"""Pydantic models for the school website."""
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, ConfigDict, EmailStr, field_validator


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def _validate_password(v: str) -> str:
    """Shared password strength rule — applied on every write/reset."""
    if len(v) < 8:
        raise ValueError("Password must be at least 8 characters")
    if not any(c.isupper() for c in v):
        raise ValueError("Password must contain at least one uppercase letter")
    if not any(c.isdigit() for c in v):
        raise ValueError("Password must contain at least one digit")
    return v


class BaseDoc(BaseModel):
    model_config = ConfigDict(extra="ignore")


# ---- Admin ----
class AdminLogin(BaseModel):
    email: str
    password: str
    # No strength check on login — just authenticate against stored hash


class AdminPasswordReset(BaseModel):
    email: str


class AdminPasswordResetConfirm(BaseModel):
    email: str
    code: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        return _validate_password(v)


class AdminChangePassword(BaseModel):
    old_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        return _validate_password(v)


# ---- News & Notices ----
class News(BaseDoc):
    id: str = Field(default_factory=new_id)
    title: str
    content: str
    date: str
    image_url: Optional[str] = None
    category: Optional[str] = "general"
    published: bool = True
    created_at: str = Field(default_factory=now_iso)


class Notice(BaseDoc):
    id: str = Field(default_factory=new_id)
    title: str
    description: str
    date: str
    file_url: Optional[str] = None
    pinned: bool = False
    created_at: str = Field(default_factory=now_iso)


# ---- Gallery ----
class GalleryImage(BaseDoc):
    id: str = Field(default_factory=new_id)
    title: str
    url: str
    category: str = "general"
    order: int = 0
    created_at: str = Field(default_factory=now_iso)


class VideoItem(BaseDoc):
    id: str = Field(default_factory=new_id)
    title: str
    url: str  # external link
    platform: str = "youtube"  # youtube/instagram/facebook/other
    thumbnail_url: Optional[str] = None
    description: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)


# ---- Calendar / Holidays ----
class CalendarEvent(BaseDoc):
    id: str = Field(default_factory=new_id)
    name: str
    date: str  # YYYY-MM-DD
    icon_url: Optional[str] = None
    type: str = "event"  # event / exam / vacation
    description: Optional[str] = None


class Holiday(BaseDoc):
    id: str = Field(default_factory=new_id)
    name: str
    date: str
    icon_url: Optional[str] = None


# ---- Student Council ----
class CouncilMember(BaseDoc):
    id: str = Field(default_factory=new_id)
    name: str
    position: str  # Captain / Vice Captain / Sports Captain etc
    photo_url: Optional[str] = None
    year: str
    bio: Optional[str] = None
    is_captain: bool = False
    house: Optional[str] = None
    order: int = 0


class ElectionPoster(BaseDoc):
    id: str = Field(default_factory=new_id)
    candidate_name: str
    position: str
    poster_url: str
    year: str
    bio: Optional[str] = None


class CouncilResult(BaseDoc):
    id: str = Field(default_factory=new_id)
    year: str
    position: str
    winner: str
    votes: Optional[int] = None
    runner_up: Optional[str] = None
    notes: Optional[str] = None


# ---- Admission Enquiry & Form ----
class FormQuestion(BaseDoc):
    id: str = Field(default_factory=new_id)
    label: str
    type: str = "text"  # text/email/phone/textarea/select/date/file
    required: bool = True
    options: List[str] = []
    order: int = 0
    placeholder: Optional[str] = None


class AdmissionEnquiry(BaseDoc):
    id: str = Field(default_factory=new_id)
    parent_name: str
    student_name: str
    contact_phone: str
    email: EmailStr
    student_class: str
    answers: Dict[str, Any] = {}
    status: str = "new"  # new/contacted/closed
    created_at: str = Field(default_factory=now_iso)


class FullAdmission(BaseDoc):
    id: str = Field(default_factory=new_id)
    answers: Dict[str, Any] = {}
    documents: List[Dict[str, str]] = []
    status: str = "submitted"
    created_at: str = Field(default_factory=now_iso)


# ---- Career ----
class CareerPost(BaseDoc):
    id: str = Field(default_factory=new_id)
    title: str
    subject: Optional[str] = None
    description: str
    qualifications: Optional[str] = None
    posted_at: str = Field(default_factory=now_iso)
    status: str = "open"  # open/closed


class CareerApplication(BaseDoc):
    id: str = Field(default_factory=new_id)
    post_id: Optional[str] = None
    name: str
    email: EmailStr
    phone: str
    subject: Optional[str] = None
    answers: Dict[str, Any] = {}
    resume_url: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)


