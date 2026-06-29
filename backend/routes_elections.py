import os
import logging
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException, Request, status, UploadFile, File, Depends
from pydantic import BaseModel
import httpx

logger = logging.getLogger("sdps.elections")

# Supabase REST settings
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
if SUPABASE_URL.endswith("/rest/v1"):
    SUPABASE_URL = SUPABASE_URL[:-8]
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

headers = {
    "apikey": SUPABASE_KEY or "",
    "Authorization": f"Bearer {SUPABASE_KEY}" if SUPABASE_KEY else "",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

elections_router = APIRouter(prefix="/api/elections", tags=["elections"])

# Models
class VoteCastPayload(BaseModel):
    admission_no: str
    selections: Dict[str, str]

class SettingUpdatePayload(BaseModel):
    value: str

class PostCreatePayload(BaseModel):
    key: str
    title: str
    order_index: int

class CandidateCreatePayload(BaseModel):
    name: str
    post_key: str
    symbol: str
    photo: Optional[str] = ""
    symbol_image: Optional[str] = ""

async def check_supabase():
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(
            status_code=503,
            detail="Supabase service is not configured on the backend."
        )

# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@elections_router.get("/settings")
async def get_settings():
    await check_supabase()
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{SUPABASE_URL}/rest/v1/election_settings", headers=headers)
        if r.status_code != 200:
            logger.error(f"Supabase settings fetch failed: {r.text}")
            raise HTTPException(status_code=500, detail="Failed to fetch settings.")
        
        data = r.json()
        settings = {}
        for d in data:
            settings[d["key"]] = d["value"]
        return settings

@elections_router.get("/stats")
async def get_stats():
    await check_supabase()
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{SUPABASE_URL}/rest/v1/election_voters?select=admission_no",
            headers={**headers, "Prefer": "count=exact", "Range": "0-0"}
        )
        count_header = r.headers.get("content-range")
        vCount = 0
        if count_header and "/" in count_header:
            vCount = int(count_header.split("/")[-1])
        return {"voters_count": vCount}

@elections_router.get("/voters/{admission_no}")
async def get_voter(admission_no: str):
    await check_supabase()
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{SUPABASE_URL}/rest/v1/election_voters?admission_no=eq.{admission_no}",
            headers=headers
        )
        if r.status_code != 200:
            logger.error(f"Voter fetch error: {r.text}")
            raise HTTPException(status_code=500, detail="Failed to search voter.")
        
        voters = r.json()
        if not voters:
            raise HTTPException(status_code=404, detail="Voter not found in roster.")
        
        v = voters[0]
        return {
            "admission_no": v["admission_no"],
            "name": v["name"],
            "role": v["role"],
            "has_voted": v["already_voted"],
            "class_name": v.get("class_name"),
            "father_name": v.get("father_name")
        }

@elections_router.get("/bootstrap")
async def bootstrap():
    await check_supabase()
    async with httpx.AsyncClient() as client:
        # Fetch posts
        r_posts = await client.get(
            f"{SUPABASE_URL}/rest/v1/election_posts?order=order_index.asc",
            headers=headers
        )
        # Fetch candidates
        r_cands = await client.get(
            f"{SUPABASE_URL}/rest/v1/election_candidates",
            headers=headers
        )

        if r_posts.status_code != 200 or r_cands.status_code != 200:
            logger.error(f"Bootstrap fetch failed: posts={r_posts.text}, candidates={r_cands.text}")
            raise HTTPException(status_code=500, detail="Failed to load ballot.")

        posts = [{"key": p["key"], "title": p["title"], "order": p["order_index"]} for p in r_posts.json()]
        candidates = [{
            "id": c["id"],
            "post": c["post_key"],
            "name": c["name"],
            "photo": c.get("photo", ""),
            "symbol": c.get("symbol", ""),
            "symbol_image": c.get("symbol_image", ""),
            "adjustment": c.get("adjustment", 0)
        } for c in r_cands.json()]

        return {
            "posts": posts,
            "candidates": candidates
        }

