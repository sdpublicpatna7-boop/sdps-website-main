"""Question Paper Portal — API Routes (/api/qp/*)"""
import os, io, base64, logging
import httpx
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Body, UploadFile, File, Form, status, Request, Response
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from jose import JWTError, jwt
import pandas as pd
from passlib.context import CryptContext
from slowapi import Limiter
from slowapi.util import get_remote_address

from qp_models import (
    QPUser, QPSession, QPExamArchive, QPAssignment,
    QPPaper, QPAutoSave, QPSection, QPQuestion, EXAM_TYPES, QP_ROLES
)
from models import new_id, now_iso
from image_utils import compress_and_save
from auth import (
    JWT_SECRET, JWT_ALGORITHM as JWT_ALG, set_auth_cookie, clear_auth_cookie,
    QP_COOKIE_NAME, generate_otp,
)
from whatsapp_service import send_whatsapp_text

logger = logging.getLogger(__name__)
qp_router = APIRouter(prefix="/api/qp", tags=["qp"])
db = None
limiter = Limiter(key_func=get_remote_address)

QP_JWT_EXP_H = int(os.environ.get("QP_JWT_EXPIRY_HOURS", "12"))
QP_PORTAL_URL = os.environ.get("QP_PORTAL_URL", "https://sdpublic.org/qp-portal/")
OTP_TTL_MIN = int(os.environ.get("QP_OTP_TTL_MIN", "10"))

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
qp_oauth2 = OAuth2PasswordBearer(tokenUrl="/api/qp/login", auto_error=False)


def init_db(database):
    global db
    db = database


# ── Helpers: phone, device, sessions, OTP ───────────────────────────────────
def _norm_phone(p) -> str:
    """Normalize to digits with India country code (e.g. 919955190262)."""
    d = "".join(ch for ch in str(p or "") if ch.isdigit())
    if len(d) == 10:
        d = "91" + d
    if len(d) == 11 and d.startswith("0"):
        d = "91" + d[1:]
    return d


def _device_from_ua(ua: str) -> str:
    ua = ua or ""
    os_name = "Unknown OS"
    for key, name in [("Windows", "Windows"), ("iPhone", "iPhone"), ("iPad", "iPad"),
                      ("Android", "Android"), ("Mac OS", "macOS"), ("Macintosh", "macOS"),
                      ("Linux", "Linux")]:
        if key in ua:
            os_name = name
            break
    br = "Browser"
    for key, name in [("Edg", "Edge"), ("OPR", "Opera"), ("Chrome", "Chrome"),
                      ("Firefox", "Firefox"), ("Safari", "Safari")]:
        if key in ua:
            br = name
            break
    return f"{br} on {os_name}"


def _client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else ""


def _user_public(user: dict) -> dict:
    return {
        "id": user["id"], "name": user.get("name", ""),
        "username": user.get("username", ""),
        "email": user.get("email", ""), "phone": user.get("phone", ""),
        "role": user["role"],
        "incharge_classes": user.get("incharge_classes", []),
        "can_review": user.get("can_review", False),
    }


async def _start_session(user: dict, request: Request) -> str:
    """Record a login session for the activity panel; returns the session id (jti)."""
    jti = new_id()
    ua = request.headers.get("user-agent", "")
    await db.qp_activity.insert_one({
        "id": jti,
        "user_id": user["id"],
        "user_name": user.get("name", ""),
        "role": user.get("role", ""),
        "login_id": user.get("username") or user.get("email") or user.get("phone", ""),
        "ip": _client_ip(request),
        "user_agent": ua[:300],
        "device": _device_from_ua(ua),
        "logged_in_at": now_iso(),
        "last_seen_at": now_iso(),
        "active": True,
        "logged_out_at": "",
    })
    return jti


async def _send_otp(user: dict, purpose: str) -> dict:
    code = generate_otp()
    expires = (datetime.now(timezone.utc) + timedelta(minutes=OTP_TTL_MIN)).isoformat()
    await db.qp_otps.update_one(
        {"phone": user["phone"]},
        {"$set": {"phone": user["phone"], "code": code, "expires_at": expires,
                  "attempts": 0, "purpose": purpose}},
        upsert=True,
    )
    msg = (f"🔐 Your S.D. Public School QP Portal verification code is: *{code}*\n\n"
           f"Valid for {OTP_TTL_MIN} minutes. Do not share this code with anyone.")
    res = await send_whatsapp_text(user["phone"], msg)
    logger.info(f"[QP OTP] phone={user['phone']} purpose={purpose} sent={res.get('success')}")
    # Local/testing convenience: when QP_OTP_DEBUG is on, log the code and treat it
    # as delivered even if WhatsApp isn't configured, so the flow can be tested.
    if os.environ.get("QP_OTP_DEBUG", "").lower() in ("1", "true", "yes"):
        logger.warning(f"[QP OTP DEBUG] phone={user['phone']} code={code}")
        if not res.get("success"):
            return {"success": True, "debug": True}
    return res


async def _verify_otp(phone: str, code: str):
    rec = await db.qp_otps.find_one({"phone": phone}, {"_id": 0})
    if not rec:
        return False, "No active code. Please request a new one."
    if rec.get("attempts", 0) >= 5:
        await db.qp_otps.delete_one({"phone": phone})
        return False, "Too many attempts. Please request a new code."
    try:
        if datetime.fromisoformat(rec["expires_at"]) < datetime.now(timezone.utc):
            await db.qp_otps.delete_one({"phone": phone})
            return False, "Code expired. Please request a new one."
    except Exception:
        pass
    if rec.get("code") != str(code).strip():
        await db.qp_otps.update_one({"phone": phone}, {"$inc": {"attempts": 1}})
        return False, "Invalid code."
    return True, "ok"


