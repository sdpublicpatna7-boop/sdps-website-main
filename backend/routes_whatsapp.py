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
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from auth import get_superadmin, TokenData

logger = logging.getLogger("sdps.whatsapp")
limiter = Limiter(key_func=get_remote_address)

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
