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

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") # Service role key required to bypass RLS

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env")
    sys.exit(1)

print(f"Connecting to MongoDB: {MONGO_URL} (Database: {DB_NAME})")
mongo_client = MongoClient(MONGO_URL)
db = mongo_client[DB_NAME]

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
    username = u.get("username")
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
        if r_auth.status_code == 201:
            auth_res = r_auth.json()
            user_id = auth_res["id"]
            print(f"Created Auth User for {username}. ID: {user_id}")
        else:
            # Maybe email already registered in Auth
            print(f"Auth creation returned code {r_auth.status_code} for {username}. Attempting profile link...")
            # Search auth.users by email to get their ID
            search_url = f"{SUPABASE_URL}/rest/v1/qp_profiles?email=eq.{email}&select=id"
            r_search = requests.get(search_url, headers=headers)
            search_res = r_search.json()
            if isinstance(search_res, list) and len(search_res) > 0:
                user_id = search_res[0]["id"]
            else:
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
        "submitted_at": a.get("submitted_at"),
        "rejection_reason": a.get("rejection_reason"),
        "rejected_by": a.get("rejected_by"),
        "rejected_at": a.get("rejected_at")
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
        "updated_at": p.get("updated_at")
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
        "created_at": n.get("created_at")
    }
    r = requests.post(f"{SUPABASE_URL}/rest/v1/qp_notifications", json=payload, headers=headers)
    if r.status_code not in [200, 201]:
        print(f"Failed to insert notification {notif_id}: {r.text}")
    else:
        print(f"Migrated Notification: {notif_id}")

print("\n🎉 Migration Completed Successfully!")
mongo_client.close()
