"""
WhatsApp Marketing routes — proxies to the Baileys Node microservice.
All endpoints require superadmin auth.

The Node service handles the actual WhatsApp connection (QR linking), the 2s
inter-message delay for bulk campaigns (to reduce ban risk), and progress
tracking. This module is a thin, authenticated proxy in front of it.
"""
import os
import io
import csv
import base64
import logging
import re
import httpx
import pandas as pd
import asyncio
from typing import Optional, List
from datetime import datetime, timezone, timedelta, date
from PIL import Image, ImageDraw, ImageFont

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from pydantic import BaseModel
from slowapi import Limiter

from auth import get_superadmin, TokenData
from models import now_iso

logger = logging.getLogger("sdps.whatsapp")

def get_real_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host or "127.0.0.1"

limiter = Limiter(key_func=get_real_ip)

WA_SERVICE_URL = os.environ.get("WA_SERVICE_URL", "http://localhost:3001")
WA_API_SECRET = os.environ.get("WA_API_SECRET", "")
if WA_API_SECRET == "change-me-secret":
    raise RuntimeError(
        "WA_API_SECRET must not use the default value. Set a strong random secret "
        "shared with the WhatsApp (Baileys) microservice."
    )

# Bulk send pacing (ms between messages). 2s default to reduce WhatsApp ban risk.
WA_BULK_DELAY_MS = int(os.environ.get("WA_BULK_DELAY_MS", "2000"))
# Max attachment size (WhatsApp media cap is ~16MB).
WA_MAX_MEDIA_MB = int(os.environ.get("WA_MAX_MEDIA_MB", "16"))

# Online fee-payment portal URL (ERP). Parents enter the child's admission no.
FEE_PAY_URL = os.environ.get("FEE_PAY_URL", "https://sdps.gungunerp.in/pay-fees")

# Default fee-reminder message. Supports {father} {name} {admn} {month}
# {balance} {pay_url} placeholders, substituted per parent.
DEFAULT_FEE_MSG = (
    "Dear {father},\n\n"
    "This is a gentle reminder from S.D. Public School regarding the pending "
    "fee for your ward *{name}* (Admission No: {admn}).\n\n"
    "Outstanding balance up to {month}: *₹{balance}*\n\n"
    "Kindly pay online at: {pay_url}\n"
    "Just enter your child's admission number and pay.\n\n"
    "If you have already paid, please ignore this message.\n\n"
    "Regards,\nS.D. Public School"
)

wa_router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])
db = None

def init_db(database):
    global db
    db = database

_WA_HEADERS = {"X-WA-Secret": WA_API_SECRET}


async def _wa_get(path: str) -> dict:
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.get(f"{WA_SERVICE_URL}{path}", headers=_WA_HEADERS)
    r.raise_for_status()
    return r.json()


async def _wa_post(path: str, **kwargs) -> dict:
    async with httpx.AsyncClient(timeout=120.0) as client:
        r = await client.post(f"{WA_SERVICE_URL}{path}", headers=_WA_HEADERS, **kwargs)
    r.raise_for_status()
    return r.json()


def _media_type(content_type: Optional[str]) -> Optional[str]:
    if not content_type:
        return None
    if content_type.startswith("image/"):
        return "image"
    if content_type.startswith("video/"):
        return "video"
    return None


async def _read_media(file: Optional[UploadFile]) -> Optional[dict]:
    """Validate + base64-encode an optional image/video attachment."""
    if not file:
        return None
    media_type = _media_type(file.content_type)
    if not media_type:
        raise HTTPException(status_code=400, detail="Attachment must be an image or video")
    data = await file.read()
    if len(data) > WA_MAX_MEDIA_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"Attachment must be ≤ {WA_MAX_MEDIA_MB}MB")
    return {
        "mediaBase64": base64.b64encode(data).decode(),
        "mediaMime": file.content_type,
        "mediaType": media_type,
    }


def _parse_numbers(numbers_text: str) -> List[str]:
    """Split a pasted blob of numbers on commas / whitespace / newlines."""
    if not numbers_text:
        return []
    parts = re.split(r"[\s,;]+", numbers_text.strip())
    return [p.strip() for p in parts if p.strip()]


def _digits_only(val: str) -> str:
    return re.sub(r"\D", "", str(val or ""))