# ── JWT helpers ────────────────────────────────────────────────────────────
def _make_token(user: dict, jti: str = None) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=QP_JWT_EXP_H)
    payload = {"sub": user["id"], "username": user.get("username", ""), "role": user["role"], "exp": exp}
    if jti:
        payload["jti"] = jti
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

class QPTokenData(BaseModel):
    sub: str; username: str; role: str

async def _current_user(request: Request, token: str = Depends(qp_oauth2)) -> QPTokenData:
    if not token:
        token = request.cookies.get(QP_COOKIE_NAME)
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        p = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except JWTError:
        raise HTTPException(401, "Invalid or expired token")
    # Update activity "last seen" for the session (best-effort).
    jti = p.get("jti")
    if jti:
        try:
            await db.qp_activity.update_one({"id": jti}, {"$set": {"last_seen_at": now_iso()}})
        except Exception:
            pass
    return QPTokenData(sub=p["sub"], username=p.get("username", ""), role=p["role"])

def _require(*roles):
    async def dep(u: QPTokenData = Depends(_current_user)):
        if u.role not in roles:
            raise HTTPException(403, f"Access denied. Required: {roles}")
        return u
    return dep


# ── Auth ───────────────────────────────────────────────────────────────────
class CheckUserPayload(BaseModel):
    username: str

@qp_router.post("/check-user")
@limiter.limit("15/minute")
async def check_user(request: Request, payload: CheckUserPayload):
    username = payload.username.strip()
    user = await db.qp_users.find_one({"username": username}, {"_id": 0})
    if not user:
        raise HTTPException(404, "No account found for this username.")
    if not user.get("is_active", True):
        raise HTTPException(403, "Account is disabled. Contact QP Admin.")
    
    first_login = not user.get("password_set", True)
    if first_login:
        if not user.get("phone"):
            raise HTTPException(400, "No phone number on file. Contact QP Admin.")
        res = await _send_otp(user, "first_setup")
        if not res.get("success"):
            raise HTTPException(503, "Could not send the OTP on WhatsApp. Contact QP Admin.")
        return {
            "first_login": True,
            "name": user.get("name", ""),
            "message": "First-time sign-in. A verification code has been sent to your registered WhatsApp number."
        }
    return {
        "first_login": False,
        "name": user.get("name", "")
    }

class QPLoginPayload(BaseModel):
    username: str
    password: str

@qp_router.post("/login")
@limiter.limit("10/minute")
async def qp_login(request: Request, response: Response, payload: QPLoginPayload):
    """Username + password login (all QP users — admin, teacher, incharge, printing_head)."""
    username = payload.username.strip()
    user = await db.qp_users.find_one({"username": username}, {"_id": 0})
    if not user:
        raise HTTPException(401, "Invalid credentials")
    if not user.get("is_active", True):
        raise HTTPException(403, "Account is disabled. Contact QP Admin.")
    if not pwd_ctx.verify(payload.password, user.get("password_hash", "")):
        raise HTTPException(401, "Invalid credentials")
    jti = await _start_session(user, request)
    token = _make_token(user, jti)
    set_auth_cookie(response, token, QP_COOKIE_NAME, QP_JWT_EXP_H)
    return {"access_token": token, "token_type": "bearer", "user": _user_public(user)}


# ── Staff first-login: username → WhatsApp OTP → set password ─────────────
class StaffUsernamePayload(BaseModel):
    username: str

class StaffSetPwPayload(BaseModel):
    username: str
    otp: str
    new_password: str

class StaffOtpPayload(BaseModel):
    username: str
    otp: str


@qp_router.post("/staff/login-start")
@limiter.limit("10/minute")
async def staff_login_start(request: Request, payload: StaffUsernamePayload):
    """First-time login: staff enters username; we send a one-time code to their
    WhatsApp so they can set a password. Returns stage='set_password'."""
    username = payload.username.strip()
    user = await db.qp_users.find_one({"username": username}, {"_id": 0})
    if not user or user.get("role") == "qp_admin":
        raise HTTPException(404, "No staff account found for this username.")
    if not user.get("is_active", True):
        raise HTTPException(403, "Account is disabled. Contact QP Admin.")
    if user.get("password_set", True):
        # Password already set — should log in via /api/qp/login directly
        raise HTTPException(400, "Password already set. Use the main login form.")
    if not user.get("phone"):
        raise HTTPException(400, "No phone number on file. Contact QP Admin.")
    res = await _send_otp(user, "first_setup")
    if not res.get("success"):
        raise HTTPException(503, "Could not send the OTP on WhatsApp. Contact QP Admin.")
    return {"stage": "set_password", "message": "A one-time code was sent to your WhatsApp."}


@qp_router.post("/staff/set-password")
@limiter.limit("10/minute")
async def staff_set_password(request: Request, response: Response, payload: StaffSetPwPayload):
    """First login: verify OTP (sent to WhatsApp) and set a password, then sign in."""
    username = payload.username.strip()
    user = await db.qp_users.find_one({"username": username}, {"_id": 0})
    if not user or user.get("password_set", True):
        raise HTTPException(400, "Invalid request.")
    phone = user.get("phone", "")
    ok, msg = await _verify_otp(phone, payload.otp)
    if not ok:
        raise HTTPException(400, msg)
    pw = payload.new_password or ""
    if len(pw) < 8 or not any(c.isupper() for c in pw) or not any(c.isdigit() for c in pw):
        raise HTTPException(400, "Password must be at least 8 characters with an uppercase letter and a digit.")
    await db.qp_users.update_one({"id": user["id"]},
                                 {"$set": {"password_hash": pwd_ctx.hash(pw), "password_set": True}})
    await db.qp_otps.delete_one({"phone": phone})
    jti = await _start_session(user, request)
    token = _make_token(user, jti)
    set_auth_cookie(response, token, QP_COOKIE_NAME, QP_JWT_EXP_H)
    return {"access_token": token, "token_type": "bearer", "user": _user_public(user)}


