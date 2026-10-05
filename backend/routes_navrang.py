from fastapi import APIRouter, HTTPException, Depends, Query, Request, Response, Body
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from pymongo import UpdateOne
import uuid
import datetime
import re
import random
import string
import csv
import io
import time
import logging

from auth import get_superadmin, get_current_admin, TokenData
from models import now_iso, new_id

logger = logging.getLogger("sdps.navrang")

navrang_router = APIRouter(prefix="/api/navrang", tags=["navrang"])
db = None

def init_db(database):
    global db
    db = database

async def _find_roster_student(adm_no: str):
    if not adm_no:
        return None
    raw = str(adm_no).strip()
    digits = re.sub(r'\D', '', raw)

    # 1. Exact match on raw string in dedicated navrang_roster
    student = await db.navrang_roster.find_one({"admission_no": raw}, {"_id": 0})
    if student:
        return student

    # 2. Case-insensitive exact match
    student = await db.navrang_roster.find_one({"admission_no": {"$regex": f"^{re.escape(raw)}$", "$options": "i"}}, {"_id": 0})
    if student:
        return student

    # 3. If raw doesn't start with SDPS, try adding SDPS (e.g. user entered "2" -> "SDPS2")
    if not raw.upper().startswith("SDPS"):
        student = await db.navrang_roster.find_one({"admission_no": f"SDPS{raw}"}, {"_id": 0})
        if student:
            return student
        if digits:
            digits_int = str(int(digits))
            student = await db.navrang_roster.find_one({"admission_no": f"SDPS{digits_int}"}, {"_id": 0})
            if student:
                return student

    # 4. If raw starts with SDPS, try stripping it (e.g. user entered "SDPS2", roster stored "2")
    if raw.upper().startswith("SDPS"):
        stripped = raw[4:].strip().lstrip("-").lstrip("_")
        student = await db.navrang_roster.find_one({"admission_no": stripped}, {"_id": 0})
        if student:
            return student
        if digits:
            digits_int = str(int(digits))
            student = await db.navrang_roster.find_one({"admission_no": digits_int}, {"_id": 0})
            if student:
                return student

    # 5. Regex match with optional SDPS prefix, hyphens, and leading zeros
    if digits:
        digits_int = str(int(digits))
        pattern = f"^(SDPS|sdps)?[\\s\\-_]*0*{digits_int}$"
        student = await db.navrang_roster.find_one({"admission_no": {"$regex": pattern, "$options": "i"}}, {"_id": 0})
        if student:
            return student

    return None

# Simple in-memory rate limiting for verify-student
verify_rate_limits = {}

def check_rate_limit(ip: str):
    now = time.time()
    if ip not in verify_rate_limits:
        verify_rate_limits[ip] = []
    verify_rate_limits[ip] = [t for t in verify_rate_limits[ip] if now - t < 60]
    if len(verify_rate_limits[ip]) >= 20:
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again in a minute.")
    verify_rate_limits[ip].append(now)

def get_client_ip(request: Request) -> str:
    if request.headers.get("X-Forwarded-For"):
        return request.headers.get("X-Forwarded-For").split(",")[0].strip()
    return request.client.host if request.client else "unknown"

def _normalize_name(name: str) -> str:
    if not name:
        return ""
    cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", name.lower())
    return " ".join(cleaned.split())

def _name_matches(entered: str, registered: str) -> bool:
    e = _normalize_name(entered)
    r = _normalize_name(registered)
    if not e or not r:
        return False
    if e == r:
        return True
    e_words = e.split()
    r_words = r.split()
    if all(w in r_words for w in e_words):
        return True
    if e_words and r_words and e_words[0] == r_words[0]:
        return True
    if e in r or r in e:
        return True
    return False

# --- Models ---

class StudentVerifyRequest(BaseModel):
    admission_no: str
    student_name: Optional[str] = None
    name: Optional[str] = None

class BookingStudent(BaseModel):
    admission_no: str

class BookRequest(BaseModel):
    package: Optional[str] = None
    package_id: Optional[str] = None
    students: List[Any] = []
    parent_name: str
    parent_phone: Optional[str] = None
    phone: Optional[str] = None
    parent_email: Optional[str] = None
    email: Optional[str] = None
    payment_method: Optional[str] = "UPI"
    payment_ref: Optional[str] = None
    utr_number: Optional[str] = None
    upi_id_used: Optional[str] = None