def _to_float(val) -> Optional[float]:
    """Parse a balance cell like '2,500.00' / '₹1200' / '-' into a float."""
    if val is None:
        return None
    s = str(val).strip()
    if not s:
        return None
    s = re.sub(r"[^\d.\-]", "", s)  # strip ₹, commas, spaces
    if s in ("", "-", ".", "-."):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def _parse_fee_rows(content: bytes, min_balance: float, month: str, template: str):
    """
    Parse a fee-balance Excel sheet and build per-parent reminder messages.

    Expected (messy) layout: an optional title row ("data"), a header row, a
    leading blank column, real data rows, and a "Total" footer row. Columns are
    matched case-insensitively: student name, admission no, father name, contact
    number and balance.

    Returns (recipients, skipped) where recipients is a list of
    {phone, name, balance, message} dicts.
    """
    try:
        df = pd.read_excel(io.BytesIO(content), header=None, dtype=str)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read Excel file: {e}")

    if df.empty:
        return [], 0

    # 1) Find the header row — the first row that mentions both a name and balance.
    header_idx = None
    for idx in range(min(len(df), 15)):
        cells = [str(c).strip().lower() for c in df.iloc[idx].tolist()]
        joined = " ".join(cells)
        if "balance" in joined and "name" in joined:
            header_idx = idx
            break
    if header_idx is None:
        raise HTTPException(
            status_code=400,
            detail="Could not find a header row containing 'Name' and 'Balance'.",
        )

    headers = [str(c).strip().lower() for c in df.iloc[header_idx].tolist()]

    def find_col(*candidates, exact=False):
        for col_i, h in enumerate(headers):
            for cand in candidates:
                if exact:
                    if h == cand:
                        return col_i
                else:
                    if cand in h:
                        return col_i
        return None

    # student name: exact 'name' first to avoid matching 'father name'
    name_col = find_col("name", exact=True)
    if name_col is None:
        name_col = find_col("student name", "student", "ward")
    father_col = find_col("father", "father name", "guardian")
    admn_col = find_col("admn", "admission", "adm no", "admno")
    contact_col = find_col("contact", "mobile", "phone", "whatsapp")
    balance_col = find_col("balance", "due", "outstanding", "pending")

    if name_col is None or balance_col is None or contact_col is None:
        raise HTTPException(
            status_code=400,
            detail="Sheet must contain Name, Contact No and Balance columns.",
        )

    recipients = []
    skipped = 0
    month = (month or "").strip()
    tmpl = template.strip() if (template and template.strip()) else DEFAULT_FEE_MSG

    for idx in range(header_idx + 1, len(df)):
        row = df.iloc[idx].tolist()

        def cell(ci):
            if ci is None or ci >= len(row):
                return ""
            v = row[ci]
            return "" if v is None else str(v).strip()

        name = cell(name_col)
        if not name or name.lower() in ("total", "grand total", "nan"):
            skipped += 1
            continue

        phone = _digits_only(cell(contact_col))
        if len(phone) < 10:
            skipped += 1
            continue

        balance = _to_float(cell(balance_col))
        if balance is None or balance <= min_balance:
            skipped += 1
            continue

        father = cell(father_col) or "Parent"
        admn = cell(admn_col) or "—"
        bal_str = f"{balance:,.0f}" if balance == int(balance) else f"{balance:,.2f}"

        message = (
            tmpl.replace("{father}", father)
            .replace("{name}", name)
            .replace("{admn}", admn)
            .replace("{month}", month)
            .replace("{balance}", bal_str)
            .replace("{pay_url}", FEE_PAY_URL)
        )
        recipients.append(
            {"phone": phone, "name": name, "balance": balance, "message": message}
        )

    # Group multiple children who share the same phone number into one message.
    # This is common in schools where siblings have the same parent contact.
    # Rather than silently dropping duplicates, we combine the details into a
    # single message so every child's balance is included.
    phone_groups: dict = {}
    for r in recipients:
        p = r["phone"]
        if p not in phone_groups:
            phone_groups[p] = []
        phone_groups[p].append(r)

    unique = []
    for phone, group in phone_groups.items():
        if len(group) == 1:
            unique.append(group[0])
        else:
            # Build a combined message listing each child's details.
            father = group[0]["name"]  # reuse father name from first child's message
            # Extract father name from the first message's greeting line if possible.
            first_msg_lines = group[0]["message"].splitlines()
            greeting = first_msg_lines[0] if first_msg_lines else ""

            child_lines = []
            total_balance = 0.0
            for child in group:
                bal = child["balance"]
                total_balance += bal
                bal_str = f"{bal:,.0f}" if bal == int(bal) else f"{bal:,.2f}"
                # Extract admn from the child's message (between "Admission No: " and ")")
                import re as _re
                admn_match = _re.search(r"Admission No: ([^)]+)\)", child["message"])
                admn = admn_match.group(1) if admn_match else "—"
                child_lines.append(
                    f"  • *{child['name']}* (Admn: {admn}) — ₹{bal_str}"
                )

            total_str = f"{total_balance:,.0f}" if total_balance == int(total_balance) else f"{total_balance:,.2f}"
            combined_message = (
                f"{greeting}\n\n"
                f"This is a gentle reminder from S.D. Public School regarding the pending "
                f"fees for your wards:\n\n"
                + "\n".join(child_lines)
                + f"\n\n*Total outstanding balance up to {month}: ₹{total_str}*\n\n"
                f"Kindly pay online at: {FEE_PAY_URL}\n"
                f"Enter your child's admission number and pay.\n\n"
                f"If you have already paid, please ignore this message.\n\n"
                f"Regards,\nS.D. Public School"
            )
            unique.append({
                "phone": phone,
                "name": ", ".join(c["name"] for c in group),
                "balance": total_balance,
                "message": combined_message,
            })

    return unique, skipped


# ── Status / QR ──────────────────────────────────────────────────────────────

@wa_router.get("/status")
async def wa_status(admin: TokenData = Depends(get_superadmin)):
    """Connection status + QR code (base64 PNG) when not yet linked."""
    try:
        return await _wa_get("/status")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"WhatsApp service unavailable: {e}")


@wa_router.post("/disconnect")
async def wa_disconnect(admin: TokenData = Depends(get_superadmin)):
    """Log out from WhatsApp and reset the session (a new QR will be generated)."""
    try:
        return await _wa_post("/disconnect", json={"confirm": True})
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


# ── Test send (single number) ────────────────────────────────────────────────

@wa_router.post("/send-test")
@limiter.limit("20/minute")
async def wa_send_test(
    request: Request,
    phone: str = Form(...),
    message: str = Form(...),
    attachment: Optional[UploadFile] = File(None),
    admin: TokenData = Depends(get_superadmin),
):
    """Send the campaign message to a single number to verify before launch."""
    payload = {"phone": phone, "message": message}
    media = await _read_media(attachment)
    if media:
        payload.update(media)
    try:
        return await _wa_post("/send-text", json=payload)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


