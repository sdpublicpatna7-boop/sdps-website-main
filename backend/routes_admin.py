"""Admin API routes (JWT-protected)."""
import os
import io
import asyncio
import logging
import httpx
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body, Request, Response
from pydantic import BaseModel
import pandas as pd
from slowapi import Limiter
from slowapi.util import get_remote_address

from auth import (
    hash_password, verify_password, create_access_token,
    get_current_admin, get_superadmin, require_permission, generate_otp, TokenData,
    set_auth_cookie, clear_auth_cookie, ADMIN_COOKIE_NAME, JWT_EXPIRY_HOURS
)

limiter = Limiter(key_func=get_remote_address)
from email_service import send_email, render_template, format_salary_slip_email, format_salary_certificate_email, format_experience_certificate_email
from image_utils import compress_and_save, save_raw_file, UnsafeUploadError
from models import (
    AdminLogin, AdminPasswordReset, AdminPasswordResetConfirm, AdminChangePassword,
    News, Notice, GalleryImage, VideoItem, CalendarEvent, Holiday,
    CouncilMember, ElectionPoster, CouncilResult, FormQuestion,
    CareerPost, AlumniMeet, AlumniSettings, TCRecord, PopupSettings,
    SiteSettings, now_iso, new_id, AdmissionEnquiry,
    EligibilityRow, FeeStructureRow, HostelFeeRow, HostelGalleryItem,
    AdministrationMember, LegalPage, ExamPaper, HolidayHomework, KheloPatnaPhoto,
    Educator, GeneratedThumbnail, SalarySlip, SalaryCertificate, ExperienceCertificate
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


class EmailSendPayload(BaseModel):
    email: str
    data: Dict[str, Any]


@admin_router.post("/salary-slips/send-email")
async def email_salary_slip(payload: EmailSendPayload, admin: TokenData = Depends(require_permission("media-tools"))):
    data = payload.data
    html_body = format_salary_slip_email(data)
    subject = f"Salary Slip - {data.get('pay_period')} - {data.get('employee_name')}"
    full_html = render_template(subject, html_body)
    res = await send_email(payload.email, subject, full_html)
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("message") or "Failed to send email")
    return {"sent": True}


@admin_router.post("/salary-certificates/send-email")
async def email_salary_certificate(payload: EmailSendPayload, admin: TokenData = Depends(require_permission("media-tools"))):
    data = payload.data
    html_body = format_salary_certificate_email(data)
    subject = f"Salary Certificate - {data.get('employee_name')}"
    full_html = render_template(subject, html_body)
    res = await send_email(payload.email, subject, full_html)
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("message") or "Failed to send email")
    return {"sent": True, "mailercloud_response": res.get("mailercloud_response")}


@admin_router.post("/experience-certificates/send-email")
async def email_experience_certificate(payload: EmailSendPayload, admin: TokenData = Depends(require_permission("media-tools"))):
    data = payload.data
    html_body = format_experience_certificate_email(data)
    subject = f"Experience Certificate - {data.get('employee_name')}"
    full_html = render_template(subject, html_body)
    res = await send_email(payload.email, subject, full_html)
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("message") or "Failed to send email")
    return {"sent": True, "mailercloud_response": res.get("mailercloud_response")}


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
async def debug_mailercloud(admin: TokenData = Depends(require_permission("site-settings"))):
    import httpx
    mailer_key = os.environ.get("MAILERCLOUD_API_KEY", "")
    sender_email = os.environ.get("SENDER_EMAIL", "noreply@sdpublic.org")
    sender_name = os.environ.get("SENDER_NAME", "S.D. Public School")
    
    if not mailer_key:
        return {"error": "MAILERCLOUD_API_KEY not configured in environment"}
        
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
            "html": "<h2>S.D. Public School</h2><p>This is a test email from the MailerCloud Email API integration. If you received this, the email service is working correctly!</p>",
            "recipients": {
                "to": [{"name": "Admin", "email": sender_email}]
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
            "status_code": r.status_code,
            "response": data,
            "success": r.status_code in (200, 201) and data.get("statusCode") == 1000,
        }
    except Exception as e:
        return {"error": str(e)}


# ============= UPDATE ENV-LIKE KEYS via DB (Razorpay/Resend/SMS) =============
@admin_router.get("/integration-keys")
async def get_integration_keys(admin: TokenData = Depends(require_permission("site-settings"))):
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
async def integration_status(admin: TokenData = Depends(require_permission("site-settings"))):
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
    users = await db.admin_users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
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