class MyTicketsRequest(BaseModel):
    phone: str

class VerifyEntryRequest(BaseModel):
    qr_token: Optional[str] = None
    booking_id: Optional[str] = None

class BookingActionRequest(BaseModel):
    action: Optional[str] = None
    payment_status: Optional[str] = None
    payment_method: Optional[str] = None
    payment_ref: Optional[str] = None

class PaymentUpdateRequest(BaseModel):
    payment_status: str
    payment_method: Optional[str] = None
    payment_ref: Optional[str] = None

# --- Public Endpoints ---

DEFAULT_PACKAGES = {
    "silver": {"name": "Silver Pass", "price": 299, "children": 1, "desc": "1 child + 1 mother, includes 1 pair of Dandiya sticks"},
    "gold": {"name": "Gold Pass", "price": 399, "children": 2, "desc": "2 children + 1 mother, includes 1 pair of Dandiya sticks"},
    "platinum": {"name": "Platinum Pass", "price": 499, "children": 3, "desc": "3 children + 1 mother, includes 1 pair of Dandiya sticks"},
}

@navrang_router.get("/config")
async def get_config():
    config = await db.navrang_config.find_one({}, {"_id": 0})
    if not config:
        config = {
            "event_name": "Navrang 2026",
            "event_date": "2026-10-15",
            "event_time": "6:00 PM – 10:00 PM",
            "venue": "S.D. Public School Main Campus, Patna",
            "booking_open": True,
            "max_tickets": 1000,
            "rules": [
                "Only current students of S.D. Public School are eligible to book.",
                "Valid QR Ticket (digital or printed) is mandatory for campus entry.",
                "Traditional Indian / Dandiya festive attire is strongly encouraged.",
                "One mother is permitted per booking package alongside the student(s).",
                "Tickets are non-transferable and strictly non-refundable."
            ],
            "contact_phone": "+91 99551 90262",
            "upi_id": "sdpublicpatna@sbi",
            "upi_merchant_name": "S.D. Public School, Patna",
            "upi_instructions": "1. Scan the QR code or tap 'Pay via Any UPI App' (GPay, PhonePe, Paytm, BHIM).\n2. Pay the exact pass amount.\n3. Enter the 12-digit UPI UTR / Transaction Reference Number from your payment receipt."
        }
    if not config.get("upi_id"):
        config["upi_id"] = "sdpublicpatna@sbi"
    if not config.get("upi_merchant_name"):
        config["upi_merchant_name"] = "S.D. Public School, Patna"
    if not config.get("upi_instructions"):
        config["upi_instructions"] = "1. Scan the QR code or tap 'Pay via Any UPI App' (GPay, PhonePe, Paytm, BHIM).\n2. Pay the exact pass amount.\n3. Enter the 12-digit UPI UTR / Transaction Reference Number from your payment receipt."
    config["packages"] = DEFAULT_PACKAGES
    return config

@navrang_router.post("/verify-student")
async def verify_student(req: StudentVerifyRequest, request: Request):
    ip = get_client_ip(request)
    check_rate_limit(ip)
    
    clean_adm = (req.admission_no or "").strip()
    if not clean_adm:
        raise HTTPException(status_code=400, detail="Admission number is required.")

    student = await _find_roster_student(clean_adm)
    if not student:
        raise HTTPException(
            status_code=404, 
            detail=f"Student with admission number '{clean_adm}' not found in SDPS school roster. Only verified current SDPS students are eligible to book passes."
        )
    
    registered_name = (student.get("student_name") or student.get("name") or "").strip()
    entered_name = (req.student_name or req.name or "").strip()
    
    # If student_name was explicitly passed, verify name match as well
    if entered_name and not _name_matches(entered_name, registered_name):
        raise HTTPException(
            status_code=400, 
            detail=f"The entered student name does not match school records for admission number {clean_adm}. Please verify the spelling or enter the name registered with the school."
        )

    # Check if student has already booked
    existing = await db.navrang_bookings.find_one({
        "students.admission_no": student["admission_no"],
        "payment_status": {"$ne": "failed"}
    })
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"Student {student['admission_no']} ({registered_name}) already has an active booking ({existing.get('booking_id')}). Duplicate bookings for the same student are prohibited."
        )
    
    phone_val = student.get("phone") or student.get("contact_no") or student.get("Contact_No") or ""

    return {
        "status": "success",
        "verified": True,
        "student": {
            "name": registered_name,
            "student_name": registered_name,
            "admission_no": student.get("admission_no", clean_adm),
            "class_name": student.get("class_name", ""),
            "section": student.get("section", ""),
            "roll_no": student.get("roll_no", ""),
            "father_name": student.get("father_name", ""),
            "mother_name": student.get("mother_name", ""),
            "phone": str(phone_val).strip(),
            "contact_no": str(phone_val).strip()
        }
    }