@qp_router.post("/staff/resend-otp")
@limiter.limit("5/minute")
async def staff_resend_otp(request: Request, payload: StaffUsernamePayload):
    username = payload.username.strip()
    user = await db.qp_users.find_one({"username": username}, {"_id": 0})
    if not user:
        raise HTTPException(404, "Account not found.")
    if not user.get("phone"):
        raise HTTPException(400, "No phone number on file.")
    purpose = "first_setup" if not user.get("password_set", True) else "login"
    res = await _send_otp(user, purpose)
    if not res.get("success"):
        raise HTTPException(503, "Could not send the OTP on WhatsApp. Contact QP Admin.")
    return {"message": "A new code was sent to your WhatsApp."}


@qp_router.post("/logout")
async def qp_logout(request: Request, response: Response):
    # Decode (ignoring expiry) to mark the session inactive in the activity log.
    token = request.cookies.get(QP_COOKIE_NAME)
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        token = auth.split(" ", 1)[1]
    if token:
        try:
            p = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG], options={"verify_exp": False})
            jti = p.get("jti")
            if jti:
                await db.qp_activity.update_one(
                    {"id": jti}, {"$set": {"active": False, "logged_out_at": now_iso()}})
        except Exception:
            pass
    clear_auth_cookie(response, QP_COOKIE_NAME)
    return {"status": "ok"}

@qp_router.get("/me")
async def qp_me(u: QPTokenData = Depends(_current_user)):
    user = await db.qp_users.find_one({"id": u.sub}, {"_id": 0, "password_hash": 0})
    return user


# ── User Activity (qp_admin) ────────────────────────────────────────────────
@qp_router.get("/activity")
async def qp_activity(u: QPTokenData = Depends(_require("qp_admin"))):
    """Login history + currently-online sessions for the admin panel."""
    items = await db.qp_activity.find({}, {"_id": 0, "user_agent": 0}).sort("last_seen_at", -1).to_list(500)
    now = datetime.now(timezone.utc)
    for it in items:
        online = False
        try:
            ls = datetime.fromisoformat(it.get("last_seen_at"))
            if ls.tzinfo is None:
                ls = ls.replace(tzinfo=timezone.utc)
            online = bool(it.get("active")) and (now - ls).total_seconds() < 900
        except Exception:
            online = False
        it["online"] = online
    return items


# ── Single teacher onboard (qp_admin) ───────────────────────────────────────
@qp_router.post("/staff/onboard")
@limiter.limit("20/minute")
async def staff_onboard(
    request: Request,
    payload: Dict[str, Any] = Body(...),
    u: QPTokenData = Depends(_require("qp_admin")),
):
    """Onboard a single teacher.
    Required fields: username, name, phone, class_name, subject, archive_id
    Optional: email, role (default: teacher)
    Creates the user (passwordless — sets password on first login via WhatsApp OTP),
    creates the assignment, and sends a WhatsApp welcome invite.
    """
    username = str(payload.get("username", "")).strip()
    name     = str(payload.get("name", "")).strip()
    phone    = _norm_phone(payload.get("phone", ""))
    cls      = str(payload.get("class_name", "")).strip()
    subject  = str(payload.get("subject", "")).strip()
    archive_id = str(payload.get("archive_id", "")).strip()
    email    = str(payload.get("email", "")).strip()
    role     = str(payload.get("role", "teacher")).strip().lower()

    if not all([username, name, phone, cls, subject, archive_id]):
        raise HTTPException(400, "username, name, phone, class_name, subject, and archive_id are required.")
    if role not in QP_ROLES:
        raise HTTPException(400, f"Invalid role '{role}'. Must be one of: {', '.join(QP_ROLES)}")

    archive = await db.qp_archives.find_one({"id": archive_id}, {"_id": 0})
    if not archive:
        raise HTTPException(404, "Archive not found.")

    # Check username uniqueness
    existing_uname = await db.qp_users.find_one({"username": username}, {"_id": 0})
    if existing_uname:
        raise HTTPException(400, f"Username '{username}' is already taken.")

    # Create user (password not set yet — first login via WhatsApp OTP)
    user = QPUser(
        username=username, name=name,
        email=email, phone=phone,
        password_hash="", password_set=False,
        role=role, created_by=u.sub,
    ).model_dump()
    await db.qp_users.insert_one(user.copy())

    # Create assignment
    assignment_created = False
    exists = await db.qp_assignments.find_one({
        "archive_id": archive_id, "class_name": cls, "subject": subject,
    })
    if not exists:
        a = QPAssignment(
            archive_id=archive_id,
            session_id=archive.get("session_id", ""),
            session_name=archive["session_name"],
            exam_type=archive["exam_type"],
            class_name=cls, subject=subject,
            teacher_id=user["id"], teacher_name=user["name"],
        ).model_dump()
        await db.qp_assignments.insert_one(a.copy())
        assignment_created = True

    # Send WhatsApp invite
    settings = await db.site_settings.find_one({"id": "site"})
    portal_url = settings.get("qp_portal_url") if settings else None
    if not portal_url:
        portal_url = QP_PORTAL_URL

    msg = (
        f"👋 Hello {name},\n\n"
        f"You have been added to the *S.D. Public School — Question Paper Portal*.\n\n"
        f"📝 Assignment: {cls} — {subject} ({archive['exam_type']}, {archive['session_name']})\n"
        f"🌐 Portal: {portal_url}\n"
        f"🔑 Your Username: *{username}*\n\n"
        f"On your first sign-in, enter your username and you'll receive a one-time code "
        f"here on WhatsApp to set your password.\n\n"
        f"— S.D. Public School QP Administration"
    )
    wa_res = await send_whatsapp_text(phone, msg)

    user.pop("password_hash", None); user.pop("_id", None)
    return {
        "user": user,
        "assignment_created": assignment_created,
        "whatsapp_sent": wa_res.get("success", False),
    }


