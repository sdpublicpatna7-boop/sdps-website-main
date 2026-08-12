"""Data Migration Script: MongoDB to Supabase.

This script reads data from your local MongoDB collections and inserts them 
directly into your Supabase Postgres database and Supabase Auth service.
"""

import os
import sys
import json
import requests
from pymongo import MongoClient
from dotenv import load_dotenv

# Load env variables
load_dotenv(".env")

# Configurations
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://127.0.0.1:27017")
DB_NAME = os.environ.get("DB_NAME", "sdps_portal")

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
if SUPABASE_URL.endswith("/rest/v1"):
    SUPABASE_URL = SUPABASE_URL[:-8]
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") # Service role key required to bypass RLS

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env")
    sys.exit(1)

print(f"Connecting to MongoDB: {MONGO_URL} (Database: {DB_NAME})")
mongo_client = MongoClient(MONGO_URL)
db = mongo_client[DB_NAME]

def clean_date(val):
    if val == "" or val is None:
        return None
    return val

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}

# ─────────────────────────────────────────────────────────────────────────────
# 1. MIGRATE USERS & PROFILES
# ─────────────────────────────────────────────────────────────────────────────
print("\n--- 1. Migrating Users & Profiles ---")
users_col = db["qp_users"]
mongo_users = list(users_col.find({}))
print(f"Found {len(mongo_users)} users in MongoDB.")

user_mapping = {} # maps MongoDB username to Supabase uuid

for u in mongo_users:
    username = u.get("username") or u.get("email", "").split("@")[0] or u.get("id")
    email = u.get("email") or f"{username}@sdpublic.org"
    name = u.get("name", username)
    phone = u.get("phone", "")
    role = u.get("role", "teacher")
    
    # Check if user already exists in Supabase
    check_url = f"{SUPABASE_URL}/rest/v1/qp_profiles?username=eq.{username}&select=id"
    r_check = requests.get(check_url, headers=headers)
    existing_profile = r_check.json()
    
    user_id = None
    if isinstance(existing_profile, list) and len(existing_profile) > 0:
        user_id = existing_profile[0]["id"]
        print(f"User {username} already exists in Supabase. ID: {user_id}")
    else:
        # Create user in Supabase Auth Admin
        auth_url = f"{SUPABASE_URL}/auth/v1/admin/users"
        auth_payload = {
            "email": email,
            "password": "TempPassword123!", # Will reset password or set via OTP
            "email_confirm": True,
            "user_metadata": {
                "name": name,
                "role": role
            }
        }
        r_auth = requests.post(auth_url, json=auth_payload, headers=headers)
        if r_auth.status_code in [200, 201]:
            auth_res = r_auth.json()
            user_id = auth_res["id"]
            print(f"Created/Resolved Auth User for {username}. ID: {user_id}")
        else:
            # Maybe email already registered in Auth
            print(f"Auth creation returned code {r_auth.status_code} for {username}. Resolving Auth ID...")
            # Query the GoTrue Auth Admin users list to find matching user UUID
            list_url = f"{SUPABASE_URL}/auth/v1/admin/users"
            r_list = requests.get(list_url, headers=headers)
            if r_list.status_code == 200:
                users_data = r_list.json().get("users", [])
                for usr in users_data:
                    if usr.get("email") == email:
                        user_id = usr.get("id")
                        print(f"Resolved existing Auth User ID: {user_id}")
                        break
            if not user_id:
                print(f"Could not resolve Auth User ID for {username}. Response: {r_auth.text}")
                continue

    if user_id:
        user_mapping[username] = user_id
        # Insert profile metadata
        profile_payload = {
            "id": user_id,
            "username": username,
            "name": name,
            "email": email,
            "phone": phone,
            "role": role,
            "password_set": u.get("password_set", False),
            "incharge_classes": u.get("incharge_classes", []),
            "can_review": u.get("can_review", False)
        }
        prof_url = f"{SUPABASE_URL}/rest/v1/qp_profiles"
        r_prof = requests.post(prof_url, json=profile_payload, headers=headers)
        if r_prof.status_code not in [200, 201]:
            print(f"Failed to upsert profile for {username}: {r_prof.text}")

# ─────────────────────────────────────────────────────────────────────────────
# 2. MIGRATE ARCHIVES
# ─────────────────────────────────────────────────────────────────────────────
print("\n--- 2. Migrating Archives ---")
archives_col = db["qp_archives"]
mongo_archives = list(archives_col.find({}))
print(f"Found {len(mongo_archives)} archives in MongoDB.")

