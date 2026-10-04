from fastapi import APIRouter, HTTPException, Depends, Query, Request, Response
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
import datetime
import re
import random
import string
import csv
import io
import time

from auth import get_superadmin, get_current_admin, TokenData
from models import now_iso, new_id

navrang_router = APIRouter(prefix="/api/navrang", tags=["navrang"])
db = None

def init_db(database):
    global db
    db = database

async def _find_roster_student(adm_no: str):
    if not adm_no:
        return None
    raw = adm_no.strip()
    digits = re.sub(r'\D', '', raw)
    student = await db.apaar_roster.find_one({"admission_no": raw}, {"_id": 0})
    if student:
        return student
    student = await db.apaar_roster.find_one({"admission_no": {"$regex": f"^{re.escape(raw)}$", "$options": "i"}}, {"_id": 0})
    if student:
        return student
    if not raw.upper().startswith("SDPS"):
        student = await db.apaar_roster.find_one({"admission_no": f"SDPS{raw}"}, {"_id": 0})
        if student:
            return student
    if digits:
        digits_int = str(int(digits))
        pattern = f"^(SDPS|sdps)?\\s*0*{digits_int}$"
        student = await db.apaar_roster.find_one({"admission_no": {"$regex": pattern, "$options": "i"}}, {"_id": 0})
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
    if len(verify_rate_limits[ip]) >= 10:
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again in a minute.")
    verify_rate_limits[ip].append(now)

def get_client_ip(request: Request) -> str:
    if request.headers.get("X-Forwarded-For"):
        return request.headers.get("X-Forwarded-For").split(",")[0].strip()
    return request.client.host if request.client else "unknown"

# --- Models ---

class StudentVerifyRequest(BaseModel):
    admission_no: str

class BookingStudent(BaseModel):
    admission_no: str

class BookRequest(BaseModel):
    package: str
    students: List[BookingStudent]
    parent_name: str
    parent_phone: str
    parent_email: Optional[str] = None

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

# Package pricing is fixed in code (single source of truth). get_config() always
# serves these, so stale prices saved in the DB can never override them.
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
            "contact_phone": "+91 99551 90262"
        }
    config["packages"] = DEFAULT_PACKAGES
    return config