# ── Bulk-template download ───────────────────────────────────────────────────
@qp_router.get("/staff/bulk-template")
async def staff_bulk_template(u: QPTokenData = Depends(_require("qp_admin"))):
    """Download a sample Excel file for bulk staff onboarding.

    Columns: username, name, phone, email, role, class_name, subject
    A teacher who teaches multiple classes/subjects gets one row per
    class-subject pair (same username/name/phone repeated).
    """
    sample_rows = [
        ["SDPSE01", "Renu Tiwary",    "9955190262", "renu@sdpublic.org",   "teacher", "Class V",    "Mathematics"],
        ["SDPSE01", "Renu Tiwary",    "9955190262", "renu@sdpublic.org",   "teacher", "Class VI",   "Mathematics"],
        ["SDPSE02", "Anil Sharma",    "9876543210", "",                    "teacher", "Class VII",  "Science, Computer"],
        ["SDPSE02", "Anil Sharma",    "9876543210", "",                    "teacher", "Class VIII", "Science, Computer"],
        ["SDPSE03", "Priya Singh",    "9012345678", "priya@sdpublic.org",  "incharge","Class IX, Class X", "English"],
    ]
    df = pd.DataFrame(sample_rows, columns=[
        "username", "name", "phone", "email", "role", "class_name", "subject"
    ])
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Staff")
        ws = writer.sheets["Staff"]
        # Auto-size columns for readability
        for col_cells in ws.iter_cols():
            max_len = max((len(str(c.value or "")) for c in col_cells), default=10)
            ws.column_dimensions[col_cells[0].column_letter].width = max_len + 4
    buf.seek(0)
    headers = {"Content-Disposition": "attachment; filename=bulk_onboard_template.xlsx"}
    return StreamingResponse(buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers=headers)


# ── Bulk onboard teachers ───────────────────────────────────────────────────
@qp_router.post("/staff/bulk-onboard")
@limiter.limit("10/minute")
async def staff_bulk_onboard(
    request: Request,
    payload: Dict[str, Any] = Body(...),
    u: QPTokenData = Depends(_require("qp_admin")),
):
    """Bulk-onboard teachers from a JSON array.

    Body schema:
    {
      "archive_id": "<id>",
      "rows": [
        { "username": "SDPSE01", "name": "Renu Tiwary", "phone": "9955190262",
          "email": "", "role": "teacher", "class_name": "Class V", "subject": "Mathematics" },
        ...
      ]
    }

    A single teacher may appear in multiple rows (same username) to receive
    multiple class-subject assignments.

    Returns a summary: created users, assignments, skipped rows, WA results.
    """
    archive_id = str(payload.get("archive_id", "")).strip()
    rows: list = payload.get("rows", [])

    if not archive_id:
        raise HTTPException(400, "archive_id is required.")
    if not rows or not isinstance(rows, list):
        raise HTTPException(400, "rows must be a non-empty array.")
    if len(rows) > 500:
        raise HTTPException(400, "Maximum 500 rows per bulk upload.")

    archive = await db.qp_archives.find_one({"id": archive_id}, {"_id": 0})
    if not archive:
        raise HTTPException(404, "Archive not found.")

    settings = await db.site_settings.find_one({"id": "site"})
    portal_url = settings.get("qp_portal_url") if settings else None
    if not portal_url:
        portal_url = QP_PORTAL_URL

    # ── Pass 1: validate all rows before touching the DB ───────────────────
    errors = []
    for i, row in enumerate(rows, start=1):
        username = str(row.get("username", "")).strip()
        name     = str(row.get("name", "")).strip()
        phone    = str(row.get("phone", "")).strip()
        cls      = str(row.get("class_name", "")).strip()
        subject  = str(row.get("subject", "")).strip()
        role     = str(row.get("role", "teacher")).strip().lower()
        if not all([username, name, phone, cls, subject]):
            errors.append(f"Row {i}: username, name, phone, class_name, subject are all required.")
        if role not in QP_ROLES:
            errors.append(f"Row {i}: invalid role '{role}'.")
    if errors:
        import json
        raise HTTPException(400, json.dumps({"message": "Validation failed", "errors": errors}))

    # ── Pass 2: process row by row ─────────────────────────────────────────
    # Cache: username → user dict (to avoid re-creating existing users)
    user_cache: Dict[str, dict] = {}
    created_users: list = []
    created_assignments: list = []
    skipped_assignments: list = []
    wa_results: list = []

    for row in rows:
        username = str(row.get("username", "")).strip()
        name     = str(row.get("name", "")).strip()
        phone    = _norm_phone(row.get("phone", ""))
        email    = str(row.get("email", "")).strip()
        cls_raw  = str(row.get("class_name", "")).strip()
        sub_raw  = str(row.get("subject", "")).strip()
        role     = str(row.get("role", "teacher")).strip().lower()

        # ── Upsert user (create once, reuse for multi-assignment rows) ───
        if username not in user_cache:
            existing_user = await db.qp_users.find_one({"username": username}, {"_id": 0})
            if existing_user:
                user_cache[username] = existing_user
            else:
                new_user = QPUser(
                    username=username, name=name,
                    email=email, phone=phone,
                    password_hash="", password_set=False,
                    role=role, created_by=u.sub,
                ).model_dump()
                await db.qp_users.insert_one(new_user.copy())
                new_user.pop("password_hash", None); new_user.pop("_id", None)
                user_cache[username] = new_user
                created_users.append({"username": username, "name": name})

                # Send WhatsApp invite once per new user
                wa_msg = (
                    f"👋 Hello {name},\n\n"
                    f"You have been added to the *S.D. Public School — Question Paper Portal*.\n\n"
                    f"🌐 Portal: {portal_url}\n"
                    f"🔑 Your Username: *{username}*\n\n"
                    f"On your first sign-in, enter your username and you'll receive a "
                    f"one-time code here on WhatsApp to set your password.\n\n"
                    f"— S.D. Public School QP Administration"
                )
                wa_res = await send_whatsapp_text(phone, wa_msg)
                wa_results.append({"username": username, "sent": wa_res.get("success", False)})

        user_doc = user_cache[username]

        # Support comma-separated classes/subjects in a single row
        classes = [c.strip() for c in cls_raw.split(",") if c.strip()]
        subjects = [s.strip() for s in sub_raw.split(",") if s.strip()]

        for cls in classes:
            for subject in subjects:
                # ── Create assignment (skip if already exists) ───────────────────
                exists = await db.qp_assignments.find_one({
                    "archive_id": archive_id, "class_name": cls, "subject": subject,
                })
                if exists:
                    skipped_assignments.append({"class_name": cls, "subject": subject, "reason": "already exists"})
                else:
                    a = QPAssignment(
                        archive_id=archive_id,
                        session_id=archive.get("session_id", ""),
                        session_name=archive["session_name"],
                        exam_type=archive["exam_type"],
                        class_name=cls, subject=subject,
                        teacher_id=user_doc["id"],
                        teacher_name=user_doc["name"],
                    ).model_dump()
                    await db.qp_assignments.insert_one(a.copy())
                    created_assignments.append({"class_name": cls, "subject": subject, "username": username})

    return {
        "created_users": created_users,
        "created_assignments": created_assignments,
        "skipped_assignments": skipped_assignments,
        "whatsapp_results": wa_results,
        "summary": {
            "users_created": len(created_users),
            "assignments_created": len(created_assignments),
            "assignments_skipped": len(skipped_assignments),
        },
    }