@elections_router.post("/vote")
async def cast_vote(payload: VoteCastPayload):
    await check_supabase()
    adm = payload.admission_no.strip()
    selections = payload.selections

    async with httpx.AsyncClient() as client:
        # 1. Check election settings
        r_settings = await client.get(
            f"{SUPABASE_URL}/rest/v1/election_settings?key=eq.election_open",
            headers=headers
        )
        if r_settings.status_code != 200 or not r_settings.json():
            raise HTTPException(status_code=403, detail="Voting is currently closed.")
        
        if r_settings.json()[0]["value"] != "true":
            raise HTTPException(status_code=403, detail="Voting is currently closed.")

        # 2. Check voter status
        r_voter = await client.get(
            f"{SUPABASE_URL}/rest/v1/election_voters?admission_no=eq.{adm}",
            headers=headers
        )
        if r_voter.status_code != 200 or not r_voter.json():
            raise HTTPException(status_code=404, detail="Voter not registered.")
        
        voter = r_voter.json()[0]
        if voter["already_voted"]:
            raise HTTPException(status_code=400, detail="You have already casted your vote.")

        # 3. Insert selections into election_votes
        r_vote = await client.post(
            f"{SUPABASE_URL}/rest/v1/election_votes",
            json={"voter_admission_no": adm, "selections": selections},
            headers=headers
        )
        if r_vote.status_code not in [200, 201]:
            logger.error(f"Insert vote failed: {r_vote.text}")
            raise HTTPException(status_code=500, detail="Failed to cast vote.")

        # 4. Set voter status to already voted
        r_update = await client.patch(
            f"{SUPABASE_URL}/rest/v1/election_voters?admission_no=eq.{adm}",
            json={"already_voted": True},
            headers=headers
        )
        if r_update.status_code not in [200, 204]:
            logger.error(f"Voter update failed: {r_update.text}")
            # Rollback vote insert
            await client.delete(
                f"{SUPABASE_URL}/rest/v1/election_votes?voter_admission_no=eq.{adm}",
                headers=headers
            )
            raise HTTPException(status_code=500, detail="Voter registration confirmation failed.")

        return {"success": True, "message": "Vote cast successfully!"}

# ─────────────────────────────────────────────────────────────────────────────
# ADMIN ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@elections_router.post("/settings/{key}")
async def update_settings(key: str, payload: SettingUpdatePayload):
    await check_supabase()
    async with httpx.AsyncClient() as client:
        # Upsert setting
        r = await client.post(
            f"{SUPABASE_URL}/rest/v1/election_settings",
            json={"key": key, "value": payload.value},
            headers={**headers, "Prefer": "resolution=merge-duplicates"}
        )
        if r.status_code not in [200, 201, 204]:
            logger.error(f"Failed to update setting {key}: {r.text}")
            raise HTTPException(status_code=500, detail="Failed to save settings.")
        return {"success": True}

@elections_router.post("/posts")
async def create_post(payload: PostCreatePayload):
    await check_supabase()
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{SUPABASE_URL}/rest/v1/election_posts",
            json={"key": payload.key, "title": payload.title, "order_index": payload.order_index},
            headers=headers
        )
        if r.status_code not in [200, 201]:
            logger.error(f"Failed to create post: {r.text}")
            raise HTTPException(status_code=500, detail="Failed to create position.")
        return {"success": True}

@elections_router.delete("/posts/{key}")
async def delete_post(key: str):
    await check_supabase()
    async with httpx.AsyncClient() as client:
        r = await client.delete(
            f"{SUPABASE_URL}/rest/v1/election_posts?key=eq.{key}",
            headers=headers
        )
        if r.status_code not in [200, 204]:
            logger.error(f"Failed to delete post: {r.text}")
            raise HTTPException(status_code=500, detail="Failed to delete position.")
        return {"success": True}

@elections_router.post("/candidates")
async def create_candidate(payload: CandidateCreatePayload):
    await check_supabase()
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{SUPABASE_URL}/rest/v1/election_candidates",
            json={
                "name": payload.name,
                "post_key": payload.post_key,
                "symbol": payload.symbol,
                "photo": payload.photo,
                "symbol_image": payload.symbol_image
            },
            headers=headers
        )
        if r.status_code not in [200, 201]:
            logger.error(f"Failed to nominate candidate: {r.text}")
            raise HTTPException(status_code=500, detail="Failed to nominate candidate.")
        return {"success": True}

@elections_router.delete("/candidates/{cid}")
async def delete_candidate(cid: str):
    await check_supabase()
    async with httpx.AsyncClient() as client:
        r = await client.delete(
            f"{SUPABASE_URL}/rest/v1/election_candidates?id=eq.{cid}",
            headers=headers
        )
        if r.status_code not in [200, 204]:
            logger.error(f"Failed to delete candidate: {r.text}")
            raise HTTPException(status_code=500, detail="Failed to delete candidate.")
        return {"success": True}