@navrang_router.post("/verify-student")
async def verify_student(req: StudentVerifyRequest, request: Request):
    ip = get_client_ip(request)
    check_rate_limit(ip)
    
    student = await _find_roster_student(req.admission_no)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found in school roster. Please verify the admission number.")
    
    name = student.get("student_name", "")
    parts = name.strip().split()
    first_name = parts[0] if parts else ""
    last_initial = parts[-1][0] if len(parts) > 1 else ""
    masked_name = f"{first_name} {last_initial}." if last_initial else first_name
    
    return {
        "status": "success",
        "student": {
            "name": masked_name,
            "full_name_masked": masked_name,
            "class_name": student.get("class_name", ""),
            "section": student.get("section", ""),
            "admission_no": student.get("admission_no", "")
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
    
    pkg_key = req.package.lower()
    if pkg_key not in packages:
        raise HTTPException(status_code=400, detail="Invalid package selected.")
        
    pkg_info = packages[pkg_key]
    required_children = pkg_info.get("children", 1)
    if len(req.students) != required_children:
        raise HTTPException(status_code=400, detail=f"The {pkg_key.title()} package requires verifying exactly {required_children} student(s).")
    
    verified_students = []
    for s in req.students:
        student = await _find_roster_student(s.admission_no)
        if not student:
            raise HTTPException(status_code=404, detail=f"Student with admission number {s.admission_no} not found.")
            
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
            "section": student.get("section", "")
        })

    booking_id = f"NVR-2026-{''.join(random.choices(string.ascii_uppercase + string.digits, k=4))}"
    while await db.navrang_bookings.find_one({"booking_id": booking_id}):
        booking_id = f"NVR-2026-{''.join(random.choices(string.ascii_uppercase + string.digits, k=4))}"

    qr_token = str(uuid.uuid4())
    
    booking_doc = {
        "_id": new_id(),
        "booking_id": booking_id,
        "qr_token": qr_token,
        "package": pkg_key,
        "price": pkg_info["price"],
        "students": verified_students,
        "parent_name": req.parent_name.strip(),
        "parent_phone": re.sub(r"\D", "", req.parent_phone)[-10:],
        "parent_email": (req.parent_email or "").strip(),
        "payment_status": "pending",
        "entry_status": "not_entered",
        "created_at": now_iso()
    }
    
    await db.navrang_bookings.insert_one(booking_doc)
    
    return {
        "booking_id": booking_id,
        "qr_token": qr_token,
        "price": pkg_info["price"],
        "package": pkg_key,
        "students": verified_students,
        "parent_name": booking_doc["parent_name"],
        "parent_phone": booking_doc["parent_phone"],
        "message": "Booking created successfully."
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
            {"booking_id": req.phone.strip().upper()}
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

    stats["payment_breakdown"] = payment_breakdown
    stats["package_breakdown"] = package_breakdown
    
    return stats

@navrang_router.get("/admin/bookings")
async def admin_get_bookings(
    search: Optional[str] = None,
    payment_status: Optional[str] = None,
    entry_status: Optional[str] = None,
    package: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    token: TokenData = Depends(get_current_admin)
):
    query = {}
    if search:
        s = search.strip()
        query["$or"] = [
            {"booking_id": {"$regex": re.escape(s), "$options": "i"}},
            {"parent_name": {"$regex": re.escape(s), "$options": "i"}},
            {"parent_phone": {"$regex": re.escape(s), "$options": "i"}},
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
        raise HTTPException(status_code=400, detail=f"Cannot allow entry: Payment status is '{booking.get('payment_status', 'pending')}'. Please collect payment first.")
        
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
    if action == "mark_paid" or action == "paid":
        update_data["payment_status"] = "paid"
    elif action == "mark_cash" or action == "cash":
        update_data["payment_status"] = "cash"
    elif action == "mark_pending" or action == "pending":
        update_data["payment_status"] = "pending"
    elif req.payment_status:
        update_data["payment_status"] = req.payment_status

    if req.payment_method:
        update_data["payment_method"] = req.payment_method
    if req.payment_ref:
        update_data["payment_ref"] = req.payment_ref
        
    await db.navrang_bookings.update_one({"booking_id": booking_id}, {"$set": update_data})
    return {"status": "success", "message": "Booking updated successfully."}

@navrang_router.get("/admin/export")
async def export_bookings(token: TokenData = Depends(get_current_admin)):
    cursor = db.navrang_bookings.find({}).sort("created_at", -1)
    bookings = await cursor.to_list(length=None)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        "Booking ID", "Created At", "Parent Name", "Parent Phone", "Package", 
        "Price", "Payment Status", "Entry Status", "Student 1", "Student 2", "Student 3"
    ])
    
    for b in bookings:
        students = b.get("students", [])
        s1 = f"{students[0]['name']} ({students[0]['admission_no']}, Class {students[0].get('class_name','')})" if len(students) > 0 else ""
        s2 = f"{students[1]['name']} ({students[1]['admission_no']}, Class {students[1].get('class_name','')})" if len(students) > 1 else ""
        s3 = f"{students[2]['name']} ({students[2]['admission_no']}, Class {students[2].get('class_name','')})" if len(students) > 2 else ""
        
        writer.writerow([
            b.get("booking_id", ""),
            b.get("created_at", ""),
            b.get("parent_name", ""),
            b.get("parent_phone", ""),
            b.get("package", ""),
            b.get("price", ""),
            b.get("payment_status", ""),
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
async def update_config(config_data: dict, token: TokenData = Depends(get_current_admin)):
    await db.navrang_config.update_one({}, {"$set": config_data}, upsert=True)
    return {"status": "success", "message": "Event configuration updated successfully."}

@navrang_router.delete("/admin/bookings/{booking_id}")
@navrang_router.delete("/admin/booking/{booking_id}")
async def delete_booking(booking_id: str, token: TokenData = Depends(get_current_admin)):
    result = await db.navrang_bookings.delete_one({"booking_id": booking_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"status": "success", "message": "Booking deleted successfully."}