for arch in mongo_archives:
    archive_id = arch.get("id")
    payload = {
        "id": archive_id,
        "session_name": arch.get("session_name"),
        "exam_type": arch.get("exam_type"),
        "is_open": arch.get("is_open", True)
    }
    r = requests.post(f"{SUPABASE_URL}/rest/v1/qp_archives", json=payload, headers=headers)
    if r.status_code not in [200, 201]:
        print(f"Failed to insert archive {archive_id}: {r.text}")
    else:
        print(f"Migrated Archive: {archive_id}")

# ─────────────────────────────────────────────────────────────────────────────
# 3. MIGRATE ASSIGNMENTS
# ─────────────────────────────────────────────────────────────────────────────
print("\n--- 3. Migrating Assignments ---")
assignments_col = db["qp_assignments"]
mongo_assignments = list(assignments_col.find({}))
print(f"Found {len(mongo_assignments)} assignments in MongoDB.")

for a in mongo_assignments:
    assignment_id = a.get("id")
    t_username = a.get("teacher_id") # MongoDB stores teacher username in teacher_id
    t_uuid = user_mapping.get(t_username)
    
    payload = {
        "id": assignment_id,
        "archive_id": a.get("archive_id"),
        "session_name": a.get("session_name"),
        "exam_type": a.get("exam_type"),
        "class_name": a.get("class_name"),
        "subject": a.get("subject"),
        "teacher_id": t_uuid,
        "teacher_name": a.get("teacher_name"),
        "status": a.get("status", "draft"),
        "submitted_at": clean_date(a.get("submitted_at")),
        "rejection_reason": a.get("rejection_reason"),
        "rejected_by": a.get("rejected_by"),
        "rejected_at": clean_date(a.get("rejected_at"))
    }
    r = requests.post(f"{SUPABASE_URL}/rest/v1/qp_assignments", json=payload, headers=headers)
    if r.status_code not in [200, 201]:
        print(f"Failed to insert assignment {assignment_id}: {r.text}")
    else:
        print(f"Migrated Assignment: {assignment_id}")

# ─────────────────────────────────────────────────────────────────────────────
# 4. MIGRATE PAPERS
# ─────────────────────────────────────────────────────────────────────────────
print("\n--- 4. Migrating Papers ---")
papers_col = db["qp_papers"]
mongo_papers = list(papers_col.find({}))
print(f"Found {len(mongo_papers)} papers in MongoDB.")

for p in mongo_papers:
    paper_id = p.get("id")
    assignment_id = p.get("assignment_id")
    
    payload = {
        "id": paper_id,
        "assignment_id": assignment_id,
        "questions": p.get("questions", []),
        "sections": p.get("sections", []),
        "updated_at": clean_date(p.get("updated_at"))
    }
    r = requests.post(f"{SUPABASE_URL}/rest/v1/qp_papers", json=payload, headers=headers)
    if r.status_code not in [200, 201]:
        print(f"Failed to insert paper {paper_id}: {r.text}")
    else:
        print(f"Migrated Paper: {paper_id}")

# ─────────────────────────────────────────────────────────────────────────────
# 5. MIGRATE NOTIFICATIONS
# ─────────────────────────────────────────────────────────────────────────────
print("\n--- 5. Migrating Notifications ---")
notif_col = db["qp_notifications"]
mongo_notifications = list(notif_col.find({}))
print(f"Found {len(mongo_notifications)} notifications in MongoDB.")

for n in mongo_notifications:
    notif_id = n.get("id")
    t_username = n.get("user_id") # MongoDB stores username in user_id
    t_uuid = user_mapping.get(t_username)
    
    if not t_uuid:
        continue
        
    payload = {
        "id": notif_id,
        "user_id": t_uuid,
        "title": n.get("title"),
        "message": n.get("message"),
        "type": n.get("type"),
        "assignment_id": n.get("assignment_id"),
        "is_read": n.get("is_read", False),
        "created_at": clean_date(n.get("created_at"))
    }
    r = requests.post(f"{SUPABASE_URL}/rest/v1/qp_notifications", json=payload, headers=headers)
    if r.status_code not in [200, 201]:
        print(f"Failed to insert notification {notif_id}: {r.text}")
    else:
        print(f"Migrated Notification: {notif_id}")

# ─────────────────────────────────────────────────────────────────────────────
# 6. MIGRATE PUBLIC SITE TABLES
# ─────────────────────────────────────────────────────────────────────────────
print("\n--- 6. Migrating Public Website Tables ---")