# ── QP Admin: User Management ──────────────────────────────────────────────
@qp_router.get("/users")
async def list_users(u: QPTokenData = Depends(_require("qp_admin"))):
    users = await db.qp_users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@qp_router.post("/users")
async def create_user(payload: Dict[str, Any] = Body(...), u: QPTokenData = Depends(_require("qp_admin"))):
    """Create a QP user. Required: username, name. Optional: phone, email, role, password."""
    username = str(payload.get("username", "")).strip()
    name     = str(payload.get("name", "")).strip()
    if not username or not name:
        raise HTTPException(400, "username and name are required")
    existing = await db.qp_users.find_one({"username": username})
    if existing:
        raise HTTPException(400, f"Username '{username}' already exists")
    raw_pw = payload.get("password", "")
    user = QPUser(
        username=username,
        name=name,
        email=payload.get("email", ""),
        phone=_norm_phone(payload.get("phone", "")) if payload.get("phone") else "",
        password_hash=pwd_ctx.hash(raw_pw) if raw_pw else "",
        password_set=bool(raw_pw),
        role=payload.get("role", "teacher"),
        is_active=payload.get("is_active", True),
        incharge_classes=payload.get("incharge_classes", []),
        can_review=payload.get("can_review", False),
        created_by=u.sub,
    ).model_dump()
    await db.qp_users.insert_one(user.copy())
    user.pop("password_hash", None); user.pop("_id", None)
    return user

@qp_router.put("/users/{uid}")
async def update_user(uid: str, payload: Dict[str, Any] = Body(...), u: QPTokenData = Depends(_require("qp_admin"))):
    update = {k: v for k, v in payload.items() if k not in ("id", "_id", "password_hash")}
    if "password" in update:
        update["password_hash"] = pwd_ctx.hash(update.pop("password"))
        update["password_set"] = True
    await db.qp_users.update_one({"id": uid}, {"$set": update})
    user = await db.qp_users.find_one({"id": uid}, {"_id": 0, "password_hash": 0})
    return user

@qp_router.delete("/users/{uid}")
async def delete_user(uid: str, u: QPTokenData = Depends(_require("qp_admin"))):
    if uid == u.sub:
        raise HTTPException(400, "Cannot delete yourself")
    await db.qp_users.delete_one({"id": uid})
    return {"deleted": uid}


# ── Sessions ───────────────────────────────────────────────────────────────
@qp_router.get("/sessions")
async def list_sessions(u: QPTokenData = Depends(_current_user)):
    return await db.qp_sessions.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)

@qp_router.post("/sessions")
async def create_session(payload: Dict[str, Any] = Body(...), u: QPTokenData = Depends(_require("qp_admin"))):
    existing = await db.qp_sessions.find_one({"name": payload.get("name")})
    if existing:
        raise HTTPException(400, "Session already exists")
    session = QPSession(name=payload["name"], created_by=u.sub).model_dump()
    await db.qp_sessions.insert_one(session.copy())
    session.pop("_id", None)
    return session

