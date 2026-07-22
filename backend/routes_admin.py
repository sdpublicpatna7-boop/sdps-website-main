"""Admin API routes (JWT-protected)."""
import os
import re
import math
import io
import asyncio
import logging
from html.parser import HTMLParser
import urllib.parse
import httpx
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body, Request, Response, BackgroundTasks
from pydantic import BaseModel
import pandas as pd
from slowapi import Limiter

from auth import (
    hash_password, verify_password, create_access_token,
    get_current_admin, get_superadmin, require_permission, generate_otp, TokenData,
    set_auth_cookie, clear_auth_cookie, ADMIN_COOKIE_NAME, JWT_EXPIRY_HOURS
)

def get_real_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host or "127.0.0.1"

limiter = Limiter(key_func=get_real_ip)
from email_service import send_email, send_email_with_attachment, render_template, render_attachment_cover_email, format_salary_slip_email, format_salary_certificate_email, format_experience_certificate_email
from pdf_service import generate_protected_pdf, wrap_for_pdf
from image_utils import compress_and_save, save_raw_file, UnsafeUploadError, UPLOAD_ROOT
from models import (
    AdminLogin, AdminPasswordReset, AdminPasswordResetConfirm, AdminChangePassword,
    News, Notice, GalleryImage, VideoItem, CalendarEvent, Holiday,
    CouncilMember, ElectionPoster, CouncilResult, FormQuestion,
    CareerPost, AlumniMeet, AlumniSettings, TCRecord, PopupSettings,
    SiteSettings, now_iso, new_id, AdmissionEnquiry,
    EligibilityRow, FeeStructureRow, HostelFeeRow, HostelGalleryItem,
    AdministrationMember, LegalPage, ExamPaper, HolidayHomework, KheloPatnaPhoto,
    Educator, GeneratedThumbnail, SalarySlip, SalaryCertificate, ExperienceCertificate, Testimonial,
    ShortLink, ShortLinkCreate, LinktreeSettings, LinktreeLink, LinktreeClick,
    ApaarRosterStudent, ApaarSubmission
)

logger = logging.getLogger(__name__)
admin_router = APIRouter(prefix="/api/admin", tags=["admin"])
db = None


def init_db(database):
    global db
    db = database


def _sanitize_update(payload: Dict[str, Any], model_cls) -> Dict[str, Any]:
    """Whitelist an update payload to the fields declared on the model.

    Prevents mass-assignment / arbitrary-key injection into the `$set` document.
    `id` and `_id` are always stripped (identity must not be reassigned here).
    """
    allowed = set(getattr(model_cls, "model_fields", {}).keys())
    return {k: v for k, v in payload.items() if k in allowed and k not in ("id", "_id")}


# ============= AUTH =============
@admin_router.post("/login")
@limiter.limit("10/minute")
async def admin_login(request: Request, response: Response, payload: AdminLogin):
    user = await db.admin_users.find_one({"email": payload.email}, {"_id": 0})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is disabled. Contact the administrator.")
    token = create_access_token({
        "sub": user["id"],
        "email": user["email"],
        "role": user.get("role", "superadmin"),
        "permissions": user.get("permissions", [])
    })
    # Set the token as an HttpOnly cookie (primary). Also returned in the body
    # as a fallback for non-browser / cross-origin clients.
    set_auth_cookie(response, token, ADMIN_COOKIE_NAME, JWT_EXPIRY_HOURS)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user.get("name", "Admin"),
            "role": user.get("role", "superadmin"),
            "permissions": user.get("permissions", [])
        }
    }


@admin_router.post("/logout")
async def admin_logout(response: Response):
    clear_auth_cookie(response, ADMIN_COOKIE_NAME)
    return {"status": "ok"}


@admin_router.post("/forgot-password")
@limiter.limit("5/minute")
async def admin_forgot_password(request: Request, payload: AdminPasswordReset):
    user = await db.admin_users.find_one({"email": payload.email}, {"_id": 0})
    if not user:
        # Do not reveal existence; return generic message
        return {"status": "ok", "message": "If account exists, OTP has been sent."}
    code = generate_otp()
    expires = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
    await db.password_resets.update_one(
        {"email": payload.email},
        {"$set": {"email": payload.email, "code": code, "expires_at": expires}},
        upsert=True
    )
    body = render_template(
        title="Admin Password Reset Code",
        body_html=f"""
        <p>Use the code below to reset your admin password. The code expires in 15 minutes.</p>
        <h2 style="letter-spacing:8px;color:#0E3B91;background:#f1f5f9;padding:12px;text-align:center;border-radius:8px;">{code}</h2>
        <p>If you did not request this, please ignore.</p>
        """
    )
    res = await send_email(payload.email, "SDPS Admin - Password Reset Code", body)
    return {"status": "ok", "message": "If account exists, OTP has been sent.", "email_status": res}


@admin_router.post("/reset-password")
async def admin_reset_password(payload: AdminPasswordResetConfirm):
    rec = await db.password_resets.find_one({"email": payload.email}, {"_id": 0})
    if not rec:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    # Cap brute-force: max 5 attempts per OTP issuance
    if rec.get("attempts", 0) >= 5:
        await db.password_resets.delete_one({"email": payload.email})
        raise HTTPException(status_code=429, detail="Too many attempts. Request a new OTP.")
    if rec.get("code") != payload.code:
        await db.password_resets.update_one(
            {"email": payload.email}, {"$inc": {"attempts": 1}}
        )
        raise HTTPException(status_code=400, detail="Invalid OTP")
    expires = rec.get("expires_at")
    if expires and datetime.fromisoformat(expires) < datetime.now(timezone.utc):
        await db.password_resets.delete_one({"email": payload.email})
        raise HTTPException(status_code=400, detail="OTP expired")
    new_hash = hash_password(payload.new_password)
    await db.admin_users.update_one({"email": payload.email}, {"$set": {"password_hash": new_hash}})
    await db.password_resets.delete_one({"email": payload.email})
    return {"status": "ok"}


@admin_router.post("/change-password")
async def admin_change_password(payload: AdminChangePassword, admin: TokenData = Depends(get_current_admin)):
    user = await db.admin_users.find_one({"id": admin.sub}, {"_id": 0})
    if not user or not verify_password(payload.old_password, user.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Current password incorrect")
    await db.admin_users.update_one({"id": admin.sub}, {"$set": {"password_hash": hash_password(payload.new_password)}})
    return {"status": "ok"}


@admin_router.get("/me")
async def admin_me(admin: TokenData = Depends(get_current_admin)):
    user = await db.admin_users.find_one({"id": admin.sub}, {"_id": 0, "password_hash": 0})
    return user


# ============= UPLOAD =============
@admin_router.post("/upload-image")
async def upload_image(
    sub_dir: str = Form("gallery"),
    file: UploadFile = File(...),
    admin: TokenData = Depends(get_current_admin)
):
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image must be ≤ 10MB before compression")
    if sub_dir in ("educators", "thumbnails"):
        try:
            res = save_raw_file(content, sub_dir, file.filename)
        except UnsafeUploadError as e:
            raise HTTPException(status_code=400, detail=str(e))
        return res
    res = compress_and_save(content, sub_dir=sub_dir)
    return res


@admin_router.post("/upload-file")
async def upload_file(
    sub_dir: str = Form("misc"),
    file: UploadFile = File(...),
    max_mb: int = Form(5),
    admin: TokenData = Depends(get_current_admin)
):
    content = await file.read()
    if len(content) > max_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File must be ≤ {max_mb}MB")
    try:
        res = save_raw_file(content, sub_dir, file.filename)
    except UnsafeUploadError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return res


# ============= GENERIC CRUD HELPER =============
def _make_crud(collection_name: str, model_cls, sort_field: str = "created_at", sort_order: int = -1, permission: str = None):
    """Returns (list, get, create, update, delete) handler functions for a collection."""
    dep = require_permission(permission) if permission else get_current_admin

    async def list_items(admin: TokenData = Depends(dep)):
        items = await db[collection_name].find({}, {"_id": 0}).sort(sort_field, sort_order).to_list(1000)
        return items

    async def get_item(item_id: str, admin: TokenData = Depends(dep)):
        item = await db[collection_name].find_one({"id": item_id}, {"_id": 0})
        if not item:
            raise HTTPException(status_code=404, detail="Not found")
        return item

    async def create_item(payload: model_cls, admin: TokenData = Depends(dep)):
        doc = payload.model_dump()
        await db[collection_name].insert_one(doc.copy())
        return doc

    async def update_item(item_id: str, payload: Dict[str, Any] = Body(...), admin: TokenData = Depends(dep)):
        update = _sanitize_update(payload, model_cls)
        if update:
            await db[collection_name].update_one({"id": item_id}, {"$set": update})
        item = await db[collection_name].find_one({"id": item_id}, {"_id": 0})
        return item

    async def delete_item(item_id: str, admin: TokenData = Depends(dep)):
        res = await db[collection_name].delete_one({"id": item_id})
        return {"deleted": res.deleted_count}

    return list_items, get_item, create_item, update_item, delete_item


def _register_crud(prefix: str, collection: str, model_cls, sort_field: str = "created_at", sort_order: int = -1, permission: str = None):
    list_h, get_h, create_h, update_h, delete_h = _make_crud(collection, model_cls, sort_field, sort_order, permission)
    admin_router.add_api_route(prefix, list_h, methods=["GET"])
    admin_router.add_api_route(prefix + "/{item_id}", get_h, methods=["GET"])
    admin_router.add_api_route(prefix, create_h, methods=["POST"])
    admin_router.add_api_route(prefix + "/{item_id}", update_h, methods=["PUT"])
    admin_router.add_api_route(prefix + "/{item_id}", delete_h, methods=["DELETE"])


_register_crud("/news", "news", News, "date", -1, permission="news")
_register_crud("/notices", "notices", Notice, "date", -1, permission="notices")
_register_crud("/gallery", "gallery", GalleryImage, "order", 1, permission="gallery")
_register_crud("/videos", "videos", VideoItem, "created_at", -1, permission="gallery")
_register_crud("/calendar", "calendar", CalendarEvent, "date", 1, permission="calendar")
_register_crud("/holidays", "holidays", Holiday, "date", 1, permission="calendar")
_register_crud("/council-members", "council_members", CouncilMember, "order", 1, permission="council")
_register_crud("/election-posters", "election_posters", ElectionPoster, "year", -1, permission="council")
_register_crud("/council-results", "council_results", CouncilResult, "year", -1, permission="council")
_register_crud("/enquiry-questions", "enquiry_questions", FormQuestion, "order", 1, permission="admissions")
_register_crud("/admission-fields", "admission_fields", FormQuestion, "order", 1, permission="admissions")
_register_crud("/career-posts", "career_posts", CareerPost, "posted_at", -1, permission="career")
_register_crud("/career-questions", "career_questions", FormQuestion, "order", 1, permission="career")
_register_crud("/alumni-questions", "alumni_questions", FormQuestion, "order", 1, permission="alumni")
_register_crud("/alumni-meets", "alumni_meets", AlumniMeet, "date", -1, permission="alumni")
_register_crud("/eligibility-rows", "eligibility_rows", EligibilityRow, "order", 1, permission="site-settings")
_register_crud("/fee-structure-rows", "fee_structure_rows", FeeStructureRow, "order", 1, permission="site-settings")
_register_crud("/hostel-fee-rows", "hostel_fee_rows", HostelFeeRow, "order", 1, permission="site-settings")
_register_crud("/administration-members", "administration_members", AdministrationMember, "order", 1, permission="site-settings")
_register_crud("/educators", "educators", Educator, "created_at", -1, permission="media-tools")
_register_crud("/testimonials", "testimonials", Testimonial, "created_at", -1, permission="site-settings")


# ============= GENERATED THUMBNAILS =============
@admin_router.post("/generated-thumbnails")
async def create_generated_thumbnail(payload: GeneratedThumbnail, admin: TokenData = Depends(get_current_admin)):
    doc = payload.model_dump()
    user = await db.admin_users.find_one({"id": admin.sub})
    doc["created_by"] = user.get("name") if (user and user.get("name")) else admin.email
    doc["created_at"] = now_iso()
    await db.generated_thumbnails.insert_one(doc.copy())
    return doc


@admin_router.get("/generated-thumbnails")
async def list_generated_thumbnails(admin: TokenData = Depends(get_current_admin)):
    items = await db.generated_thumbnails.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items


@admin_router.delete("/generated-thumbnails/{item_id}")
async def delete_generated_thumbnail(item_id: str, admin: TokenData = Depends(get_current_admin)):
    res = await db.generated_thumbnails.delete_one({"id": item_id})
    return {"deleted": res.deleted_count}


# ============= SALARY SLIPS =============
@admin_router.post("/salary-slips")
async def create_salary_slip(payload: SalarySlip, admin: TokenData = Depends(require_permission("media-tools"))):
    doc = payload.model_dump()
    user = await db.admin_users.find_one({"id": admin.sub})
    doc["created_by"] = user.get("name") if (user and user.get("name")) else admin.email
    doc["created_at"] = now_iso()
    await db.salary_slips.insert_one(doc.copy())
    return doc


@admin_router.get("/salary-slips")
async def list_salary_slips(admin: TokenData = Depends(require_permission("media-tools"))):
    items = await db.salary_slips.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items


@admin_router.delete("/salary-slips/{item_id}")
async def delete_salary_slip(item_id: str, admin: TokenData = Depends(require_permission("media-tools"))):
    res = await db.salary_slips.delete_one({"id": item_id})
    return {"deleted": res.deleted_count}


# ============= SALARY CERTIFICATES =============
@admin_router.post("/salary-certificates")
async def create_salary_certificate(payload: SalaryCertificate, admin: TokenData = Depends(require_permission("media-tools"))):
    doc = payload.model_dump()
    user = await db.admin_users.find_one({"id": admin.sub})
    doc["created_by"] = user.get("name") if (user and user.get("name")) else admin.email
    doc["created_at"] = now_iso()
    await db.salary_certificates.insert_one(doc.copy())
    return doc


@admin_router.get("/salary-certificates")
async def list_salary_certificates(admin: TokenData = Depends(require_permission("media-tools"))):
    items = await db.salary_certificates.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items


@admin_router.delete("/salary-certificates/{item_id}")
async def delete_salary_certificate(item_id: str, admin: TokenData = Depends(require_permission("media-tools"))):
    res = await db.salary_certificates.delete_one({"id": item_id})
    return {"deleted": res.deleted_count}


# ============= EXPERIENCE CERTIFICATES =============
@admin_router.post("/experience-certificates")
async def create_experience_certificate(payload: ExperienceCertificate, admin: TokenData = Depends(require_permission("media-tools"))):
    doc = payload.model_dump()
    user = await db.admin_users.find_one({"id": admin.sub})
    doc["created_by"] = user.get("name") if (user and user.get("name")) else admin.email
    doc["created_at"] = now_iso()
    await db.experience_certificates.insert_one(doc.copy())
    return doc


@admin_router.get("/experience-certificates")
async def list_experience_certificates(admin: TokenData = Depends(require_permission("media-tools"))):
    items = await db.experience_certificates.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items


@admin_router.delete("/experience-certificates/{item_id}")
async def delete_experience_certificate(item_id: str, admin: TokenData = Depends(require_permission("media-tools"))):
    res = await db.experience_certificates.delete_one({"id": item_id})
    return {"deleted": res.deleted_count}


async def sync_logo_url():
    if db is not None:
        settings = await db.site_settings.find_one({}, {"logo_url": 1, "_id": 0})
        if settings and settings.get("logo_url"):
            import email_service
            import pdf_service
            email_service.LOGO_URL = settings["logo_url"]
            pdf_service.LOGO_URL = settings["logo_url"]


class EmailSendPayload(BaseModel):
    email: str
    data: Dict[str, Any]


@admin_router.post("/salary-slips/send-email")
async def email_salary_slip(
    request: Request,
    payload: EmailSendPayload,
    admin: TokenData = Depends(require_permission("media-tools")),
    _logo: None = Depends(sync_logo_url)
):
    data = payload.data
    employee_name = data.get("employee_name", "Employee")
    pay_period = data.get("pay_period", "")
    subject = f"Salary Slip - {pay_period} - {employee_name}"

    # Generate the document HTML and convert to protected PDF
    doc_html = format_salary_slip_email(data)
    pdf_html = wrap_for_pdf(f"Salary Slip — {pay_period}", doc_html)
    try:
        pdf_bytes = generate_protected_pdf(pdf_html)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

    # Write PDF to local temp uploads folder for backup download option
    import uuid
    temp_dir = UPLOAD_ROOT / "temp"
    temp_dir.mkdir(exist_ok=True)
    filename = f"salary_slip_{uuid.uuid4().hex}.pdf"
    filepath = temp_dir / filename
    filepath.write_bytes(pdf_bytes)

    base_url = str(request.base_url).rstrip("/")
    download_url = f"{base_url}/api/uploads/temp/{filename}"

    # Send email with PDF attachment
    safe_period = pay_period.replace(" ", "_").replace("/", "-")
    cover_html = render_attachment_cover_email(
        employee_name, "Salary Slip",
        extra_info=f"Pay Period: <strong>{pay_period}</strong>",
        download_url=download_url
    )
    res = await send_email_with_attachment(
        to_email=payload.email,
        subject=subject,
        html_body=cover_html,
        pdf_bytes=pdf_bytes,
        pdf_filename=f"Salary_Slip_{safe_period}_{employee_name.replace(' ', '_')}.pdf",
        to_name=employee_name,
    )
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("message") or "Failed to send email")
    return {"sent": True, "method": res.get("method", "unknown")}