# ---- Alumni ----
class AlumniMember(BaseDoc):
    id: str = Field(default_factory=new_id)
    name: str
    email: EmailStr
    phone: str
    year_passed: str
    answers: Dict[str, Any] = {}
    payment_id: Optional[str] = None
    payment_status: str = "pending"  # pending/paid/failed
    amount: int = 0
    created_at: str = Field(default_factory=now_iso)


class AlumniMeet(BaseDoc):
    id: str = Field(default_factory=new_id)
    title: str
    date: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    location: Optional[str] = None


class AlumniSettings(BaseDoc):
    id: str = "alumni-settings"
    is_visible: bool = True
    membership_amount: int = 500  # INR
    intro_text: str = "Join the SDPS Alumni Network."


# ---- TC ----
class TCRecord(BaseDoc):
    id: str = Field(default_factory=new_id)
    student_name: str
    dob: str  # YYYY-MM-DD
    admission_number: str
    tc_file_url: str
    uploaded_at: str = Field(default_factory=now_iso)
    notes: Optional[str] = None


class TCDownloadRequest(BaseModel):
    student_name: str
    dob: str
    admission_number: str


# ---- Popup ----
class PopupSettings(BaseDoc):
    id: str = "popup"
    enabled: bool = True
    title: str = "Welcome to SDPS"
    content: str = "Admissions are now open for 2026-27. Apply today!"
    image_url: Optional[str] = None
    button_text: Optional[str] = "Apply Now"
    button_link: Optional[str] = "/admissions"


# ---- Fee Payment ----
class FeeOrderRequest(BaseModel):
    student_name: str
    admission_number: str
    student_class: str
    fee_type: str
    amount: int  # INR (rupees)
    contact: str
    email: EmailStr


class FeeVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


# ---- Site Settings ----
class SiteSettings(BaseDoc):
    id: str = "site"
    school_name: str = "S.D. Public School"
    tagline: str = "Empowering Generations Since 1994"
    address: str = "Maurya Colony Near R.O.B Kumhrar Biscoman Golambar, Gulzarbagh Road, Patna, Bihar 800007"
    phone_primary: str = "+91 99551 90262"
    phone_secondary: str = "+91 99551 90162"
    email: str = "helpdesk@sdpublic.org"
    erp_url: str = "https://sdpublic.gungunerp.in"
    play_store_url: str = "https://play.google.com/store/apps/details?id=com.gungunerp.appsdpublicschool"
    youtube_channel: str = "https://www.youtube.com/channel/UCz-rV6401Guk41-4zNpjm-g"
    instagram_url: str = ""
    facebook_url: str = ""
    hero_video_url: str = "https://www.youtube.com/embed/Lv7W4kSSM3w"
    fee_payment_url: str = ""
    # Document embeds — upload PDF or paste URL, shown inline on public pages
    fee_structure_pdf_url: str = "https://drive.google.com/file/d/1mXk_y808w4s5ytxd5t9wCGuxuViYBGUY/preview"
    prospectus_pdf_url: str = "https://drive.google.com/file/d/1nBbND2dzSEoXHHSiRcB0LSIpoKOZpYfV/preview"
    hostel_food_menu_pdf_url: str = "https://drive.google.com/file/d/1eOuSkdJkV8Ex-T8wJeMayvsM0HhUsX5V/preview"
    hostel_checklist_pdf_url: str = "https://drive.google.com/file/d/179QQRZ9SzD10zPH6qrtI8FHO2AbZkq78/preview"
    demystified_image_url: str = "https://sdpublic.org/assets/img/demystified.jpg"
    preschool_banner_image_url: str = "https://sdpublic.org/assets/img/banner.jpg"
    khelo_patna_hero_image_url: str = "/khelo-patna-hero.jpg"
    logo_url: str = "https://sdpublic.org/assets/img/logo.png"
    hero_banner_url: str = "https://sdpublic.org/assets/img/banner.jpg"
    hero_feature_image_url: str = "https://sdpublic.org/img/feature.jpg"
    admission_open_button_url: str = "https://sdpublic.org/assets/img/admission_open_button.png"
    ranked_badge_url: str = "https://sdpublic.org/assets/img/ranked.png"
    director_photo_url: str = "https://sdpublic.org/assets/img/AKT.png"
    principal_photo_url: str = "https://sdpublic.org/assets/img/RT.jpg"
    about_trust_logo_url: str = "https://sdpublic.org/assets/img/about_new.jpg"
    academics_learning_image_url: str = "https://sdpublic.org/assets/img/learning_beyond.png"
    academics_facilities_image_url: str = "https://sdpublic.org/assets/img/world_class.jpg"
    career_hero_image_url: str = "/sdps-team.png"
    qp_portal_url: str = "https://sdpublic.org/qp-portal/"
    
    # Community Voices / Testimonials
    testimonial_parent_name: str = "Rajesh Kumar"
    testimonial_parent_info: str = "Parent of Riya (Class II)"
    testimonial_parent_text: str = "The individual attention my daughter receives at S.D. Public School is remarkable. Her confidence in speaking and logic skills has blossomed since Playgroup. The teachers are incredibly nurturing."
    
    testimonial_video_url_1: str = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    testimonial_video_thumb_1: str = "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=600"
    testimonial_video_text_1: str = "Watch how S.D. Public School focuses on active class participation and holistic academic growth. Our experience with the school's online learning and physical campus has been wonderful."
    testimonial_video_parent_1: str = "Suman Mishra"
    testimonial_video_info_1: str = "Parent of Aarav (Class VI)"
    
    testimonial_video_url_2: str = "https://www.facebook.com"
    testimonial_video_thumb_2: str = "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=600"
    testimonial_video_text_2: str = "Check out our sports day reel and parent sharing sessions on social media! S.D. Public School is active, energetic, and provides excellent extracurricular exposure."
    testimonial_video_parent_2: str = "Amit Sharma"
    testimonial_video_info_2: str = "Parent of Priyanshu (Class VIII)"

    stats: Dict[str, str] = {
        "years": "30+",
        "educators": "75+",
        "students": "50000+",
        "alumni": "5000+"
    }