@qp_router.post("/archives/promote-assignments")
async def promote_assignments(payload: Dict[str, Any] = Body(...), u: QPTokenData = Depends(_require("qp_admin"))):
    """Copy teacher assignments from one exam archive to another (promote team)."""
    from_archive_id = payload.get("from_archive_id")
    to_archive_id   = payload.get("to_archive_id")
    if not from_archive_id or not to_archive_id:
        raise HTTPException(400, "from_archive_id and to_archive_id required")

    from_archive = await db.qp_archives.find_one({"id": from_archive_id}, {"_id": 0})
    to_archive   = await db.qp_archives.find_one({"id": to_archive_id},   {"_id": 0})
    if not from_archive or not to_archive:
        raise HTTPException(404, "Archive not found")

    source_assignments = await db.qp_assignments.find({"archive_id": from_archive_id}, {"_id": 0}).to_list(500)
    promoted = []
    for sa in source_assignments:
        exists = await db.qp_assignments.find_one({
            "archive_id": to_archive_id,
            "class_name": sa["class_name"],
            "subject":    sa["subject"],
        })
        if exists:
            continue
        new_a = QPAssignment(
            archive_id=to_archive_id,
            session_id=to_archive["session_id"] if "session_id" in to_archive else sa["session_id"],
            session_name=to_archive["session_name"],
            exam_type=to_archive["exam_type"],
            class_name=sa["class_name"],
            subject=sa["subject"],
            teacher_id=sa["teacher_id"],
            teacher_name=sa["teacher_name"],
        ).model_dump()
        await db.qp_assignments.insert_one(new_a.copy())
        new_a.pop("_id", None)
        promoted.append(new_a)
    return {"promoted": len(promoted), "assignments": promoted}


# ── Exam Archives ──────────────────────────────────────────────────────────
@qp_router.get("/archives")
async def list_archives(u: QPTokenData = Depends(_current_user)):
    archives = await db.qp_archives.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return archives

@qp_router.post("/archives")
async def create_archive(payload: Dict[str, Any] = Body(...), u: QPTokenData = Depends(_require("qp_admin"))):
    archive = QPExamArchive(
        session_id=payload.get("session_id", ""),
        session_name=payload["session_name"],
        exam_type=payload["exam_type"],
        is_open=payload.get("is_open", True),
        created_by=u.sub,
    ).model_dump()
    await db.qp_archives.insert_one(archive.copy())
    archive.pop("_id", None)
    return archive

@qp_router.put("/archives/{aid}")
async def update_archive(aid: str, payload: Dict[str, Any] = Body(...), u: QPTokenData = Depends(_require("qp_admin"))):
    update = {k: v for k, v in payload.items() if k not in ("id", "_id")}
    await db.qp_archives.update_one({"id": aid}, {"$set": update})
    return await db.qp_archives.find_one({"id": aid}, {"_id": 0})

@qp_router.delete("/archives/{aid}")
async def delete_archive(aid: str, u: QPTokenData = Depends(_require("qp_admin"))):
    await db.qp_archives.delete_one({"id": aid})
    return {"deleted": aid}


# ── Assignments ────────────────────────────────────────────────────────────
@qp_router.get("/assignments")
async def list_assignments(u: QPTokenData = Depends(_current_user)):
    if u.role == "teacher":
        items = await db.qp_assignments.find({"teacher_id": u.sub}, {"_id": 0}).to_list(500)
    elif u.role == "incharge":
        user = await db.qp_users.find_one({"id": u.sub}, {"_id": 0})
        classes = user.get("incharge_classes", []) if user else []
        items = await db.qp_assignments.find(
            {"class_name": {"$in": classes}}, {"_id": 0}
        ).to_list(1000)
    elif u.role == "printing_head":
        items = await db.qp_assignments.find(
            {"status": {"$in": ["approved", "printing"]}}, {"_id": 0}
        ).to_list(1000)
    else:  # qp_admin
        items = await db.qp_assignments.find({}, {"_id": 0}).to_list(5000)
    return items

@qp_router.post("/assignments")
async def create_assignment(payload: Dict[str, Any] = Body(...), u: QPTokenData = Depends(_require("qp_admin"))):
    archive = await db.qp_archives.find_one({"id": payload.get("archive_id")}, {"_id": 0})
    if not archive:
        raise HTTPException(404, "Archive not found")
    if not archive.get("is_open"):
        raise HTTPException(400, "This archive is closed for new assignments")

    teacher = await db.qp_users.find_one({"id": payload.get("teacher_id")}, {"_id": 0})
    if not teacher:
        raise HTTPException(404, "Teacher not found")

    exists = await db.qp_assignments.find_one({
        "archive_id": payload["archive_id"],
        "class_name": payload["class_name"],
        "subject":    payload["subject"],
    })
    if exists:
        raise HTTPException(400, "Assignment already exists for this class/subject/exam")

    a = QPAssignment(
        archive_id=payload["archive_id"],
        session_id=archive.get("session_id", ""),
        session_name=archive["session_name"],
        exam_type=archive["exam_type"],
        class_name=payload["class_name"],
        subject=payload["subject"],
        teacher_id=teacher["id"],
        teacher_name=teacher["name"],
    ).model_dump()
    await db.qp_assignments.insert_one(a.copy())
    a.pop("_id", None)
    return a

@qp_router.delete("/assignments/{aid}")
async def delete_assignment(aid: str, u: QPTokenData = Depends(_require("qp_admin"))):
    await db.qp_assignments.delete_one({"id": aid})
    return {"deleted": aid}


