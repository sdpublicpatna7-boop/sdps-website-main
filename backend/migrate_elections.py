import os
import sys
import requests
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv(".env")

# Configurations
MONGO_URL = "mongodb+srv://SDPS:qf3gtUobJ2kaZERZ@sdps-election-server.trpp58b.mongodb.net/?appName=SDPS-Election-Server"
DB_NAME = "school_election"

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
if SUPABASE_URL.endswith("/rest/v1"):
    SUPABASE_URL = SUPABASE_URL[:-8]
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

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
# 1. MIGRATE POSTS
# ─────────────────────────────────────────────────────────────────────────────
print("\n--- 1. Migrating Posts ---")
posts_col = db["posts"]
mongo_posts = list(posts_col.find({}))
print(f"Found {len(mongo_posts)} posts in MongoDB.")

posts_map = {} # key -> title
for p in mongo_posts:
    key = p.get("key") or p.get("id")
    title = p.get("title")
    order_index = p.get("order") or 0
    posts_map[key] = title

    payload = {
        "key": key,
        "title": title,
        "order_index": int(order_index)
    }
    r = requests.post(f"{SUPABASE_URL}/rest/v1/election_posts", json=payload, headers=headers)
    if r.status_code not in [200, 201]:
        print(f"Failed to insert post {key}: {r.text}")
    else:
        print(f"Migrated Post: {key} ({title})")

# ─────────────────────────────────────────────────────────────────────────────
# 2. MIGRATE CANDIDATES
# ─────────────────────────────────────────────────────────────────────────────
print("\n--- 2. Migrating Candidates ---")
candidates_col = db["candidates"]
mongo_candidates = list(candidates_col.find({}))
print(f"Found {len(mongo_candidates)} candidates in MongoDB.")

candidates_map = {} # id -> candidate doc
for c in mongo_candidates:
    cid = c.get("id")
    post_key = c.get("post")
    name = c.get("name")
    photo = c.get("photo", "")
    symbol = c.get("symbol", "")
    symbol_image = c.get("symbol_image", "")
    adjustment = c.get("adjustment") or 0
    candidates_map[cid] = c

    payload = {
        "id": cid,
        "post_key": post_key,
        "name": name,
        "photo": photo,
        "symbol": symbol,
        "symbol_image": symbol_image,
        "adjustment": int(adjustment)
    }
    r = requests.post(f"{SUPABASE_URL}/rest/v1/election_candidates", json=payload, headers=headers)
    if r.status_code not in [200, 201]:
        print(f"Failed to insert candidate {cid}: {r.text}")
    else:
        print(f"Migrated Candidate: {name}")

# ─────────────────────────────────────────────────────────────────────────────
# 3. MIGRATE VOTES / BALLOTS & COMPILE ARCHIVE FOR 2026-27
# ─────────────────────────────────────────────────────────────────────────────
print("\n--- 3. Migrating & Compiling Votes Archive (2026-27) ---")
votes_col = db["votes"]
mongo_votes = list(votes_col.find({}))
print(f"Found {len(mongo_votes)} casted ballots in MongoDB.")

# Compile vote count totals: post_key -> candidate_id -> count
tallies = {}
voted_admission_nos = set()

for v in mongo_votes:
    adm_no = v.get("admission_no")
    voted_admission_nos.add(adm_no)
    selections = v.get("selections") or {}

    for post_key, cand_id in selections.items():
        if post_key not in tallies:
            tallies[post_key] = {}
        tallies[post_key][cand_id] = tallies[post_key].get(cand_id, 0) + 1

# Generate archive rows
archive_rows = []
for post_key, cands_votes in tallies.items():
    post_title = posts_map.get(post_key, post_key)
    
    # Determine winner
    max_votes = -1
    winner_id = None
    for cid, v_count in cands_votes.items():
        if v_count > max_votes:
            max_votes = v_count
            winner_id = cid

    for cid, v_count in cands_votes.items():
        cand = candidates_map.get(cid)
        cand_name = cand.get("name") if cand else "Unknown Candidate"
        cand_symbol = cand.get("symbol") if cand else ""

        archive_rows.append({
            "session_name": "2026-27",
            "post_key": post_key,
            "post_title": post_title,
            "candidate_name": cand_name,
            "candidate_symbol": cand_symbol,
            "votes_count": int(v_count),
            "is_winner": cid == winner_id and v_count > 0
          })

# Insert into election_results_archive
print(f"Uploading {len(archive_rows)} archive results rows to Supabase...")
for row in archive_rows:
    r = requests.post(f"{SUPABASE_URL}/rest/v1/election_results_archive", json=row, headers=headers)
    if r.status_code not in [200, 201]:
        print(f"Failed to insert archive row: {r.text}")

# ─────────────────────────────────────────────────────────────────────────────
# 4. MIGRATE VOTER ROSTER
# ─────────────────────────────────────────────────────────────────────────────
print("\n--- 4. Migrating Voter Roster ---")
voters_col = db["users"]
mongo_voters = list(voters_col.find({}))
print(f"Found {len(mongo_voters)} voters in MongoDB.")

for v in mongo_voters:
    adm_no = v.get("admission_no")
    name = v.get("name")
    role = v.get("role", "student")
    class_name = v.get("class_name")
    father_name = v.get("father_name")
    subject = v.get("subject")
    designation = v.get("designation")
    already_voted = adm_no in voted_admission_nos

    payload = {
        "admission_no": adm_no,
        "name": name,
        "role": role,
        "class_name": class_name,
        "father_name": father_name,
        "subject": subject,
        "designation": designation,
        "already_voted": already_voted
    }
    r = requests.post(f"{SUPABASE_URL}/rest/v1/election_voters", json=payload, headers=headers)
    if r.status_code not in [200, 201]:
        print(f"Failed to insert voter {adm_no}: {r.text}")

# ─────────────────────────────────────────────────────────────────────────────
# 5. SET ELECTION STATUS TO CLOSED
# ─────────────────────────────────────────────────────────────────────────────
print("\n--- 5. Closing Election Settings ---")
requests.post(f"{SUPABASE_URL}/rest/v1/election_settings", json={"key": "election_open", "value": "false"}, headers=headers)

print("\n🎉 Election Migration & Results Archiving Completed Successfully!")
mongo_client.close()
