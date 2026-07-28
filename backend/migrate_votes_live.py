import os
import sys
import requests
from pymongo import MongoClient
from dotenv import load_dotenv

# Load env variables
load_dotenv(".env")

import os
MONGO_URL = os.getenv("MONGO_URL", "")
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

# 1. Fetch votes from MongoDB
print("\nFetching votes from MongoDB 'votes' collection...")
votes_col = db["votes"]
mongo_votes = list(votes_col.find({}))
print(f"Found {len(mongo_votes)} votes in MongoDB.")

if not mongo_votes:
    print("No votes found in MongoDB. Exiting.")
    mongo_client.close()
    sys.exit(0)

# 2. Upload votes to Supabase election_votes in bulk
print("\nPreparing bulk insertion of votes to Supabase...")
vote_payloads = []
voted_admission_nos = []

for v in mongo_votes:
    adm_no = v.get("admission_no")
    selections = v.get("selections") or {}
    if adm_no:
        vote_payloads.append({
            "voter_admission_no": adm_no,
            "selections": selections
        })
        voted_admission_nos.append(adm_no)

# Delete existing votes in Supabase election_votes first to prevent duplicates
print("Clearing existing votes from Supabase election_votes...")
r_clear = requests.delete(f"{SUPABASE_URL}/rest/v1/election_votes", headers=headers)
if r_clear.status_code not in [200, 204]:
    print(f"Warning: Failed to clear election_votes table: {r_clear.text}")

# Bulk insert votes
# Insert in batches of 100
batch_size = 100
for i in range(0, len(vote_payloads), batch_size):
    batch = vote_payloads[i:i + batch_size]
    print(f"Inserting batch of {len(batch)} votes to Supabase...")
    r_insert = requests.post(f"{SUPABASE_URL}/rest/v1/election_votes", json=batch, headers={**headers, "Prefer": "resolution=merge-duplicates"})
    if r_insert.status_code not in [200, 201]:
        print(f"ERROR: Failed to insert batch starting at index {i}: {r_insert.text}")
    else:
        print(f"Successfully inserted batch starting at index {i}.")

# 3. Update already_voted flag in election_voters
print("\nUpdating already_voted status for voters in Supabase...")

# First reset all voters already_voted flags to false
print("Resetting all already_voted flags in Supabase to false...")
r_reset = requests.patch(
    f"{SUPABASE_URL}/rest/v1/election_voters?already_voted=eq.true",
    json={"already_voted": False},
    headers=headers
)
if r_reset.status_code not in [200, 204]:
    print(f"Warning: Failed to reset voter flags: {r_reset.text}")

# Set already_voted to true in batches of 50 using `in` filter
voter_batch_size = 50
for i in range(0, len(voted_admission_nos), voter_batch_size):
    batch = voted_admission_nos[i:i + voter_batch_size]
    adm_list_str = ",".join(batch)
    print(f"Setting already_voted=true for batch of {len(batch)} voters...")
    r_update = requests.patch(
        f"{SUPABASE_URL}/rest/v1/election_voters?admission_no=in.({adm_list_str})",
        json={"already_voted": True},
        headers=headers
    )
    if r_update.status_code not in [200, 204]:
        print(f"ERROR: Failed to update already_voted status for batch: {r_update.text}")
    else:
        print(f"Successfully updated voter status for batch.")

print("\n🎉 Vote migration and voter flags synchronization completed successfully!")
mongo_client.close()