# ---- Contact ----
class ContactMessage(BaseDoc):
    id: str = Field(default_factory=new_id)
    name: str
    email: EmailStr
    phone: Optional[str] = None
    subject: Optional[str] = None
    message: str
    created_at: str = Field(default_factory=now_iso)
    status: str = "new"


# ---- Admission Eligibility ----
class EligibilityRow(BaseDoc):
    id: str = Field(default_factory=new_id)
    class_name: str          # e.g. "Play Group", "Nursery", "Class I"
    min_age: str             # e.g. "2 Years"
    max_age: str             # e.g. "3 Years"
    born_between: str        # e.g. "01 April 2021 - 01 April 2023"
    session: str = "2026-27"
    order: int = 0


# ---- Fee Structure ----
class FeeStructureRow(BaseDoc):
    id: str = Field(default_factory=new_id)
    class_name: str          # e.g. "Nursery", "Class I-V"
    admission_fee: str = ""
    tuition_fee: str = ""    # Monthly or Annual
    annual_charges: str = ""
    transport_fee: str = ""
    other_fees: str = ""
    session: str = "2026-27"
    order: int = 0


# ---- Hostel Fee Structure ----
class HostelFeeRow(BaseDoc):
    id: str = Field(default_factory=new_id)
    category: str            # e.g. "Class VI-VIII", "Class IX-X"
    monthly_fee: str = ""
    annual_fee: str = ""
    admission_fee: str = ""
    note: str = ""
    session: str = "2026-27"
    order: int = 0


# ---- Hostel Gallery ----
class HostelGalleryItem(BaseDoc):
    id: str = Field(default_factory=new_id)
    caption: str = ""
    image_url: str
    order: int = 0
    uploaded_at: str = Field(default_factory=now_iso)


# ---- Administration Members ----
class AdministrationMember(BaseDoc):
    id: str = Field(default_factory=new_id)
    name: str
    designation: str         # e.g. "Director", "Principal"
    photo_url: str = ""
    message_heading: str = ""   # e.g. "लक्ष्य एवं उद्देश्य" or "Dear Parents and Students,"
    message: str = ""
    order: int = 0


# ---- Terms & Privacy ----
class LegalPage(BaseDoc):
    id: str          # "terms" or "privacy"
    title: str
    content: str     # HTML/Markdown content
    updated_at: str = Field(default_factory=now_iso)


# ---- Exam Papers ----
class ExamQuestion(BaseModel):
    """Single question inside a section"""
    q_no: str = ""          # "1", "2a", etc.
    question: str = ""
    marks: int = 0
    sub_questions: List[str] = []  # for composite questions

class ExamSection(BaseModel):
    """A section in a question paper (e.g. Section A - MCQ)"""
    section_label: str = "Section A"
    section_title: str = ""   # e.g. "Multiple Choice Questions"
    instructions: str = ""
    total_marks: int = 0
    questions: List[ExamQuestion] = []

class ExamPaper(BaseDoc):
    id: str = Field(default_factory=new_id)
    title: str                # e.g. "Half Yearly Examination 2025-26"
    subject: str              # e.g. "Mathematics"
    class_name: str           # e.g. "Class VIII"
    session: str = ""         # e.g. "2025-26"
    exam_type: str = ""       # e.g. "Unit Test", "Half Yearly", "Final"
    date: str = ""
    duration: str = ""        # e.g. "3 Hours"
    total_marks: int = 0
    general_instructions: List[str] = []
    sections: List[ExamSection] = []
    pdf_url: str = ""         # optional PDF upload
    is_published: bool = True
    created_at: str = Field(default_factory=now_iso)