@admin_router.post("/salary-certificates/send-email")
async def email_salary_certificate(
    request: Request,
    payload: EmailSendPayload,
    admin: TokenData = Depends(require_permission("media-tools")),
    _logo: None = Depends(sync_logo_url)
):
    data = payload.data
    employee_name = data.get("employee_name", "Employee")
    subject = f"Salary Certificate - {employee_name}"

    # Generate the document HTML and convert to protected PDF
    doc_html = format_salary_certificate_email(data)
    pdf_html = wrap_for_pdf("Salary Certificate", doc_html)
    try:
        pdf_bytes = generate_protected_pdf(pdf_html)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

    # Write PDF to local temp uploads folder for backup download option
    import uuid
    temp_dir = UPLOAD_ROOT / "temp"
    temp_dir.mkdir(exist_ok=True)
    filename = f"salary_certificate_{uuid.uuid4().hex}.pdf"
    filepath = temp_dir / filename
    filepath.write_bytes(pdf_bytes)

    base_url = str(request.base_url).rstrip("/")
    download_url = f"{base_url}/api/uploads/temp/{filename}"

    # Send email with PDF attachment
    cover_html = render_attachment_cover_email(
        employee_name, "Salary Certificate",
        extra_info=f"Financial Year: <strong>{data.get('financial_year', '')}</strong>",
        download_url=download_url
    )
    res = await send_email_with_attachment(
        to_email=payload.email,
        subject=subject,
        html_body=cover_html,
        pdf_bytes=pdf_bytes,
        pdf_filename=f"Salary_Certificate_{employee_name.replace(' ', '_')}.pdf",
        to_name=employee_name,
    )
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("message") or "Failed to send email")
    return {"sent": True, "method": res.get("method", "unknown")}


@admin_router.post("/experience-certificates/send-email")
async def email_experience_certificate(
    request: Request,
    payload: EmailSendPayload,
    admin: TokenData = Depends(require_permission("media-tools")),
    _logo: None = Depends(sync_logo_url)
):
    data = payload.data
    employee_name = data.get("employee_name", "Employee")
    subject = f"Experience Certificate - {employee_name}"

    # Generate the document HTML and convert to protected PDF
    doc_html = format_experience_certificate_email(data)
    pdf_html = wrap_for_pdf("Experience Certificate", doc_html)
    try:
        pdf_bytes = generate_protected_pdf(pdf_html)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

    # Write PDF to local temp uploads folder for backup download option
    import uuid
    temp_dir = UPLOAD_ROOT / "temp"
    temp_dir.mkdir(exist_ok=True)
    filename = f"experience_certificate_{uuid.uuid4().hex}.pdf"
    filepath = temp_dir / filename
    filepath.write_bytes(pdf_bytes)

    base_url = str(request.base_url).rstrip("/")
    download_url = f"{base_url}/api/uploads/temp/{filename}"

    # Send email with PDF attachment
    cover_html = render_attachment_cover_email(
        employee_name, "Experience Certificate",
        extra_info=f"Tenure: {data.get('joining_date', '')} — {data.get('leaving_date', 'Present')}",
        download_url=download_url
    )
    res = await send_email_with_attachment(
        to_email=payload.email,
        subject=subject,
        html_body=cover_html,
        pdf_bytes=pdf_bytes,
        pdf_filename=f"Experience_Certificate_{employee_name.replace(' ', '_')}.pdf",
        to_name=employee_name,
    )
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("message") or "Failed to send email")
    return {"sent": True, "method": res.get("method", "unknown")}


# ============= READ-ONLY LISTS (for admin: enquiries, applications, etc) =============
@admin_router.get("/admission-enquiries")
async def list_enquiries(admin: TokenData = Depends(require_permission("admissions"))):
    items = await db.admission_enquiries.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return items


@admin_router.put("/admission-enquiries/{item_id}")
async def update_enquiry(item_id: str, payload: Dict[str, Any] = Body(...), admin: TokenData = Depends(require_permission("admissions"))):
    update = _sanitize_update(payload, AdmissionEnquiry)
    if update:
        await db.admission_enquiries.update_one({"id": item_id}, {"$set": update})
    return await db.admission_enquiries.find_one({"id": item_id}, {"_id": 0})


@admin_router.delete("/admission-enquiries/{item_id}")
async def delete_enquiry(item_id: str, admin: TokenData = Depends(require_permission("admissions"))):
    res = await db.admission_enquiries.delete_one({"id": item_id})
    return {"deleted": res.deleted_count}


@admin_router.get("/admissions")
async def list_admissions(admin: TokenData = Depends(require_permission("admissions"))):
    items = await db.admissions.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return items


@admin_router.get("/career-applications")
async def list_career_apps(admin: TokenData = Depends(require_permission("career"))):
    items = await db.career_applications.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return items


@admin_router.get("/alumni-members")
async def list_alumni_members(admin: TokenData = Depends(require_permission("alumni"))):
    items = await db.alumni_members.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return items


@admin_router.get("/payments")
async def list_payments(admin: TokenData = Depends(require_permission("site-settings"))):
    items = await db.payments.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return items


@admin_router.get("/contact-messages")
async def list_contact_messages(admin: TokenData = Depends(require_permission("contact-messages"))):
    items = await db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return items


# ============= SINGLETON SETTINGS =============
@admin_router.get("/popup-settings")
async def get_popup_settings(admin: TokenData = Depends(require_permission("popup"))):
    doc = await db.popup_settings.find_one({"id": "popup"}, {"_id": 0})
    if not doc:
        doc = PopupSettings().model_dump()
        await db.popup_settings.insert_one(doc.copy())
    return doc


@admin_router.put("/popup-settings")
async def update_popup_settings(payload: Dict[str, Any] = Body(...), admin: TokenData = Depends(require_permission("popup"))):
    update = _sanitize_update(payload, PopupSettings)
    update["id"] = "popup"
    await db.popup_settings.update_one({"id": "popup"}, {"$set": update}, upsert=True)
    return await db.popup_settings.find_one({"id": "popup"}, {"_id": 0})


@admin_router.get("/site-settings")
async def get_site_settings_admin(admin: TokenData = Depends(require_permission("site-settings"))):
    doc = await db.site_settings.find_one({"id": "site"}, {"_id": 0})
    if not doc:
        doc = SiteSettings().model_dump()
        await db.site_settings.insert_one(doc.copy())
    else:
        # Merge with defaults to ensure any newly added settings are always present
        defaults = SiteSettings().model_dump()
        for k, v in defaults.items():
            if k not in doc:
                doc[k] = v
    return doc


@admin_router.put("/site-settings")
async def update_site_settings(payload: Dict[str, Any] = Body(...), admin: TokenData = Depends(require_permission("site-settings"))):
    update = _sanitize_update(payload, SiteSettings)
    update["id"] = "site"
    await db.site_settings.update_one({"id": "site"}, {"$set": update}, upsert=True)
    return await db.site_settings.find_one({"id": "site"}, {"_id": 0})


@admin_router.get("/alumni-settings")
async def get_alumni_settings_admin(admin: TokenData = Depends(require_permission("alumni"))):
    doc = await db.alumni_settings.find_one({"id": "alumni-settings"}, {"_id": 0})
    if not doc:
        doc = AlumniSettings().model_dump()
        await db.alumni_settings.insert_one(doc.copy())
    return doc


@admin_router.put("/alumni-settings")
async def update_alumni_settings(payload: Dict[str, Any] = Body(...), admin: TokenData = Depends(require_permission("alumni"))):
    update = _sanitize_update(payload, AlumniSettings)
    update["id"] = "alumni-settings"
    await db.alumni_settings.update_one({"id": "alumni-settings"}, {"$set": update}, upsert=True)
    return await db.alumni_settings.find_one({"id": "alumni-settings"}, {"_id": 0})


# ============= TC RECORDS =============
@admin_router.get("/tc-records")
async def list_tc_records(admin: TokenData = Depends(require_permission("tc-records"))):
    items = await db.tc_records.find({}, {"_id": 0}).sort("uploaded_at", -1).to_list(5000)
    return items


@admin_router.post("/tc-records")
async def create_tc_record(
    payload: Dict[str, Any] = Body(...),
    admin: TokenData = Depends(require_permission("tc-records"))
):
    if not payload.get("tc_file_url"):
        raise HTTPException(status_code=400, detail="tc_file_url is required")
    rec = TCRecord(
        student_name=payload.get("student_name", ""),
        dob=payload.get("dob", ""),
        admission_number=payload.get("admission_number", ""),
        tc_file_url=payload["tc_file_url"],
        notes=payload.get("notes", ""),
    ).model_dump()
    await db.tc_records.insert_one(rec.copy())
    return rec


@admin_router.delete("/tc-records/{item_id}")
async def delete_tc_record(item_id: str, admin: TokenData = Depends(require_permission("tc-records"))):
    res = await db.tc_records.delete_one({"id": item_id})
    return {"deleted": res.deleted_count}