@navrang_router.post("/book")
async def book_tickets(req: BookRequest):
    config = await get_config()
    if not config.get("booking_open", True):
        raise HTTPException(status_code=400, detail="Online bookings are currently closed.")
        
    total_bookings = await db.navrang_bookings.count_documents({"payment_status": {"$ne": "failed"}})
    if total_bookings >= config.get("max_tickets", 1000):
        raise HTTPException(status_code=400, detail="Event is completely sold out.")

    packages = config.get("packages", DEFAULT_PACKAGES)
    
    pkg_str = req.package or req.package_id or ""
    pkg_key = pkg_str.lower().strip()
    if pkg_key not in packages:
        raise HTTPException(status_code=400, detail="Invalid package selected.")
        
    pkg_info = packages[pkg_key]
    required_children = pkg_info.get("children", 1)
    if len(req.students) != required_children:
        raise HTTPException(status_code=400, detail=f"The {pkg_key.title()} package requires verifying exactly {required_children} student(s).")
    
    raw_phone = req.parent_phone or req.phone or ""
    parent_phone_clean = re.sub(r"\D", "", raw_phone)[-10:]
    if len(parent_phone_clean) != 10:
        raise HTTPException(status_code=400, detail="Please provide a valid 10-digit mobile number for ticket and WhatsApp confirmation.")

    parent_email_val = (req.parent_email or req.email or "").strip()

    verified_students = []
    for s in req.students:
        if isinstance(s, dict):
            adm_val = str(s.get("admission_no") or s.get("id") or "").strip()
        elif hasattr(s, "admission_no"):
            adm_val = str(s.admission_no).strip()
        elif isinstance(s, str):
            adm_val = s.strip()
        else:
            adm_val = str(s).strip()

        if not adm_val:
            raise HTTPException(status_code=400, detail="Student admission number is required.")

        student = await _find_roster_student(adm_val)
        if not student:
            raise HTTPException(status_code=404, detail=f"Student with admission number {adm_val} not found in SDPS roster.")
            
        # Check if already booked
        existing_booking = await db.navrang_bookings.find_one({
            "students.admission_no": student["admission_no"],
            "payment_status": {"$ne": "failed"}
        })
        if existing_booking:
            raise HTTPException(status_code=400, detail=f"Student {student['admission_no']} already has an active booking ({existing_booking.get('booking_id')}). Duplicate bookings are prohibited.")
            
        verified_students.append({
            "admission_no": student["admission_no"],
            "name": student.get("student_name", ""),
            "class_name": student.get("class_name", ""),
            "section": student.get("section", ""),
            "roll_no": student.get("roll_no", ""),
            "father_name": student.get("father_name", ""),
            "mother_name": student.get("mother_name", "")
        })

    booking_id = f"NVR-2026-{''.join(random.choices(string.ascii_uppercase + string.digits, k=4))}"
    while await db.navrang_bookings.find_one({"booking_id": booking_id}):
        booking_id = f"NVR-2026-{''.join(random.choices(string.ascii_uppercase + string.digits, k=4))}"

    qr_token = str(uuid.uuid4())
    
    utr_val = (req.payment_ref or req.utr_number or "").strip()
    if not utr_val:
        raise HTTPException(status_code=400, detail="Please provide the 12-digit UPI Transaction ID / UTR reference number.")

    booking_doc = {
        "_id": new_id(),
        "booking_id": booking_id,
        "qr_token": qr_token,
        "package": pkg_key,
        "price": pkg_info["price"],
        "students": verified_students,
        "parent_name": req.parent_name.strip(),
        "parent_phone": parent_phone_clean,
        "parent_email": parent_email_val,
        "payment_method": req.payment_method or "UPI",
        "payment_ref": utr_val,
        "upi_id_used": req.upi_id_used or config.get("upi_id", "sdpublicpatna@sbi"),
        "payment_status": "pending",
        "entry_status": "not_entered",
        "created_at": now_iso()
    }
    
    await db.navrang_bookings.insert_one(booking_doc)

    # Trigger transactional WhatsApp confirmation message
    try:
        student_lines = []
        for s in verified_students:
            s_name = s.get("name") or "Student"
            s_adm = s.get("admission_no") or ""
            s_cls = f"Class {s.get('class_name')} {s.get('section', '')}".strip() if s.get('class_name') else ""
            line = f"• {s_name} (Adm: {s_adm})"
            if s_cls:
                line += f" - {s_cls}"
            student_lines.append(line)
        students_text = "\n".join(student_lines)

        pkg_title = pkg_info.get("name", f"{pkg_key.title()} Pass")
        event_date = config.get("event_date", "15 Oct 2026")
        event_time = config.get("event_time", "6:00 PM – 10:00 PM")
        venue = config.get("venue", "S.D. Public School Main Campus, Patna")
        ticket_link = f"https://navrang.sdpublic.org/my-ticket?booking_id={booking_id}"

        wa_msg = (
            f"🎉 *NAVRANG 2026 PASS BOOKING CONFIRMED!* 🎆\n"
            f"*S.D. Public School, Patna*\n\n"
            f"Dear *{booking_doc['parent_name']}*,\n"
            f"Namaste! Your Navrang 2026 Dandiya & Durga Puja Celebration Night pass has been booked successfully.\n\n"
            f"📋 *BOOKING DETAILS:*\n"
            f"• *Booking ID:* {booking_id}\n"
            f"• *Pass Package:* {pkg_title} (₹{pkg_info['price']})\n"
            f"• *UPI UTR Number:* {utr_val}\n"
            f"• *Payment Status:* Submitted (Pending Admin Approval)\n\n"
            f"👨‍🎓 *STUDENT(S):*\n"
            f"{students_text}\n\n"
            f"🎟️ *ACCESS YOUR DIGITAL ENTRY PASS:*\n"
            f"👉 {ticket_link}\n\n"
            f"📍 *EVENT SCHEDULE:*\n"
            f"• *Date & Time:* {event_date} | {event_time}\n"
            f"• *Venue:* {venue}\n\n"
            f"⚠️ *Important Entry Guidelines:*\n"
            f"1. Please keep your QR pass handy on your mobile at the school entrance gate.\n"
            f"2. Pass admits student(s) + 1 Mother and includes 1 pair of Dandiya sticks.\n"
            f"3. Traditional festive attire is encouraged.\n\n"
            f"📞 *School Desk:* +91 99551 90262\n"
            f"— *S.D. Public School, Patna*"
        )

        from whatsapp_service import send_whatsapp_text
        await send_whatsapp_text(
            phone=booking_doc["parent_phone"],
            message=wa_msg,
            subject=f"Navrang 2026 Pass Confirmation - {booking_id}"
        )
    except Exception as wa_e:
        logger.warning(f"Could not send WhatsApp booking message: {wa_e}")
    
    return {
        "booking_id": booking_id,
        "qr_token": qr_token,
        "price": pkg_info["price"],
        "package": pkg_key,
        "students": verified_students,
        "parent_name": booking_doc["parent_name"],
        "parent_phone": booking_doc["parent_phone"],
        "payment_method": booking_doc["payment_method"],
        "payment_ref": booking_doc["payment_ref"],
        "payment_status": booking_doc["payment_status"],
        "message": "Booking created successfully. Pending school payment verification."
    }