# ---- Holiday Homework ----
class HWSubjectItem(BaseModel):
    """One subject checklist entry inside holiday homework"""
    subject: str
    tasks: List[str] = []        # e.g. ["Write 5 pages of cursive", "Learn tables 1-20"]
    options: List[str] = []      # optional choices student picks from

class HWProjectWork(BaseModel):
    title: str = ""
    description: str = ""
    materials_needed: List[str] = []
    submission_date: str = ""

class HolidayHomework(BaseDoc):
    id: str = Field(default_factory=new_id)
    title: str                         # e.g. "Summer Holiday Homework 2025"
    class_name: str                    # e.g. "Class V"
    vacation_type: str = "Summer"      # Summer / Winter / Diwali / Puja
    year: str = ""                     # e.g. "2025"
    start_date: str = ""
    end_date: str = ""
    message: str = ""                  # general message to parents/students
    subjects: List[HWSubjectItem] = [] # subject-wise checklist
    projects: List[HWProjectWork] = [] # project work section
    doubt_contact: str = ""            # e.g. WhatsApp number or email for doubts
    doubt_timing: str = ""             # e.g. "Mon-Fri, 10am-12pm"
    pdf_url: str = ""                  # optional full PDF download
    is_published: bool = True
    created_at: str = Field(default_factory=now_iso)


# ---- Khelo Patna Gallery ----
class KheloPatnaPhoto(BaseDoc):
    id: str = Field(default_factory=new_id)
    image_url: str
    caption: str = ""
    order: int = 0
    created_at: str = Field(default_factory=now_iso)


# ---- Educator and Thumbnail Generator ----
class Educator(BaseDoc):
    id: str = Field(default_factory=new_id)
    name: str
    role: str = "SDPS Educator"
    photo_url: str = ""
    created_at: str = Field(default_factory=now_iso)


class GeneratedThumbnail(BaseDoc):
    id: str = Field(default_factory=new_id)
    teacher_name: str
    title1: str
    title2: str
    thumbnail_url: str
    created_by: str = ""
    created_at: str = Field(default_factory=now_iso)


class SalarySlip(BaseDoc):
    id: str = Field(default_factory=new_id)
    employee_name: str
    designation: str
    employee_id: str
    department: str
    pay_period: str
    working_days: int
    present_days: int
    basic_salary: int
    hra: int
    da: int
    medical_allowance: int
    conveyance_allowance: int
    special_allowance: int
    pf: int
    professional_tax: int
    tds: int
    other_deductions: int
    gross_salary: int
    total_deductions: int
    net_salary: int
    payment_mode: str
    bank_name: str
    account_number: str
    utr_id: str
    payment_date: str
    slip_format: str = "slip"
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)


class SalaryCertificate(BaseDoc):
    id: str = Field(default_factory=new_id)
    employee_name: str
    designation: str
    basic_salary: int
    hra: int
    da: int
    medical_allowance: int
    conveyance_allowance: int
    special_allowance: int
    gross_salary: int
    payment_date: str
    financial_year: Optional[str] = "2026-2027"
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)


class ExperienceCertificate(BaseDoc):
    id: str = Field(default_factory=new_id)
    employee_name: str
    designation: str
    joining_date: str
    leaving_date: str
    certificate_date: str
    created_by: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)


class Testimonial(BaseDoc):
    id: str = Field(default_factory=new_id)
    parent_name: str
    parent_info: str
    type: str         # "text", "youtube", "instagram", "facebook"
    text: str
    video_url: str = ""
    video_thumb_url: str = ""
    created_at: str = Field(default_factory=now_iso)


# ---- Link Shortener ----
class ShortLinkCreate(BaseDoc):
    title: str
    url: str
    custom_code: Optional[str] = None


class ShortLink(BaseDoc):
    id: str = Field(default_factory=new_id)
    code: str
    title: str
    url: str
    created_at: str = Field(default_factory=now_iso)
    created_by: str
    clicks_count: int = 0


class ShortLinkClick(BaseDoc):
    id: str = Field(default_factory=new_id)
    link_code: str
    timestamp: str = Field(default_factory=now_iso)
    ip: str
    user_agent: str
    browser: str
    os: str
    device: str
    referrer: str
    country: str


# ---- Linktree ----
class LinktreeSettings(BaseDoc):
    id: str = "branding"
    profile_title: str = "S.D. Public School, Patna"
    profile_bio: str = "Nurturing excellence and preparing students to thrive in every challenge."
    logo_url: str = "/logo192.png"
    instagram: str = ""
    facebook: str = ""
    youtube: str = ""
    whatsapp: str = ""
    playstore: str = ""
    email: str = ""


class LinktreeLink(BaseDoc):
    id: str = Field(default_factory=new_id)
    title: str
    url: str
    group_header: Optional[str] = ""
    order: int = 0
    is_active: bool = True
