from fastapi import APIRouter, HTTPException, Depends, Query, Request, Response, Body
from fastapi.responses import JSONResponse, HTMLResponse, FileResponse
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
import os
import logging
import razorpay

from auth import get_superadmin, get_current_admin, TokenData
from models import now_iso, new_id

logger = logging.getLogger("sdps.navrang")

navrang_router = APIRouter(prefix="/api/navrang", tags=["navrang"])
db = None

def init_db(database):
    global db
    db = database

async def _lookup_in_collection(coll, raw: str, digits: str):
    if coll is None:
        return None
    # 1. Exact match on raw string
    student = await coll.find_one({"admission_no": raw}, {"_id": 0})
    if student:
        return student

    # 2. Case-insensitive exact match
    student = await coll.find_one({"admission_no": {"$regex": f"^{re.escape(raw)}$", "$options": "i"}}, {"_id": 0})
    if student:
        return student

    # 3. If raw doesn't start with SDPS, try adding SDPS (e.g. user entered "2" -> "SDPS2")
    if not raw.upper().startswith("SDPS"):
        student = await coll.find_one({"admission_no": f"SDPS{raw}"}, {"_id": 0})
        if student:
            return student
        student = await coll.find_one({"admission_no": {"$regex": f"^SDPS{re.escape(raw)}$", "$options": "i"}}, {"_id": 0})
        if student:
            return student
        if digits:
            digits_int = str(int(digits))
            student = await coll.find_one({"admission_no": f"SDPS{digits_int}"}, {"_id": 0})
            if student:
                return student
            student = await coll.find_one({"admission_no": {"$regex": f"^SDPS0*{digits_int}$", "$options": "i"}}, {"_id": 0})
            if student:
                return student

    # 4. If raw starts with SDPS, try stripping it (e.g. user entered "SDPS2", roster stored "2")
    if raw.upper().startswith("SDPS"):
        stripped = raw[4:].strip().lstrip("-").lstrip("_")
        student = await coll.find_one({"admission_no": stripped}, {"_id": 0})
        if student:
            return student
        student = await coll.find_one({"admission_no": {"$regex": f"^{re.escape(stripped)}$", "$options": "i"}}, {"_id": 0})
        if student:
            return student
        if digits:
            digits_int = str(int(digits))
            student = await coll.find_one({"admission_no": digits_int}, {"_id": 0})
            if student:
                return student
            student = await coll.find_one({"admission_no": {"$regex": f"^0*{digits_int}$", "$options": "i"}}, {"_id": 0})
            if student:
                return student

    # 5. Regex match with optional SDPS prefix, hyphens, and leading zeros
    if digits:
        digits_int = str(int(digits))
        pattern = f"^(SDPS|sdps)?[\\s\\-_]*0*{digits_int}$"
        student = await coll.find_one({"admission_no": {"$regex": pattern, "$options": "i"}}, {"_id": 0})
        if student:
            return student

    return None

async def _find_roster_student(adm_no: str):
    if not adm_no or db is None:
        return None
    raw = str(adm_no).strip()
    digits = re.sub(r'\D', '', raw)

    # 1. Search in dedicated Dandiya roster first
    try:
        student = await _lookup_in_collection(db.navrang_roster, raw, digits)
        if student:
            return student
    except Exception as e:
        logger.warning(f"Error checking navrang_roster: {e}")

    # 2. Fallback to main school apaar_roster
    try:
        student = await _lookup_in_collection(db.apaar_roster, raw, digits)
        if student:
            return student
    except Exception as e:
        logger.warning(f"Error checking apaar_roster fallback: {e}")

    return None

async def seed_navrang_defaults():
    """Seed sample students for local dev/testing if both navrang_roster and apaar_roster are empty."""
    if db is None:
        return
    try:
        nav_count = await db.navrang_roster.count_documents({})
        apaar_count = await db.apaar_roster.count_documents({})
        if nav_count == 0 and apaar_count == 0:
            sample_students = [
                {
                    "admission_no": "SDPS101",
                    "student_name": "Surbhi",
                    "class_name": "CLASS-III",
                    "section": "A",
                    "roll_no": "24",
                    "father_name": "Sanjeet Kumar",
                    "mother_name": "Nilu Kumari",
                    "phone": "7488454722",
                    "contact_no": "7488454722",
                    "created_at": now_iso()
                },
                {
                    "admission_no": "SDPS2",
                    "student_name": "Aksh Chaudhary",
                    "class_name": "CLASS-I",
                    "section": "A",
                    "roll_no": "08",
                    "father_name": "Santosh Chaudhary",
                    "mother_name": "Rupa Chaudahray",
                    "phone": "9334120156",
                    "contact_no": "9334120156",
                    "created_at": now_iso()
                },
                {
                    "admission_no": "SDPS8",
                    "student_name": "Aarna Kashyap",
                    "class_name": "CLASS-I",
                    "section": "A",
                    "roll_no": "5",
                    "father_name": "Vicky Kumar",
                    "mother_name": "Rinku Kumari",
                    "phone": "8804145581",
                    "contact_no": "8804145581",
                    "created_at": now_iso()
                },
                {
                    "admission_no": "SDPS13",
                    "student_name": "Sanshkrita",
                    "class_name": "CLASS-I",
                    "section": "A",
                    "roll_no": "31",
                    "father_name": "Kameshwer Shah",
                    "mother_name": "Sushma Devi",
                    "phone": "8709912503",
                    "contact_no": "8709912503",
                    "created_at": now_iso()
                },
                {
                    "admission_no": "SDPS15",
                    "student_name": "Anurag Mehta",
                    "class_name": "CLASS-I",
                    "section": "A",
                    "roll_no": "14",
                    "father_name": "Amit Kumar",
                    "mother_name": "Poonam Kumari",
                    "phone": "9576224419",
                    "contact_no": "9576224419",
                    "created_at": now_iso()
                },
            ]
            await db.navrang_roster.insert_many(sample_students)
            logger.info(f"[SEED] Seeded {len(sample_students)} default sample students into navrang_roster for testing.")
    except Exception as e:
        logger.warning(f"[SEED] Could not seed navrang defaults: {e}")

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