@navrang_router.get("/booking/{booking_id}")
async def get_booking(booking_id: str, phone: Optional[str] = Query(None)):
    query = {"$or": [{"booking_id": booking_id}, {"booking_id": booking_id.upper()}]}
    booking = await db.navrang_bookings.find_one(query, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if phone:
        clean_phone = re.sub(r"\D", "", phone)[-10:]
        if booking.get("parent_phone") != clean_phone:
            raise HTTPException(status_code=403, detail="Phone number does not match this booking record.")
    return booking

@navrang_router.post("/my-tickets")
async def get_my_tickets(req: MyTicketsRequest):
    clean_phone = re.sub(r"\D", "", req.phone)[-10:]
    cursor = db.navrang_bookings.find(
        {"$or": [
            {"parent_phone": clean_phone},
            {"booking_id": req.phone.strip().upper()},
            {"booking_id": req.phone.strip()}
        ]},
        {"_id": 0}
    ).sort("created_at", -1)
    bookings = await cursor.to_list(length=None)
    return {"bookings": bookings}

# --- Admin Endpoints ---

@navrang_router.get("/admin/stats")
async def get_admin_stats(token: TokenData = Depends(get_current_admin)):
    pipeline = [
        {"$group": {
            "_id": None,
            "total_bookings": {"$sum": 1},
            "total_revenue": {
                "$sum": {
                    "$cond": [{"$in": ["$payment_status", ["paid", "cash"]]}, "$price", 0]
                }
            },
            "total_entered": {
                "$sum": {
                    "$cond": [{"$eq": ["$entry_status", "entered"]}, 1, 0]
                }
            }
        }}
    ]
    
    stats_res = await db.navrang_bookings.aggregate(pipeline).to_list(1)
    stats = stats_res[0] if stats_res else {"total_bookings": 0, "total_revenue": 0, "total_entered": 0}
    if "_id" in stats:
        del stats["_id"]

    payment_breakdown = {}
    async for b in db.navrang_bookings.aggregate([{"$group": {"_id": "$payment_status", "count": {"$sum": 1}}}]):
        payment_breakdown[b["_id"] or "pending"] = b["count"]

    package_breakdown = {}
    async for b in db.navrang_bookings.aggregate([{"$group": {"_id": "$package", "count": {"$sum": 1}}}]):
        package_breakdown[b["_id"] or "silver"] = b["count"]

    recent_cursor = db.navrang_bookings.find({}, {"_id": 0}).sort("created_at", -1).limit(10)
    recent_bookings = await recent_cursor.to_list(length=10)

    packages_list = [
        {"name": "silver", "count": package_breakdown.get("silver", 0)},
        {"name": "gold", "count": package_breakdown.get("gold", 0)},
        {"name": "platinum", "count": package_breakdown.get("platinum", 0)}
    ]

    return {
        "total_bookings": stats.get("total_bookings", 0),
        "total_revenue": stats.get("total_revenue", 0),
        "entries_recorded": stats.get("total_entered", 0),
        "pending_payments": payment_breakdown.get("pending", 0),
        "packages": packages_list,
        "recent_bookings": recent_bookings
    }

@navrang_router.get("/admin/bookings")
async def get_admin_bookings(
    search: Optional[str] = Query(None),
    payment_status: Optional[str] = Query(None),
    entry_status: Optional[str] = Query(None),
    package: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    token: TokenData = Depends(get_current_admin)
):
    query = {}
    if search:
        s = search.strip()
        query["$or"] = [
            {"booking_id": {"$regex": re.escape(s), "$options": "i"}},
            {"parent_name": {"$regex": re.escape(s), "$options": "i"}},
            {"parent_phone": {"$regex": re.escape(s), "$options": "i"}},
            {"payment_ref": {"$regex": re.escape(s), "$options": "i"}},
            {"students.name": {"$regex": re.escape(s), "$options": "i"}},
            {"students.admission_no": {"$regex": re.escape(s), "$options": "i"}}
        ]
    if payment_status and payment_status != "all":
        query["payment_status"] = payment_status
    if entry_status and entry_status != "all":
        query["entry_status"] = entry_status
    if package and package != "all":
        query["package"] = package

    skip = (page - 1) * limit
    cursor = db.navrang_bookings.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    bookings = await cursor.to_list(length=None)
    total = await db.navrang_bookings.count_documents(query)

    return {
        "bookings": bookings,
        "total": total,
        "page": page,
        "limit": limit
    }

@navrang_router.post("/admin/verify-entry")
async def admin_verify_entry(req: VerifyEntryRequest, token: TokenData = Depends(get_current_admin)):
    identifier = (req.qr_token or req.booking_id or "").strip()
    if not identifier:
        raise HTTPException(status_code=400, detail="Please scan a QR code or enter a Booking ID.")
        
    booking = await db.navrang_bookings.find_one({
        "$or": [
            {"qr_token": identifier},
            {"booking_id": identifier.upper()},
            {"booking_id": identifier}
        ]
    })
    
    if not booking:
        raise HTTPException(status_code=404, detail="Invalid Ticket: No booking found for this code.")
        
    if booking.get("payment_status") not in ["paid", "cash"]:
        raise HTTPException(status_code=400, detail=f"Cannot allow entry: Payment status is '{booking.get('payment_status', 'pending')}'. Please collect payment or verify UTR first.")
        
    if booking.get("entry_status") == "entered":
        raise HTTPException(status_code=400, detail=f"ALREADY USED: This ticket was already checked in at {booking.get('entry_time', 'earlier')}.")
        
    update_data = {
        "entry_status": "entered",
        "entry_time": now_iso(),
        "entry_marked_by": token.sub
    }
    
    await db.navrang_bookings.update_one({"booking_id": booking["booking_id"]}, {"$set": update_data})
    
    booking.update(update_data)
    if "_id" in booking:
        del booking["_id"]
        
    return {
        "status": "success",
        "message": "Entry verified and marked successfully!",
        "booking": booking
    }

@navrang_router.post("/admin/bookings/{booking_id}/action")
@navrang_router.put("/admin/bookings/{booking_id}/payment")
@navrang_router.put("/admin/booking/{booking_id}/payment")
async def update_booking_action(
    booking_id: str, 
    req: BookingActionRequest,
    token: TokenData = Depends(get_current_admin)
):
    booking = await db.navrang_bookings.find_one({"booking_id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    update_data = {"updated_at": now_iso()}
    action = req.action or req.payment_status
    if action in ("mark_paid", "paid", "verify_paid"):
        update_data["payment_status"] = "paid"
        update_data["verified_by"] = token.sub
        update_data["verified_at"] = now_iso()
    elif action in ("mark_cash", "cash"):
        update_data["payment_status"] = "cash"
        update_data["verified_by"] = token.sub
        update_data["verified_at"] = now_iso()
    elif action in ("mark_pending", "pending"):
        update_data["payment_status"] = "pending"
    elif action in ("reject", "reject_payment", "mark_failed", "failed"):
        update_data["payment_status"] = "failed"
    elif req.payment_status:
        update_data["payment_status"] = req.payment_status

    if req.payment_method:
        update_data["payment_method"] = req.payment_method
    if req.payment_ref:
        update_data["payment_ref"] = req.payment_ref
        
    await db.navrang_bookings.update_one({"booking_id": booking_id}, {"$set": update_data})

    # If action is verify_paid or mark_paid, send WhatsApp confirmation
    if action in ("mark_paid", "paid", "verify_paid") and booking.get("parent_phone"):
        try:
            ticket_link = f"https://navrang.sdpublic.org/my-ticket?booking_id={booking_id}"
            verified_wa_msg = (
                f"✅ *PAYMENT VERIFIED — NAVRANG 2026 PASS ACTIVATED!* 🎟️\n"
                f"*S.D. Public School, Patna*\n\n"
                f"Dear *{booking.get('parent_name', 'Parent')}*,\n"
                f"Your UPI payment (UTR: {booking.get('payment_ref', 'N/A')}) for Navrang 2026 has been *VERIFIED & APPROVED* by the school administration.\n\n"
                f"🎫 *Booking ID:* {booking_id}\n"
                f"✨ *Pass Status:* ACTIVE & READY FOR GATE ENTRY\n\n"
                f"👉 *Open Your Verified Entry QR Pass:*\n"
                f"{ticket_link}\n\n"
                f"See you at the Navrang celebration! 🎆\n"
                f"— *S.D. Public School, Patna*"
            )
            from whatsapp_service import send_whatsapp_text
            await send_whatsapp_text(
                phone=booking.get("parent_phone"),
                message=verified_wa_msg,
                subject=f"Navrang 2026 Pass Verified - {booking_id}"
            )
        except Exception as wa_err:
            logger.warning(f"Could not send WhatsApp verification message: {wa_err}")

    return {"status": "success", "message": "Booking updated successfully."}

@navrang_router.get("/admin/export")
async def export_bookings(token: TokenData = Depends(get_current_admin)):
    cursor = db.navrang_bookings.find({}).sort("created_at", -1)
    bookings = await cursor.to_list(length=None)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        "Booking ID", "Created At", "Parent Name", "Parent Phone", "Package", 
        "Price", "Payment Status", "Payment Method", "UTR / Ref No", "Entry Status", "Student 1", "Student 2", "Student 3"
    ])
    
    for b in bookings:
        stus = b.get("students", [])
        s1 = f"{stus[0].get('name')} ({stus[0].get('admission_no')})" if len(stus) > 0 else ""
        s2 = f"{stus[1].get('name')} ({stus[1].get('admission_no')})" if len(stus) > 1 else ""
        s3 = f"{stus[2].get('name')} ({stus[2].get('admission_no')})" if len(stus) > 2 else ""
        
        writer.writerow([
            b.get("booking_id", ""),
            b.get("created_at", ""),
            b.get("parent_name", ""),
            b.get("parent_phone", ""),
            b.get("package", ""),
            b.get("price", 0),
            b.get("payment_status", ""),
            b.get("payment_method", ""),
            b.get("payment_ref", ""),
            b.get("entry_status", ""),
            s1, s2, s3
        ])
        
    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=navrang_bookings_2026.csv"}
    )