# ── Status Transitions ─────────────────────────────────────────────────────
@qp_router.post("/assignments/{aid}/submit")
async def submit_paper(aid: str, u: QPTokenData = Depends(_require("teacher"))):
    a = await db.qp_assignments.find_one({"id": aid, "teacher_id": u.sub}, {"_id": 0})
    if not a:
        raise HTTPException(404, "Assignment not found or not yours")
    if a["status"] not in ("draft",):
        raise HTTPException(400, f"Cannot submit from status '{a['status']}'")
    archive = await db.qp_archives.find_one({"id": a["archive_id"]}, {"_id": 0})
    if not archive or not archive.get("is_open"):
        raise HTTPException(400, "Archive is closed")
    # Check if paper exists
    paper = await db.qp_papers.find_one({"assignment_id": aid}, {"_id": 0, "sections": 0, "passage_text": 0})
    if not paper:
        raise HTTPException(400, "No paper content found. Please build the paper first.")
    await db.qp_assignments.update_one({"id": aid}, {"$set": {
        "status": "submitted", "submitted_at": now_iso(),
        "rejection_reason": "", "rejected_by": "", "rejected_at": ""
    }})
    return {"status": "submitted"}

@qp_router.post("/assignments/{aid}/incharge-review")
async def incharge_review(aid: str, payload: Dict[str, Any] = Body({}), u: QPTokenData = Depends(_require("incharge"))):
    a = await db.qp_assignments.find_one({"id": aid}, {"_id": 0})
    if not a:
        raise HTTPException(404, "Not found")
    # Check incharge has access to this class
    user = await db.qp_users.find_one({"id": u.sub}, {"_id": 0})
    if a["class_name"] not in (user.get("incharge_classes") or []):
        raise HTTPException(403, "You don't have access to this class")
    if not user.get("can_review"):
        raise HTTPException(403, "Review permission not granted. Contact admin.")
    if a["status"] != "submitted":
        raise HTTPException(400, f"Cannot review from status '{a['status']}'")

    action = payload.get("action")  # "approve" | "reject"
    if action == "approve":
        await db.qp_assignments.update_one({"id": aid}, {"$set": {
            "status": "incharge_approved", "incharge_reviewed_at": now_iso()
        }})
        return {"status": "incharge_approved"}
    elif action == "reject":
        await db.qp_assignments.update_one({"id": aid}, {"$set": {
            "status": "draft",
            "rejection_reason": payload.get("reason", "Needs revision"),
            "rejected_by": "incharge",
            "rejected_at": now_iso(),
        }})
        return {"status": "draft", "rejected": True}
    raise HTTPException(400, "action must be 'approve' or 'reject'")

@qp_router.post("/assignments/{aid}/admin-action")
async def admin_action(aid: str, payload: Dict[str, Any] = Body(...), u: QPTokenData = Depends(_require("qp_admin"))):
    a = await db.qp_assignments.find_one({"id": aid}, {"_id": 0})
    if not a:
        raise HTTPException(404, "Not found")

    action = payload.get("action")  # "approve" | "reject" | "send_to_print"
    if action == "approve":
        await db.qp_assignments.update_one({"id": aid}, {"$set": {
            "status": "approved", "admin_approved_at": now_iso()
        }})
        return {"status": "approved"}
    elif action == "reject":
        target_status = payload.get("reject_to", "draft")  # "draft" or "submitted"
        await db.qp_assignments.update_one({"id": aid}, {"$set": {
            "status": target_status,
            "rejection_reason": payload.get("reason", "Needs revision"),
            "rejected_by": "admin",
            "rejected_at": now_iso(),
        }})
        return {"status": target_status, "rejected": True}
    elif action == "send_to_print":
        if a["status"] != "approved":
            raise HTTPException(400, "Paper must be approved before sending to print")
        await db.qp_assignments.update_one({"id": aid}, {"$set": {
            "status": "printing", "sent_to_print_at": now_iso()
        }})
        return {"status": "printing"}
    raise HTTPException(400, "action must be 'approve', 'reject', or 'send_to_print'")


# ── Paper CRUD ─────────────────────────────────────────────────────────────
@qp_router.get("/papers/{assignment_id}")
async def get_paper(assignment_id: str, u: QPTokenData = Depends(_current_user)):
    a = await db.qp_assignments.find_one({"id": assignment_id}, {"_id": 0})
    if not a:
        raise HTTPException(404, "Assignment not found")

    # Access control
    if u.role == "teacher" and a["teacher_id"] != u.sub:
        raise HTTPException(403, "Not your assignment")
    if u.role == "incharge":
        user = await db.qp_users.find_one({"id": u.sub}, {"_id": 0})
        if a["class_name"] not in (user.get("incharge_classes") or []):
            raise HTTPException(403, "No access to this class")
        # Incharges can only see a paper AFTER the teacher submits it — never a draft.
        # (Drafts in progress are visible to the admin only.)
        if a["status"] not in ("submitted", "incharge_approved", "approved", "printing"):
            raise HTTPException(403, "Paper not yet submitted for review")
    if u.role == "printing_head" and a["status"] not in ("approved", "printing"):
        raise HTTPException(403, "Paper not approved for printing")

    paper = await db.qp_papers.find_one({"assignment_id": assignment_id}, {"_id": 0})
    return paper or {}