# ============= EXCEL IMPORT for Calendar =============
@admin_router.post("/calendar/import-excel")
async def import_calendar_excel(
    file: UploadFile = File(...),
    target: str = Form("calendar"),  # 'calendar' or 'holidays'
    admin: TokenData = Depends(require_permission("calendar"))
):
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File must be ≤ 5MB")
    try:
        df = pd.read_excel(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse excel: {e}")
    df.columns = [str(c).strip().lower() for c in df.columns]
    if "name" not in df.columns or "date" not in df.columns:
        raise HTTPException(status_code=400, detail="Excel must have 'name' and 'date' columns (optional: icon, type, description)")
    items = []
    for _, row in df.iterrows():
        date_val = row.get("date")
        if pd.isna(date_val):
            continue
        if hasattr(date_val, "strftime"):
            date_str = date_val.strftime("%Y-%m-%d")
        else:
            date_str = str(date_val)[:10]
        item = {
            "id": new_id(),
            "name": str(row.get("name", "")).strip(),
            "date": date_str,
            "icon_url": str(row.get("icon", "") or "").strip() or None,
        }
        if target == "calendar":
            item["type"] = str(row.get("type", "event") or "event").strip()
            item["description"] = str(row.get("description", "") or "").strip() or None
        items.append(item)
    if not items:
        return {"inserted": 0}
    coll = db.calendar if target == "calendar" else db.holidays
    await coll.insert_many([i.copy() for i in items])
    return {"inserted": len(items)}


# ============= DASHBOARD STATS =============
@admin_router.get("/stats")
async def admin_stats(admin: TokenData = Depends(get_current_admin)):
    return {
        "news": await db.news.count_documents({}),
        "notices": await db.notices.count_documents({}),
        "gallery": await db.gallery.count_documents({}),
        "videos": await db.videos.count_documents({}),
        "enquiries": await db.admission_enquiries.count_documents({}),
        "admissions": await db.admissions.count_documents({}),
        "career_applications": await db.career_applications.count_documents({}),
        "alumni_members": await db.alumni_members.count_documents({}),
        "tc_records": await db.tc_records.count_documents({}),
        "payments_paid": await db.payments.count_documents({"status": "paid"}),
        "contact_messages": await db.contact_messages.count_documents({}),
    }


# ============= DEBUG MAILERCLOUD INTEGRATION =============
@admin_router.get("/debug-mailercloud")
async def debug_mailercloud(to: str = "", admin: TokenData = Depends(require_permission("site-settings"))):
    import httpx
    mailer_key = os.environ.get("MAILERCLOUD_API_KEY", "")
    sender_email = os.environ.get("SENDER_EMAIL", "noreply@sdpublic.org")
    sender_name = os.environ.get("SENDER_NAME", "S.D. Public School")
    
    if not mailer_key:
        return {"error": "MAILERCLOUD_API_KEY not configured in environment"}
    
    recipient = to or sender_email
        
    # Correct MailerCloud Email API — plain key, no Bearer prefix
    headers = {
        "Authorization": mailer_key,
        "Content-Type": "application/json"
    }
    payload = {
        "version": "1.0",
        "email": {
            "from": sender_email,
            "fromName": sender_name,
            "subject": "SDPS Email Test — MailerCloud Integration",
            "html": "<h2>S.D. Public School</h2><p>This is a test email from the MailerCloud Email API integration. If you received this, the email service is working correctly!</p><p>Sent at: " + str(__import__('datetime').datetime.now()) + "</p>",
            "recipients": {
                "to": [{"name": "Test Recipient", "email": recipient}]
            },
        },
        "metadata": {
            "campaignType": "TRANSACTIONAL",
        },
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post("https://email-api.mailercloud.com/email", json=payload, headers=headers)
        data = r.json()
        return {
            "sent_to": recipient,
            "sent_from": sender_email,
            "status_code": r.status_code,
            "response": data,
            "success": r.status_code in (200, 201) and data.get("statusCode") == 1000,
        }
    except Exception as e:
        return {"error": str(e)}


# ============= UPDATE ENV-LIKE KEYS via DB (Razorpay/Resend/SMS) =============
@admin_router.get("/integration-keys")
async def get_integration_keys(admin: TokenData = Depends(get_superadmin)):
    """Return masked keys (admin can update at .env). For now read-only env reflect."""
    def mask(v: str) -> str:
        if not v:
            return ""
        return v[:4] + "***" + v[-3:] if len(v) > 8 else "***"
    return {
        "mailercloud_api_key": mask(os.environ.get("MAILERCLOUD_API_KEY", "")),
        "sender_email": os.environ.get("SENDER_EMAIL", "noreply@sdpublic.org"),
        "sender_name": os.environ.get("SENDER_NAME", "S.D. Public School"),
        "razorpay_key_id": os.environ.get("RAZORPAY_KEY_ID", ""),
        "razorpay_key_secret": mask(os.environ.get("RAZORPAY_KEY_SECRET", "")),
        "bulksms_api_url": os.environ.get("BULKSMS_API_URL", ""),
        "bulksms_api_key": mask(os.environ.get("BULKSMS_API_KEY", "")),
        "bulksms_sender_id": os.environ.get("BULKSMS_SENDER_ID", ""),
        "erp_login_url": os.environ.get("ERP_LOGIN_URL", "https://sdpublic.gungunerp.in"),
    }


def _mask_secret(v: str) -> str:
    """Reveal only the first 4 and last 3 characters of a sensitive value."""
    if not v:
        return ""
    return v[:4] + "***" + v[-3:] if len(v) > 8 else "***"


async def _check_mongo() -> tuple:
    try:
        await db.command("ping")
        return "ok", "Ping successful"
    except Exception as e:
        return "down", str(e)[:100]


async def _check_http(url: str, headers: dict = None) -> tuple:
    if not url:
        return "not_configured", "URL not set"
    try:
        async with httpx.AsyncClient(timeout=5.0, follow_redirects=True) as c:
            r = await c.get(url, headers=headers or {})
        if r.status_code < 500:
            return "ok", f"Reachable ({r.status_code})"
        return "down", f"Error {r.status_code}"
    except Exception:
        return "down", "Unreachable"


async def _check_whatsapp(url: str, secret: str) -> tuple:
    if not secret:
        return "not_configured", "WA_API_SECRET not set", False
    try:
        async with httpx.AsyncClient(timeout=6.0) as c:
            r = await c.get(f"{url}/status", headers={"X-WA-Secret": secret})
        if r.status_code < 300:
            connected = bool(r.json().get("connected"))
            if connected:
                return "ok", "Linked & connected", True
            return "configured", "Service up — not linked (scan QR)", False
        return "down", f"Service error {r.status_code}", False
    except Exception:
        return "down", "Service unreachable", False


@admin_router.get("/integration-status")
async def integration_status(admin: TokenData = Depends(get_superadmin)):
    """Full integration inventory with live health checks and masked secrets.

    `status` is one of: ok | configured | down | not_configured.
    """
    mailer_key = os.environ.get("MAILERCLOUD_API_KEY", "")
    razor_id = os.environ.get("RAZORPAY_KEY_ID", "")
    razor_secret = os.environ.get("RAZORPAY_KEY_SECRET", "")
    sms_url = os.environ.get("BULKSMS_API_URL", "")
    sms_key = os.environ.get("BULKSMS_API_KEY", "")
    sms_sender = os.environ.get("BULKSMS_SENDER_ID", "")
    erp_url = os.environ.get("ERP_LOGIN_URL", "https://sdpublic.gungunerp.in")
    wa_url = os.environ.get("WA_SERVICE_URL", "http://localhost:3001")
    wa_secret = os.environ.get("WA_API_SECRET", "")
    jwt_secret = os.environ.get("JWT_SECRET", "")
    cloudinary_name = os.environ.get("CLOUDINARY_CLOUD_NAME", "")
    cloudinary_key = os.environ.get("CLOUDINARY_API_KEY", "")
    cloudinary_secret = os.environ.get("CLOUDINARY_API_SECRET", "")

    # Run independent live probes concurrently.
    (mongo_status, mongo_detail), (erp_status, erp_detail), (wa_status, wa_detail, wa_connected) = await asyncio.gather(
        _check_mongo(),
        _check_http(erp_url),
        _check_whatsapp(wa_url, wa_secret),
    )

    def cfg(present: bool) -> str:
        return "configured" if present else "not_configured"

    integrations = [
        {
            "key": "mongodb", "label": "MongoDB Database", "group": "Core", "icon": "🗄️",
            "status": mongo_status, "detail": mongo_detail,
            "fields": [
                {"name": "MONGO_URL", "value": _mask_secret(os.environ.get("MONGO_URL", "")), "sensitive": True},
                {"name": "DB_NAME", "value": os.environ.get("DB_NAME", ""), "sensitive": False},
            ],
        },
        {
            "key": "auth", "label": "Auth & Cookies", "group": "Core", "icon": "🔐",
            "status": "configured" if jwt_secret else "not_configured",
            "detail": "JWT secret set" if jwt_secret else "JWT_SECRET missing",
            "fields": [
                {"name": "JWT_SECRET", "value": _mask_secret(jwt_secret), "sensitive": True},
                {"name": "COOKIE_SECURE", "value": os.environ.get("COOKIE_SECURE", "true"), "sensitive": False},
                {"name": "COOKIE_SAMESITE", "value": os.environ.get("COOKIE_SAMESITE", "lax"), "sensitive": False},
                {"name": "CORS_ORIGINS", "value": os.environ.get("CORS_ORIGINS", ""), "sensitive": False},
            ],
        },
        {
            "key": "email", "label": "Email — MailerCloud", "group": "Messaging", "icon": "✉️",
            "status": cfg(bool(mailer_key)),
            "detail": "API key configured" if mailer_key else "Not configured",
            "fields": [
                {"name": "MAILERCLOUD_API_KEY", "value": _mask_secret(mailer_key), "sensitive": True},
                {"name": "SENDER_EMAIL", "value": os.environ.get("SENDER_EMAIL", "noreply@sdpublic.org"), "sensitive": False},
                {"name": "SENDER_NAME", "value": os.environ.get("SENDER_NAME", "S.D. Public School"), "sensitive": False},
            ],
        },
        {
            "key": "sms", "label": "Bulk SMS", "group": "Messaging", "icon": "📱",
            "status": cfg(bool(sms_url and sms_key)),
            "detail": "Configured" if (sms_url and sms_key) else "Not configured",
            "fields": [
                {"name": "BULKSMS_API_URL", "value": sms_url, "sensitive": False},
                {"name": "BULKSMS_API_KEY", "value": _mask_secret(sms_key), "sensitive": True},
                {"name": "BULKSMS_SENDER_ID", "value": sms_sender, "sensitive": False},
            ],
        },
        {
            "key": "whatsapp", "label": "WhatsApp (Baileys)", "group": "Messaging", "icon": "💬",
            "status": wa_status, "detail": wa_detail, "connected": wa_connected,
            "manageable": True,  # QR + disconnect controls live in this panel
            "fields": [
                {"name": "WA_SERVICE_URL", "value": wa_url, "sensitive": False},
                {"name": "WA_API_SECRET", "value": _mask_secret(wa_secret), "sensitive": True},
            ],
        },
        {
            "key": "razorpay", "label": "Razorpay", "group": "Payments", "icon": "💳",
            "status": cfg(bool(razor_id and razor_secret)),
            "detail": "Keys configured" if (razor_id and razor_secret) else "Not configured",
            "fields": [
                {"name": "RAZORPAY_KEY_ID", "value": razor_id, "sensitive": False},
                {"name": "RAZORPAY_KEY_SECRET", "value": _mask_secret(razor_secret), "sensitive": True},
            ],
        },
        {
            "key": "erp", "label": "ERP", "group": "External", "icon": "🎓",
            "status": erp_status, "detail": erp_detail,
            "fields": [
                {"name": "ERP_LOGIN_URL", "value": erp_url, "sensitive": False},
            ],
        },
        {
            "key": "ai", "label": "AI Assist (Groq)", "group": "External", "icon": "🤖",
            "status": cfg(bool(os.environ.get("GROQ_API_KEY", ""))),
            "detail": "Groq API key configured" if os.environ.get("GROQ_API_KEY", "") else "Not configured (free key from console.groq.com)",
            "fields": [
                {"name": "GROQ_API_KEY", "value": _mask_secret(os.environ.get("GROQ_API_KEY", "")), "sensitive": True},
                {"name": "GROQ_MODEL", "value": os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile"), "sensitive": False},
            ],
        },
        {
            "key": "cloudinary", "label": "Cloudinary CDN", "group": "Storage", "icon": "☁️",
            "status": cfg(bool(cloudinary_name and cloudinary_key and cloudinary_secret)),
            "detail": "Cloudinary active (uploads routed to Cloudinary CDN)" if (cloudinary_name and cloudinary_key and cloudinary_secret) else "Not configured (uploads saved to local disk fallback)",
            "fields": [
                {"name": "CLOUDINARY_CLOUD_NAME", "value": cloudinary_name, "sensitive": False},
                {"name": "CLOUDINARY_API_KEY", "value": _mask_secret(cloudinary_key), "sensitive": True},
                {"name": "CLOUDINARY_API_SECRET", "value": _mask_secret(cloudinary_secret), "sensitive": True},
            ],
        },
    ]
    return {"integrations": integrations, "checked_at": now_iso()}


# ============= HOSTEL GALLERY =============
@admin_router.get("/hostel-gallery")
async def list_hostel_gallery(admin: TokenData = Depends(require_permission("hostel-gallery"))):
    items = await db.hostel_gallery.find({}, {"_id": 0}).sort("order", 1).to_list(500)
    return items


@admin_router.post("/hostel-gallery")
async def create_hostel_gallery_item(
    payload: Dict[str, Any] = Body(...),
    admin: TokenData = Depends(require_permission("hostel-gallery"))
):
    if not payload.get("image_url"):
        raise HTTPException(status_code=400, detail="image_url is required")
    item = HostelGalleryItem(
        caption=payload.get("caption", ""),
        order=int(payload.get("order", 0)),
        image_url=payload["image_url"]
    )
    doc = item.model_dump()
    await db.hostel_gallery.insert_one(doc.copy())
    return {k: v for k, v in doc.items() if k != "_id"}


@admin_router.delete("/hostel-gallery/{item_id}")
async def delete_hostel_gallery_item(item_id: str, admin: TokenData = Depends(require_permission("hostel-gallery"))):
    await db.hostel_gallery.delete_one({"id": item_id})
    return {"deleted": item_id}

@admin_router.put("/hostel-gallery/{item_id}")
async def update_hostel_gallery_item(item_id: str, payload: Dict[str, Any] = Body(...), admin: TokenData = Depends(require_permission("hostel-gallery"))):
    update = _sanitize_update(payload, HostelGalleryItem)
    await db.hostel_gallery.update_one({"id": item_id}, {"$set": update})
    item = await db.hostel_gallery.find_one({"id": item_id}, {"_id": 0})
    return item


# ============= LEGAL PAGES (Terms & Privacy) =============
@admin_router.get("/legal/{page_id}")
async def get_legal_page(page_id: str, admin: TokenData = Depends(require_permission("site-settings"))):
    if page_id not in ("terms", "privacy"):
        raise HTTPException(status_code=400, detail="Invalid page_id")
    doc = await db.legal_pages.find_one({"id": page_id}, {"_id": 0})
    if not doc:
        defaults = {
            "terms": {
                "id": "terms", "title": "Terms & Conditions",
                "content": "<h2>Terms &amp; Conditions</h2><p>Welcome to the official website of <strong>S.D. Public School (Suryamuni Devi Public School)</strong>, Patna, Bihar. By accessing or using this website, you agree to be bound by the following Terms &amp; Conditions. Please read them carefully.</p><h3>1. Acceptance of Terms</h3><p>By using this website, you confirm that you have read, understood, and agree to these terms. If you do not agree, please discontinue use of the website immediately.</p><h3>2. Use of Website</h3><p>This website is provided for informational and educational purposes only. The content — including text, images, news, notices, and other material — is maintained by S.D. Public School and The Suryamuni Devi Foundation Trust. Unauthorised reproduction or redistribution of any content is strictly prohibited.</p><h3>3. Admission &amp; Enquiry Forms</h3><p>Information submitted through our admission enquiry and application forms is used solely for processing your admission request. You agree to provide accurate and truthful information. The school reserves the right to reject any application based on incorrect information.</p><h3>4. Fee Payment</h3><p>Fee payments made through the online portal are subject to the school's fee policy. All transactions are processed securely. In case of any discrepancy, please contact the school accounts office at <a href='mailto:helpdesk@sdpublic.org'>helpdesk@sdpublic.org</a> or <a href='tel:+919955190262'>+91 99551 90262</a>.</p><h3>5. Intellectual Property</h3><p>All content on this website, including logos, images, text, and design, is the intellectual property of S.D. Public School and The Suryamuni Devi Foundation Trust. No content may be copied, republished, or distributed without prior written permission.</p><h3>6. Third-Party Links</h3><p>This website may contain links to third-party websites (e.g., Google Forms, ERP portal, Play Store). S.D. Public School is not responsible for the content or privacy practices of these external sites.</p><h3>7. Disclaimer</h3><p>While we strive to keep all information accurate and up to date, S.D. Public School makes no warranties regarding the completeness or accuracy of content on this website. The school reserves the right to modify, update, or remove any content at any time without notice.</p><h3>8. Governing Law</h3><p>These terms are governed by the laws of India. Any disputes arising out of the use of this website shall be subject to the jurisdiction of courts in Patna, Bihar.</p><h3>9. Contact</h3><p>For any queries regarding these Terms &amp; Conditions, please contact us at <a href='mailto:helpdesk@sdpublic.org'>helpdesk@sdpublic.org</a> or call <a href='tel:+919955190262'>+91 99551 90262</a>.</p><p><em>Last reviewed: June 2025</em></p>",
                "updated_at": now_iso()
            },
            "privacy": {
                "id": "privacy", "title": "Privacy Policy",
                "content": "<h2>Privacy Policy</h2><p><strong>S.D. Public School (Suryamuni Devi Public School)</strong>, managed by The Suryamuni Devi Foundation Trust, Patna, Bihar, is committed to protecting the privacy of all users of this website, including parents, students, and prospective applicants.</p><h3>1. Information We Collect</h3><p>We collect personal information when you interact with our website, including through:</p><ul><li>Admission enquiry forms (name, email, phone, student details)</li><li>Full admission application forms (additional academic and personal details)</li><li>Contact forms and career application forms</li><li>Alumni registration forms</li><li>Fee payment portal (transaction details processed by our payment partner)</li></ul><h3>2. How We Use Your Information</h3><p>Information collected is used strictly for:</p><ul><li>Processing admission applications and enquiries</li><li>Communicating with parents and students regarding school matters</li><li>Sending notifications, circulars, and academic updates via SMS and email</li><li>Generating TC (Transfer Certificate) and maintaining school records</li><li>Career application processing</li></ul><p>We do <strong>not</strong> sell, rent, or share your personal information with any third party for marketing purposes.</p><h3>3. Data Storage &amp; Security</h3><p>All data submitted through this website is stored securely. We implement appropriate technical and organisational measures to protect your personal information against unauthorised access, loss, or misuse.</p><h3>4. Cookies</h3><p>Our website may use cookies to improve your browsing experience. Cookies are small files stored on your device. You can disable cookies through your browser settings, though some website features may not function correctly as a result.</p><h3>5. Third-Party Services</h3><p>We use trusted third-party services including:</p><ul><li><strong>Razorpay / Payment Gateway</strong> — for fee processing (subject to their own privacy policy)</li><li><strong>Google Forms</strong> — for certain application forms</li><li><strong>GungungERP</strong> — for student management (subject to their privacy policy)</li></ul><h3>6. Children's Privacy</h3><p>Our website collects information about children only in the context of school admission and management, and only with parental consent. We do not knowingly collect personal data from children for any other purpose.</p><h3>7. Your Rights</h3><p>You have the right to request access to, correction of, or deletion of your personal data held by us. To exercise these rights, please write to <a href='mailto:helpdesk@sdpublic.org'>helpdesk@sdpublic.org</a>.</p><h3>8. Changes to This Policy</h3><p>This Privacy Policy may be updated from time to time. We encourage you to review it periodically.</p><h3>9. Contact Us</h3><p>For any privacy-related concerns, please contact:</p><p><strong>S.D. Public School</strong><br/>Maurya Colony, Near R.O.B. Kumhrar, Biscoman Golambar, Gulzarbagh Road, Patna, Bihar 800007<br/>Email: <a href='mailto:helpdesk@sdpublic.org'>helpdesk@sdpublic.org</a><br/>Phone: <a href='tel:+919955190262'>+91 99551 90262</a></p><p><em>Last reviewed: June 2025</em></p>",
                "updated_at": now_iso()
            }
        }
        doc = defaults[page_id]
        await db.legal_pages.insert_one(doc.copy())
    return doc


@admin_router.put("/legal/{page_id}")
async def update_legal_page(page_id: str, payload: Dict[str, Any] = Body(...), admin: TokenData = Depends(require_permission("site-settings"))):
    if page_id not in ("terms", "privacy"):
        raise HTTPException(status_code=400, detail="Invalid page_id")
    payload.pop("_id", None)
    payload["id"] = page_id
    payload["updated_at"] = now_iso()
    await db.legal_pages.update_one({"id": page_id}, {"$set": payload}, upsert=True)
    return await db.legal_pages.find_one({"id": page_id}, {"_id": 0})


# ============= STAFF USER MANAGEMENT (superadmin only) =============

@admin_router.get("/staff-users")
async def list_staff_users(admin: TokenData = Depends(get_superadmin)):
    users = await db.admin_users.find({"email": {"$ne": "admin@sdpublic.org"}}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@admin_router.post("/staff-users")
async def create_staff_user(payload: Dict[str, Any] = Body(...), admin: TokenData = Depends(get_superadmin)):
    if not payload.get("email") or not payload.get("password"):
        raise HTTPException(status_code=400, detail="email and password required")
    existing = await db.admin_users.find_one({"email": payload["email"]})
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    user = {
        "id": new_id(),
        "email": payload["email"],
        "name": payload.get("name", "Staff Member"),
        "role": payload.get("role", "staff"),
        "permissions": payload.get("permissions", []),
        "password_hash": hash_password(payload["password"]),
        "created_at": now_iso(),
    }
    await db.admin_users.insert_one(user.copy())
    user.pop("password_hash", None)
    user.pop("_id", None)
    return user

@admin_router.put("/staff-users/{user_id}")
async def update_staff_user(user_id: str, payload: Dict[str, Any] = Body(...), admin: TokenData = Depends(get_superadmin)):
    update = {k: v for k, v in payload.items() if k not in ("id", "_id", "password_hash")}
    if "password" in update:
        update["password_hash"] = hash_password(update.pop("password"))
    await db.admin_users.update_one({"id": user_id}, {"$set": update})
    user = await db.admin_users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return user

@admin_router.delete("/staff-users/{user_id}")
async def delete_staff_user(user_id: str, admin: TokenData = Depends(get_superadmin)):
    # Prevent deleting self
    if user_id == admin.sub:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    await db.admin_users.delete_one({"id": user_id})
    return {"deleted": user_id}


# ============= EXAM PAPERS (staff + superadmin) =============

@admin_router.get("/exam-papers")
async def list_exam_papers(admin: TokenData = Depends(require_permission("academics"))):
    items = await db.exam_papers.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items

@admin_router.post("/exam-papers")
async def create_exam_paper(payload: Dict[str, Any] = Body(...), admin: TokenData = Depends(require_permission("academics"))):
    paper = ExamPaper(**{k: v for k, v in payload.items() if k not in ("id", "_id")}).model_dump()
    await db.exam_papers.insert_one(paper.copy())
    return {k: v for k, v in paper.items() if k != "_id"}

@admin_router.put("/exam-papers/{item_id}")
async def update_exam_paper(item_id: str, payload: Dict[str, Any] = Body(...), admin: TokenData = Depends(require_permission("academics"))):
    update = _sanitize_update(payload, ExamPaper)
    await db.exam_papers.update_one({"id": item_id}, {"$set": update})
    item = await db.exam_papers.find_one({"id": item_id}, {"_id": 0})
    return item

@admin_router.delete("/exam-papers/{item_id}")
async def delete_exam_paper(item_id: str, admin: TokenData = Depends(require_permission("academics"))):
    await db.exam_papers.delete_one({"id": item_id})
    return {"deleted": item_id}


# ============= HOLIDAY HOMEWORK (staff + superadmin) =============

@admin_router.get("/holiday-homework")
async def list_holiday_homework(admin: TokenData = Depends(require_permission("academics"))):
    items = await db.holiday_homework.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items

@admin_router.post("/holiday-homework")
async def create_holiday_homework(payload: Dict[str, Any] = Body(...), admin: TokenData = Depends(require_permission("academics"))):
    hw = HolidayHomework(**{k: v for k, v in payload.items() if k not in ("id", "_id")}).model_dump()
    await db.holiday_homework.insert_one(hw.copy())
    return {k: v for k, v in hw.items() if k != "_id"}

@admin_router.put("/holiday-homework/{item_id}")
async def update_holiday_homework(item_id: str, payload: Dict[str, Any] = Body(...), admin: TokenData = Depends(require_permission("academics"))):
    update = _sanitize_update(payload, HolidayHomework)
    await db.holiday_homework.update_one({"id": item_id}, {"$set": update})
    item = await db.holiday_homework.find_one({"id": item_id}, {"_id": 0})
    return item

@admin_router.delete("/holiday-homework/{item_id}")
async def delete_holiday_homework(item_id: str, admin: TokenData = Depends(require_permission("academics"))):
    await db.holiday_homework.delete_one({"id": item_id})
    return {"deleted": item_id}


# ============= KHELO PATNA GALLERY =============

@admin_router.get("/khelo-patna-gallery")
async def list_khelo_patna_gallery(admin: TokenData = Depends(require_permission("khelo-patna-gallery"))):
    items = await db.khelo_patna_gallery.find({}, {"_id": 0}).sort("order", 1).to_list(200)
    return items

@admin_router.post("/khelo-patna-gallery")
async def create_khelo_patna_photo(payload: Dict[str, Any] = Body(...), admin: TokenData = Depends(require_permission("khelo-patna-gallery"))):
    if not payload.get("image_url"):
        raise HTTPException(status_code=400, detail="image_url required")
    item = KheloPatnaPhoto(image_url=payload["image_url"], caption=payload.get("caption",""), order=int(payload.get("order",0))).model_dump()
    await db.khelo_patna_gallery.insert_one(item.copy())
    return {k:v for k,v in item.items() if k!="_id"}

@admin_router.put("/khelo-patna-gallery/{item_id}")
async def update_khelo_patna_photo(item_id: str, payload: Dict[str, Any] = Body(...), admin: TokenData = Depends(require_permission("khelo-patna-gallery"))):
    update = _sanitize_update(payload, KheloPatnaPhoto)
    await db.khelo_patna_gallery.update_one({"id": item_id}, {"$set": update})
    return await db.khelo_patna_gallery.find_one({"id": item_id}, {"_id": 0})

@admin_router.delete("/khelo-patna-gallery/{item_id}")
async def delete_khelo_patna_photo(item_id: str, admin: TokenData = Depends(require_permission("khelo-patna-gallery"))):
    await db.khelo_patna_gallery.delete_one({"id": item_id})
    return {"deleted": item_id}


# ============= LINK SHORTENER =============

class ShortenerMetadataParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = ""
        self.description = ""
        self.image = ""
        self.in_title = False

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if tag == "title":
            self.in_title = True
        elif tag == "meta":
            prop = attrs_dict.get("property", "").lower()
            name = attrs_dict.get("name", "").lower()
            content = attrs_dict.get("content", "")
            
            if prop == "og:title" or name == "twitter:title":
                self.title = content
            elif prop == "og:description" or name == "description" or name == "twitter:description":
                self.description = content
            elif prop == "og:image" or name == "twitter:image":
                self.image = content

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title and not self.title:
            self.title = data.strip()

def get_yt_video_id(url):
    import re
    try:
        match = re.search(r'(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})', url)
        if match:
            return match.group(1)
    except Exception:
        pass
    return None
def get_social_branding(url: str, title: str = "", description: str = "", image: str = ""):
    lower_url = url.lower()
    out_title = title or url
    out_desc = description
    out_img = image

    is_raw_title = not title or title == url or url.startswith(title)
    
    if is_raw_title or not out_img:
        if "instagram.com" in lower_url:
            if is_raw_title:
                out_title = "Instagram Reel" if "/reel/" in lower_url else "Instagram Post"
            if not out_desc:
                out_desc = "Open this link to view photos, videos, and reels on Instagram."
            if not out_img:
                out_img = "https://cdn-icons-png.flaticon.com/512/174/174855.png"
        elif "facebook.com" in lower_url or "fb.watch" in lower_url:
            if is_raw_title:
                out_title = "Facebook Video" if ("/watch" in lower_url or "/videos" in lower_url) else "Facebook Post"
            if not out_desc:
                out_desc = "Connect with friends, family and other people you know on Facebook."
            if not out_img:
                out_img = "https://cdn-icons-png.flaticon.com/512/124/124010.png"
        elif "x.com" in lower_url or "twitter.com" in lower_url:
            if is_raw_title:
                out_title = "X / Twitter Post"
            if not out_desc:
                out_desc = "View updates, threads, and media on X."
            if not out_img:
                out_img = "https://cdn-icons-png.flaticon.com/512/5969/5969020.png"
        elif "drive.google.com" in lower_url:
            if is_raw_title:
                out_title = "Google Drive File"
            if not out_desc:
                out_desc = "Access files, documents, and shared folders securely on Google Drive."
            if not out_img:
                out_img = "https://cdn-icons-png.flaticon.com/512/281/281752.png"
        elif "docs.google.com" in lower_url:
            if is_raw_title:
                out_title = "Google Docs Document"
            if not out_desc:
                out_desc = "View and edit shared documents online on Google Docs."
            if not out_img:
                out_img = "https://cdn-icons-png.flaticon.com/512/281/281760.png"

    return {
        "title": out_title,
        "description": out_desc,
        "image": out_img,
        "url": url,
        "is_youtube": False
    }

@admin_router.get("/shortener/preview")
async def get_url_preview(url: str, admin: TokenData = Depends(require_permission("site-settings"))):
    url_stripped = url.strip()
    if not url_stripped:
        return {"title": "", "description": "", "image": "", "is_youtube": False}
    
    yt_id = get_yt_video_id(url_stripped)
    if yt_id:
        title = "YouTube Video"
        thumbnail = f"https://img.youtube.com/vi/{yt_id}/mqdefault.jpg"
        desc = ""
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(f"https://www.youtube.com/oembed?url={urllib.parse.quote(url_stripped)}&format=json")
                if res.status_code == 200:
                    d = res.json()
                    title = d.get("title", title)
                    desc = d.get("author_name", "")
        except Exception as e:
            logger.error(f"YouTube oembed fail: {e}")
        return {
            "title": title,
            "description": desc,
            "image": thumbnail,
            "url": url_stripped,
            "is_youtube": True
        }

    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        async with httpx.AsyncClient(timeout=4.0, follow_redirects=True) as client:
            res = await client.get(url_stripped, headers=headers)
            if res.status_code == 200:
                parser = ShortenerMetadataParser()
                parser.feed(res.text)
                return get_social_branding(
                    url_stripped,
                    parser.title,
                    parser.description,
                    parser.image
                )
    except Exception as e:
        logger.error(f"Metadata parser fetch fail: {e}")
        
    return get_social_branding(url_stripped)

@admin_router.get("/shortener")
async def list_short_links(admin: TokenData = Depends(require_permission("site-settings"))):
    items = await db.short_links.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items


@admin_router.post("/shortener")
async def create_short_link(payload: ShortLinkCreate, admin: TokenData = Depends(require_permission("site-settings"))):
    title_val = payload.title.strip()
    url_val = payload.url.strip()
    
    if payload.bypass_ads:
        url_lower = url_val.lower()
        is_yt = "youtube.com" in url_lower or "youtu.be" in url_lower
        if is_yt and not ("t=" in url_lower or "time_continue=" in url_lower):
            if "?" in url_val:
                url_val = f"{url_val}&t=1"
            else:
                url_val = f"{url_val}?t=1"
                
    if not title_val or not url_val:
        raise HTTPException(status_code=400, detail="Title and URL cannot be empty")
    if len(title_val) > 100:
        raise HTTPException(status_code=400, detail="Title must be 100 characters or less")
    if len(url_val) > 2048:
        raise HTTPException(status_code=400, detail="URL must be 2048 characters or less")
        
    url_lower = url_val.lower()
    if not (url_lower.startswith("http://") or url_lower.startswith("https://")):
        raise HTTPException(status_code=400, detail="URL must start with http:// or https://")

    code = None
    if payload.custom_code:
        custom_code_val = payload.custom_code.strip()
        if len(custom_code_val) > 30:
            raise HTTPException(status_code=400, detail="Custom code must be 30 characters or less")
            
        # Sanitize code (alphanumeric and lowercase only)
        code = "".join(c for c in custom_code_val.lower() if c.isalnum())
        if not code:
            raise HTTPException(status_code=400, detail="Invalid custom code alias")
            
        existing = await db.short_links.find_one({"code": code})
        if existing:
            raise HTTPException(status_code=400, detail="Custom short code is already in use")
    else:
        import random
        import string
        chars = string.ascii_lowercase + string.digits
        for _ in range(20):
            test_code = "".join(random.choice(chars) for _ in range(6))
            existing = await db.short_links.find_one({"code": test_code})
            if not existing:
                code = test_code
                break
        if not code:
            raise HTTPException(status_code=500, detail="Could not generate unique short code")

    link = ShortLink(
        code=code,
        title=title_val,
        url=url_val,
        description=payload.description or "",
        image=payload.image or "",
        created_by=admin.email
    )
    await db.short_links.insert_one(link.model_dump())
    return link


@admin_router.delete("/shortener/{item_id}")
async def delete_short_link(item_id: str, admin: TokenData = Depends(require_permission("site-settings"))):
    link = await db.short_links.find_one({"id": item_id}, {"_id": 0})
    if not link:
        raise HTTPException(status_code=404, detail="Short link not found")
        
    code = link["code"]
    await db.short_links.delete_one({"id": item_id})
    await db.short_link_clicks.delete_many({"link_code": code})
    return {"deleted": item_id}


@admin_router.get("/shortener/{item_id}/analytics")
async def get_short_link_analytics(item_id: str, admin: TokenData = Depends(require_permission("site-settings"))):
    link = await db.short_links.find_one({"id": item_id}, {"_id": 0})
    if not link:
        raise HTTPException(status_code=404, detail="Short link not found")
        
    code = link["code"]
    
    # 1. Device Split
    cursor = db.short_link_clicks.aggregate([
        {"$match": {"link_code": code}},
        {"$group": {"_id": "$device", "count": {"$sum": 1}}}
    ])
    devices = [{"name": item["_id"], "value": item["count"]} for item in await cursor.to_list(100)]
    
    # 2. OS Split
    cursor = db.short_link_clicks.aggregate([
        {"$match": {"link_code": code}},
        {"$group": {"_id": "$os", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ])
    oss = [{"name": item["_id"], "value": item["count"]} for item in await cursor.to_list(100)]
    
    # 3. Browser Split
    cursor = db.short_link_clicks.aggregate([
        {"$match": {"link_code": code}},
        {"$group": {"_id": "$browser", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ])
    browsers = [{"name": item["_id"], "value": item["count"]} for item in await cursor.to_list(100)]
    
    # 4. Country Split
    cursor = db.short_link_clicks.aggregate([
        {"$match": {"link_code": code}},
        {"$group": {"_id": "$country", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ])
    countries = [{"name": item["_id"], "value": item["count"]} for item in await cursor.to_list(100)]
    
    # 5. Referrer Split
    cursor = db.short_link_clicks.aggregate([
        {"$match": {"link_code": code}},
        {"$group": {"_id": "$referrer", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ])
    referrers = [{"name": item["_id"], "value": item["count"]} for item in await cursor.to_list(100)]
    
    # 6. Daily Trend (last 30 days)
    # Get counts grouped by YYYY-MM-DD
    cursor = db.short_link_clicks.aggregate([
        {"$match": {"link_code": code}},
        {"$project": {"date": {"$substr": ["$timestamp", 0, 10]}}},
        {"$group": {"_id": "$date", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ])
    daily = [{"date": item["_id"], "clicks": item["count"]} for item in await cursor.to_list(1000)]
    
    return {
        "link": link,
        "devices": devices,
        "oss": oss,
        "browsers": browsers,
        "countries": countries,
        "referrers": referrers,
        "daily": daily
    }


# ============= LINKTREE CUSTOMIZER =============

@admin_router.get("/linktree/settings")
async def get_linktree_settings(admin: TokenData = Depends(require_permission("site-settings"))):
    settings = await db.linktree_settings.find_one({"id": "branding"}, {"_id": 0})
    if not settings:
        settings = LinktreeSettings().model_dump()
        
    site_settings = await db.site_settings.find_one({"id": "site"}, {"logo_url": 1})
    if site_settings and site_settings.get("logo_url"):
        settings["logo_url"] = site_settings["logo_url"]
        
    return settings


@admin_router.post("/linktree/settings")
async def save_linktree_settings(payload: LinktreeSettings, admin: TokenData = Depends(require_permission("site-settings"))):
    doc = payload.model_dump()
    doc["id"] = "branding"
    await db.linktree_settings.update_one(
        {"id": "branding"},
        {"$set": doc},
        upsert=True
    )
    
    # Also update site settings logo_url to keep them connected
    if payload.logo_url:
        await db.site_settings.update_one(
            {"id": "site"},
            {"$set": {"logo_url": payload.logo_url}},
            upsert=True
        )
        
    return doc


@admin_router.get("/linktree/links")
async def list_linktree_links(admin: TokenData = Depends(require_permission("site-settings"))):
    links = await db.linktree_links.find({}, {"_id": 0}).sort("order", 1).to_list(1000)
    return links


@admin_router.post("/linktree/links")
async def create_linktree_link(payload: LinktreeLink, admin: TokenData = Depends(require_permission("site-settings"))):
    # Calculate highest order index
    highest = 0
    cursor = db.linktree_links.find({}, {"order": 1}).sort("order", -1).limit(1)
    results = await cursor.to_list(1)
    if results:
        highest = results[0].get("order", 0)

    doc = payload.model_dump()
    doc["order"] = highest + 1
    await db.linktree_links.insert_one(doc)
    return {k:v for k,v in doc.items() if k!="_id"}


@admin_router.put("/linktree/links/{item_id}")
async def update_linktree_link(item_id: str, payload: Dict[str, Any] = Body(...), admin: TokenData = Depends(require_permission("site-settings"))):
    # Exclude _id to avoid modification error
    update = {k: v for k, v in payload.items() if k not in ["_id", "id"]}
    await db.linktree_links.update_one({"id": item_id}, {"$set": update})
    return await db.linktree_links.find_one({"id": item_id}, {"_id": 0})


@admin_router.delete("/linktree/links/{item_id}")
async def delete_linktree_link(item_id: str, admin: TokenData = Depends(require_permission("site-settings"))):
    await db.linktree_links.delete_one({"id": item_id})
    return {"deleted": item_id}


@admin_router.post("/linktree/links/reorder")
async def reorder_linktree_links(payload: List[str] = Body(...), admin: TokenData = Depends(require_permission("site-settings"))):
    # payload is list of IDs in order
    for idx, item_id in enumerate(payload):
        await db.linktree_links.update_one(
            {"id": item_id},
            {"$set": {"order": idx}}
        )
    return {"status": "reordered"}


@admin_router.get("/linktree/links/{link_id}/analytics")
async def get_linktree_link_analytics(link_id: str, admin: TokenData = Depends(require_permission("site-settings"))):
    link = await db.linktree_links.find_one({"id": link_id}, {"_id": 0})
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
        
    cursor = db.linktree_clicks.aggregate([
        {"$match": {"link_id": link_id}},
        {"$group": {"_id": "$device", "count": {"$sum": 1}}}
    ])
    devices = [{"name": item["_id"], "value": item["count"]} for item in await cursor.to_list(100)]
    
    cursor = db.linktree_clicks.aggregate([
        {"$match": {"link_id": link_id}},
        {"$group": {"_id": "$os", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ])
    oss = [{"name": item["_id"], "value": item["count"]} for item in await cursor.to_list(100)]
    
    cursor = db.linktree_clicks.aggregate([
        {"$match": {"link_id": link_id}},
        {"$group": {"_id": "$browser", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ])
    browsers = [{"name": item["_id"], "value": item["count"]} for item in await cursor.to_list(100)]
    
    cursor = db.linktree_clicks.aggregate([
        {"$match": {"link_id": link_id}},
        {"$group": {"_id": "$country", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ])
    countries = [{"name": item["_id"], "value": item["count"]} for item in await cursor.to_list(100)]
    
    cursor = db.linktree_clicks.aggregate([
        {"$match": {"link_id": link_id}},
        {"$group": {"_id": "$referrer", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ])
    referrers = [{"name": item["_id"], "value": item["count"]} for item in await cursor.to_list(100)]
    
    cursor = db.linktree_clicks.aggregate([
        {"$match": {"link_id": link_id}},
        {"$project": {"date": {"$substr": ["$timestamp", 0, 10]}}},
        {"$group": {"_id": "$date", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ])
    daily = [{"date": item["_id"], "clicks": item["count"]} for item in await cursor.to_list(1000)]
    
    return {
        "link": link,
        "devices": devices,
        "oss": oss,
        "browsers": browsers,
        "countries": countries,
        "referrers": referrers,
        "daily": daily
    }


@admin_router.get("/maps-reviews")
async def list_maps_reviews(admin: TokenData = Depends(require_permission("google-reviews"))):
    cursor = db.maps_reviews_used.find({}).sort("created_at", -1)
    docs = await cursor.to_list(length=1000)
    results = []
    for doc in docs:
        doc["id"] = str(doc["_id"])
        if "_id" in doc:
            del doc["_id"]
        results.append(doc)
    return results


@admin_router.get("/maps-reviews/stats")
async def maps_reviews_stats(admin: TokenData = Depends(require_permission("google-reviews"))):
    total = await db.maps_reviews_used.count_documents({})
    
    # Ratings aggregate
    ratings_pipeline = [
        {"$group": {"_id": "$rating", "count": {"$sum": 1}}}
    ]
    ratings_cursor = db.maps_reviews_used.aggregate(ratings_pipeline)
    ratings_res = await ratings_cursor.to_list(length=100)
    ratings = {str(r["_id"] or 5): r["count"] for r in ratings_res}
    
    # Devices aggregate
    devices_pipeline = [
        {"$group": {"_id": "$device", "count": {"$sum": 1}}}
    ]
    devices_cursor = db.maps_reviews_used.aggregate(devices_pipeline)
    devices_res = await devices_cursor.to_list(length=100)
    devices = {str(d["_id"] or "unknown"): d["count"] for d in devices_res}
    
    # OS aggregate
    os_pipeline = [
        {"$group": {"_id": "$os", "count": {"$sum": 1}}}
    ]
    os_cursor = db.maps_reviews_used.aggregate(os_pipeline)
    os_res = await os_cursor.to_list(length=100)
    oss = {str(o["_id"] or "unknown"): o["count"] for o in os_res}

    # Browser aggregate
    browser_pipeline = [
        {"$group": {"_id": "$browser", "count": {"$sum": 1}}}
    ]
    browser_cursor = db.maps_reviews_used.aggregate(browser_pipeline)
    browser_res = await browser_cursor.to_list(length=100)
    browsers = {str(b["_id"] or "unknown"): b["count"] for b in browser_res}
    
    # Top IPs
    ips_pipeline = [
        {"$group": {"_id": "$ip", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 15}
    ]
    ips_cursor = db.maps_reviews_used.aggregate(ips_pipeline)
    ips_res = await ips_cursor.to_list(length=15)
    top_ips = [{"ip": r["_id"] or "unknown", "count": r["count"]} for r in ips_res]
    
    return {
        "total": total,
        "ratings": ratings,
        "devices": devices,
        "oss": oss,
        "browsers": browsers,
        "top_ips": top_ips
    }


# ---- APAAR ID Data Manager ----
@admin_router.get("/apaar/submissions")
async def get_apaar_submissions(
    search: Optional[str] = None,
    class_name: Optional[str] = None,
    admin: TokenData = Depends(require_permission("site-settings"))
):
    query = {}
    if search:
        import re
        escaped_search = re.escape(search)
        query["$or"] = [
            {"admission_no": {"$regex": escaped_search, "$options": "i"}},
            {"student_name": {"$regex": escaped_search, "$options": "i"}},
            {"student_aadhaar_name": {"$regex": escaped_search, "$options": "i"}}
        ]
    if class_name:
        import re
        escaped_class = re.escape(class_name)
        query["class_name"] = {"$regex": rf"(?<!\bKG)(?<!\bK\.G\.)(?<!\bKG\s)(?<!\bKG-)(?<!\bK\.G\.-)(?<!\bK\.G\.\s)(?:\b|[^a-zA-Z]){escaped_class}(?:\b|[^a-zA-Z])", "$options": "i"}
        
    submissions = await db.apaar_submissions.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Backfill missing class/sec from roster dynamically
    for sub in submissions:
        if not sub.get("class_name") or not sub.get("section"):
            roster_student = await db.apaar_roster.find_one({"admission_no": sub["admission_no"]}, {"class_name": 1, "section": 1, "_id": 0})
            if roster_student:
                c_name = roster_student.get("class_name") or ""
                sec = roster_student.get("section") or ""
                sub["class_name"] = c_name
                sub["section"] = sec
                await db.apaar_submissions.update_one(
                    {"admission_no": sub["admission_no"]},
                    {"$set": {"class_name": c_name, "section": sec}}
                )
                
    return submissions


@admin_router.delete("/apaar/submissions/{id}")
async def delete_apaar_submission(id: str, admin: TokenData = Depends(require_permission("site-settings"))):
    res = await db.apaar_submissions.delete_one({"id": id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Submission not found")
    return {"status": "success", "message": "Submission deleted successfully"}


@admin_router.post("/apaar/submissions/{id}/reject")
async def reject_apaar_submission(
    id: str,
    payload: Dict[str, str] = Body(...),
    admin: TokenData = Depends(require_permission("site-settings"))
):
    remarks = payload.get("remarks", "")
    if not remarks:
        raise HTTPException(status_code=400, detail="Remarks/reason is required for rejection.")
        
    sub = await db.apaar_submissions.find_one({"id": id})
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
        
    admission_no = sub["admission_no"]
    student_name = sub["student_name"]
    mobile_no = sub.get("mobile_no", "")
    
    prompt = f"""
Write a highly professional, polite, and formal notification from the S.D. Public School (SDPS) Patna Administration to parents.
The student "{student_name}" (Admission No: {admission_no}) has a correction required in their APAAR ID consent form submission.

Reason for rejection / Action needed: {remarks}

Provide the parent with their direct resubmission link: https://sdpublic.org/apaar?adm={admission_no}

IMPORTANT formatting rules:
- Format the response specifically as a WhatsApp message.
- Use simple emojis if helpful, but maintain a formal, clear, and respectful tone.
- Do NOT use markdown headings or bullet formatting that looks bad in WhatsApp. Use *bold* for emphasis where appropriate in WhatsApp syntax.
- Ensure it includes the link.
- Only return the final message text to send. Do not write any pre-amble or explanations.
"""
    
    groq_key = os.environ.get("GROQ_API_KEY", "")
    gemini_key = os.environ.get("GEMINI_API_KEY", "")
    
    msg_text = ""
    if groq_key:
        try:
            import httpx
            headers = {
                "Authorization": f"Bearer {groq_key}",
                "Content-Type": "application/json"
            }
            body = {
                "model": os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile"),
                "messages": [
                    {"role": "system", "content": "You are a professional school administrator. Write formal, concise WhatsApp notifications to parents."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.3
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post("https://api.groq.com/openai/v1/chat/completions", json=body, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    msg_text = data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            print("Groq message generation failed:", e)
            
    if not msg_text and gemini_key:
        try:
            import httpx
            model = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={gemini_key}"
            body = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.3}
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=body)
                if res.status_code == 200:
                    data = res.json()
                    msg_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
        except Exception as e:
            print("Gemini message generation failed:", e)
            
    if not msg_text:
        msg_text = f"""*S.D. PUBLIC SCHOOL, PATNA*
*Notice: APAAR Registration Correction Required*

Dear Parent,

We have reviewed the APAAR ID Consent & Registration details submitted for your child, *{student_name}* (Admission No: *{admission_no}*).

There is a correction required in the submitted information:
{remarks}

Please re-submit the correct details using the link below:
👉 https://sdpublic.org/apaar?adm={admission_no}

For any queries, please message us on WhatsApp.

Regards,
*Administration*
*S.D. Public School, Patna*"""

    # Delete submission from database to allow re-submission
    await db.apaar_submissions.delete_one({"id": id})
    
    phone = mobile_no.strip()
    if len(phone) == 10 and phone.isdigit():
        phone = f"91{phone}"
        
    from whatsapp_service import send_whatsapp_text
    auto_sent = False
    if phone:
        wa_res = await send_whatsapp_text(phone, msg_text)
        auto_sent = wa_res.get("success", False)
        
    return {
        "status": "success",
        "message": "Submission rejected and deleted successfully.",
        "whatsapp_message": msg_text,
        "mobile_no": phone,
        "auto_sent": auto_sent
    }


@admin_router.get("/apaar/roster")
async def get_apaar_roster(
    search: Optional[str] = None,
    class_name: Optional[str] = None,
    admin: TokenData = Depends(require_permission("site-settings"))
):
    query = {}
    if search:
        import re
        escaped_search = re.escape(search)
        query["$or"] = [
            {"admission_no": {"$regex": escaped_search, "$options": "i"}},
            {"student_name": {"$regex": escaped_search, "$options": "i"}},
            {"father_name": {"$regex": escaped_search, "$options": "i"}}
        ]
    if class_name:
        import re
        escaped_class = re.escape(class_name)
        query["class_name"] = {"$regex": rf"(?<!\bKG)(?<!\bK\.G\.)(?<!\bKG\s)(?<!\bKG-)(?<!\bK\.G\.-)(?<!\bK\.G\.\s)(?:\b|[^a-zA-Z]){escaped_class}(?:\b|[^a-zA-Z])", "$options": "i"}
    students = await db.apaar_roster.find(query, {"_id": 0}).sort("admission_no", 1).to_list(2000)
    return students


@admin_router.post("/apaar/roster/bulk")
async def upload_apaar_roster(
    payload: List[Dict[str, str]] = Body(...),
    admin: TokenData = Depends(require_permission("site-settings"))
):
    if not payload:
        raise HTTPException(status_code=400, detail="Empty payload")
        
    from pymongo import UpdateOne
    operations = []
    for item in payload:
        adm = item.get("admission_no")
        name = item.get("student_name")
        f_name = item.get("father_name")
        c_name = item.get("class_name")
        sec = item.get("section")
        if not adm or not name:
            continue
            
        operations.append(
            UpdateOne(
                {"admission_no": adm.strip()},
                {
                    "$set": {
                        "id": item.get("id") or new_id(),
                        "admission_no": adm.strip(),
                        "student_name": name.strip(),
                        "father_name": (f_name or "").strip(),
                        "class_name": (c_name or "").strip(),
                        "section": (sec or "").strip(),
                        "created_at": now_iso()
                    }
                },
                upsert=True
            )
        )
        
    if operations:
        await db.apaar_roster.bulk_write(operations)
        
    return {"status": "success", "message": f"Successfully processed {len(operations)} roster records."}


@admin_router.delete("/apaar/roster/clear")
async def clear_apaar_roster(admin: TokenData = Depends(require_permission("site-settings"))):
    await db.apaar_roster.delete_many({})
    return {"status": "success", "message": "APAAR school roster cleared successfully."}


# ─────────────────────────────────────────────────────────────────────────────
# OMR AUTOMATED ROSTER & EVALUATION MANAGEMENT
# ─────────────────────────────────────────────────────────────────────────────
@admin_router.post("/omr/upload-roster")
async def upload_omr_roster(
    file: UploadFile = File(...),
    admin: TokenData = Depends(require_permission("site-settings"))
):
    """Upload Excel/CSV file containing student details for pre-printed OMR sheets."""
    contents = await file.read()
    filename = file.filename.lower()
    
    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")
        
    # Standardize column headers
    df.columns = [str(col).strip().lower().replace(" ", "_").replace(".", "").replace("'", "") for col in df.columns]
    
    def clean_val(val):
        if pd.isna(val):
            return ""
        s = str(val).strip()
        if s.endswith(".0"):
            s = s[:-2]
        if s.lower() == "nan":
            return ""
        return s

    records = []
    from pymongo import UpdateOne
    operations = []
    
    for _, row in df.iterrows():
        name = clean_val(row.get("student_name") or row.get("name") or row.get("candidate_name"))
        f_name = clean_val(row.get("father_name") or row.get("fathers_name"))
        c_name = clean_val(row.get("class") or row.get("class_name"))
        sec = clean_val(row.get("section"))
        roll = clean_val(row.get("roll_no") or row.get("roll") or row.get("roll_number"))
        adm = clean_val(row.get("admn_no") or row.get("admission_no") or row.get("adm_no") or row.get("reg_no") or row.get("id"))
        
        if not name:
            continue
            
        if not adm:
            adm = f"{c_name}-{sec}-{roll}" if (c_name and roll) else f"SDPS-{new_id()[:6].upper()}"
            
        doc = {
            "id": adm,
            "admission_no": adm,
            "student_name": name,
            "father_name": f_name,
            "class_name": c_name,
            "section": sec,
            "roll_no": roll,
            "updated_at": now_iso()
        }
        
        operations.append(
            UpdateOne(
                {"admission_no": adm},
                {"$set": doc},
                upsert=True
            )
        )
        
    if operations:
        await db.omr_roster.bulk_write(operations)
        
    return {
        "status": "success",
        "message": f"Successfully imported {len(operations)} student records for OMR generation.",
        "count": len(operations)
    }


@admin_router.get("/omr/roster")
async def get_omr_roster(
    class_name: Optional[str] = None,
    section: Optional[str] = None,
    search: Optional[str] = "",
    page: int = 1,
    limit: int = 0,
    source: Optional[str] = "all",
    admin: TokenData = Depends(require_permission("site-settings"))
):
    """
    Fetch student roster from OMR roster.
    Supports filtering by Class Name, Section, and Search.
    Also returns available classes and sections for UI selection.
    If limit > 0, returns paginated results.
    """
    ROMAN_TO_ARABIC = {
        "I": "1", "II": "2", "III": "3", "IV": "4", "V": "5",
        "VI": "6", "VII": "7", "VIII": "8", "IX": "9", "X": "10",
        "XI": "11", "XII": "12"
    }
    ARABIC_TO_ROMAN = {v: k for k, v in ROMAN_TO_ARABIC.items()}

    def clean_class_name(c_str: str) -> str:
        s = str(c_str).strip()
        clean = re.sub(r'^(CLASS|STD|STANDARD)[\s\-]*', '', s, flags=re.I).strip()
        clean_nodash = re.sub(r'[\-\s]', '', clean).upper()
        if clean_nodash in ROMAN_TO_ARABIC:
            return f"Class {clean_nodash}"
        if clean_nodash in ARABIC_TO_ROMAN:
            return f"Class {ARABIC_TO_ROMAN[clean_nodash]}"
        if clean_nodash in ("NURSERY", "NUR"):
            return "Class Nursery"
        if clean_nodash in ("LKG", "KGI", "KG1"):
            return "Class LKG"
        if clean_nodash in ("UKG", "KGII", "KG2"):
            return "Class UKG"
        if clean:
            return f"Class {clean.title()}"
        return s

    raw_classes = set()
    available_sections_set = set()

    try:
        for field in ("class_name", "class"):
            distinct_vals = await db.omr_roster.distinct(field)
            for val in distinct_vals:
                if val and str(val).strip():
                    raw_classes.add(clean_class_name(str(val)))

        raw_s = await db.omr_roster.distinct("section")
        for s in raw_s:
            if s and str(s).strip(): available_sections_set.add(str(s).strip().upper())
        raw_s2 = await db.omr_roster.distinct("sec")
        for s in raw_s2:
            if s and str(s).strip(): available_sections_set.add(str(s).strip().upper())
    except Exception as e:
        logger.error(f"Error querying distinct classes/sections: {e}", exc_info=True)

    CLASS_ORDER = ["Class Nursery", "Class LKG", "Class UKG", "Class I", "Class II", "Class III", "Class IV", "Class V", "Class VI", "Class VII", "Class VIII", "Class IX", "Class X", "Class XI", "Class XII"]
    def class_sort_key(c):
        if c in CLASS_ORDER:
            return (0, CLASS_ORDER.index(c))
        return (1, c)

    available_classes = sorted(list(raw_classes), key=class_sort_key)
    available_sections = sorted(list(available_sections_set))

    query_parts = []
    
    if search and search.strip():
        search_escaped = re.escape(search.strip())
        query_parts.append({
            "$or": [
                {"student_name": {"$regex": search_escaped, "$options": "i"}},
                {"name": {"$regex": search_escaped, "$options": "i"}},
                {"admission_no": {"$regex": search_escaped, "$options": "i"}},
                {"roll_no": {"$regex": search_escaped, "$options": "i"}},
                {"father_name": {"$regex": search_escaped, "$options": "i"}}
            ]
        })
        
    if class_name and class_name.strip() and class_name.upper() != "ALL":
        raw_c = class_name.strip().upper()
        clean_c = re.sub(r'^(CLASS|STD|STANDARD)\s*[\-\s]*', '', raw_c, flags=re.I).strip()
        clean_c_no_dash = re.sub(r'[\-\s]', '', clean_c)
        variants = {raw_c}
        if clean_c:
            variants.add(clean_c)
            variants.add(f"CLASS {clean_c}")
            variants.add(f"CLASS-{clean_c}")
            variants.add(f"STD {clean_c}")
            variants.add(f"STD-{clean_c}")
            if clean_c_no_dash in ROMAN_TO_ARABIC:
                ar = ROMAN_TO_ARABIC[clean_c_no_dash]
                variants.update({ar, f"CLASS {ar}", f"CLASS-{ar}", f"STD {ar}", f"STD-{ar}"})
            elif clean_c_no_dash in ARABIC_TO_ROMAN:
                rm = ARABIC_TO_ROMAN[clean_c_no_dash]
                variants.update({rm, f"CLASS {rm}", f"CLASS-{rm}", f"STD {rm}", f"STD-{rm}"})
        
        class_fields = ["class_name", "class", "student_class", "std", "standard", "grade", "cls"]
        cls_conditions = []
        for var in variants:
            escaped = re.escape(var)
            for field in class_fields:
                cls_conditions.append({field: {"$regex": f"^{escaped}$", "$options": "i"}})
                cls_conditions.append({field: {"$regex": f"^CLASS\\s*[\-\s]*{escaped}$", "$options": "i"}})
                cls_conditions.append({field: {"$regex": f"^STD\\s*[\-\s]*{escaped}$", "$options": "i"}})
        query_parts.append({"$or": cls_conditions})
        
    if section and section.strip() and section.upper() != "ALL":
        raw_s = section.strip().upper()
        clean_s = re.sub(r'^(SECTION|SEC)\s*[\-\s]*', '', raw_s, flags=re.I).strip()
        sec_vars = {raw_s}
        if clean_s:
            sec_vars.update({clean_s, f"SECTION {clean_s}", f"SEC {clean_s}", f"SEC-{clean_s}"})
            
        sec_fields = ["section", "sec", "section_name"]
        sec_conditions = []
        for svar in sec_vars:
            escaped_s = re.escape(svar)
            for sfield in sec_fields:
                sec_conditions.append({sfield: {"$regex": f"^{escaped_s}$", "$options": "i"}})
                sec_conditions.append({sfield: {"$regex": f"^SEC(TION)?\\s*[\-\s]*{escaped_s}$", "$options": "i"}})
        query_parts.append({"$or": sec_conditions})
        
    query = {}
    if len(query_parts) == 1:
        query = query_parts[0]
    elif len(query_parts) > 1:
        query["$and"] = query_parts

    if limit > 0:
        total = await db.omr_roster.count_documents(query)
        pages = math.ceil(total / limit) if total > 0 else 1
        skip_val = (page - 1) * limit
        cursor = db.omr_roster.find(query).skip(skip_val).limit(limit)
        students_list = await cursor.to_list(limit)
        
        serialized = []
        for doc in students_list:
            serialized.append({
                "id": doc.get("id") or str(doc.get("_id", "")),
                "student_name": doc.get("student_name") or doc.get("name") or "",
                "roll_no": doc.get("roll_no") or doc.get("roll") or "",
                "class_name": doc.get("class_name") or doc.get("class") or "",
                "section": doc.get("section") or doc.get("sec") or "",
                "admission_no": doc.get("admission_no") or doc.get("admn_no") or "",
                "father_name": doc.get("father_name") or doc.get("fathers_name") or "",
                "source": "omr"
            })
            
        return {
            "status": "success",
            "students": serialized,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": pages,
            "available_classes": available_classes,
            "available_sections": available_sections
        }
    else:
        omr_docs = []
        if class_name and class_name.strip():
            omr_docs = await db.omr_roster.find(query).to_list(length=5000)

            if not omr_docs:
                all_omr = await db.omr_roster.find({}).to_list(length=5000)
                target_c = (class_name or "").strip().upper()
                clean_target_c = re.sub(r'^(CLASS|STD|STANDARD)\s*[\-\s]*', '', target_c, flags=re.I).strip()
                clean_target_c_nodash = re.sub(r'[\-\s]', '', clean_target_c)
                target_ar = ROMAN_TO_ARABIC.get(clean_target_c_nodash, clean_target_c_nodash)
                target_rm = ARABIC_TO_ROMAN.get(clean_target_c_nodash, clean_target_c_nodash)

                def matches_student(doc):
                    if not target_c or target_c == "ALL":
                        return True
                    s_class = str(doc.get("class_name") or doc.get("class") or doc.get("student_class") or doc.get("standard") or "").strip().upper()
                    if not s_class:
                        return True
                    s_clean = re.sub(r'^(CLASS|STD|STANDARD)\s*[\-\s]*', '', s_class, flags=re.I).strip()
                    s_clean_nodash = re.sub(r'[\-\s]', '', s_clean)
                    s_ar = ROMAN_TO_ARABIC.get(s_clean_nodash, s_clean_nodash)
                    s_rm = ARABIC_TO_ROMAN.get(s_clean_nodash, s_clean_nodash)

                    return (clean_target_c_nodash in (s_clean_nodash, s_ar, s_rm) or
                            target_ar in (s_clean_nodash, s_ar, s_rm) or
                            target_rm in (s_clean_nodash, s_ar, s_rm) or
                            target_c in s_class or s_class in target_c)

                for d in all_omr:
                    if matches_student(d): omr_docs.append(d)

        seen_adm = set()
        unified_students = []

        def process_doc(doc):
            name = str(doc.get("student_name") or doc.get("name") or doc.get("candidate_name") or "").strip()
            if not name:
                return
            roll = str(doc.get("roll_no") or doc.get("roll") or doc.get("roll_number") or "").strip()
            c_name = str(doc.get("class_name") or doc.get("class") or "").strip()
            sec = str(doc.get("section") or doc.get("sec") or "").strip()
            adm = str(doc.get("admission_no") or doc.get("admn_no") or doc.get("id") or "").strip()
            f_name = str(doc.get("father_name") or doc.get("fathers_name") or "").strip()
            
            dedup_key = f"{adm.upper()}_{c_name.upper()}_{roll}" if adm else f"{name.upper()}_{c_name.upper()}_{roll}"
            if dedup_key in seen_adm:
                return
            seen_adm.add(dedup_key)

            unified_students.append({
                "id": doc.get("id") or str(doc.get("_id", "")),
                "student_name": name,
                "roll_no": roll,
                "class_name": c_name,
                "section": sec,
                "admission_no": adm,
                "father_name": f_name,
                "source": "omr"
            })

        for d in omr_docs:
            process_doc(d)

        def sort_key(s):
            roll_num = 999999
            if s["roll_no"].isdigit():
                roll_num = int(s["roll_no"])
            return (s["class_name"], s["section"], roll_num, s["student_name"])

        unified_students.sort(key=sort_key)

        return {
            "status": "success",
            "students": unified_students,
            "count": len(unified_students),
            "available_classes": available_classes,
            "available_sections": available_sections
        }


class OmrStudentSchema(BaseModel):
    admission_no: str
    student_name: str
    roll_no: str
    class_name: str
    section: str
    father_name: Optional[str] = ""


@admin_router.post("/omr/students")
async def add_omr_student(
    student: OmrStudentSchema,
    admin: TokenData = Depends(require_permission("site-settings"))
):
    adm = student.admission_no.strip()
    if not adm:
        raise HTTPException(status_code=400, detail="Admission No is required.")
        
    existing = await db.omr_roster.find_one({"admission_no": adm})
    if existing:
        raise HTTPException(status_code=400, detail="A student with this Admission No already exists.")
        
    doc = {
        "id": adm,
        "admission_no": adm,
        "student_name": student.student_name.strip(),
        "father_name": student.father_name.strip(),
        "class_name": student.class_name.strip(),
        "section": student.section.strip(),
        "roll_no": student.roll_no.strip(),
        "updated_at": now_iso()
    }
    await db.omr_roster.insert_one(doc)
    return {"status": "success", "message": "Student added successfully to OMR roster."}


@admin_router.put("/omr/students/{student_id}")
async def update_omr_student(
    student_id: str,
    student: OmrStudentSchema,
    admin: TokenData = Depends(require_permission("site-settings"))
):
    adm = student.admission_no.strip()
    if not adm:
        raise HTTPException(status_code=400, detail="Admission No is required.")
        
    from bson import ObjectId
    query = {"$or": [{"admission_no": student_id}, {"id": student_id}]}
    try:
        if ObjectId.is_valid(student_id):
            query["$or"].append({"_id": ObjectId(student_id)})
    except Exception:
        pass
        
    existing = await db.omr_roster.find_one(query)
    if not existing:
        raise HTTPException(status_code=404, detail="Student record not found.")
        
    if adm != existing.get("admission_no"):
        clash = await db.omr_roster.find_one({"admission_no": adm})
        if clash:
            raise HTTPException(status_code=400, detail="Another student with this Admission No already exists.")

    doc = {
        "admission_no": adm,
        "student_name": student.student_name.strip(),
        "father_name": student.father_name.strip(),
        "class_name": student.class_name.strip(),
        "section": student.section.strip(),
        "roll_no": student.roll_no.strip(),
        "updated_at": now_iso()
    }
    await db.omr_roster.update_one({"_id": existing["_id"]}, {"$set": doc})
    return {"status": "success", "message": "Student updated successfully in OMR roster."}


@admin_router.delete("/omr/students/{student_id}")
async def delete_omr_student(
    student_id: str,
    admin: TokenData = Depends(require_permission("site-settings"))
):
    from bson import ObjectId
    query = {"$or": [{"admission_no": student_id}, {"id": student_id}]}
    try:
        if ObjectId.is_valid(student_id):
            query["$or"].append({"_id": ObjectId(student_id)})
    except Exception:
        pass
        
    res = await db.omr_roster.delete_one(query)
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Student record not found.")
    return {"status": "success", "message": "Student record deleted from OMR roster."}



@admin_router.delete("/omr/roster/clear")
async def clear_omr_roster(admin: TokenData = Depends(require_permission("site-settings"))):
    await db.omr_roster.delete_many({})
    return {"status": "success", "message": "OMR student roster cleared."}


@admin_router.post("/omr/booklets/save")
async def save_omr_booklets(
    payload: Dict[str, Any] = Body(...),
    admin: TokenData = Depends(require_permission("site-settings"))
):
    """Save booklet mapping (Booklet Serial No / Barcode <-> Student, Subject & Exam Details) for automated evaluation."""
    booklets = payload.get("booklets", [])
    if not booklets:
        return {"status": "success", "count": 0}
        
    from pymongo import UpdateOne
    operations = []
    for b in booklets:
        booklet_no = str(b.get("booklet_no") or "").strip()
        barcode = str(b.get("barcode") or booklet_no).strip()
        exam_title = str(b.get("exam_title") or "").strip()
        subject_name = str(b.get("subject_name") or "").strip()
        if not booklet_no:
            continue
        doc = {
            "booklet_no": booklet_no,
            "barcode": barcode,
            "roll_no": str(b.get("roll_no") or "").strip(),
            "student_name": str(b.get("student_name") or "").strip(),
            "class_name": str(b.get("class_name") or "").strip(),
            "section": str(b.get("section") or "").strip(),
            "admission_no": str(b.get("admission_no") or "").strip(),
            "father_name": str(b.get("father_name") or "").strip(),
            "subject_name": subject_name,
            "exam_title": exam_title,
            "session": str(b.get("session") or "").strip(),
            "updated_at": now_iso()
        }
        operations.append(
            UpdateOne(
                {"booklet_no": booklet_no, "exam_title": exam_title, "subject_name": subject_name},
                {"$set": doc},
                upsert=True
            )
        )
        
    if operations:
        await db.omr_booklets.bulk_write(operations)
        
    return {"status": "success", "message": f"Saved {len(operations)} booklet barcode mappings.", "count": len(operations)}


@admin_router.get("/omr/booklets")
async def list_omr_booklets(
    exam_title: Optional[str] = None,
    subject_name: Optional[str] = None,
    class_name: Optional[str] = None,
    search: Optional[str] = None,
    admin: TokenData = Depends(require_permission("site-settings"))
):
    """List or search all stored barcode & booklet assignments."""
    query = {}
    if exam_title:
        query["exam_title"] = exam_title
    if subject_name:
        query["subject_name"] = subject_name
    if class_name:
        query["class_name"] = class_name
    if search:
        query["$or"] = [
            {"booklet_no": {"$regex": search, "$options": "i"}},
            {"barcode": {"$regex": search, "$options": "i"}},
            {"student_name": {"$regex": search, "$options": "i"}},
            {"roll_no": {"$regex": search, "$options": "i"}},
            {"admission_no": {"$regex": search, "$options": "i"}}
        ]
        
    records = await db.omr_booklets.find(query).sort([("class_name", 1), ("roll_no", 1)]).to_list(length=5000)
    for r in records:
        r["_id"] = str(r.get("_id", ""))
    return {"status": "success", "booklets": records, "count": len(records)}


@admin_router.delete("/omr/booklets/clear")
async def clear_omr_booklets(admin: TokenData = Depends(require_permission("site-settings"))):
    """Clear all stored OMR barcode booklet mappings from the database."""
    res = await db.omr_booklets.delete_many({})
    return {"status": "success", "message": f"Cleared {res.deleted_count} stored booklet barcode mappings.", "count": res.deleted_count}


@admin_router.get("/omr/booklets/next-serial")
async def get_next_booklet_serial(
    prefix: str = "SDP-",
    admin: TokenData = Depends(require_permission("site-settings"))
):
    """Find highest numeric booklet suffix in database across all records so serial numbers NEVER collide or re-use 1001."""
    clean_prefix = (prefix or "").strip()
    records = await db.omr_booklets.find({}).to_list(length=50000)
    
    max_num_all = 1000
    max_num_prefix = 1000
    
    for r in records:
        b_no = str(r.get("booklet_no", "")).strip()
        match = re.search(r"(\d+)$", b_no)
        if match:
            try:
                num = int(match.group(1), 10)
                if num > max_num_all:
                    max_num_all = num
                if clean_prefix and (b_no.startswith(clean_prefix) or clean_prefix in b_no):
                    if num > max_num_prefix:
                        max_num_prefix = num
            except ValueError:
                pass
                
    highest = max(max_num_prefix, max_num_all)
    next_num = highest + 1
    return {
        "status": "success",
        "next_start_no": str(next_num),
        "next_booklet_no": f"{clean_prefix}{next_num}",
        "max_assigned": highest
    }


@admin_router.get("/omr/booklet/{booklet_no}")
async def get_omr_booklet(
    booklet_no: str,
    admin: TokenData = Depends(require_permission("site-settings"))
):
    """Lookup student details by booklet number or roll number."""
    record = await db.omr_booklets.find_one({
        "$or": [
            {"booklet_no": booklet_no},
            {"barcode": booklet_no},
            {"roll_no": booklet_no}
        ]
    })
    if record:
        record["_id"] = str(record.get("_id", ""))
        return {"status": "success", "found": True, "student": record}
    return {"status": "success", "found": False}


@admin_router.post("/omr/evaluations/save")
async def save_omr_evaluations(
    payload: Dict[str, Any] = Body(...),
    admin: TokenData = Depends(require_permission("site-settings"))
):
    """Save batch or single evaluated OMR results to MongoDB."""
    exam_title = payload.get("exam_title", "General Exam")
    date_str = payload.get("exam_date", now_iso()[:10])
    results = payload.get("results", [])
    
    from pymongo import UpdateOne
    operations = []
    
    for item in results:
        booklet_no = item.get("booklet_no") or item.get("serial_no") or new_id()[:8]
        adm_no = item.get("admission_no") or item.get("student_id") or ""
        
        doc = {
            "booklet_no": booklet_no,
            "admission_no": adm_no,
            "student_name": item.get("student_name", "Unknown"),
            "father_name": item.get("father_name", ""),
            "class_name": item.get("class_name", ""),
            "section": item.get("section", ""),
            "roll_no": item.get("roll_no", ""),
            "exam_title": exam_title,
            "exam_date": date_str,
            "score": item.get("score", 0),
            "max_marks": item.get("max_marks", 0),
            "percentage": item.get("percentage", 0),
            "correct_count": item.get("correct_count", 0),
            "wrong_count": item.get("wrong_count", 0),
            "unanswered_count": item.get("unanswered_count", 0),
            "answers": item.get("answers", {}),
            "evaluated_at": now_iso()
        }
        
        operations.append(
            UpdateOne(
                {"booklet_no": booklet_no, "exam_title": exam_title},
                {"$set": doc},
                upsert=True
            )
        )
        
    if operations:
        await db.omr_evaluations.bulk_write(operations)
        
    return {"status": "success", "message": f"Saved {len(operations)} evaluation records."}


@admin_router.get("/omr/evaluations")
async def get_omr_evaluations(
    exam_title: Optional[str] = None,
    class_name: Optional[str] = None,
    admin: TokenData = Depends(require_permission("site-settings"))
):
    query = {}
    if exam_title:
        query["exam_title"] = exam_title
    if class_name:
        query["class_name"] = class_name
        
    records = await db.omr_evaluations.find(query).sort("evaluated_at", -1).to_list(length=5000)
    for r in records:
        r["_id"] = str(r.get("_id", ""))
    return {"status": "success", "evaluations": records, "count": len(records)}


@admin_router.get("/omr/export-results")
async def export_omr_results(
    exam_title: Optional[str] = None,
    admin: TokenData = Depends(require_permission("site-settings"))
):
    """Export evaluated results as Excel sheet download."""
    query = {}
    if exam_title:
        query["exam_title"] = exam_title
        
    records = await db.omr_evaluations.find(query).sort([("class_name", 1), ("roll_no", 1)]).to_list(length=5000)
    
    rows = []
    for r in records:
        rows.append({
            "Booklet No": r.get("booklet_no", ""),
            "Roll No": r.get("roll_no", ""),
            "Student Name": r.get("student_name", ""),
            "Father Name": r.get("father_name", ""),
            "Class": r.get("class_name", ""),
            "Section": r.get("section", ""),
            "Exam Title": r.get("exam_title", ""),
            "Score": r.get("score", 0),
            "Max Marks": r.get("max_marks", 0),
            "Percentage (%)": r.get("percentage", 0),
            "Correct": r.get("correct_count", 0),
            "Wrong": r.get("wrong_count", 0),
            "Unanswered": r.get("unanswered_count", 0),
            "Date": r.get("exam_date", "")
        })
        
    df = pd.DataFrame(rows)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="OMR_Results")
    output.seek(0)
    
    from fastapi.responses import StreamingResponse
    headers = {
        "Content-Disposition": f"attachment; filename=OMR_Results_{exam_title or 'All'}.xlsx"
    }
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers
    )


# Global lock to serialize PDF exports, preventing concurrent Chromium instances from exceeding 512MB RAM
pdf_export_lock = asyncio.Lock()


@admin_router.post("/omr/export-pdf")
async def export_omr_pdf(
    background_tasks: BackgroundTasks,
    payload: Dict[str, Any] = Body(...),
    admin: TokenData = Depends(require_permission("site-settings"))
):
    """
    Renders OMR sheets to a high-fidelity vector PDF using headless Playwright Chromium.
    Engineered with disk-backed streaming and single-page recycling to guarantee minimal RAM (< 50MB)
    well below Render's 512MB memory threshold.
    """
    html_content = payload.get("html")
    html_pages = payload.get("htmlPages")
    is_landscape = payload.get("isLandscape", False)
    
    if not html_pages and html_content:
        html_pages = [html_content]
        
    if not html_pages:
        raise HTTPException(status_code=400, detail="Missing HTML content.")
        
    async with pdf_export_lock:
        temp_files = []
        out_pdf_path = None
        temp_dir = None
        try:
            from playwright.async_api import async_playwright
            import pikepdf
            import tempfile
            import gc
            
            temp_dir = tempfile.mkdtemp(prefix="omr_pdf_")
            
            browserless_key = os.getenv("BROWSERLESS_API_KEY", "").strip()
            
            rendered_via_browserless = False
            if browserless_key:
                logger.info(f"Attempting concurrent PDF rendering for {len(html_pages)} pages via Browserless.io Cloud REST API...")
                try:
                    limits = httpx.Limits(max_keepalive_connections=5, max_connections=10)
                    async with httpx.AsyncClient(timeout=120.0, limits=limits) as client:
                        semaphore = asyncio.Semaphore(2) # Concurrency of 2 to stay within Browserless rate limits
                        
                        async def render_single_page(idx, page_html):
                            async with semaphore:
                                b_url = f"https://chrome.browserless.io/pdf?token={browserless_key}"
                                b_payload = {
                                    "html": page_html,
                                    "options": {
                                        "displayHeaderFooter": False,
                                        "printBackground": True,
                                        "format": "A4",
                                        "landscape": is_landscape,
                                        "margin": {"top": "0mm", "right": "0mm", "bottom": "0mm", "left": "0mm"}
                                    }
                                }
                                
                                max_retries = 3
                                for attempt in range(max_retries):
                                    try:
                                        resp = await client.post(b_url, json=b_payload)
                                        if resp.status_code == 200 and len(resp.content) > 100:
                                            chunk_path = os.path.join(temp_dir, f"page_{idx:05d}.pdf")
                                            with open(chunk_path, "wb") as f:
                                                f.write(resp.content)
                                            return chunk_path
                                        elif resp.status_code == 429:
                                            logger.warning(f"Browserless 429 rate limit hit for page {idx}. Retrying in {(attempt + 1) * 1.5}s...")
                                            await asyncio.sleep((attempt + 1) * 1.5)
                                            continue
                                        else:
                                            raise Exception(f"Browserless REST API page {idx} status {resp.status_code}: {resp.text[:200]}")
                                    except httpx.HTTPError as h_err:
                                        if attempt == max_retries - 1:
                                            raise h_err
                                        await asyncio.sleep(1.0 * (attempt + 1))
                                
                                raise Exception(f"Browserless REST API page {idx} failed after {max_retries} retries.")

                        tasks = [render_single_page(idx, page_html) for idx, page_html in enumerate(html_pages)]
                        temp_files = list(await asyncio.gather(*tasks))
                        
                    rendered_via_browserless = True
                    logger.info("Successfully rendered PDF via Browserless.io Cloud REST API.")
                except Exception as b_err:
                    logger.warning(f"Browserless REST API failed ({b_err}). Falling back to local Playwright Chromium.")
                    temp_files = [] # Reset temp_files for fallback

            if not rendered_via_browserless:
                exe_path = "/usr/bin/chromium"
                launch_args = [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                    "--disable-software-rasterizer",
                    "--disable-extensions",
                    "--no-zygote",
                    "--single-process",
                    "--disable-background-networking",
                    "--disable-background-timer-throttling",
                    "--disable-backgrounding-occluded-windows",
                    "--disable-breakpad",
                    "--disable-component-extensions-with-background-pages",
                    "--disable-ipc-flooding-protection",
                    "--disable-renderer-backgrounding",
                    "--js-flags=--max-old-space-size=128"
                ]
                if not os.path.exists(exe_path):
                    exe_path = None # Use Playwright's local Chromium revision on macOS/Windows
                    launch_args = [arg for arg in launch_args if arg not in ("--single-process", "--no-zygote")]

                async with async_playwright() as p:
                    browser = await p.chromium.launch(
                        headless=True,
                        executable_path=exe_path,
                        args=launch_args
                    )
                    try:
                        context = await browser.new_context(viewport={"width": 1200, "height": 1600})
                        try:
                            page = await context.new_page()
                            try:
                                for idx, page_html in enumerate(html_pages):
                                    await page.set_content(page_html, wait_until="load", timeout=30000)
                                    try:
                                        await page.wait_for_load_state("networkidle", timeout=2000)
                                    except Exception:
                                        pass
                                    
                                    chunk_path = os.path.join(temp_dir, f"page_{idx}.pdf")
                                    await page.pdf(
                                        path=chunk_path,
                                        format="A4",
                                        landscape=is_landscape,
                                        print_background=True,
                                        margin={"top": "0mm", "right": "0mm", "bottom": "0mm", "left": "0mm"}
                                    )
                                    temp_files.append(chunk_path)
                            finally:
                                await page.close()
                        finally:
                            await context.close()
                    finally:
                        await browser.close()
                
            # Merge all single-sheet PDFs directly on disk using pikepdf
            merged_pdf = pikepdf.Pdf.new()
            for chunk_path in temp_files:
                with pikepdf.Pdf.open(chunk_path) as src:
                    merged_pdf.pages.extend(src.pages)

            out_pdf_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf", dir=temp_dir)
            out_pdf_path = out_pdf_file.name
            out_pdf_file.close()

            merged_pdf.save(out_pdf_path)
            merged_pdf.close()

            # Clean up individual page chunk files
            for f in temp_files:
                try:
                    if os.path.exists(f):
                        os.remove(f)
                except Exception:
                    pass

            gc.collect()

            # Background cleanup task to remove temporary directory after response is sent
            def cleanup_temp_files():
                try:
                    if out_pdf_path and os.path.exists(out_pdf_path):
                        os.remove(out_pdf_path)
                    if temp_dir and os.path.exists(temp_dir):
                        import shutil
                        shutil.rmtree(temp_dir, ignore_errors=True)
                except Exception:
                    pass
                gc.collect()

            background_tasks.add_task(cleanup_temp_files)

            from fastapi.responses import FileResponse
            return FileResponse(
                path=out_pdf_path,
                media_type="application/pdf",
                filename="OMR_Results.pdf"
            )

        except Exception as e:
            logger.error(f"Playwright PDF generation failed: {e}")
            try:
                for f in temp_files:
                    if os.path.exists(f):
                        os.remove(f)
                if out_pdf_path and os.path.exists(out_pdf_path):
                    os.remove(out_pdf_path)
                if temp_dir and os.path.exists(temp_dir):
                    import shutil
                    shutil.rmtree(temp_dir, ignore_errors=True)
            except Exception:
                pass
            gc.collect()
            raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")


# ==============================================================================
# EMAIL & WHATSAPP MESSAGE LOGS ENDPOINTS
# ==============================================================================

@admin_router.get("/message-logs")
@admin_router.get("/admin/message-logs")
async def get_message_logs(
    channel: Optional[str] = "all",
    status: Optional[str] = "all",
    search: Optional[str] = "",
    page: int = 1,
    limit: int = 30,
    user: TokenData = Depends(get_admin_user)
):
    """Fetch paginated email & WhatsApp message logs with search and filters."""
    query = {}
    
    if channel and channel.lower() != "all":
        query["channel"] = channel.lower()
        
    if status and status.lower() != "all":
        query["status"] = status.lower()
        
    if search:
        regex_pattern = {"$regex": search, "$options": "i"}
        query["$or"] = [
            {"recipient": regex_pattern},
            {"recipient_name": regex_pattern},
            {"subject": regex_pattern},
            {"message_content": regex_pattern},
            {"error_details": regex_pattern},
            {"provider": regex_pattern}
        ]

    # Calculate overall stats across all message logs
    total_all = await db.message_logs.count_documents({})
    total_emails = await db.message_logs.count_documents({"channel": "email"})
    total_whatsapp = await db.message_logs.count_documents({"channel": "whatsapp"})
    total_sent = await db.message_logs.count_documents({"status": "sent"})
    total_failed = await db.message_logs.count_documents({"status": "failed"})
    total_mocked = await db.message_logs.count_documents({"status": "mocked"})
    
    attempts = total_sent + total_failed
    success_rate = round((total_sent / attempts * 100), 1) if attempts > 0 else 100.0

    # Paginated filtered query
    total_filtered = await db.message_logs.count_documents(query)
    skip = (max(1, page) - 1) * limit
    
    cursor = db.message_logs.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    logs = await cursor.to_list(length=limit)

    return {
        "logs": logs,
        "total": total_filtered,
        "page": page,
        "limit": limit,
        "pages": max(1, math.ceil(total_filtered / limit)) if total_filtered > 0 else 1,
        "stats": {
            "total_all": total_all,
            "total_emails": total_emails,
            "total_whatsapp": total_whatsapp,
            "total_sent": total_sent,
            "total_failed": total_failed,
            "total_mocked": total_mocked,
            "success_rate": success_rate
        }
    }


@admin_router.get("/message-logs/{log_id}")
async def get_message_log_detail(
    log_id: str,
    user: TokenData = Depends(get_admin_user)
):
    """Fetch full detail for a specific email/WhatsApp message log item."""
    log_item = await db.message_logs.find_one({"id": log_id}, {"_id": 0})
    if not log_item:
        raise HTTPException(status_code=404, detail="Message log not found")
    return log_item


@admin_router.post("/message-logs/{log_id}/resend")
async def resend_message_from_log(
    log_id: str,
    user: TokenData = Depends(get_admin_user)
):
    """Re-send an email or WhatsApp message from a log entry."""
    log_item = await db.message_logs.find_one({"id": log_id}, {"_id": 0})
    if not log_item:
        raise HTTPException(status_code=404, detail="Message log not found")
        
    channel = log_item.get("channel", "email").lower()
    recipient = log_item.get("recipient", "")
    subject = log_item.get("subject", "Resent Message")
    content = log_item.get("message_content", "")

    if not recipient or not content:
        raise HTTPException(status_code=400, detail="Cannot resend message: missing recipient or content")

    if channel == "email":
        from email_service import send_email
        res = await send_email(recipient, f"[Resent] {subject}", content)
    elif channel == "whatsapp":
        from whatsapp_service import send_whatsapp_text
        res = await send_whatsapp_text(recipient, content, subject=f"[Resent] {subject}")
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported message channel: {channel}")

    return {
        "success": res.get("success", False),
        "message": res.get("message", "Resend attempt complete"),
        "result": res
    }


@admin_router.delete("/message-logs/clear")
async def clear_message_logs(
    channel: Optional[str] = "all",
    user: TokenData = Depends(get_superadmin)
):
    """Clear message logs (superadmin only)."""
    query = {}
    if channel and channel.lower() != "all":
        query["channel"] = channel.lower()
    
    result = await db.message_logs.delete_many(query)
    return {
        "success": True,
        "deleted_count": result.deleted_count,
        "message": f"Cleared {result.deleted_count} message logs."
    }