@navrang_router.put("/admin/config")
async def update_config(config_data: dict, token: TokenData = Depends(get_superadmin)):
    if "_id" in config_data:
        del config_data["_id"]
    await db.navrang_config.update_one({}, {"$set": config_data}, upsert=True)
    return {"status": "success", "message": "Event configuration updated successfully."}

@navrang_router.delete("/admin/bookings/{booking_id}")
@navrang_router.delete("/admin/booking/{booking_id}")
async def delete_booking(booking_id: str, token: TokenData = Depends(get_current_admin)):
    result = await db.navrang_bookings.delete_one({"booking_id": booking_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"status": "success", "message": "Booking deleted successfully."}

# --- Student Roster Management for Event Eligibility ---

@navrang_router.get("/admin/roster")
async def get_admin_roster(
    search: Optional[str] = Query(None),
    class_name: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    token: TokenData = Depends(get_current_admin)
):
    query = {}
    if search:
        escaped = re.escape(search.strip())
        query["$or"] = [
            {"admission_no": {"$regex": escaped, "$options": "i"}},
            {"student_name": {"$regex": escaped, "$options": "i"}},
            {"father_name": {"$regex": escaped, "$options": "i"}},
            {"mother_name": {"$regex": escaped, "$options": "i"}},
            {"phone": {"$regex": escaped, "$options": "i"}},
        ]
    if class_name:
        query["class_name"] = {"$regex": f"^{re.escape(class_name.strip())}$", "$options": "i"}

    total = await db.navrang_roster.count_documents(query)
    cursor = db.navrang_roster.find(query, {"_id": 0}).sort("admission_no", 1).skip((page - 1) * limit).limit(limit)
    students = await cursor.to_list(length=limit)

    # Check which students have booked
    adm_nos = [s.get("admission_no") for s in students if s.get("admission_no")]
    booked_cursor = db.navrang_bookings.find(
        {"students.admission_no": {"$in": adm_nos}, "payment_status": {"$ne": "failed"}},
        {"booking_id": 1, "students.admission_no": 1, "payment_status": 1}
    )
    booked_list = await booked_cursor.to_list(length=len(adm_nos) * 3 + 10)
    booked_map = {}
    for b in booked_list:
        for st in b.get("students", []):
            booked_map[st.get("admission_no")] = {
                "booking_id": b.get("booking_id"),
                "payment_status": b.get("payment_status")
            }

    for s in students:
        s["booking"] = booked_map.get(s.get("admission_no"), None)

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "students": students
    }