class StudentRosterRecord(BaseModel):
    admission_no: Optional[str] = None
    student_name: str
    class_name: Optional[str] = ""
    section: Optional[str] = ""
    roll_no: Optional[str] = ""
    father_name: Optional[str] = ""
    mother_name: Optional[str] = ""
    phone: Optional[str] = ""
    contact_no: Optional[str] = ""

class AdminCashBookingRequest(BaseModel):
    package: str = "silver"
    students: List[Dict[str, Any]] = []
    parent_name: str
    parent_phone: str
    parent_email: Optional[str] = ""
    amount_collected: Optional[float] = None
    receipt_no: Optional[str] = None
    admit_immediately: Optional[bool] = False
    notes: Optional[str] = ""

# --- 2nd Razorpay Account (Dedicated Exclusively to Navrang) ---
async def _get_navrang_razorpay_config():
    """
    Returns (key_id, key_secret, is_enabled) for the Razorpay account dedicated to Navrang passes.
    Priority:
    1. db.navrang_config ("razorpay_key_id", "razorpay_key_secret", "razorpay_enabled")
    2. Environment variables NAVRANG_RAZORPAY_KEY_ID & NAVRANG_RAZORPAY_KEY_SECRET
    3. Global school RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET
    """
    if db is None:
        return "", "", False
    try:
        cfg = await db.navrang_config.find_one({}, {"_id": 0}) or {}
    except Exception:
        cfg = {}

    key_id = (
        cfg.get("razorpay_key_id") or 
        os.environ.get("NAVRANG_RAZORPAY_KEY_ID") or 
        os.environ.get("RAZORPAY_KEY_ID") or 
        ""
    ).strip()
    key_secret = (
        cfg.get("razorpay_key_secret") or 
        os.environ.get("NAVRANG_RAZORPAY_KEY_SECRET") or 
        os.environ.get("RAZORPAY_KEY_SECRET") or 
        ""
    ).strip()
    
    # If explicitly toggled off in config, disabled. Otherwise enabled if both key_id and secret exist.
    is_enabled = bool(cfg.get("razorpay_enabled", True) and key_id and key_secret)
    return key_id, key_secret, is_enabled

async def _get_navrang_razorpay_client():
    key_id, key_secret, enabled = await _get_navrang_razorpay_config()
    if not enabled or not key_id or not key_secret:
        return None, None
    try:
        client = razorpay.Client(auth=(key_id, key_secret))
        return client, key_id
    except Exception as e:
        logger.error(f"Failed to initialize Navrang 2nd Razorpay client: {e}")
        return None, None

# --- Public Endpoints ---

DEFAULT_PACKAGES = {
    "silver": {"name": "Silver Pass", "price": 299, "children": 1, "desc": "1 child + 1 mother, includes 1 pair of Dandiya sticks"},
    "gold": {"name": "Gold Pass", "price": 399, "children": 2, "desc": "2 children + 1 mother, includes 1 pair of Dandiya sticks"},
    "platinum": {"name": "Platinum Pass", "price": 499, "children": 3, "desc": "3 children + 1 mother, includes 1 pair of Dandiya sticks"},
}