# ── Bulk campaign ──────────────────────────────────────────────────────────────

@wa_router.post("/send-bulk")
@limiter.limit("5/minute")
async def wa_send_bulk(
    request: Request,
    message: str = Form(...),
    numbers: str = Form(""),
    contacts_csv: Optional[UploadFile] = File(None),
    attachment: Optional[UploadFile] = File(None),
    admin: TokenData = Depends(get_superadmin),
):
    """
    Launch a bulk WhatsApp campaign.

    Provide recipients either as `numbers` (comma/space/newline separated) or a
    `contacts_csv` file with a `phone` column (optional `name`). Sends are paced
    by the Node service with a delay between messages to reduce ban risk.
    """
    contacts = []

    # 1) numbers pasted directly
    for n in _parse_numbers(numbers):
        contacts.append({"phone": n, "name": ""})

    # 2) optional CSV
    if contacts_csv:
        raw = await contacts_csv.read()
        if len(raw) > 5 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Contacts CSV must be ≤ 5MB")
        try:
            text = raw.decode("utf-8-sig")
            reader = csv.DictReader(io.StringIO(text))
            for row in reader:
                phone = (row.get("phone") or row.get("Phone") or row.get("mobile") or "").strip()
                name = (row.get("name") or row.get("Name") or "").strip()
                if phone:
                    contacts.append({"phone": phone, "name": name})
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not parse CSV: {e}")

    # de-duplicate on phone, preserve order
    seen = set()
    unique = []
    for c in contacts:
        if c["phone"] not in seen:
            seen.add(c["phone"])
            unique.append(c)
    contacts = unique

    if not contacts:
        raise HTTPException(status_code=400, detail="No valid phone numbers provided")

    payload = {"contacts": contacts, "message": message, "delayMs": WA_BULK_DELAY_MS}
    media = await _read_media(attachment)
    if media:
        payload.update(media)

    try:
        result = await _wa_post("/send-bulk", json=payload)
        return {**result, "contacts_count": len(contacts)}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


# ── Fee reminders (Excel upload) ─────────────────────────────────────────────

@wa_router.post("/fee-reminder")
@limiter.limit("5/minute")
async def wa_fee_reminder(
    request: Request,
    file: UploadFile = File(...),
    month: str = Form(...),
    min_balance: float = Form(0.0),
    message_template: str = Form(""),
    dry_run: bool = Form(False),
    admin: TokenData = Depends(get_superadmin),
):
    """
    Upload a fee-balance Excel sheet and WhatsApp a payment reminder to each
    parent whose outstanding balance is greater than `min_balance`.

    With `dry_run=true`, parses and returns a preview (count + sample) without
    sending anything. Otherwise the personalised reminders are dispatched via
    the Node bulk sender (paced to reduce ban risk).
    """
    raw = await file.read()
    if len(raw) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Excel file must be ≤ 5MB")

    recipients, skipped = _parse_fee_rows(raw, min_balance, month, message_template)
    if not recipients:
        raise HTTPException(
            status_code=400,
            detail="No parents matched (check the balance filter and the sheet columns).",
        )

    sample = [
        {"name": r["name"], "phone": r["phone"], "balance": r["balance"]}
        for r in recipients[:10]
    ]

    if dry_run:
        return {"recipients": len(recipients), "skipped": skipped, "sample": sample}

    contacts = [
        {"phone": r["phone"], "name": r["name"], "message": r["message"]}
        for r in recipients
    ]
    payload = {"contacts": contacts, "message": "", "delayMs": WA_BULK_DELAY_MS}
    try:
        result = await _wa_post("/send-bulk", json=payload)
        return {"recipients": len(recipients), "skipped": skipped, "sample": sample, **result}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@wa_router.get("/bulk-progress")
async def wa_bulk_progress(admin: TokenData = Depends(get_superadmin)):
    """Poll progress of the ongoing bulk campaign."""
    try:
        data = await _wa_get("/status")
        return data.get("bulkProgress", {"total": 0, "sent": 0, "failed": 0, "running": False})
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@wa_router.post("/stop-bulk")
async def wa_stop_bulk(admin: TokenData = Depends(get_superadmin)):
    """Request the Node service to stop an in-progress campaign."""
    try:
        return await _wa_post("/stop-bulk")
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


# ── Birthday Greetings (Excel upload + dynamic card generation) ──────────────

def _parse_dob_val(val: str) -> Optional[date]:
    if not val:
        return None
    val = val.strip().lower()
    if val in ("nan", "nat", "-", ""):
        return None
    # Try parsing different common date formats
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d", "%d-%m-%Y", "%d.%m.%Y"):
        try:
            date_part = val.split()[0]
            return datetime.strptime(date_part, fmt).date()
        except ValueError:
            continue
    # Try pandas generic conversion
    try:
        ts = pd.to_datetime(val, errors="coerce")
        if pd.notna(ts):
            return ts.date()
    except Exception:
        pass
    return None


