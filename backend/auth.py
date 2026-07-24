"""Authentication utilities: JWT, password hashing, dependencies."""
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, List

from fastapi import Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

JWT_SECRET = os.environ.get("JWT_SECRET", "")
if not JWT_SECRET or JWT_SECRET == "change-me" or len(JWT_SECRET) < 32:
    raise RuntimeError(
        "JWT_SECRET env var must be set to a strong random value of at least 32 chars. "
        "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(48))\""
    )
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_EXPIRY_HOURS = int(os.environ.get("JWT_EXPIRY_HOURS", "24"))

# ── Auth cookie configuration ────────────────────────────────────────────────
# Auth tokens are delivered as HttpOnly cookies so they cannot be read by
# JavaScript (mitigates XSS token theft). The Authorization header is still
# accepted as a fallback for non-browser / cross-origin clients.
ADMIN_COOKIE_NAME = "sdps_admin_token"
QP_COOKIE_NAME = "qp_token"
# Secure (HTTPS-only) by default; set COOKIE_SECURE=false for local http dev.
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "true").lower() != "false"
# SameSite: "lax" (default) works for same-site SPA + API. Use "none" (with
# COOKIE_SECURE=true) only if the SPA and API are on different registrable domains.
COOKIE_SAMESITE = os.environ.get("COOKIE_SAMESITE", "lax").lower()
if COOKIE_SAMESITE not in ("lax", "strict", "none"):
    COOKIE_SAMESITE = "lax"
# Browsers reject SameSite=None cookies that are not Secure — enforce it.
if COOKIE_SAMESITE == "none":
    COOKIE_SECURE = True

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/admin/login", auto_error=False)


def set_auth_cookie(response: Response, token: str, cookie_name: str, max_age_hours: int) -> None:
    """Attach an HttpOnly auth cookie to the response."""
    response.set_cookie(
        key=cookie_name,
        value=token,
        max_age=max_age_hours * 3600,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        path="/",
    )


def clear_auth_cookie(response: Response, cookie_name: str) -> None:
    response.delete_cookie(key=cookie_name, path="/", samesite=COOKIE_SAMESITE)


class TokenData(BaseModel):
    sub: str
    email: str
    role: str = "superadmin"   # "superadmin" | "staff"
    permissions: List[str] = []


def hash_password(password: str) -> str:
    # bcrypt limit is 72 bytes; truncate to avoid ValueError
    password = password.encode("utf-8")[:72].decode("utf-8", errors="ignore")
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(plain, hashed)
    except Exception:
        return False


def create_access_token(data: dict, expires_hours: int = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=expires_hours or JWT_EXPIRY_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return None


async def get_current_admin(
    request: Request,
    token: str = Depends(oauth2_scheme),
) -> TokenData:
    """Any authenticated user (superadmin or staff).

    Accepts the token from the HttpOnly cookie first, then the Authorization header.
    """
    if not token:
        token = request.cookies.get(ADMIN_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    sub = payload.get("sub")
    email = payload.get("email")
    role = payload.get("role", "superadmin")
    permissions = payload.get("permissions", [])
    if not sub or not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    return TokenData(sub=sub, email=email, role=role, permissions=permissions)


async def get_superadmin(
    request: Request,
    token: str = Depends(oauth2_scheme),
) -> TokenData:
    """Only superadmin can access this endpoint."""
    td = await get_current_admin(request, token)
    if td.role != "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Superadmin access required")
    return td


PERMISSION_ALIASES = {
    "educators": ["media-tools"],
    "thumbnail-generator": ["media-tools"],
    "salary-tools": ["media-tools"],
    "notice-maker": ["media-tools"],
    "omr-tools": ["media-tools"],
    "apaar": ["site-settings"],
    "link-tools": ["site-settings"],
}

def require_permission(permission_name: str):
    """Requires superadmin role, or staff role with the specific permission name or parent group."""
    async def dependency(request: Request, token: str = Depends(oauth2_scheme)) -> TokenData:
        td = await get_current_admin(request, token)
        if td.role == "superadmin":
            return td
        user_perms = getattr(td, "permissions", [])
        if permission_name in user_perms:
            return td
        for parent in PERMISSION_ALIASES.get(permission_name, []):
            if parent in user_perms:
                return td
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: permission '{permission_name}' required"
        )
    return dependency


def generate_otp(length: int = 6) -> str:
    return "".join([str(secrets.randbelow(10)) for _ in range(length)])