@elections_router.post("/voters/upload")
async def upload_voters(payload: List[Dict[str, Any]]):
    await check_supabase()
    async with httpx.AsyncClient() as client:
        # 1. Clear existing voters
        r_del = await client.delete(f"{SUPABASE_URL}/rest/v1/election_voters", headers=headers)
        if r_del.status_code not in [200, 204]:
            logger.error(f"Failed to clear voters: {r_del.text}")
            raise HTTPException(status_code=500, detail="Failed to prepare voters database.")

        # 2. Insert new voters in chunks
        for i in range(0, len(payload), 100):
            chunk = payload[i:i + 100]
            r_ins = await client.post(f"{SUPABASE_URL}/rest/v1/election_voters", json=chunk, headers=headers)
            if r_ins.status_code not in [200, 201, 204]:
                logger.error(f"Failed to insert chunk: {r_ins.text}")
                raise HTTPException(status_code=500, detail="Failed to save voter records.")

        return {"success": True, "count": len(payload)}

@elections_router.post("/archive")
async def archive_results(session_name: str = "2026-27"):
    await check_supabase()
    async with httpx.AsyncClient() as client:
        # 1. Fetch posts, candidates, and votes from Supabase
        r_posts = await client.get(f"{SUPABASE_URL}/rest/v1/election_posts", headers=headers)
        r_cands = await client.get(f"{SUPABASE_URL}/rest/v1/election_candidates", headers=headers)
        r_votes = await client.get(f"{SUPABASE_URL}/rest/v1/election_votes", headers=headers)
        
        if r_posts.status_code != 200 or r_cands.status_code != 200 or r_votes.status_code != 200:
            logger.error(f"Failed to fetch archive source tables: posts={r_posts.text}, candidates={r_cands.text}, votes={r_votes.text}")
            raise HTTPException(status_code=500, detail="Failed to fetch data for compilation.")
        
        posts = r_posts.json()
        candidates = r_cands.json()
        votes = r_votes.json()
        
        # Compile counts
        count = {}  # post_key -> candidate_id -> count
        for v in votes:
            sel = v.get("selections") or {}
            for pk, cid in sel.items():
                if pk not in count:
                    count[pk] = {}
                count[pk][cid] = count[pk].get(cid, 0) + 1
                
        archive_rows = []
        for post in posts:
            p_key = post["key"]
            p_title = post["title"]
            post_cands = [c for c in candidates if c["post_key"] == p_key]
            
            post_counts = count.get(p_key, {})
            max_votes = -1
            winner_id = None
            for c in post_cands:
                votes_for_cand = post_counts.get(c["id"], 0)
                if votes_for_cand > max_votes:
                    max_votes = votes_for_cand
                    winner_id = c["id"]
                    
            for c in post_cands:
                v_count = post_counts.get(c["id"], 0)
                archive_rows.append({
                    "session_name": session_name,
                    "post_key": p_key,
                    "post_title": p_title,
                    "candidate_name": c["name"],
                    "candidate_symbol": c["symbol"],
                    "votes_count": v_count,
                    "is_winner": c["id"] == winner_id and v_count > 0
                })
                
        # 2. Insert into archive
        if archive_rows:
            r_ins = await client.post(f"{SUPABASE_URL}/rest/v1/election_results_archive", json=archive_rows, headers=headers)
            if r_ins.status_code not in [200, 201]:
                logger.error(f"Failed to write archive rows: {r_ins.text}")
                raise HTTPException(status_code=500, detail="Failed to save archive results.")
                
        # 3. Clear votes
        r_del_votes = await client.delete(f"{SUPABASE_URL}/rest/v1/election_votes", headers=headers)
        if r_del_votes.status_code not in [200, 204]:
            logger.error(f"Failed to delete votes: {r_del_votes.text}")
            
        # 4. Reset voter flag
        r_reset = await client.patch(
            f"{SUPABASE_URL}/rest/v1/election_voters",
            json={"already_voted": False},
            headers=headers
        )
        if r_reset.status_code not in [200, 204]:
            logger.error(f"Failed to reset voter flag: {r_reset.text}")
            
        # 5. Set settings to close
        await client.post(
            f"{SUPABASE_URL}/rest/v1/election_settings",
            json={"key": "election_open", "value": "false"},
            headers={**headers, "Prefer": "resolution=merge-duplicates"}
        )
        
        return {"success": True}

from auth import get_current_admin