def _get_row_val(item: dict, *keys) -> str:
    """Helper to extract column value case-insensitively with flexible aliases."""
    for k in keys:
        if k in item and item[k] is not None:
            return str(item[k]).strip()
    norm_map = {re.sub(r'[\s_\-.]', '', k.lower()): v for k, v in item.items() if v is not None}
    for k in keys:
        norm_k = re.sub(r'[\s_\-.]', '', k.lower())
        if norm_k in norm_map:
            return str(norm_map[norm_k]).strip()
    return ""

@navrang_router.post("/admin/roster/upload")
async def upload_admin_roster(
    payload: Dict[str, Any] = Body(...),
    token: TokenData = Depends(get_current_admin)
):
    students_data = payload.get("students", [])
    replace_all = payload.get("replace", False)

    if not students_data or not isinstance(students_data, list):
        raise HTTPException(status_code=400, detail="No student records found in upload payload.")

    if replace_all:
        await db.navrang_roster.delete_many({})

    operations = []
    for item in students_data:
        adm = _get_row_val(
            item, 
            "Admn_No", "admn_no", "Admn No", "ADMN_NO", 
            "admission_no", "Admission No", "Admission Number", "Adm No", "adm_no", "Roll No"
        )
        name = _get_row_val(
            item, 
            "Name", "name", "student_name", "Student Name", "Student_Name"
        )

        if not adm or not name:
            continue

        c_name = _get_row_val(item, "Class", "class", "class_name", "Class_Name", "Grade")
        sec = _get_row_val(item, "Section", "section", "sec")
        roll = _get_row_val(item, "Roll_no", "roll_no", "Roll No", "Roll_No", "roll")
        father = _get_row_val(item, "Father_Name", "father_name", "Father Name", "Father's Name", "Parent Name")
        mother = _get_row_val(item, "Mother_Name", "mother_name", "Mother Name", "Mother's Name")
        phone = _get_row_val(item, "Contact_No", "contact_no", "Contact No", "phone", "Phone", "Mobile")

        doc = {
            "admission_no": adm,
            "student_name": name,
            "class_name": c_name,
            "section": sec,
            "roll_no": roll,
            "father_name": father,
            "mother_name": mother,
            "phone": phone,
            "contact_no": phone,
            "updated_at": now_iso()
        }

        operations.append(
            UpdateOne(
                {"admission_no": adm},
                {"$set": doc, "$setOnInsert": {"created_at": now_iso()}},
                upsert=True
            )
        )

    if not operations:
        raise HTTPException(
            status_code=400, 
            detail="No valid student rows containing both Admn_No and Name were found in the uploaded file."
        )

    await db.navrang_roster.bulk_write(operations)
    total_in_roster = await db.navrang_roster.count_documents({})

    return {
        "status": "success",
        "message": f"Successfully processed {len(operations)} student records into the Dandiya roster.",
        "imported_count": len(operations),
        "total_roster_count": total_in_roster
    }