@qp_router.put("/papers/{assignment_id}")
async def save_paper(assignment_id: str, payload: Dict[str, Any] = Body(...), u: QPTokenData = Depends(_require("teacher"))):
    a = await db.qp_assignments.find_one({"id": assignment_id, "teacher_id": u.sub}, {"_id": 0})
    if not a:
        raise HTTPException(403, "Not your assignment")
    if a["status"] not in ("draft",):
        raise HTTPException(400, f"Paper is '{a['status']}' — cannot edit. Contact admin to unlock.")
    archive = await db.qp_archives.find_one({"id": a["archive_id"]}, {"_id": 0})
    if not archive or not archive.get("is_open"):
        raise HTTPException(400, "Archive is closed for editing")

    payload.pop("id", None); payload.pop("_id", None)
    payload["assignment_id"] = assignment_id
    payload["teacher_id"]    = u.sub
    payload["updated_at"]    = now_iso()

    existing = await db.qp_papers.find_one({"assignment_id": assignment_id})
    if existing:
        await db.qp_papers.update_one({"assignment_id": assignment_id}, {"$set": payload})
    else:
        payload["id"] = payload.get("id") or new_id()
        payload["created_at"] = now_iso()
        await db.qp_papers.insert_one(payload.copy())

    # Also save autosave snapshot
    snap = QPAutoSave(
        assignment_id=assignment_id,
        teacher_id=u.sub,
        paper_data=payload,
    ).model_dump()
    await db.qp_autosaves.replace_one(
        {"assignment_id": assignment_id, "teacher_id": u.sub},
        snap, upsert=True
    )
    return {"saved": True, "updated_at": payload["updated_at"]}


# ── Image Upload ───────────────────────────────────────────────────────────
@qp_router.post("/upload-image")
async def qp_upload_image(
    image: UploadFile = File(...),
    u: QPTokenData = Depends(_require("teacher"))
):
    content = await image.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(413, "Image must be ≤ 10MB before compression")
    res = compress_and_save(content, sub_dir="qp_images")
    return {"url": res["url"]}


# ── AI Assist (Groq) ───────────────────────────────────────────────────────
# Calls run server-side so the API key never reaches the browser. Get a free
# key at https://console.groq.com and set GROQ_API_KEY.
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")


class AIPromptPayload(BaseModel):
    prompt: str


@qp_router.post("/ai")
@limiter.limit("20/minute")
async def qp_ai(request: Request, payload: AIPromptPayload,
                u: QPTokenData = Depends(_require("teacher", "qp_admin"))):
    if not GROQ_API_KEY:
        raise HTTPException(503, "AI is not configured. Ask the admin to set GROQ_API_KEY.")
    prompt = (payload.prompt or "").strip()
    if not prompt:
        raise HTTPException(400, "Empty prompt")
    prompt = prompt[:4000]

    url = "https://api.groq.com/openai/v1/chat/completions"
    body = {
        "model": GROQ_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 1024,
        "temperature": 0.7,
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as c:
            r = await c.post(
                url,
                json=body,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
            )
        if r.status_code == 429:
            raise HTTPException(429, "AI is busy (rate limit). Try again in a minute.")
        if r.status_code >= 300:
            logger.warning(f"Groq error {r.status_code}: {r.text[:200]}")
            raise HTTPException(502, "AI service error. Please try again.")
        data = r.json()
        text = ""
        for choice in data.get("choices", []):
            text += choice.get("message", {}).get("content", "")
        return {"text": text.strip() or "No response generated."}
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"AI request failed: {e}")
        raise HTTPException(502, "Could not reach the AI service.")


# ── Progress Dashboard ─────────────────────────────────────────────────────
@qp_router.get("/progress/{archive_id}")
async def get_progress(archive_id: str, u: QPTokenData = Depends(_current_user)):
    query = {"archive_id": archive_id}
    if u.role == "incharge":
        user = await db.qp_users.find_one({"id": u.sub}, {"_id": 0})
        classes = user.get("incharge_classes", []) if user else []
        query["class_name"] = {"$in": classes}

    assignments = await db.qp_assignments.find(
        query,
        {"_id": 0, "sections": 0}  # don't leak question data
    ).to_list(500)

    # Aggregate — incharge and printing head never get question content
    summary = {}
    for a in assignments:
        key = f"{a['class_name']}||{a['subject']}"
        summary[key] = {
            "id": a["id"],
            "class_name": a["class_name"],
            "subject": a["subject"],
            "teacher_name": a["teacher_name"],
            "status": a["status"],
            "submitted_at": a.get("submitted_at", ""),
            "admin_approved_at": a.get("admin_approved_at", ""),
            "rejection_reason": a.get("rejection_reason", "") if u.role in ("qp_admin", "incharge") else "",
            "rejected_by": a.get("rejected_by", "") if u.role in ("qp_admin", "incharge") else "",
        }
    return list(summary.values())


# ── Incharge Settings (qp_admin sets which classes an incharge monitors) ───
@qp_router.put("/users/{uid}/incharge-settings")
async def set_incharge_settings(uid: str, payload: Dict[str, Any] = Body(...), u: QPTokenData = Depends(_require("qp_admin"))):
    await db.qp_users.update_one({"id": uid}, {"$set": {
        "incharge_classes": payload.get("incharge_classes", []),
        "can_review": payload.get("can_review", False),
    }})
    return await db.qp_users.find_one({"id": uid}, {"_id": 0, "password_hash": 0})


# ── Substitute Teacher ─────────────────────────────────────────────────────
@qp_router.post("/assignments/{aid}/substitute")
async def substitute_teacher(aid: str, payload: Dict[str, Any] = Body(...), u: QPTokenData = Depends(_require("qp_admin"))):
    new_teacher_id = payload.get("teacher_id")
    teacher = await db.qp_users.find_one({"id": new_teacher_id}, {"_id": 0})
    if not teacher:
        raise HTTPException(404, "Teacher not found")
    await db.qp_assignments.update_one({"id": aid}, {"$set": {
        "teacher_id": teacher["id"],
        "teacher_name": teacher["name"],
        "status": "draft",
    }})
    return {"substituted": True, "new_teacher": teacher["name"]}