def _parse_birthday_rows(content: bytes, target_date: Optional[date] = None, filename: str = ""):
    """
    Parse a student CSV or Excel list, match DOB column, and filter for today's birthdays.
    """
    try:
        if filename.lower().endswith('.csv'):
            try:
                text = content.decode("utf-8-sig")
            except UnicodeDecodeError:
                text = content.decode("latin-1")
            df = pd.read_csv(io.StringIO(text), dtype=str)
        else:
            df = pd.read_excel(io.BytesIO(content), dtype=str)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read student file: {e}")

    if df.empty:
        return [], 0

    headers = [str(c).strip().lower() for c in df.columns]

    def find_col(*candidates):
        for col_i, h in enumerate(headers):
            h_norm = h.replace("_", " ").strip()
            for cand in candidates:
                cand_norm = cand.replace("_", " ").strip()
                if h_norm == cand_norm:
                    return col_i
        for col_i, h in enumerate(headers):
            h_norm = h.replace("_", " ").strip()
            for cand in candidates:
                cand_norm = cand.replace("_", " ").strip()
                if cand_norm in h_norm:
                    if cand_norm == "name" and ("father" in h_norm or "mother" in h_norm or "guardian" in h_norm):
                        continue
                    return col_i
        return None

    name_col = find_col("name", "student name", "child name", "first name")
    contact_col = find_col("contact no", "contact_no", "contact", "mobile", "phone", "whatsapp", "number")
    dob_col = find_col("date of birth", "date_of_birth", "dob", "birth", "birthday", "birthdate")
    admn_col = find_col("admn no", "admn_no", "admission no", "admission_no", "admn", "admission", "adm no", "admno")
    roll_col = find_col("roll no", "roll_no", "roll", "roll number", "rollno", "s.no", "sl.no", "r.no", "serial no", "roll_num")

    if name_col is None or contact_col is None or dob_col is None:
        raise HTTPException(
            status_code=400,
            detail="File must contain Name, Contact No, and Date of Birth (DOB) columns.",
        )

    if not target_date:
        ist = timezone(timedelta(hours=5, minutes=30))
        target_date = datetime.now(ist).date()

    recipients = []
    skipped = 0

    for idx in range(len(df)):
        row = df.iloc[idx].tolist()

        def cell(ci):
            if ci is None or ci >= len(row):
                return ""
            v = row[ci]
            return "" if pd.isna(v) or v is None else str(v).strip()

        name = cell(name_col)
        if not name or name.lower() in ("total", "grand total", "nan"):
            skipped += 1
            continue

        phone = _digits_only(cell(contact_col))
        if len(phone) < 10:
            skipped += 1
            continue

        raw_dob = cell(dob_col)
        parsed_dob = _parse_dob_val(raw_dob)
        if not parsed_dob:
            skipped += 1
            continue

        # Check if birthday matches month & day
        if parsed_dob.month == target_date.month and parsed_dob.day == target_date.day:
            recipients.append({
                "phone": phone,
                "name": name,
                "dob": parsed_dob.strftime("%Y-%m-%d"),
                "admission_no": cell(admn_col) if admn_col is not None else "",
                "roll_no": cell(roll_col) if roll_col is not None else ""
            })
        else:
            # Not birthday on target date
            pass

    return recipients, skipped


def _get_font(size: int, bold: bool = False):
    font_names = [
        "arial.ttf",
        "Arial.ttf",
        "DejaVuSans.ttf",
        "LiberationSans-Regular.ttf",
        "Helvetica.ttf"
    ]
    if bold:
        font_names = [
            "arialbd.ttf",
            "Arial Bold.ttf",
            "DejaVuSans-Bold.ttf",
            "LiberationSans-Bold.ttf",
            "Helvetica-Bold.ttf"
        ] + font_names
        
    for name in font_names:
        try:
            return ImageFont.truetype(name, size)
        except IOError:
            continue
            
    common_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/System/Library/Fonts/Cache/Arial.ttf",
        "/Library/Fonts/Arial.ttf"
    ]
    for path in common_paths:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except IOError:
                continue
                
    return ImageFont.load_default()


def _generate_birthday_card(name: Optional[str] = None) -> bytes:
    width, height = 800, 800
    img = Image.new("RGBA", (width, height), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    
    # 1) Background: Draw diagonal gradient from Royal Blue (#0E3B91) to Vibrant Orange (#F87D0E)
    color_start = (14, 59, 145, 255)  # #0E3B91
    color_end = (248, 125, 14, 255)   # #F87D0E
    for y in range(height):
        factor = y / height
        r = int(color_start[0] + (color_end[0] - color_start[0]) * factor)
        g = int(color_start[1] + (color_end[1] - color_start[1]) * factor)
        b = int(color_start[2] + (color_end[2] - color_start[2]) * factor)
        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))
        
    # 2) Semi-transparent Inner Container (Alpha composited so text is fully readable)
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    
    # Draw dark premium card with 85% opacity (deep navy color matching school archetype)
    overlay_draw.rounded_rectangle(
        [(50, 50), (750, 750)],
        radius=24,
        fill=(10, 15, 36, 215),       # #0A0F24 with 215 alpha
        outline=(199, 161, 91, 255),  # #C7A15B solid gold outline
        width=3
    )
    
    # Draw inner gold accent line
    overlay_draw.rounded_rectangle(
        [(65, 65), (735, 735)],
        radius=16,
        fill=None,
        outline=(199, 161, 91, 255),  # #C7A15B solid gold
        width=1
    )
    
    img = Image.alpha_composite(img, overlay)
    draw = ImageDraw.Draw(img)

    # 4) Draw Confetti
    confetti_points = [
        (100, 150, 10, "#C7A15B"), (120, 280, 8, "#FFFFFF"), (200, 120, 12, "#F87D0E"),
        (650, 140, 9, "#FFFFFF"), (700, 220, 11, "#C7A15B"), (680, 320, 7, "#F87D0E"),
        (150, 650, 11, "#FFFFFF"), (110, 520, 8, "#C7A15B"), (220, 680, 10, "#F87D0E"),
        (620, 660, 12, "#C7A15B"), (690, 580, 9, "#FFFFFF"), (670, 480, 7, "#F87D0E")
    ]
    for x, y, r, color in confetti_points:
        draw.ellipse([(x - r, y - r), (x + r, y + r)], fill=color)

    def draw_center_text(text, y_pos, font_size, fill_color, is_bold=False):
        font = _get_font(font_size, is_bold)
        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        x = (width - tw) // 2
        draw.text((x, y_pos), text, font=font, fill=fill_color)

    # 5) School Header
    draw_center_text("S.D. PUBLIC SCHOOL", 110, 34, "#FFFFFF", is_bold=True)
    draw_center_text("Patna-7", 155, 14, "#E2E8F0")
    
    draw.line([(320, 195), (480, 195)], fill="#C7A15B", width=2)
    
    # 6) Greeting Headline
    draw_center_text("HAPPY BIRTHDAY!", 250, 52, "#C7A15B", is_bold=True)
    
    # 7) Student Name
    if name:
        draw_center_text(name, 350, 42, "#FFFFFF", is_bold=True)
        msg_y = 470
    else:
        draw_center_text("Wishing You A", 340, 36, "#FFFFFF", is_bold=True)
        draw_center_text("Fantastic Day!", 400, 36, "#FFFFFF", is_bold=True)
        msg_y = 510
        
    # 8) Birthday Wish
    draw_center_text("Wishing you a wonderful year ahead filled with", msg_y, 18, "#E2E8F0")
    draw_center_text("happiness, academic success, and endless learning.", msg_y + 30, 18, "#E2E8F0")
    
    # 9) Footer Signature
    draw_center_text("From all of us at the SDPS Family", 630, 16, "#FFFFFF")
    
    final_img = img.convert("RGB")
    buffer = io.BytesIO()
    final_img.save(buffer, format="JPEG", quality=85)
    return buffer.getvalue()