@elections_router.get("/board")
async def public_board():
    await check_supabase()
    async with httpx.AsyncClient() as client:
        # Fetch posts, voters, and settings
        r_posts = await client.get(f"{SUPABASE_URL}/rest/v1/election_posts", headers=headers)
        r_voters = await client.get(f"{SUPABASE_URL}/rest/v1/election_voters", headers=headers)
        r_votes = await client.get(f"{SUPABASE_URL}/rest/v1/election_votes", headers=headers)
        r_open = await client.get(f"{SUPABASE_URL}/rest/v1/election_settings?key=eq.election_open", headers=headers)

        if r_posts.status_code != 200 or r_voters.status_code != 200 or r_votes.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to load dashboard data.")

        posts = r_posts.json()
        voters = r_voters.json()
        votes = r_votes.json()
        
        election_open = r_open.json()[0]["value"] == "true" if r_open.json() else False

        total_users = len(voters)
        total_students = sum(1 for v in voters if v.get("role") == "student")
        total_teachers = sum(1 for v in voters if v.get("role") == "teacher")

        voted_students = sum(1 for v in voters if v["already_voted"] and v.get("role") == "student")
        voted_teachers = sum(1 for v in voters if v["already_voted"] and v.get("role") == "teacher")

        class_groups = {}
        for u in voters:
            if u.get("role") == "student":
                cls = u.get("class_name") or "Unassigned"
                g = class_groups.setdefault(cls, {"class_name": cls, "total": 0, "voted": 0})
                g["total"] += 1
                if u["already_voted"]:
                    g["voted"] += 1
        class_breakdown = sorted(class_groups.values(), key=lambda x: x["class_name"])

        return {
            "election_open": election_open,
            "categories_count": len(posts),
            "total_users": total_users,
            "total_students": total_students,
            "total_teachers": total_teachers,
            "total_voted": len(votes),
            "voted_students": voted_students,
            "voted_teachers": voted_teachers,
            "pending": max(0, total_users - len(votes)),
            "turnout_pct": round((len(votes) / total_users * 100), 1) if total_users else 0,
            "class_breakdown": class_breakdown,
            "last_vote_at": "",
            "updated_at": ""
        }

@elections_router.get("/results")
async def get_results(admin = Depends(get_current_admin)):
    await check_supabase()
    async with httpx.AsyncClient() as client:
        r_posts = await client.get(f"{SUPABASE_URL}/rest/v1/election_posts?order=order_index.asc", headers=headers)
        r_cands = await client.get(f"{SUPABASE_URL}/rest/v1/election_candidates", headers=headers)
        r_votes = await client.get(f"{SUPABASE_URL}/rest/v1/election_votes", headers=headers)
        r_voters = await client.get(f"{SUPABASE_URL}/rest/v1/election_voters", headers={**headers, "Prefer": "count=exact", "Range": "0-0"})

        if r_posts.status_code != 200 or r_cands.status_code != 200 or r_votes.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to compile results.")

        posts = r_posts.json()
        candidates = r_cands.json()
        votes = r_votes.json()
        
        count_header = r_voters.headers.get("content-range")
        total_users = int(count_header.split("/")[-1]) if count_header and "/" in count_header else 0

        counts = {}
        for v in votes:
            sel = v.get("selections") or {}
            for cid in sel.values():
                counts[cid] = counts.get(cid, 0) + 1

        by_post = {p["key"]: [] for p in posts}
        for c in candidates:
            adj = int(c.get("adjustment") or 0)
            entry = {
                "candidate_id": c["id"],
                "name": c["name"],
                "photo": c.get("photo", ""),
                "symbol": c.get("symbol", ""),
                "votes": counts.get(c["id"], 0) + adj
            }
            if c["post_key"] in by_post:
                by_post[c["post_key"]].append(entry)

        for k in by_post:
            by_post[k].sort(key=lambda x: x["votes"], reverse=True)

        return {
            "posts": [{"key": p["key"], "title": p["title"], "order": p["order_index"]} for p in posts],
            "by_post": by_post,
            "winners": {p["key"]: (by_post[p["key"]][0] if by_post[p["key"]] else None) for p in posts},
            "total_voted": len(votes),
            "total_users": total_users,
            "turnout_pct": round((len(votes) / total_users * 100), 1) if total_users else 0
        }


@elections_router.post("/settings/results_publish_time")
async def set_results_publish_time(payload: Dict[str, Any], admin = Depends(get_current_admin)):
    """Schedule when results become public. payload = {value: ISO datetime string or empty string to clear}"""
    await check_supabase()
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{SUPABASE_URL}/rest/v1/election_settings",
            json={"key": "results_publish_time", "value": payload.get("value", "")},
            headers={**headers, "Prefer": "resolution=merge-duplicates"}
        )
        if r.status_code not in [200, 201, 204]:
            logger.error(f"Failed to set results_publish_time: {r.text}")
            raise HTTPException(status_code=500, detail="Failed to save schedule.")
        return {"success": True}