# A. Admission Enquiries
enq_col = db["admission_enquiries"]
for item in enq_col.find({}):
    payload = {
        "id": item.get("id"),
        "parent_name": item.get("parent_name"),
        "phone": item.get("phone"),
        "email": item.get("email"),
        "child_name": item.get("child_name"),
        "child_class": item.get("child_class"),
        "message": item.get("message"),
        "status": item.get("status", "pending")
    }
    requests.post(f"{SUPABASE_URL}/rest/v1/admission_enquiries", json=payload, headers=headers)

# B. Alumni Members
alumni_col = db["alumni_members"]
for item in alumni_col.find({}):
    payload = {
        "id": item.get("id"),
        "name": item.get("name"),
        "email": item.get("email"),
        "phone": item.get("phone"),
        "batch_year": int(item.get("batch_year", 2000)),
        "current_occupation": item.get("current_occupation"),
        "location": item.get("location"),
        "approved": item.get("approved", False),
        "payment_status": item.get("payment_status", "unpaid"),
        "payment_id": item.get("payment_id"),
        "order_id": item.get("order_id")
    }
    requests.post(f"{SUPABASE_URL}/rest/v1/alumni_members", json=payload, headers=headers)

# C. Career Applications
career_col = db["career_applications"]
for item in career_col.find({}):
    payload = {
        "id": item.get("id"),
        "name": item.get("name"),
        "email": item.get("email"),
        "phone": item.get("phone"),
        "post": item.get("post"),
        "resume_url": item.get("resume_url"),
        "experience": item.get("experience")
    }
    requests.post(f"{SUPABASE_URL}/rest/v1/career_applications", json=payload, headers=headers)

# D. Legal Pages
legal_col = db["legal_pages"]
for item in legal_col.find({}):
    payload = {
        "id": item.get("id"),
        "title": item.get("title"),
        "content": item.get("content")
    }
    requests.post(f"{SUPABASE_URL}/rest/v1/site_legal_pages", json=payload, headers=headers)

# E. Notices / News
news_col = db["notices"]
for item in news_col.find({}):
    payload = {
        "id": item.get("id"),
        "title": item.get("title"),
        "content": item.get("content"),
        "date": clean_date(item.get("date")),
        "category": item.get("category", "notice"),
        "attachment_url": item.get("attachment_url")
    }
    requests.post(f"{SUPABASE_URL}/rest/v1/site_news", json=payload, headers=headers)

# F. TC Records
tc_col = db["tc_records"]
for item in tc_col.find({}):
    payload = {
        "id": item.get("id"),
        "student_name": item.get("student_name"),
        "admission_no": item.get("admission_no"),
        "issue_date": clean_date(item.get("issue_date")),
        "status": item.get("status", "active"),
        "file_url": item.get("file_url")
    }
    requests.post(f"{SUPABASE_URL}/rest/v1/tc_records", json=payload, headers=headers)

# G. Videos
video_col = db["videos"]
for item in video_col.find({}):
    payload = {
        "id": item.get("id"),
        "title": item.get("title"),
        "youtube_id": item.get("youtube_id")
    }
    requests.post(f"{SUPABASE_URL}/rest/v1/site_videos", json=payload, headers=headers)

# H. Settings (site_settings, popup_settings, alumni_settings, birthday_settings)
settings_map = {
    "site_settings": "site_settings",
    "popup_settings": "popup",
    "alumni_settings": "alumni",
    "birthday_settings": "birthday"
}
for col_name, key_name in settings_map.items():
    col = db[col_name]
    doc = col.find_one({})
    if doc:
        doc.pop("_id", None)
        payload = {
            "key": key_name,
            "value": doc
        }
        requests.post(f"{SUPABASE_URL}/rest/v1/site_settings", json=payload, headers=headers)

# I. Birthday Students (1.1K documents)
bday_col = db["birthday_students"]
bday_docs = list(bday_col.find({}))
print(f"Migrating {len(bday_docs)} birthday students...")
for item in bday_docs:
    payload = {
        "id": item.get("id"),
        "student_name": item.get("student_name"),
        "class_name": item.get("class_name"),
        "dob": clean_date(item.get("dob")),
        "phone": item.get("phone"),
        "email": item.get("email")
    }
    requests.post(f"{SUPABASE_URL}/rest/v1/birthday_students", json=payload, headers=headers)

print("\n🎉 Whole Database Migration Completed Successfully!")
mongo_client.close()