@wa_router.post("/birthday-campaign/preview")
@limiter.limit("5/minute")
async def wa_birthday_campaign_preview(
    request: Request,
    file: UploadFile = File(...),
    target_date: Optional[str] = Form(None),
    admin: TokenData = Depends(get_superadmin),
):
    """
    Parse a student Excel list, find today's birthdays, and return
    a recipient preview plus a base64 preview of the generated greeting card.
    """
    if not file.filename.lower().endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only CSV (.csv) or Excel (.xlsx, .xls) files are allowed.")
    raw = await file.read()
    if len(raw) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File must be ≤ 5MB")

    parsed_date = None
    if target_date:
        try:
            parsed_date = datetime.strptime(target_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="target_date must be in YYYY-MM-DD format")

    recipients, skipped = _parse_birthday_rows(raw, parsed_date, file.filename)

    # Use first student name for preview card, default to "Dear Student"
    sample_name = recipients[0]["name"] if recipients else "Dear Student"
    card_bytes = _generate_birthday_card(sample_name)
    card_b64 = base64.b64encode(card_bytes).decode("utf-8")
    card_preview_url = f"data:image/jpeg;base64,{card_b64}"

    return {
        "recipients_count": len(recipients),
        "skipped_count": skipped,
        "recipients": recipients,
        "card_preview_url": card_preview_url,
    }