@navrang_router.get("/config")
async def get_config():
    config = await db.navrang_config.find_one({}, {"_id": 0}) if db is not None else None
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
    
    # 2nd Razorpay Account (Navrang Only) public properties
    key_id, _, is_enabled = await _get_navrang_razorpay_config()
    config["razorpay_enabled"] = is_enabled
    config["razorpay_key_id"] = key_id
    if "razorpay_key_secret" in config:
        del config["razorpay_key_secret"]

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

    # Check if student has already booked and paid
    existing_paid = await db.navrang_bookings.find_one({
        "students.admission_no": student["admission_no"],
        "payment_status": {"$in": ["paid", "cash"]}
    })
    if existing_paid:
        raise HTTPException(
            status_code=400, 
            detail=f"Student {student['admission_no']} ({registered_name}) already has an active confirmed booking ({existing_paid.get('booking_id')}). Duplicate bookings for the same student are prohibited."
        )

    # Check if there is an existing pending booking for this student
    pending_booking = await db.navrang_bookings.find_one({
        "students.admission_no": student["admission_no"],
        "payment_status": "pending"
    })
    pending_b_id = pending_booking.get("booking_id") if pending_booking else None
    
    phone_val = (
        student.get("phone") or 
        student.get("contact_no") or 
        student.get("Contact_No") or 
        student.get("mobile") or 
        ""
    )
    class_val = student.get("class_name") or student.get("Class") or student.get("class") or ""
    sec_val = student.get("section") or student.get("Section") or ""
    roll_val = student.get("roll_no") or student.get("Roll_no") or student.get("Roll No") or ""
    father_val = student.get("father_name") or student.get("Father_Name") or student.get("father") or ""
    mother_val = student.get("mother_name") or student.get("Mother_Name") or student.get("mother") or ""

    return {
        "status": "success",
        "verified": True,
        "pending_booking_id": pending_b_id,
        "student": {
            "name": registered_name,
            "student_name": registered_name,
            "admission_no": student.get("admission_no", clean_adm),
            "class_name": str(class_val).strip(),
            "section": str(sec_val).strip(),
            "roll_no": str(roll_val).strip(),
            "father_name": str(father_val).strip(),
            "mother_name": str(mother_val).strip(),
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
            
        # Check if already booked and confirmed
        existing_paid = await db.navrang_bookings.find_one({
            "students.admission_no": student["admission_no"],
            "payment_status": {"$in": ["paid", "cash"]}
        })
        if existing_paid:
            raise HTTPException(
                status_code=400, 
                detail=f"Student {student['admission_no']} already has a confirmed, active pass ({existing_paid.get('booking_id')}). Duplicate bookings are prohibited."
            )

        # Clear any stale abandoned pending bookings for this student
        await db.navrang_bookings.delete_many({
            "students.admission_no": student["admission_no"],
            "payment_status": "pending"
        })
            
        st_name = student.get("student_name") or student.get("name") or student.get("Name") or ""
        c_name = student.get("class_name") or student.get("Class") or student.get("class") or ""
        s_name = student.get("section") or student.get("Section") or ""
        r_num = student.get("roll_no") or student.get("Roll_no") or student.get("Roll No") or ""
        f_name = student.get("father_name") or student.get("Father_Name") or student.get("father") or ""
        m_name = student.get("mother_name") or student.get("Mother_Name") or student.get("mother") or ""

        verified_students.append({
            "admission_no": student.get("admission_no", adm_val),
            "name": str(st_name).strip(),
            "class_name": str(c_name).strip(),
            "section": str(s_name).strip(),
            "roll_no": str(r_num).strip(),
            "father_name": str(f_name).strip(),
            "mother_name": str(m_name).strip()
        })

    booking_id = f"NVR-2026-{''.join(random.choices(string.ascii_uppercase + string.digits, k=4))}"
    while await db.navrang_bookings.find_one({"booking_id": booking_id}):
        booking_id = f"NVR-2026-{''.join(random.choices(string.ascii_uppercase + string.digits, k=4))}"

    qr_token = str(uuid.uuid4())
    
    is_razorpay = "razorpay" in (req.payment_method or "").lower() or not (req.payment_ref or req.utr_number)
    utr_val = (req.payment_ref or req.utr_number or "").strip()
    if not utr_val:
        utr_val = "pending_razorpay" if is_razorpay else "online_checkout"

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
        "payment_method": req.payment_method or "razorpay",
        "payment_ref": utr_val,
        "upi_id_used": req.upi_id_used or config.get("upi_id", "sdpublicpatna@sbi"),
        "payment_status": "pending",
        "entry_status": "not_entered",
        "created_at": now_iso()
    }

    # Automatically generate Razorpay order if Razorpay is configured
    client, key_id = await _get_navrang_razorpay_client()
    order_data = None
    if client and key_id:
        try:
            amount_inr = int(pkg_info["price"] or 299)
            amount_paise = amount_inr * 100
            order = client.order.create({
                "amount": amount_paise,
                "currency": "INR",
                "payment_capture": 1,
                "notes": {
                    "booking_id": booking_id,
                    "event": "Navrang 2026 Dandiya",
                    "parent_name": req.parent_name.strip(),
                    "parent_phone": parent_phone_clean,
                    "package": pkg_key
                }
            })
            booking_doc["razorpay_order_id"] = order["id"]
            booking_doc["razorpay_key_id"] = key_id
            booking_doc["payment_gateway"] = "razorpay_navrang"
            order_data = {
                "order_id": order["id"],
                "amount": amount_paise,
                "currency": "INR",
                "key_id": key_id
            }
        except Exception as rzp_e:
            logger.error(f"Failed to auto-create Razorpay order for {booking_id}: {rzp_e}")
    
    await db.navrang_bookings.insert_one(booking_doc)

    return {
        "booking_id": booking_id,
        "qr_token": qr_token,
        "price": pkg_info["price"],
        "package": pkg_key,
        "students": verified_students,
        "parent_name": booking_doc["parent_name"],
        "parent_phone": booking_doc["parent_phone"],
        "parent_email": booking_doc.get("parent_email", ""),
        "payment_method": booking_doc["payment_method"],
        "payment_ref": booking_doc["payment_ref"],
        "payment_status": booking_doc["payment_status"],
        "razorpay_order": order_data,
        "message": "Booking initiated. Complete payment on Razorpay for instant auto-verification."
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

# --- 2nd Razorpay Payment Processing (Navrang Only) ---

class NavrangCreateOrderRequest(BaseModel):
    booking_id: str

class NavrangVerifyPaymentRequest(BaseModel):
    booking_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

async def _send_navrang_verified_whatsapp(booking: dict):
    """Send immediate WhatsApp pass confirmation with live entry QR link."""
    if not booking or not booking.get("parent_phone"):
        return
    booking_id = booking.get("booking_id")
    try:
        ticket_link = f"https://navrang.sdpublic.org/my-ticket?booking_id={booking_id}"
        verified_wa_msg = (
            f"✅ *PAYMENT VERIFIED — NAVRANG 2026 PASS ACTIVATED!* 🎟️\n"
            f"*S.D. Public School, Patna*\n\n"
            f"Dear *{booking.get('parent_name', 'Parent')}*,\n"
            f"Your payment via *{booking.get('payment_method', 'Razorpay Online').upper()}* (Ref: {booking.get('payment_ref', 'N/A')}) for Navrang 2026 has been *VERIFIED & APPROVED*.\n\n"
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
        logger.warning(f"Could not send WhatsApp verification message for {booking_id}: {wa_err}")

@navrang_router.post("/create-order")
async def navrang_create_order(req: NavrangCreateOrderRequest):
    b_id = (req.booking_id or "").strip().upper()
    if not b_id:
        raise HTTPException(status_code=400, detail="Booking ID is required.")

    booking = await db.navrang_bookings.find_one({
        "$or": [{"booking_id": b_id}, {"booking_id": req.booking_id.strip()}]
    })
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")

    if booking.get("payment_status") in ("paid", "cash"):
        raise HTTPException(status_code=400, detail="This booking is already paid.")

    client, key_id = await _get_navrang_razorpay_client()
    if not client or not key_id:
        raise HTTPException(
            status_code=503, 
            detail="Navrang 2nd Razorpay account is not configured yet. Configure Navrang Razorpay keys in Admin Settings or pay via UPI QR."
        )

    amount_inr = int(booking.get("price") or 299)
    amount_paise = amount_inr * 100

    try:
        order = client.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "payment_capture": 1,
            "notes": {
                "booking_id": booking["booking_id"],
                "event": "Navrang 2026 Dandiya",
                "parent_name": booking.get("parent_name", ""),
                "parent_phone": booking.get("parent_phone", ""),
                "package": booking.get("package", "")
            }
        })
    except Exception as e:
        logger.error(f"Navrang Razorpay order creation failed: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to initiate Razorpay order: {str(e)}")

    await db.navrang_bookings.update_one(
        {"booking_id": booking["booking_id"]},
        {"$set": {
            "razorpay_order_id": order["id"],
            "razorpay_key_id": key_id,
            "payment_gateway": "razorpay_navrang",
            "updated_at": now_iso()
        }}
    )

    return {
        "status": "success",
        "order_id": order["id"],
        "amount": amount_paise,
        "currency": "INR",
        "key_id": key_id,
        "booking_id": booking["booking_id"],
        "parent_name": booking.get("parent_name", ""),
        "parent_phone": booking.get("parent_phone", ""),
        "parent_email": booking.get("parent_email", "")
    }

@navrang_router.post("/verify-payment")
async def navrang_verify_payment(req: NavrangVerifyPaymentRequest):
    b_id = (req.booking_id or "").strip().upper()
    booking = await db.navrang_bookings.find_one({
        "$or": [{"booking_id": b_id}, {"booking_id": req.booking_id.strip()}]
    })
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")

    client, key_id = await _get_navrang_razorpay_client()
    if not client:
        raise HTTPException(status_code=503, detail="Navrang Razorpay gateway not configured.")

    try:
        client.utility.verify_payment_signature({
            "razorpay_order_id": req.razorpay_order_id,
            "razorpay_payment_id": req.razorpay_payment_id,
            "razorpay_signature": req.razorpay_signature
        })
    except Exception as e:
        logger.warning(f"Navrang Razorpay signature verification failed for {b_id}: {e}")
        raise HTTPException(status_code=400, detail="Payment verification failed: invalid signature.")

    verified_booking = await _auto_verify_booking(
        booking=booking,
        payment_id=req.razorpay_payment_id,
        order_id=req.razorpay_order_id,
        signature=req.razorpay_signature,
        method="razorpay",
        verified_by="Razorpay_Navrang_Auto"
    )

    return {
        "status": "success",
        "message": "Payment verified and Navrang pass activated successfully!",
        "booking": verified_booking
    }


async def _auto_verify_booking(
    booking: dict,
    payment_id: str,
    order_id: Optional[str] = None,
    signature: Optional[str] = None,
    method: str = "razorpay",
    verified_by: str = "Razorpay_Navrang_Auto"
) -> dict:
    """Marks booking as paid, records payment refs, and dispatches instant verified WhatsApp pass."""
    b_id = booking.get("booking_id")
    update_data = {
        "payment_status": "paid",
        "payment_method": method or "razorpay",
        "payment_ref": payment_id,
        "paid_at": now_iso(),
        "verified_at": now_iso(),
        "verified_by": verified_by,
        "updated_at": now_iso()
    }
    if order_id:
        update_data["razorpay_order_id"] = order_id
    if payment_id:
        update_data["razorpay_payment_id"] = payment_id
    if signature:
        update_data["razorpay_signature"] = signature

    await db.navrang_bookings.update_one(
        {"$or": [{"booking_id": b_id}, {"booking_id": b_id.upper()}]},
        {"$set": update_data}
    )
    booking.update(update_data)
    if "_id" in booking:
        del booking["_id"]

    try:
        await _send_navrang_verified_whatsapp(booking)
    except Exception as wa_err:
        logger.warning(f"Failed to send auto-verified WhatsApp for {b_id}: {wa_err}")

    return booking


class NavrangCheckStatusRequest(BaseModel):
    booking_id: Optional[str] = None
    order_id: Optional[str] = None


@navrang_router.post("/check-payment-status")
@navrang_router.get("/check-payment-status")
async def navrang_check_payment_status(
    booking_id: Optional[str] = Query(None),
    order_id: Optional[str] = Query(None),
    body: Optional[NavrangCheckStatusRequest] = Body(None)
):
    """
    Auto-verifies a booking directly against Razorpay's API.
    If the parent paid but closed the tab or experienced a network drop,
    this checks Razorpay orders/payments and automatically activates the pass.
    """
    b_id = booking_id or (body.booking_id if body else None)
    ord_id = order_id or (body.order_id if body else None)
    if not b_id and not ord_id:
        raise HTTPException(status_code=400, detail="booking_id or order_id is required.")

    query = {}
    if b_id:
        clean_b = b_id.strip().upper()
        query["$or"] = [{"booking_id": clean_b}, {"booking_id": b_id.strip()}]
    else:
        query["razorpay_order_id"] = ord_id.strip()

    booking = await db.navrang_bookings.find_one(query)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")

    if booking.get("payment_status") in ("paid", "cash"):
        if "_id" in booking:
            del booking["_id"]
        return {
            "status": "success",
            "is_paid": True,
            "message": "Payment verified and pass active.",
            "booking": booking
        }

    client, key_id = await _get_navrang_razorpay_client()
    if not client:
        if "_id" in booking:
            del booking["_id"]
        return {
            "status": "pending",
            "is_paid": False,
            "message": "Payment gateway keys are being configured. Please contact school desk or check again shortly.",
            "booking": booking
        }

    target_order_id = booking.get("razorpay_order_id") or ord_id
    if not target_order_id:
        if "_id" in booking:
            del booking["_id"]
        return {
            "status": "pending",
            "is_paid": False,
            "message": "No online payment order found for this booking.",
            "booking": booking
        }

    try:
        payments_data = client.order.payments(target_order_id)
        items = payments_data.get("items", []) if isinstance(payments_data, dict) else []
        captured = next((p for p in items if p.get("status") in ("captured", "authorized")), None)
        if captured:
            verified_booking = await _auto_verify_booking(
                booking=booking,
                payment_id=captured.get("id"),
                order_id=target_order_id,
                method=captured.get("method", "razorpay"),
                verified_by="Razorpay_Auto_Sync"
            )
            return {
                "status": "success",
                "is_paid": True,
                "message": "Payment automatically verified via Razorpay! Pass activated.",
                "booking": verified_booking
            }
        else:
            if "_id" in booking:
                del booking["_id"]
            return {
                "status": "pending",
                "is_paid": False,
                "message": "Payment not yet captured on Razorpay.",
                "booking": booking
            }
    except Exception as e:
        logger.error(f"Razorpay status check error for {b_id}: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to query Razorpay: {str(e)}")


@navrang_router.post("/webhook")
@navrang_router.post("/razorpay-webhook")
async def navrang_razorpay_webhook(request: Request):
    """
    Razorpay Webhook handler. Automatically marks bookings as paid and
    activates QR passes upon receiving 'payment.captured' or 'order.paid' events.
    """
    try:
        body_bytes = await request.body()
        event_payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    signature = request.headers.get("X-Razorpay-Signature", "")
    key_id, key_secret, _ = await _get_navrang_razorpay_config()
    cfg = await db.navrang_config.find_one({}, {"_id": 0}) or {}
    webhook_secret = (cfg.get("razorpay_webhook_secret") or key_secret or "").strip()

    if webhook_secret and signature:
        import hmac
        import hashlib
        expected = hmac.new(webhook_secret.encode("utf-8"), body_bytes, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, signature):
            logger.warning("Navrang Razorpay webhook signature invalid.")
            raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event = event_payload.get("event", "")
    logger.info(f"Navrang Razorpay webhook event: {event}")

    if event in ("payment.captured", "order.paid"):
        payment = event_payload.get("payload", {}).get("payment", {}).get("entity", {})
        order_id = payment.get("order_id") or event_payload.get("payload", {}).get("order", {}).get("entity", {}).get("id")
        notes = payment.get("notes") or {}
        booking_id = notes.get("booking_id")

        query = {}
        if booking_id:
            query["booking_id"] = booking_id
        elif order_id:
            query["razorpay_order_id"] = order_id

        if query:
            booking = await db.navrang_bookings.find_one(query)
            if booking and booking.get("payment_status") != "paid":
                pay_id = payment.get("id") or "rzp_webhook"
                await _auto_verify_booking(
                    booking=booking,
                    payment_id=pay_id,
                    order_id=order_id,
                    method=payment.get("method", "razorpay"),
                    verified_by="Razorpay_Webhook_Auto"
                )
                logger.info(f"Booking {booking.get('booking_id')} successfully auto-verified via webhook.")

    return {"status": "ok"}

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
        raise HTTPException(status_code=404, detail="INVALID TICKET: No booking found for this code.")
        
    if "_id" in booking:
        del booking["_id"]

    if booking.get("payment_status") not in ["paid", "cash"]:
        return JSONResponse(
            status_code=400,
            content={
                "status": "unpaid",
                "detail": f"PAYMENT UNPAID: Payment status is '{booking.get('payment_status', 'pending')}'. Please collect ₹{booking.get('price', 0)} cash or verify UTR first.",
                "booking": booking
            }
        )
        
    if booking.get("entry_status") == "entered":
        return JSONResponse(
            status_code=400,
            content={
                "status": "already_used",
                "detail": f"ALREADY USED: This ticket was already checked in at {booking.get('entry_time', 'earlier')} by {booking.get('entry_marked_by', 'Gate Officer')}.",
                "booking": booking
            }
        )
        
    update_data = {
        "entry_status": "entered",
        "entry_time": now_iso(),
        "entry_marked_by": token.sub
    }
    
    await db.navrang_bookings.update_one({"booking_id": booking["booking_id"]}, {"$set": update_data})
    
    booking.update(update_data)
        
    return {
        "status": "success",
        "verified": True,
        "message": "ENTRY GRANTED ✓",
        "booking": booking
    }

@navrang_router.post("/admin/bookings/{booking_id}/admit-cash")
async def admin_admit_cash(booking_id: str, token: TokenData = Depends(get_current_admin)):
    booking = await db.navrang_bookings.find_one({"booking_id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    update_data = {
        "payment_status": "cash",
        "entry_status": "entered",
        "entry_time": now_iso(),
        "entry_marked_by": token.sub,
        "verified_by": token.sub,
        "verified_at": now_iso(),
        "updated_at": now_iso()
    }
    
    await db.navrang_bookings.update_one({"booking_id": booking_id}, {"$set": update_data})
    booking.update(update_data)
    if "_id" in booking:
        del booking["_id"]
        
    return {
        "status": "success",
        "message": "Cash collected & Entry Granted ✓",
        "booking": booking
    }

@navrang_router.post("/admin/book-cash")
async def admin_book_cash(req: AdminCashBookingRequest, token: TokenData = Depends(get_current_admin)):
    config = await get_config()
    packages = config.get("packages") or DEFAULT_PACKAGES
    
    pkg_key = (req.package or "silver").lower().strip()
    if pkg_key not in packages:
        raise HTTPException(status_code=400, detail=f"Invalid package '{pkg_key}'. Choose from silver, gold, or platinum.")
    
    pkg_info = packages[pkg_key]
    required_children = pkg_info.get("children", 1)
    
    parent_name = req.parent_name.strip()
    if not parent_name:
        raise HTTPException(status_code=400, detail="Parent or guardian name is required.")
        
    parent_phone_clean = re.sub(r"\D", "", req.parent_phone or "")[-10:]
    if len(parent_phone_clean) != 10:
        raise HTTPException(status_code=400, detail="Please enter a valid 10-digit mobile number for WhatsApp ticket delivery.")

    if not req.students or len(req.students) < required_children:
        raise HTTPException(
            status_code=400, 
            detail=f"The selected {pkg_info.get('name', pkg_key.title())} requires details for {required_children} student(s)."
        )

    # Process and enrich each student's details
    verified_students = []
    for idx in range(required_children):
        st_input = req.students[idx] if idx < len(req.students) else {}
        adm_val = (st_input.get("admission_no") or "").strip()
        name_val = (st_input.get("student_name") or st_input.get("name") or "").strip()
        
        # If admission_no provided, try looking up in Dandiya roster first, then apaar_roster
        roster_data = None
        if adm_val:
            roster_data = await _find_roster_student(adm_val)
            
        if roster_data:
            st_name = name_val or roster_data.get("student_name") or roster_data.get("name") or ""
            c_name = roster_data.get("class_name") or roster_data.get("Class") or st_input.get("class_name", "")
            s_name = roster_data.get("section") or roster_data.get("Section") or st_input.get("section", "")
            r_num = roster_data.get("roll_no") or roster_data.get("Roll_no") or st_input.get("roll_no", "")
            f_name = roster_data.get("father_name") or roster_data.get("Father_Name") or st_input.get("father_name", "")
            m_name = roster_data.get("mother_name") or roster_data.get("Mother_Name") or st_input.get("mother_name", "")
            standard_adm = roster_data.get("admission_no", adm_val)
        else:
            if not name_val:
                name_val = f"Student {idx + 1}"
            st_name = name_val
            c_name = st_input.get("class_name", "")
            s_name = st_input.get("section", "")
            r_num = st_input.get("roll_no", "")
            f_name = st_input.get("father_name", "")
            m_name = st_input.get("mother_name", "")
            standard_adm = adm_val or f"CASH-SPOT-{idx + 1}"

        verified_students.append({
            "admission_no": str(standard_adm).strip(),
            "name": str(st_name).strip(),
            "student_name": str(st_name).strip(),
            "class_name": str(c_name).strip(),
            "section": str(s_name).strip(),
            "roll_no": str(r_num).strip(),
            "father_name": str(f_name).strip(),
            "mother_name": str(m_name).strip()
        })

    # Generate unique booking ID & QR token
    booking_id = f"NVR-2026-{''.join(random.choices(string.ascii_uppercase + string.digits, k=4))}"
    while await db.navrang_bookings.find_one({"booking_id": booking_id}):
        booking_id = f"NVR-2026-{''.join(random.choices(string.ascii_uppercase + string.digits, k=4))}"

    qr_token = str(uuid.uuid4())
    price_val = float(req.amount_collected) if req.amount_collected is not None else float(pkg_info.get("price", 299))
    receipt_val = (req.receipt_no or "").strip() or f"CASH-{booking_id}"
    
    is_immediate_entry = bool(req.admit_immediately)
    entry_status = "entered" if is_immediate_entry else "not_entered"
    entry_time = now_iso() if is_immediate_entry else None
    entry_marked_by = token.sub if is_immediate_entry else None

    booking_doc = {
        "_id": new_id(),
        "booking_id": booking_id,
        "qr_token": qr_token,
        "package": pkg_key,
        "price": price_val,
        "students": verified_students,
        "parent_name": parent_name,
        "parent_phone": parent_phone_clean,
        "parent_email": (req.parent_email or "").strip(),
        "payment_method": "Cash at Desk",
        "payment_ref": receipt_val,
        "payment_status": "cash",
        "verified_by": token.sub,
        "verified_at": now_iso(),
        "entry_status": entry_status,
        "entry_time": entry_time,
        "entry_marked_by": entry_marked_by,
        "booked_by_admin": token.sub,
        "admin_notes": (req.notes or "").strip(),
        "created_at": now_iso(),
        "updated_at": now_iso()
    }

    await db.navrang_bookings.insert_one(booking_doc)

    # Send instant WhatsApp notification
    whatsapp_sent = False
    try:
        student_lines = []
        for s in verified_students:
            s_name = s.get("name") or s.get("student_name") or "Student"
            s_adm = s.get("admission_no") or ""
            s_cls = f"Class {s.get('class_name')} {s.get('section', '')}".strip() if s.get('class_name') else ""
            line = f"• {s_name} (Adm: {s_adm})"
            if s_cls:
                line += f" - {s_cls}"
            student_lines.append(line)
        students_text = "\n".join(student_lines)

        pkg_title = pkg_info.get("name", f"{pkg_key.title()} Pass")
        ticket_link = f"https://navrang.sdpublic.org/my-ticket?booking_id={booking_id}"
        
        wa_msg = (
            f"✅ *CASH PAYMENT CONFIRMED — NAVRANG 2026 PASS ISSUED!* 🎟️\n"
            f"*S.D. Public School, Patna*\n\n"
            f"Dear *{booking_doc['parent_name']}*,\n"
            f"Your cash payment of *₹{price_val:.0f}* at the school counter has been recorded and your Navrang 2026 entry pass is *ACTIVE*.\n\n"
            f"📋 *OFFICIAL PASS DETAILS:*\n"
            f"• *Booking ID:* {booking_id}\n"
            f"• *Pass Package:* {pkg_title}\n"
            f"• *Amount Paid:* ₹{price_val:.0f} (Cash Collected)\n"
            f"• *Cash Receipt Ref:* {receipt_val}\n"
            f"• *Issued By Admin:* {token.sub}\n"
            f"• *Entry Status:* {'ALREADY CHECKED IN ✓' if is_immediate_entry else 'ACTIVE & READY FOR ENTRY'}\n\n"
            f"👨‍🎓 *ADMITTED STUDENT(S):*\n"
            f"{students_text}\n\n"
            f"🎟️ *VIEW / DOWNLOAD YOUR ENTRY QR PASS:*\n"
            f"👉 {ticket_link}\n\n"
            f"⚠️ *Important Guidelines:*\n"
            f"1. Please show your QR pass at the entrance gate for quick verification.\n"
            f"2. Package admits student(s) + 1 Mother and includes 1 pair of Dandiya sticks.\n"
            f"3. Traditional festive attire is encouraged.\n\n"
            f"📞 *School Desk:* +91 99551 90262\n"
            f"— *S.D. Public School, Patna*"
        )
        from whatsapp_service import send_whatsapp_text
        await send_whatsapp_text(
            phone=booking_doc["parent_phone"],
            message=wa_msg,
            subject=f"Navrang 2026 Cash Pass - {booking_id}"
        )
        whatsapp_sent = True
    except Exception as wa_e:
        logger.warning(f"Could not send WhatsApp cash confirmation for {booking_id}: {wa_e}")

    booking_doc.pop("_id", None)
    return {
        "status": "success",
        "message": f"Cash ticket pass {booking_id} booked and activated successfully.",
        "booking": booking_doc,
        "whatsapp_sent": whatsapp_sent
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
    elif action == "auto_sync_razorpay":
        # Auto-query Razorpay API to verify payment
        client, key_id = await _get_navrang_razorpay_client()
        target_order = booking.get("razorpay_order_id")
        if not client or not target_order:
            raise HTTPException(status_code=400, detail="No online Razorpay order found for this booking, or gateway not configured.")
        try:
            payments_data = client.order.payments(target_order)
            items = payments_data.get("items", []) if isinstance(payments_data, dict) else []
            captured = next((p for p in items if p.get("status") in ("captured", "authorized")), None)
            if captured:
                verified_b = await _auto_verify_booking(
                    booking=booking,
                    payment_id=captured.get("id"),
                    order_id=target_order,
                    method=captured.get("method", "razorpay"),
                    verified_by=f"Admin_Razorpay_Sync_{token.sub}"
                )
                return {
                    "status": "success",
                    "message": "Booking verified & activated via Razorpay API!",
                    "is_paid": True,
                    "booking": verified_b
                }
            else:
                raise HTTPException(status_code=400, detail="Payment is not yet captured on Razorpay.")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to query Razorpay API: {str(e)}")
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

@navrang_router.get("/admin/config")
async def get_admin_config(token: TokenData = Depends(get_current_admin)):
    config = await db.navrang_config.find_one({}, {"_id": 0}) or {}
    key_id, key_secret, is_enabled = await _get_navrang_razorpay_config()
    config["razorpay_enabled"] = bool(config.get("razorpay_enabled", is_enabled))
    config["razorpay_key_id"] = key_id
    config["has_razorpay_key_secret"] = bool(key_secret)
    config["razorpay_key_secret_masked"] = ("••••••••••••" if key_secret else "")
    return config

@navrang_router.put("/admin/config")
async def update_config(config_data: dict, token: TokenData = Depends(get_current_admin)):
    if "_id" in config_data:
        del config_data["_id"]
        
    # If admin submitted masked secret, don't wipe existing key secret
    secret = config_data.get("razorpay_key_secret")
    if secret == "••••••••••••":
        del config_data["razorpay_key_secret"]
    elif secret is not None and not str(secret).strip():
        config_data["razorpay_key_secret"] = ""
        
    await db.navrang_config.update_one({}, {"$set": config_data}, upsert=True)
    return {"status": "success", "message": "Navrang configuration updated successfully."}

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

@navrang_router.put("/admin/roster/{admission_no}")
async def update_roster_student(
    admission_no: str,
    payload: StudentRosterRecord,
    token: TokenData = Depends(get_current_admin)
):
    target_adm = admission_no.strip()
    new_adm = (payload.admission_no or target_adm).strip()
    phone_clean = (payload.phone or payload.contact_no or "").strip()

    if not payload.student_name.strip():
        raise HTTPException(status_code=400, detail="Student name cannot be empty.")

    update_fields = {
        "student_name": payload.student_name.strip(),
        "class_name": (payload.class_name or "").strip(),
        "section": (payload.section or "").strip(),
        "roll_no": (payload.roll_no or "").strip(),
        "father_name": (payload.father_name or "").strip(),
        "mother_name": (payload.mother_name or "").strip(),
        "phone": phone_clean,
        "contact_no": phone_clean,
        "updated_at": now_iso()
    }
    if new_adm and new_adm != target_adm:
        update_fields["admission_no"] = new_adm

    await db.navrang_roster.update_one(
        {"admission_no": target_adm},
        {"$set": update_fields, "$setOnInsert": {"created_at": now_iso()}},
        upsert=True
    )

    # If admission number was changed, update active bookings for this student as well
    if new_adm and new_adm != target_adm:
        await db.navrang_bookings.update_many(
            {"students.admission_no": target_adm},
            {"$set": {"students.$.admission_no": new_adm}}
        )

    updated_doc = await db.navrang_roster.find_one({"admission_no": new_adm}, {"_id": 0})
    return {
        "status": "success",
        "message": f"Student {new_adm} details updated successfully.",
        "student": updated_doc
    }

@navrang_router.post("/admin/roster/student")
async def create_roster_student(
    payload: StudentRosterRecord,
    token: TokenData = Depends(get_current_admin)
):
    adm = (payload.admission_no or "").strip()
    name = (payload.student_name or "").strip()
    if not adm or not name:
        raise HTTPException(status_code=400, detail="Admission number and student name are required.")

    existing = await db.navrang_roster.find_one({"admission_no": adm})
    if existing:
        raise HTTPException(status_code=400, detail=f"Student with admission number {adm} already exists in the Dandiya roster.")

    phone_clean = (payload.phone or payload.contact_no or "").strip()
    doc = {
        "admission_no": adm,
        "student_name": name,
        "class_name": (payload.class_name or "").strip(),
        "section": (payload.section or "").strip(),
        "roll_no": (payload.roll_no or "").strip(),
        "father_name": (payload.father_name or "").strip(),
        "mother_name": (payload.mother_name or "").strip(),
        "phone": phone_clean,
        "contact_no": phone_clean,
        "created_at": now_iso(),
        "updated_at": now_iso()
    }
    await db.navrang_roster.insert_one(doc)
    doc.pop("_id", None)
    return {
        "status": "success",
        "message": f"Student {adm} added to Dandiya roster.",
        "student": doc
    }


@navrang_router.get("/og-html", response_class=HTMLResponse)
@navrang_router.get("/og-html/{subpath:path}", response_class=HTMLResponse)
async def get_navrang_og_html(
    request: Request,
    subpath: Optional[str] = None,
    path: Optional[str] = Query(None, description="Subpath parameter")
):
    """
    Returns server-side rendered HTML with rich OpenGraph and Twitter Card metadata for
    navrang.sdpublic.org links. When links are shared on WhatsApp, Facebook, iMessage,
    Telegram, LinkedIn, Twitter, etc., this ensures the official Navrang Dandiya Night
    banner and description preview is always shown.
    """
    raw_path = subpath or path or "/"
    clean_path = raw_path.strip()
    if not clean_path.startswith("/"):
        clean_path = "/" + clean_path

    canonical_url = f"https://navrang.sdpublic.org{clean_path if clean_path != '/' else ''}"
    banner_url = "https://navrang.sdpublic.org/navrang-banner.jpg"

    if "/book" in clean_path:
        title = "Book Navrang 2026 Passes | S.D. Public School, Patna"
        desc = "Book your exclusive passes online for Navrang 2026 - Dandiya Raas, Garba & Durga Puja Celebration Night at S.D. Public School, Patna. Student verification, QR ticketing & instant confirmation."
    elif "/my-ticket" in clean_path:
        title = "My Tickets & QR Entry Pass | Navrang 2026 | S.D. Public School, Patna"
        desc = "Access, view and download your official Navrang 2026 QR entry passes and booking receipts for Dandiya Night at S.D. Public School, Patna."
    else:
        title = "Navrang 2026 | Grand Dandiya Raas & Durga Puja Celebration | S.D. Public School, Patna"
        desc = "Join S.D. Public School for Navrang 2026 - The grandest Dandiya Raas, Garba & Durga Puja celebration night in Patna on October 15, 2026. Live DJ, food stalls, games, prizes & festive vibes. Book your passes online now!"

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{title}</title>
    <meta name="description" content="{desc}">
    <link rel="canonical" href="{canonical_url}">

    <!-- Open Graph / Facebook / WhatsApp / iMessage / Telegram / LinkedIn -->
    <meta property="og:site_name" content="Navrang 2026 — S.D. Public School, Patna">
    <meta property="og:title" content="{title}">
    <meta property="og:description" content="{desc}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="{canonical_url}">
    <meta property="og:image" content="{banner_url}">
    <meta property="og:image:secure_url" content="{banner_url}">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:image:width" content="1024">
    <meta property="og:image:height" content="576">
    <meta property="og:image:alt" content="Navrang 2026 Dandiya Night Celebration - S.D. Public School, Patna">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{title}">
    <meta name="twitter:description" content="{desc}">
    <meta name="twitter:image" content="{banner_url}">
    <meta name="twitter:image:alt" content="Navrang 2026 Dandiya Night Celebration - S.D. Public School, Patna">

    <!-- Automatic redirection for regular visitors -->
    <script>
        window.location.replace("{canonical_url}");
    </script>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090d16; color: #f8fafc; margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box;">
    <div style="max-width: 540px; width: 100%; background: #131b2e; border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 20px; padding: 24px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);">
        <img src="{banner_url}" alt="Navrang 2026" style="width: 100%; height: auto; aspect-ratio: 16/9; object-fit: cover; border-radius: 14px; margin-bottom: 20px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5);">
        <span style="display: inline-block; background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">
            S.D. Public School, Patna
        </span>
        <h1 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0 0 12px 0; line-height: 1.4;">
            {title}
        </h1>
        <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
            {desc}
        </p>
        <a href="{canonical_url}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #0f172a; font-weight: 700; font-size: 15px; text-decoration: none; padding: 12px 32px; border-radius: 12px; box-shadow: 0 4px 14px 0 rgba(245, 158, 11, 0.39);">
            Open Navrang Portal &rarr;
        </a>
    </div>
</body>
</html>"""
    return HTMLResponse(content=html_content, status_code=200)


@navrang_router.get("/banner.jpg")
@navrang_router.get("/navrang-banner.jpg")
@navrang_router.get("/navrang-og.jpg")
async def get_navrang_banner_image():
    """Serves the official Navrang 2026 high-resolution banner image directly."""
    candidates = [
        os.path.join(os.path.dirname(__file__), "navrang-banner.jpg"),
        os.path.join(os.path.dirname(__file__), "uploads", "navrang-banner.jpg"),
        os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "navrang-banner.jpg"),
        os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "navrang-hero-bg.jpg"),
    ]
    for path in candidates:
        if os.path.isfile(path):
            return FileResponse(path, media_type="image/jpeg", headers={"Cache-Control": "public, max-age=86400"})
    raise HTTPException(status_code=404, detail="Navrang banner image not found")


