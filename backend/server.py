"""S.D. Public School - FastAPI server (main entrypoint)."""
import os
import asyncio
import logging
import httpx
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# MongoDB connection
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("sdps")

# Import routers AFTER env is loaded
from routes_public import public_router, init_db as init_public
from routes_admin import admin_router, init_db as init_admin, limiter as admin_limiter
from routes_qp import qp_router, init_db as init_qp, limiter as qp_limiter
from routes_whatsapp import wa_router
from auth import hash_password
from models import SiteSettings, PopupSettings, AlumniSettings, new_id, LinktreeSettings


# ── Keep-alive: stop Render free services from idling out (spin down ~15 min) ──
KEEPALIVE_INTERVAL_SEC = int(os.environ.get("KEEPALIVE_INTERVAL_SEC", "720"))  # 12 min
SELF_URL = (os.environ.get("RENDER_EXTERNAL_URL") or os.environ.get("SELF_URL", "")).rstrip("/")
WA_URL = os.environ.get("WA_SERVICE_URL", "").rstrip("/")


async def _keepalive_loop():
    """Every ~12 min, ping this service and the WhatsApp service so neither
    Render instance spins down for inactivity (24x7 warm)."""
    await asyncio.sleep(45)  # let startup finish first
    async with httpx.AsyncClient(timeout=20.0) as c:
        while True:
            targets = []
            if SELF_URL:
                targets.append(f"{SELF_URL}/api/ping")
            if WA_URL:
                targets.append(f"{WA_URL}/ping")
            for url in targets:
                try:
                    await c.get(url)
                except Exception as e:
                    logger.debug(f"[keepalive] {url} failed: {e}")
            await asyncio.sleep(KEEPALIVE_INTERVAL_SEC)


async def seed_defaults():
    """Seed an initial admin and default settings if not present."""
    seed_email = os.environ.get("ADMIN_SEED_EMAIL", "admin@sdpublic.org")
    seed_password = os.environ.get("ADMIN_SEED_PASSWORD")
    if not seed_password:
        raise RuntimeError("ADMIN_SEED_PASSWORD env var must be set — no default allowed")
    existing = await db.admin_users.find_one({"email": seed_email}, {"_id": 0})
    if not existing:
        await db.admin_users.insert_one({
            "id": new_id(),
            "email": seed_email,
            "name": "SDPS Admin",
            "password_hash": hash_password(seed_password),
            "role": "superadmin",
        })
        logger.info(f"[SEED] Admin user created: {seed_email}")
    else:
        # Always sync seed password and role
        await db.admin_users.update_one(
            {"email": seed_email},
            {"$set": {
                "password_hash": hash_password(seed_password),
                "role": "superadmin"
            }}
        )

    # Seed a default staff user
    staff_email = os.environ.get("STAFF_SEED_EMAIL", "staff@sdpublic.org")
    staff_password = os.environ.get("STAFF_SEED_PASSWORD")
    if not staff_password:
        raise RuntimeError("STAFF_SEED_PASSWORD env var must be set — no default allowed")
    existing_staff = await db.admin_users.find_one({"email": staff_email}, {"_id": 0})
    if not existing_staff:
        await db.admin_users.insert_one({
            "id": new_id(),
            "email": staff_email,
            "name": "SDPS Staff",
            "password_hash": hash_password(staff_password),
            "role": "staff",
        })
        logger.info(f"[SEED] Staff user created: {staff_email}")
    else:
        # Always sync staff seed password and role
        await db.admin_users.update_one(
            {"email": staff_email},
            {"$set": {
                "password_hash": hash_password(staff_password),
                "role": "staff"
            }}
        )

    # Seed QP portal admin (separate from website admin)
    qp_admin_username = os.environ.get("QP_ADMIN_USERNAME", "qpadmin")
    qp_admin_password = os.environ.get("QP_ADMIN_PASSWORD")
    if not qp_admin_password:
        raise RuntimeError("QP_ADMIN_PASSWORD env var must be set — no default allowed")
    existing_qp = await db.qp_users.find_one({"username": qp_admin_username}, {"_id": 0})
    from passlib.context import CryptContext as _CryptContext
    _ctx = _CryptContext(schemes=["bcrypt"], deprecated="auto")
    if not existing_qp:
        await db.qp_users.insert_one({
            "id": new_id(),
            "name": "QP Administrator",
            "username": qp_admin_username,
            "email": "",
            "phone": "",
            "password_hash": _ctx.hash(qp_admin_password),
            "password_set": True,
            "role": "qp_admin",
            "is_active": True,
            "incharge_classes": [],
            "can_review": False,
            "created_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat() + "Z",
            "created_by": "seed",
        })
        logger.info(f"[SEED] QP Admin created with username: {qp_admin_username}")
    else:
        # Always sync QP admin seed password
        await db.qp_users.update_one(
            {"username": qp_admin_username},
            {"$set": {
                "password_hash": _ctx.hash(qp_admin_password)
            }}
        )
    # Default settings
    if not await db.site_settings.find_one({"id": "site"}):
        await db.site_settings.insert_one(SiteSettings().model_dump())
    if not await db.popup_settings.find_one({"id": "popup"}):
        await db.popup_settings.insert_one(PopupSettings().model_dump())
    if not await db.alumni_settings.find_one({"id": "alumni-settings"}):
        await db.alumni_settings.insert_one(AlumniSettings().model_dump())
    if not await db.linktree_settings.find_one({"id": "branding"}):
        await db.linktree_settings.insert_one(LinktreeSettings().model_dump())


@asynccontextmanager
async def lifespan(app: FastAPI):
    from routes_whatsapp import init_db as init_wa, run_daily_birthday_campaign_loop
    init_public(db)
    init_admin(db)
    init_qp(db)
    init_wa(db)
    await seed_defaults()
    logger.info("SDPS backend ready")
    ka_task = asyncio.create_task(_keepalive_loop())
    bday_task = asyncio.create_task(run_daily_birthday_campaign_loop())
    yield
    ka_task.cancel()
    bday_task.cancel()
    client.close()


app = FastAPI(title="S.D. Public School API", lifespan=lifespan)


# ── Security headers ─────────────────────────────────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        # Tighten CSP as needed when you know all your script/style origins
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' https://checkout.razorpay.com; "
            "frame-src https://checkout.razorpay.com https://drive.google.com; "
            "img-src 'self' data: https: blob:; "
            "media-src 'self' blob: https:; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "object-src 'none'; base-uri 'self'; form-action 'self'"
        )
        return response


app.add_middleware(SecurityHeadersMiddleware)


# ── CORS ─────────────────────────────────────────────────────────────────────
_cors_origins_raw = os.environ.get("CORS_ORIGINS", "")
if not _cors_origins_raw:
    raise RuntimeError(
        "CORS_ORIGINS env var must be set (e.g. https://sdpublic.org). "
        "Wildcard '*' is not allowed — it disables credential security."
    )
_cors_origins = [o.strip() for o in _cors_origins_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_cors_origins,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(public_router)
app.include_router(admin_router)
app.include_router(qp_router)
app.include_router(wa_router)
from routes_elections import elections_router
app.include_router(elections_router)

# Wire up rate limiters (slowapi requires app.state.limiter)
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
app.state.limiter = admin_limiter   # primary limiter for state
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.get("/api/")
async def root():
    return {"app": "S.D. Public School API", "status": "ok"}


@app.get("/api/ping")
async def ping():
    """Lightweight keep-alive endpoint (no DB) for the pinger / uptime monitors."""
    return {"status": "alive"}
