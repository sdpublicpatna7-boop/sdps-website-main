"""Question Paper Portal — Data Models"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from models import new_id, now_iso

# ── Roles ──────────────────────────────────────────────────────────────────
QP_ROLES = ["qp_admin", "teacher", "incharge", "printing_head"]

# ── User ───────────────────────────────────────────────────────────────────
class QPUser(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    username: str = ""             # primary login key (e.g. SDPSE01); unique across qp_users
    email: str = ""                # optional, kept for records; NOT used for login
    phone: str = ""                # normalized (e.g. 919955190262) — WhatsApp OTP + contact
    password_hash: str = ""        # empty until the staff member sets it on first login
    password_set: bool = True      # False for newly-onboarded staff (must set via OTP first)
    role: str = "teacher"          # qp_admin | teacher | incharge | printing_head
    is_active: bool = True
    # incharge-specific: list of class names they can monitor
    incharge_classes: List[str] = []
    # incharge-specific: can they review questions (or only see progress)?
    can_review: bool = False
    created_at: str = Field(default_factory=now_iso)
    created_by: str = ""           # id of qp_admin who created

# ── Session ────────────────────────────────────────────────────────────────
class QPSession(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str                      # e.g. "2026-27"
    is_active: bool = True
    created_at: str = Field(default_factory=now_iso)
    created_by: str = ""

# ── Exam Archive ───────────────────────────────────────────────────────────
EXAM_TYPES = ["F.A.-I", "F.A.-II", "F.A.-III", "F.A.-IV", "S.A.-I", "S.A.-II"]

class QPExamArchive(BaseModel):
    id: str = Field(default_factory=new_id)
    session_id: str
    session_name: str              # e.g. "2026-27"
    exam_type: str                 # F.A.-I … S.A.-II
    is_open: bool = True           # False = locked (teachers cannot edit/view)
    created_at: str = Field(default_factory=now_iso)
    created_by: str = ""

# ── Assignment ─────────────────────────────────────────────────────────────
class QPAssignment(BaseModel):
    id: str = Field(default_factory=new_id)
    archive_id: str
    session_id: str
    session_name: str
    exam_type: str
    class_name: str
    subject: str
    teacher_id: str
    teacher_name: str
    # Status flow:
    # draft → submitted → incharge_review (optional) → admin_review → approved → printing
    # Any stage can be rejected → back to draft
    status: str = "draft"
    rejection_reason: str = ""
    rejected_by: str = ""          # role who rejected
    rejected_at: str = ""
    submitted_at: str = ""
    incharge_reviewed_at: str = ""
    admin_approved_at: str = ""
    sent_to_print_at: str = ""
    created_at: str = Field(default_factory=now_iso)

# ── Question / Section ─────────────────────────────────────────────────────
class QPSubQuestion(BaseModel):
    text: str = ""
    marks: int = 0

class QPQuestion(BaseModel):
    id: str = Field(default_factory=new_id)
    q_no: str = ""
    question: str = ""
    marks: int = 1
    options: List[str] = []        # MCQ options
    sub_questions: List[QPSubQuestion] = []
    image_url: str = ""            # uploaded image
    image_data: str = ""           # base64 drawn image
    answer_lines: int = 3

class QPSection(BaseModel):
    id: str = Field(default_factory=new_id)
    section_label: str = "Section A"
    section_title: str = ""
    question_type: str = "MCQ"
    instructions: str = ""
    total_marks: int = 0
    questions: List[QPQuestion] = []

class QPPaper(BaseModel):
    id: str = Field(default_factory=new_id)
    assignment_id: str
    archive_id: str
    session_name: str
    exam_type: str
    class_name: str
    subject: str
    teacher_id: str
    # Header fields
    show_header_image: bool = True
    duration: str = "2 Hours"
    total_marks: int = 60
    compulsory_note: str = "ALL QUESTIONS ARE COMPULSORY"
    passage_title: str = ""
    passage_text: str = ""
    # Sections
    sections: List[QPSection] = []
    # PDF
    pdf_url: str = ""
    # Timestamps
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)
    # Auto-save
    last_autosave: str = Field(default_factory=now_iso)

# ── Auto-save snapshot ─────────────────────────────────────────────────────
class QPAutoSave(BaseModel):
    id: str = Field(default_factory=new_id)
    assignment_id: str
    teacher_id: str
    paper_data: Dict[str, Any] = {}
    saved_at: str = Field(default_factory=now_iso)