@navrang_router.delete("/admin/roster/clear")
async def clear_admin_roster(token: TokenData = Depends(get_current_admin)):
    await db.navrang_roster.delete_many({})
    return {"status": "success", "message": "Dandiya student roster cleared successfully."}

@navrang_router.delete("/admin/roster/{admission_no}")
async def delete_roster_student(admission_no: str, token: TokenData = Depends(get_current_admin)):
    res = await db.navrang_roster.delete_one({"admission_no": admission_no})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Student record not found in Dandiya roster.")
    return {"status": "success", "message": f"Student {admission_no} removed from Dandiya roster."}

@navrang_router.get("/admin/roster/template")
async def get_admin_roster_template(token: TokenData = Depends(get_current_admin)):
    csv_content = (
        "Class,Section,Roll_no,Name,Father_Name,Mother_Name,Contact_No,Admn_No\n"
        "CLASS-I,A,08,Aksh Chaudhary,Santosh Chaudhary,Rupa Chaudahray,9334120156,SDPS2\n"
        "CLASS-I,A,5,Aarna Kashyap,Vicky Kumar,Rinku Kumari,8804145581,SDPS8\n"
        "CLASS-I,A,31,Sanshkrita,Kameshwer Shah,Sushma Devi,8709912503,SDPS13\n"
        "CLASS-I,A,14,Anurag Mehta,Amit Kumar,Poonam Kumari,9576224419,SDPS15\n"
    )
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sdps_student_roster_template.csv"}
    )