@wa_router.post("/birthday-campaign/send")
@limiter.limit("5/minute")
async def wa_birthday_campaign_send(
    request: Request,
    file: UploadFile = File(...),
    message_template: str = Form(""),
    target_date: Optional[str] = Form(None),
    dry_run: bool = Form(False),
    admin: TokenData = Depends(get_superadmin),
):
    """
    Parse student Excel list, find birthdays, generate card, and launch bulk campaign.
    """
    if not file.filename.lower().endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only CSV (.csv) or Excel (.xlsx, .xls) files are allowed.")
    raw = await file.read()
    if len(raw) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File must be ≤ 5MB")

    parsed_date = None
    if target_date:
        try:
            parsed_date = datetime.strptime(target_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="target_date must be in YYYY-MM-DD format")

    recipients, skipped = _parse_birthday_rows(raw, parsed_date, file.filename)
    if not recipients:
        raise HTTPException(
            status_code=400,
            detail="No students matched birthdays for the selected date.",
        )

    sample = [
        {"name": r["name"], "phone": r["phone"], "dob": r["dob"]}
        for r in recipients[:10]
    ]

    if dry_run:
        return {"recipients_count": len(recipients), "skipped_count": skipped, "sample": sample}

    tmpl = message_template.strip() if (message_template and message_template.strip()) else "Dear {name}, S.D. Public School wishes you a very Happy Birthday! 🎂🎉"
    
    contacts = []
    for r in recipients:
        msg = tmpl.replace("{name}", r["name"])
        c_card_bytes = _generate_birthday_card(r["name"])
        c_card_b64 = base64.b64encode(c_card_bytes).decode("utf-8")
        contacts.append({
            "phone": r["phone"],
            "name": r["name"],
            "message": msg,
            "mediaBase64": c_card_b64,
            "mediaMime": "image/jpeg",
            "mediaType": "image"
        })

    payload = {
        "contacts": contacts,
        "message": "",
        "delayMs": WA_BULK_DELAY_MS
    }

    try:
        result = await _wa_post("/send-bulk", json=payload)
        return {
            "recipients_count": len(recipients),
            "skipped_count": skipped,
            "sample": sample,
            **result
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


# ── Database Roster and Auto-Scheduler Actions ──

def _parse_all_students(content: bytes, filename: str = ""):
    """
    Parse a student CSV or Excel list and return all valid students with all 9 fields.
    """
    try:
        if filename.lower().endswith('.csv'):
            try:
                text = content.decode("utf-8-sig")
            except UnicodeDecodeError:
                text = content.decode("latin-1")
            df = pd.read_csv(io.StringIO(text), dtype=str)
        else:
            df = pd.read_excel(io.BytesIO(content), dtype=str)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read student file: {e}")

    if df.empty:
        return [], 0

    headers = [str(c).strip().lower() for c in df.columns]

    def find_col(*candidates):
        for col_i, h in enumerate(headers):
            h_norm = h.replace("_", " ").strip()
            for cand in candidates:
                cand_norm = cand.replace("_", " ").strip()
                if cand_norm == h_norm or cand_norm in h_norm:
                    return col_i
        return None

    name_col = find_col("student name", "student_name", "candidate name", "full name", "child name", "first name", "name", "student")
    father_col = find_col("father name", "father_name", "fathers name", "father's name", "father", "guardian", "parent name")
    mother_col = find_col("mother name", "mother_name", "mother")
    contact_col = find_col("contact no", "contact_no", "contact", "mobile", "phone", "whatsapp", "number", "parent phone", "parent mobile")
    admn_col = find_col("admn no", "admn_no", "admission no", "admission_no", "admn", "admission", "adm no", "admno", "reg no", "registration no", "student id", "id")
    dob_col = find_col("date of birth", "date_of_birth", "dob", "birth", "birthday", "birthdate")
    roll_col = find_col("roll no", "roll_no", "roll", "roll number", "rollno", "s.no", "sl.no", "r.no", "serial no", "roll_num")
    class_col = find_col("class name", "class_name", "class", "grade", "std", "standard")
    section_col = find_col("section name", "section_name", "section", "sec", "sec.")
    perm_addr_col = find_col("permanent address", "permanent_address", "perm address", "permanent")
    curr_addr_col = find_col("current address", "current_address", "curr address", "current")
    biometric_col = find_col("biometric")

    if name_col is None:
        raise HTTPException(
            status_code=400,
            detail="Excel file must contain a Student Name column (e.g., 'Name' or 'Student Name').",
        )

    students = []
    skipped = 0

    for idx in range(len(df)):
        row = df.iloc[idx].tolist()

        def cell(ci):
            if ci is None or ci >= len(row):
                return ""
            v = row[ci]
            return "" if pd.isna(v) or v is None else str(v).strip()

        name = cell(name_col)
        if not name or name.lower() in ("total", "grand total", "nan"):
            skipped += 1
            continue

        phone = _digits_only(cell(contact_col)) if contact_col is not None else ""
        raw_dob = cell(dob_col) if dob_col is not None else ""
        parsed_dob = _parse_dob_val(raw_dob) if raw_dob else None
        dob_str = parsed_dob.strftime("%Y-%m-%d") if parsed_dob else ""

        admn = cell(admn_col)
        father = cell(father_col)
        mother = cell(mother_col)
        roll = cell(roll_col)
        c_name = cell(class_col)
        sec = cell(section_col)
        perm_addr = cell(perm_addr_col)
        curr_addr = cell(curr_addr_col)
        biometric = cell(biometric_col)

        students.append({
            "name": name,
            "student_name": name,
            "father_name": father,
            "mother_name": mother,
            "phone": phone,
            "contact_no": phone,
            "admission_no": admn,
            "admn_no": admn,
            "roll_no": roll,
            "roll": roll,
            "class_name": c_name,
            "class": c_name,
            "section": sec,
            "sec": sec,
            "dob": dob_str,
            "date_of_birth": dob_str,
            "permanent_address": perm_addr,
            "current_address": curr_addr,
            "biometric": biometric
        })

    return students, skipped


@wa_router.post("/birthday-campaign/import")
@limiter.limit("3/minute")
async def wa_birthday_campaign_import(
    request: Request,
    file: UploadFile = File(...),
    mode: str = Form("overwrite"), # "overwrite" or "append"
    admin: TokenData = Depends(get_superadmin),
):
    """
    Import student roster from Excel to MongoDB.
    - overwrite: drops the birthday_students collection and saves fresh records.
    - append: updates or adds new records.
    """
    if not file.filename.lower().endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only CSV (.csv) or Excel (.xlsx, .xls) files are allowed.")
    raw = await file.read()
    if len(raw) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File must be ≤ 5MB")

    students, skipped = _parse_all_students(raw, file.filename)
    if not students:
        raise HTTPException(status_code=400, detail="No valid students found in the sheet.")

    from pymongo import UpdateOne

    if mode == "overwrite":
        await db.birthday_students.delete_many({})
        await db.birthday_students.insert_many(students)
    else:
        # Append mode
        for s in students:
            query_filter = {"admission_no": s["admission_no"]} if s["admission_no"] else {"phone": s["phone"], "name": s["name"]}
            await db.birthday_students.update_one(
                query_filter,
                {"$set": s},
                upsert=True
            )

    # Automatically sync with OMR student roster for pre-filled OMR generation
    omr_operations = []
    for s in students:
        s_name = str(s.get("name") or s.get("student_name") or "STUDENT")
        adm = s.get("admission_no") or f"{s.get('class_name')}-{s.get('section')}-{s.get('roll_no')}"
        if not adm or adm == "--":
            adm = f"SDPS-{s_name.replace(' ', '')[:4].upper()}"
        doc = {
            "id": adm,
            "admission_no": adm,
            "student_name": s.get("name") or s.get("student_name") or "",
            "father_name": s.get("father_name") or "",
            "class_name": s.get("class_name") or "",
            "section": s.get("section") or "",
            "roll_no": s.get("roll_no") or "",
            "updated_at": now_iso()
        }
        omr_operations.append(
            UpdateOne({"admission_no": adm}, {"$set": doc}, upsert=True)
        )
    if omr_operations:
        await db.omr_roster.bulk_write(omr_operations)

    return {
        "success": True,
        "imported_count": len(students),
        "skipped_count": skipped,
        "mode": mode
    }


@wa_router.get("/birthday-campaign/info")
async def wa_birthday_campaign_info(admin: TokenData = Depends(get_superadmin)):
    """
    Get current database statistics (total students, latest admission number,
    list of today's birthdays, last run time of the auto-campaign scheduler).
    """
    total_students = await db.birthday_students.count_documents({})

    latest_admn = "None"
    cursor = db.birthday_students.find({"admission_no": {"$exists": True, "$ne": ""}}, {"admission_no": 1, "_id": 0})
    admission_nos = [doc["admission_no"] for doc in await cursor.to_list(100000)]
    if admission_nos:
        max_num = -1
        max_val = ""
        for val in admission_nos:
            digits = re.findall(r"\d+", val)
            if digits:
                num = int("".join(digits))
                if num > max_num:
                    max_num = num
                    max_val = val
            else:
                if max_num == -1 and val > max_val:
                    max_val = val
        if max_val:
            latest_admn = max_val

    ist = timezone(timedelta(hours=5, minutes=30))
    today = datetime.now(ist).date()
    today_str = today.strftime("%Y-%m-%d")
    
    month_day_suffix = today.strftime("-%m-%d")
    cursor = db.birthday_students.find({"dob": {"$regex": f"{month_day_suffix}$"}}, {"_id": 0})
    birthdays_today = await cursor.to_list(10000)

    sched_doc = await db.birthday_settings.find_one({"id": "birthday-scheduler"})
    last_run = sched_doc.get("last_run", "Never") if sched_doc else "Never"

    return {
        "total_students": total_students,
        "latest_admission_no": latest_admn,
        "birthdays_today": birthdays_today,
        "last_scheduler_run": last_run,
        "target_date": today_str
    }


@wa_router.post("/birthday-campaign/send-saved")
@limiter.limit("5/minute")
async def wa_birthday_campaign_send_saved(
    request: Request,
    message_template: str = Form(""),
    admin: TokenData = Depends(get_superadmin),
):
    """
    Launch a birthday campaign for today's birthdays stored in MongoDB.
    """
    ist = timezone(timedelta(hours=5, minutes=30))
    today = datetime.now(ist).date()
    
    month_day_suffix = today.strftime("-%m-%d")
    cursor = db.birthday_students.find({"dob": {"$regex": f"{month_day_suffix}$"}}, {"_id": 0})
    recipients = await cursor.to_list(10000)

    if not recipients:
        raise HTTPException(
            status_code=400,
            detail="No students have birthdays today in the database.",
        )

    tmpl = message_template.strip() if (message_template and message_template.strip()) else "Dear {name}, S.D. Public School wishes you a very Happy Birthday! May your year ahead be filled with joy and success. 🎂🎉"
    
    contacts = []
    for r in recipients:
        msg = tmpl.replace("{name}", r["name"])
        c_card_bytes = _generate_birthday_card(r["name"])
        c_card_b64 = base64.b64encode(c_card_bytes).decode("utf-8")
        contacts.append({
            "phone": r["phone"],
            "name": r["name"],
            "message": msg,
            "mediaBase64": c_card_b64,
            "mediaMime": "image/jpeg",
            "mediaType": "image"
        })

    payload = {
        "contacts": contacts,
        "message": "",
        "delayMs": WA_BULK_DELAY_MS
    }

    try:
        result = await _wa_post("/send-bulk", json=payload)
        return {
            "recipients_count": len(recipients),
            "sample": [{"name": r["name"], "phone": r["phone"]} for r in recipients[:10]],
            **result
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


from bson import ObjectId
import math

class StudentUpdateModel(BaseModel):
    name: str
    father_name: Optional[str] = ""
    mother_name: Optional[str] = ""
    phone: str
    admission_no: Optional[str] = ""
    roll_no: Optional[str] = ""
    class_name: Optional[str] = ""
    section: Optional[str] = ""
    dob: str  # YYYY-MM-DD
    permanent_address: Optional[str] = ""
    current_address: Optional[str] = ""
    biometric: Optional[str] = ""

def serialize_student(doc):
    if not doc:
        return None
    d = dict(doc)
    if "_id" in d:
        d["id"] = str(d["_id"])
        del d["_id"]
    return d

@wa_router.get("/birthday-campaign/students")
async def wa_list_birthday_students(
    search: str = "",
    class_name: str = "",
    section: str = "",
    page: int = 1,
    limit: int = 20,
    admin: TokenData = Depends(get_superadmin)
):
    query = {}
    if search:
        search_escaped = re.escape(search.strip())
        query["$or"] = [
            {"name": {"$regex": search_escaped, "$options": "i"}},
            {"student_name": {"$regex": search_escaped, "$options": "i"}},
            {"admission_no": {"$regex": search_escaped, "$options": "i"}},
            {"roll_no": {"$regex": search_escaped, "$options": "i"}},
            {"roll": {"$regex": search_escaped, "$options": "i"}},
            {"phone": {"$regex": search_escaped, "$options": "i"}}
        ]
    if class_name:
        query["$or"] = [
            {"class_name": {"$regex": f"^{re.escape(class_name.strip())}$", "$options": "i"}},
            {"class": {"$regex": f"^{re.escape(class_name.strip())}$", "$options": "i"}}
        ]
    if section:
        query["$or"] = [
            {"section": {"$regex": f"^{re.escape(section.strip())}$", "$options": "i"}},
            {"sec": {"$regex": f"^{re.escape(section.strip())}$", "$options": "i"}}
        ]
    
    total = await db.birthday_students.count_documents(query)
    effective_limit = limit if limit > 0 else 5000
    pages = math.ceil(total / effective_limit) if total > 0 else 1
    skip_val = (page - 1) * effective_limit
    cursor = db.birthday_students.find(query).skip(skip_val).limit(effective_limit)
    students_list = await cursor.to_list(effective_limit)
    
    serialized = [serialize_student(s) for s in students_list]
    
    return {
        "students": serialized,
        "total": total,
        "page": page,
        "limit": effective_limit,
        "pages": pages
    }

@wa_router.post("/birthday-campaign/students")
async def wa_create_birthday_student(
    payload: StudentUpdateModel,
    admin: TokenData = Depends(get_superadmin)
):
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", payload.dob):
        raise HTTPException(status_code=400, detail="Date of Birth must be in YYYY-MM-DD format")
        
    student_dict = payload.model_dump()
    student_dict["contact_no"] = payload.phone
    student_dict["admn_no"] = payload.admission_no
    student_dict["date_of_birth"] = payload.dob
    student_dict["roll"] = payload.roll_no or ""
    student_dict["roll_no"] = payload.roll_no or ""
    
    res = await db.birthday_students.insert_one(student_dict)
    created = await db.birthday_students.find_one({"_id": res.inserted_id})
    return serialize_student(created)

@wa_router.put("/birthday-campaign/students/{student_id}")
async def wa_update_birthday_student(
    student_id: str,
    payload: StudentUpdateModel,
    admin: TokenData = Depends(get_superadmin)
):
    try:
        obj_id = ObjectId(student_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid student ID format")
        
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", payload.dob):
        raise HTTPException(status_code=400, detail="Date of Birth must be in YYYY-MM-DD format")
        
    student_dict = payload.model_dump()
    student_dict["contact_no"] = payload.phone
    student_dict["admn_no"] = payload.admission_no
    student_dict["date_of_birth"] = payload.dob
    student_dict["roll"] = payload.roll_no or ""
    student_dict["roll_no"] = payload.roll_no or ""
    
    res = await db.birthday_students.update_one(
        {"_id": obj_id},
        {"$set": student_dict}
    )
    
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Student not found")
        
    return {"success": True}

@wa_router.delete("/birthday-campaign/students/{student_id}")
async def wa_delete_birthday_student(
    student_id: str,
    admin: TokenData = Depends(get_superadmin)
):
    try:
        obj_id = ObjectId(student_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid student ID format")
        
    res = await db.birthday_students.delete_one({"_id": obj_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Student not found")
        
    return {"success": True}


async def run_daily_birthday_campaign_loop():
    """
    Background loop that wakes up periodically, checks if it is past 6:00 AM in IST,
    and runs the daily birthday WhatsApp campaign for matching students.
    """
    logger.info("[Birthday Scheduler] Loop started")
    await asyncio.sleep(30)
    
    ist = timezone(timedelta(hours=5, minutes=30))
    
    while True:
        try:
            now = datetime.now(ist)
            if now.hour >= 6:
                today_str = now.strftime("%Y-%m-%d")
                
                sched_doc = await db.birthday_settings.find_one({"id": "birthday-scheduler"})
                last_run = sched_doc.get("last_run") if sched_doc else None
                
                if last_run != today_str:
                    logger.info(f"[Birthday Scheduler] Running campaign for date: {today_str}")
                    
                    month_day_suffix = now.strftime("-%m-%d")
                    cursor = db.birthday_students.find({"dob": {"$regex": f"{month_day_suffix}$"}}, {"_id": 0})
                    recipients = await cursor.to_list(10000)
                    
                    if recipients:
                        logger.info(f"[Birthday Scheduler] Found {len(recipients)} matching birthday(s)")
                        
                        tmpl = "Dear {name}, S.D. Public School wishes you a very Happy Birthday! May your year ahead be filled with joy and success. 🎂🎉"
                        contacts = []
                        for r in recipients:
                            msg = tmpl.replace("{name}", r["name"])
                            c_card_bytes = _generate_birthday_card(r["name"])
                            c_card_b64 = base64.b64encode(c_card_bytes).decode("utf-8")
                            contacts.append({
                                "phone": r["phone"],
                                "name": r["name"],
                                "message": msg,
                                "mediaBase64": c_card_b64,
                                "mediaMime": "image/jpeg",
                                "mediaType": "image"
                            })
                            
                        payload = {
                            "contacts": contacts,
                            "message": "",
                            "delayMs": WA_BULK_DELAY_MS
                        }
                        
                        try:
                            async with httpx.AsyncClient(timeout=30.0) as client:
                                r = await client.post(
                                    f"{WA_SERVICE_URL}/send-bulk",
                                    headers={"X-WA-Secret": WA_API_SECRET},
                                    json=payload
                                )
                            if r.status_code < 300:
                                logger.info(f"[Birthday Scheduler] Campaign started successfully: {r.text}")
                            else:
                                logger.warning(f"[Birthday Scheduler] Node service returned {r.status_code}: {r.text}")
                        except Exception as e:
                            logger.error(f"[Birthday Scheduler] Error sending campaign: {e}")
                    else:
                        logger.info("[Birthday Scheduler] No matching birthdays today")
                        
                    await db.birthday_settings.update_one(
                        {"id": "birthday-scheduler"},
                        {"$set": {"last_run": today_str}},
                        upsert=True
                    )
            
        except Exception as e:
            logger.error(f"[Birthday Scheduler] Loop exception: {e}")
            
        await asyncio.sleep(600)