@elections_router.get("/public-results")
async def public_results():
    """Public endpoint: returns results only if publish time has passed, otherwise returns countdown."""
    from datetime import datetime, timezone
    await check_supabase()
    async with httpx.AsyncClient() as client:
        # 1. Check publish time setting
        r_time = await client.get(
            f"{SUPABASE_URL}/rest/v1/election_settings?key=eq.results_publish_time",
            headers=headers
        )
        publish_time_str = ""
        if r_time.status_code == 200 and r_time.json():
            publish_time_str = r_time.json()[0].get("value", "")

        if not publish_time_str:
            return {"status": "sealed", "message": "Results have not been scheduled for release yet."}

        try:
            publish_dt = datetime.fromisoformat(publish_time_str.replace("Z", "+00:00"))
        except Exception:
            return {"status": "sealed", "message": "Invalid publish time configured."}

        now = datetime.now(timezone.utc)
        if now < publish_dt:
            remaining = (publish_dt - now).total_seconds()
            return {
                "status": "countdown",
                "publish_at": publish_time_str,
                "remaining_seconds": max(0, int(remaining)),
                "message": "Results will be published soon."
            }

        # 2. Time has passed — return full results (no auth required)
        r_posts = await client.get(f"{SUPABASE_URL}/rest/v1/election_posts?order=order_index.asc", headers=headers)
        r_cands = await client.get(f"{SUPABASE_URL}/rest/v1/election_candidates", headers=headers)
        r_votes = await client.get(f"{SUPABASE_URL}/rest/v1/election_votes", headers=headers)

        if r_posts.status_code != 200 or r_cands.status_code != 200 or r_votes.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to compile results.")

        posts = r_posts.json()
        candidates = r_cands.json()
        votes = r_votes.json()

        # Also check archive for this session
        r_archive = await client.get(
            f"{SUPABASE_URL}/rest/v1/election_results_archive?order=id.desc&limit=100",
            headers=headers
        )
        archive = r_archive.json() if r_archive.status_code == 200 else []

        # If there are live votes, compute from votes
        if votes:
            counts = {}
            for v in votes:
                sel = v.get("selections") or {}
                for cid in sel.values():
                    counts[cid] = counts.get(cid, 0) + 1

            by_post = {p["key"]: [] for p in posts}
            for c in candidates:
                adj = int(c.get("adjustment") or 0)
                entry = {
                    "candidate_id": c["id"],
                    "name": c["name"],
                    "photo": c.get("photo", ""),
                    "symbol": c.get("symbol", ""),
                    "votes": counts.get(c["id"], 0) + adj
                }
                if c["post_key"] in by_post:
                    by_post[c["post_key"]].append(entry)

            for k in by_post:
                by_post[k].sort(key=lambda x: x["votes"], reverse=True)

            return {
                "status": "live",
                "posts": [{"key": p["key"], "title": p["title"], "order": p["order_index"]} for p in posts],
                "by_post": by_post,
                "winners": {p["key"]: (by_post[p["key"]][0] if by_post[p["key"]] else None) for p in posts},
                "total_voted": len(votes),
            }

        # If no live votes but archive exists, return from archive
        if archive:
            archive_posts = {}
            for row in archive:
                pk = row["post_key"]
                if pk not in archive_posts:
                    archive_posts[pk] = {"key": pk, "title": row["post_title"], "candidates": []}
                archive_posts[pk]["candidates"].append({
                    "name": row["candidate_name"],
                    "symbol": row.get("candidate_symbol", ""),
                    "votes": row["votes_count"],
                    "is_winner": row["is_winner"]
                })

            by_post = {}
            post_list = []
            for pk, info in archive_posts.items():
                post_list.append({"key": pk, "title": info["title"]})
                sorted_cands = sorted(info["candidates"], key=lambda x: x["votes"], reverse=True)
                by_post[pk] = sorted_cands

            return {
                "status": "live",
                "source": "archive",
                "posts": post_list,
                "by_post": by_post,
                "winners": {pk: (by_post[pk][0] if by_post[pk] else None) for pk in by_post},
                "total_voted": sum(c["votes"] for cands in by_post.values() for c in cands) // max(1, len(by_post)),
            }

        return {"status": "sealed", "message": "No results available."}

