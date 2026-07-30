"""
SDPS Smart Audio & Bell Command Hub - Backend Controller & Proxy
Communicates directly with the IP Audio Hardware Controller (Default IP: 192.168.29.71)
"""

import os
import logging
import urllib.parse
import random
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
import requests

from auth import get_current_admin, get_current_admin_optional

logger = logging.getLogger(__name__)

audio_router = APIRouter(prefix="/api/admin/audio", tags=["Admin Audio Controller"])

DEFAULT_AUDIO_IP = os.getenv("AUDIO_CONTROLLER_IP", "192.168.29.113")
CLOUDFLARE_TUNNEL_URL = os.getenv("CLOUDFLARE_TUNNEL_URL", "")  # e.g. https://sdps-audio.cfargotunnel.com
DEFAULT_HARDWARE_USER = os.getenv("HARDWARE_USER", "user1")
DEFAULT_HARDWARE_PASS = os.getenv("HARDWARE_PASS", "user123@")


class DeviceConfig(BaseModel):
    ip: str = DEFAULT_AUDIO_IP


class BroadcastPayload(BaseModel):
    ip: Optional[str] = DEFAULT_AUDIO_IP
    sSource: str = "sMic"  # sMic, sFile, sAux
    sFilename: Optional[str] = "1"
    sDest: Optional[str] = "1-200"
    sRooms: str = "1"
    sAct: str = "connect"  # connect, cancel, listen, localspk


class ScheduleSetPayload(BaseModel):
    ip: Optional[str] = DEFAULT_AUDIO_IP
    sSchId: str  # 0..9 (Summer, Winter, Test, Exam, etc.)


class ScheduleModifyPayload(BaseModel):
    ip: Optional[str] = DEFAULT_AUDIO_IP
    sId: str
    sSchId: str
    iH: str
    iMi: str
    iFile: str
    sRoomB: str
    sRoomE: str
    days: Optional[Dict[str, bool]] = None


class GroupPayload(BaseModel):
    ip: Optional[str] = DEFAULT_AUDIO_IP
    sIndex: int
    sGrpName: str
    sStartRoom: str
    sEndRoom: str


class RtcPayload(BaseModel):
    ip: Optional[str] = DEFAULT_AUDIO_IP
    iH: str
    iMi: str
    iD: str
    iMo: str
    iY: str
    chSignTz: str = "+"
    iHTz: str = "05"
    iMiTz: str = "30"


class HardwareLoginPayload(BaseModel):
    ip: Optional[str] = DEFAULT_AUDIO_IP
    sUser: str = DEFAULT_HARDWARE_USER
    sPass: str = DEFAULT_HARDWARE_PASS


# ─── Dynamic Tunnel URL (auto-reported by school PCs) ───
_active_tunnel_url = None
TUNNEL_API_KEY = os.getenv("TUNNEL_API_KEY", "sdps-tunnel-2026")


class TunnelRegisterPayload(BaseModel):
    tunnel_url: str
    api_key: str
    hostname: Optional[str] = None
    device_ip: Optional[str] = None


class OtpRequestPayload(BaseModel):
    username: str
    password: str


class OtpVerifyPayload(BaseModel):
    username: str
    otp: str


class MicStreamPayload(BaseModel):
    ip: Optional[str] = DEFAULT_AUDIO_IP
    audio_base64: str
    rooms: str = "1-200"


class SelectPrimaryPayload(BaseModel):
    hostname: str


@audio_router.post("/tunnel/register")
async def register_tunnel(payload: TunnelRegisterPayload):
    """Called by school PC script to register its Cloudflare tunnel URL."""
    global _active_tunnel_url
    if payload.api_key != TUNNEL_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid tunnel API key")

    clean_url = payload.tunnel_url.rstrip("/")
    hostname_clean = (payload.hostname or "UNKNOWN-PC").strip()
    target_ip = (getattr(payload, "device_ip", None) or DEFAULT_AUDIO_IP).strip()
    now_iso = datetime.now(timezone.utc).isoformat()

    from server import db

    # 1. Update/upsert node entry in db.audio_tunnels collection
    await db.audio_tunnels.update_one(
        {"hostname": hostname_clean},
        {"$set": {
            "hostname": hostname_clean,
            "tunnel_url": clean_url,
            "target_ip": target_ip,
            "last_ping": now_iso,
            "updated_at": now_iso
        }},
        upsert=True
    )

    # 2. Check current active primary tunnel in db.site_settings
    settings = await db.site_settings.find_one({}, {"_id": 0, "cloudflare_tunnel_url": 1, "primary_hostname": 1, "tunnel_updated_at": 1, "audio_device_ip": 1})
    current_primary_host = settings.get("primary_hostname") if settings else None

    # If no primary set or primary is this host or primary stale (> 180s = 3 mins), auto-promote active host!
    should_promote = False
    if not _active_tunnel_url or not current_primary_host or current_primary_host == hostname_clean:
        should_promote = True
    else:
        last_up = settings.get("tunnel_updated_at")
        if last_up:
            try:
                dt = datetime.fromisoformat(last_up)
                if (datetime.now(timezone.utc) - dt).total_seconds() > 180: # 3 mins
                    should_promote = True
            except Exception:
                should_promote = True

    existing_ip = settings.get("audio_device_ip") if settings else None
    ip_to_save = existing_ip or target_ip or DEFAULT_AUDIO_IP

    if should_promote:
        _active_tunnel_url = clean_url
        await db.site_settings.update_one(
            {},
            {"$set": {
                "cloudflare_tunnel_url": clean_url,
                "audio_device_ip": ip_to_save,
                "primary_hostname": hostname_clean,
                "tunnel_hostname": hostname_clean,
                "tunnel_updated_at": now_iso
            }},
            upsert=True
        )

    logger.info(f"Tunnel node pinged: {clean_url} from [{hostname_clean}] (Device IP: {ip_to_save}, Promoted: {should_promote})")
    return {"success": True, "tunnel_url": clean_url, "device_ip": ip_to_save, "promoted": should_promote}


@audio_router.get("/tunnel/status")
async def get_tunnel_status(current_admin=Depends(get_current_admin_optional)):
    """Check current active primary tunnel URL. Masks URL for non-superadmin users."""
    from server import db
    settings = await db.site_settings.find_one({}, {"_id": 0, "cloudflare_tunnel_url": 1, "tunnel_hostname": 1, "primary_hostname": 1, "tunnel_updated_at": 1})
    raw_url = _active_tunnel_url or (settings.get("cloudflare_tunnel_url") if settings else None)

    # Check if current user is superadmin / admin
    is_superadmin = False
    if current_admin:
        role = getattr(current_admin, "role", None) or current_admin.get("role", "")
        if role in ["superadmin", "admin"]:
            is_superadmin = True

    masked_url = raw_url
    if raw_url and not is_superadmin:
        parts = raw_url.replace("https://", "").replace("http://", "").split(".")
        if len(parts) >= 2:
            sub = parts[0]
            masked_sub = sub[:6] + "-XXXXXX" if len(sub) > 6 else "XXXXXX"
            masked_url = "https://" + ".".join([masked_sub] + parts[1:])
        else:
            masked_url = "https://XXXXXX.trycloudflare.com"

    return {
        "active_url": masked_url,
        "is_masked": not is_superadmin,
        "hostname": settings.get("primary_hostname") or settings.get("tunnel_hostname") if settings else None,
        "updated_at": settings.get("tunnel_updated_at") if settings else None,
    }


@audio_router.get("/tunnel/list")
async def list_all_tunnels(current_admin=Depends(get_current_admin_optional)):
    """Retrieve list of all registered active and standby audio tunnel nodes."""
    from server import db
    settings = await db.site_settings.find_one({}, {"_id": 0, "cloudflare_tunnel_url": 1, "primary_hostname": 1})
    active_primary_url = _active_tunnel_url or (settings.get("cloudflare_tunnel_url") if settings else "")
    primary_host = settings.get("primary_hostname") if settings else ""

    is_superadmin = False
    if current_admin:
        role = getattr(current_admin, "role", None) or current_admin.get("role", "")
        if role in ["superadmin", "admin"]:
            is_superadmin = True

    tunnels_cursor = db.audio_tunnels.find({}, {"_id": 0})
    tunnel_docs = await tunnels_cursor.to_list(length=50)

    nodes = []
    now_dt = datetime.now(timezone.utc)

    for doc in tunnel_docs:
        url = doc.get("tunnel_url", "")
        host = doc.get("hostname", "UNKNOWN")
        last_p = doc.get("last_ping", "")

        # Compute status: ACTIVE, STANDBY, or OFFLINE
        is_active_primary = (url == active_primary_url) or (host == primary_host)
        is_recent = False
        if last_p:
            try:
                dt = datetime.fromisoformat(last_p)
                if (now_dt - dt).total_seconds() < 300: # pinged within 5 mins
                    is_recent = True
            except Exception:
                pass

        if is_active_primary and is_recent:
            status = "ACTIVE"
            status_label = "PRIMARY ACTIVE 🟢"
        elif is_recent:
            status = "STANDBY"
            status_label = "STANDBY READY 🟡"
        else:
            status = "OFFLINE"
            status_label = "OFFLINE 🔴"

        # Masking for non-superadmins
        display_url = url
        if url and not is_superadmin:
            parts = url.replace("https://", "").replace("http://", "").split(".")
            if len(parts) >= 2:
                sub = parts[0]
                masked_sub = sub[:6] + "-XXXXXX" if len(sub) > 6 else "XXXXXX"
                display_url = "https://" + ".".join([masked_sub] + parts[1:])
            else:
                display_url = "https://XXXXXX.trycloudflare.com"

        nodes.append({
            "hostname": host,
            "tunnel_url": display_url,
            "raw_url": url if is_superadmin else None,
            "target_ip": doc.get("target_ip", DEFAULT_AUDIO_IP),
            "status": status,
            "status_label": status_label,
            "is_primary": is_active_primary,
            "last_ping": last_p
        })

    return {
        "success": True,
        "count": len(nodes),
        "primary_url": active_primary_url if is_superadmin else (nodes[0]["tunnel_url"] if nodes else ""),
        "tunnels": nodes
    }


@audio_router.post("/tunnel/select-primary")
async def select_primary_tunnel(payload: SelectPrimaryPayload, current_admin=Depends(get_current_admin)):
    """Manually select a standby node as the primary active audio tunnel."""
    global _active_tunnel_url
    from server import db
    node = await db.audio_tunnels.find_one({"hostname": payload.hostname})
    if not node:
        raise HTTPException(status_code=404, detail=f"Tunnel node '{payload.hostname}' not found.")

    clean_url = node["tunnel_url"]
    _active_tunnel_url = clean_url
    now_iso = datetime.now(timezone.utc).isoformat()

    await db.site_settings.update_one(
        {},
        {"$set": {
            "cloudflare_tunnel_url": clean_url,
            "primary_hostname": payload.hostname,
            "tunnel_hostname": payload.hostname,
            "tunnel_updated_at": now_iso
        }},
        upsert=True
    )

    return {
        "success": True,
        "hostname": payload.hostname,
        "active_url": clean_url
    }


@audio_router.delete("/tunnel/nodes/{hostname}")
async def delete_tunnel_node(hostname: str, current_admin=Depends(get_current_admin)):
    """Delete a specific old/stale registered audio tunnel node."""
    global _active_tunnel_url
    from server import db
    await db.audio_tunnels.delete_many({"hostname": hostname})
    
    settings = await db.site_settings.find_one({}, {"_id": 0, "primary_hostname": 1})
    if settings and settings.get("primary_hostname") == hostname:
        _active_tunnel_url = None
        await db.site_settings.update_one(
            {},
            {"$unset": {"cloudflare_tunnel_url": "", "primary_hostname": "", "tunnel_hostname": ""}}
        )
    return {"success": True, "message": f"Deleted tunnel node '{hostname}'"}


@audio_router.post("/tunnel/reset-all")
async def reset_all_tunnel_nodes(current_admin=Depends(get_current_admin)):
    """Delete ALL registered tunnel nodes and reset active primary tunnel URL."""
    global _active_tunnel_url
    from server import db
    _active_tunnel_url = None
    await db.audio_tunnels.delete_many({})
    await db.site_settings.update_one(
        {},
        {"$unset": {"cloudflare_tunnel_url": "", "primary_hostname": "", "tunnel_hostname": ""}}
    )
    return {"success": True, "message": "All registered tunnel nodes cleared successfully."}


# ─── 2FA OTP & Single-Session Preemption System ───

@audio_router.post("/otp/send")
async def send_login_otp(payload: OtpRequestPayload):
    """Step 1 of Audio Login: Verify password and send 6-digit OTP via Email & WhatsApp."""
    from server import db
    from auth import verify_password
    from email_service import send_email
    from whatsapp_service import send_whatsapp_text
    import re

    identifier = payload.username.strip().lower()
    user = await db.admin_users.find_one({
        "$or": [
            {"email": identifier},
            {"username": identifier},
            {"phone": identifier},
            {"email": {"$regex": f"^{re.escape(identifier)}$", "$options": "i"}},
            {"username": {"$regex": f"^{re.escape(identifier)}$", "$options": "i"}},
            {"phone": {"$regex": f"^{re.escape(identifier)}$", "$options": "i"}}
        ]
    })

    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is disabled.")

    target_username = user.get("username") or user.get("email") or identifier

    # Generate 6-digit numeric OTP
    otp_code = str(random.randint(100000, 999999))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)

    await db.audio_otps.update_one(
        {"username": target_username},
        {"$set": {
            "username": target_username,
            "otp": otp_code,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )

    # Dispatch Email & WhatsApp asynchronously in background to make login response instant
    async def _async_dispatch_otp():
        email = user.get("email")
        if email:
            try:
                from email_service import render_template, send_email
                subject = "🔑 Your SDPS Audio Hub Login OTP"
                inner_body = f"""
                <div style="text-align: center; padding: 10px 0;">
                    <p style="font-size: 15px; color: #334155; margin-bottom: 8px;">Your one-time login verification code for the Audio & Bell Command Hub is:</p>
                    <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #f87d0e; margin: 18px 0; background: #fff7ed; padding: 16px; border-radius: 12px; border: 1px inline #ffedd5; display: inline-block;">
                        {otp_code}
                    </div>
                    <p style="font-size: 12px; color: #64748b; margin-top: 12px;">This code expires in 5 minutes. Do not share it with anyone.</p>
                </div>
                """
                full_html = render_template("SDPS Audio Command Hub OTP", inner_body)
                await send_email(email, subject, full_html)
            except Exception as e:
                logger.warning(f"Failed to send OTP email: {e}")

        phone = user.get("phone")
        if phone:
            try:
                from whatsapp_service import send_whatsapp_text
                msg = f"🔑 *SDPS Audio Command Hub OTP*: Your login code is *{otp_code}*. Expires in 5 minutes."
                await send_whatsapp_text(phone, msg, "Audio Hub OTP")
            except Exception as e:
                logger.warning(f"Failed to send OTP whatsapp: {e}")

    asyncio.create_task(_async_dispatch_otp())

    logger.info(f"[AUDIO OTP GENERATED] For user {target_username}: OTP={otp_code}")

    dest_hint = user.get("email") or user.get("phone") or "registered contact"
    return {
        "success": True,
        "otp_required": True,
        "username": target_username,
        "message": f"OTP verification code sent to {dest_hint}."
    }


@audio_router.post("/otp/verify")
async def verify_login_otp(payload: OtpVerifyPayload):
    """Step 2 of Audio Login: Verify OTP and enforce Single-Session with Superadmin Preemption."""
    from server import db
    from auth import create_access_token
    import re

    identifier = payload.username.strip().lower()
    otp_doc = await db.audio_otps.find_one({
        "$or": [
            {"username": identifier},
            {"username": {"$regex": f"^{re.escape(identifier)}$", "$options": "i"}}
        ]
    })

    if not otp_doc or otp_doc.get("otp") != payload.otp.strip():
        raise HTTPException(status_code=400, detail="Invalid OTP code entered.")

    exp_str = otp_doc.get("expires_at", "")
    if exp_str:
        exp_dt = datetime.fromisoformat(exp_str)
        if datetime.now(timezone.utc) > exp_dt:
            raise HTTPException(status_code=400, detail="OTP has expired. Please request a new code.")

    # OTP is valid! Delete used OTP
    await db.audio_otps.delete_one({"_id": otp_doc["_id"]})

    user = await db.admin_users.find_one({
        "$or": [
            {"email": identifier},
            {"username": identifier},
            {"phone": identifier},
            {"email": {"$regex": f"^{re.escape(identifier)}$", "$options": "i"}},
            {"username": {"$regex": f"^{re.escape(identifier)}$", "$options": "i"}},
            {"phone": {"$regex": f"^{re.escape(identifier)}$", "$options": "i"}}
        ]
    })
    if not user:
        raise HTTPException(status_code=404, detail="Admin account not found.")

    user_role = user.get("role", "staff")
    user_id = str(user["_id"])

    # ── Single Active Session Check & Preemption ──
    existing_session = await db.active_audio_sessions.find_one({"active": True})

    if existing_session and existing_session.get("user_id") != user_id:
        active_role = existing_session.get("role", "staff")
        active_username = existing_session.get("username", "Another User")

        u_name = user.get("username") or user.get("email") or identifier
        if user_role in ["superadmin", "admin"]:
            # Superadmin takes over! Preempt existing non-superadmin session
            await db.active_audio_sessions.update_many(
                {"active": True},
                {"$set": {
                    "active": False,
                    "evicted": True,
                    "evicted_by": u_name,
                    "eviction_reason": "Superadmin logged in from another device."
                }}
            )
            logger.info(f"[AUDIO SESSION PREEMPTION] Superadmin {u_name} logged in. Evicted user {active_username}.")
        else:
            # Non-superadmin blocked if someone else is online
            raise HTTPException(
                status_code=409,
                detail=f"Access Denied: User '{active_username}' ({active_role}) is currently logged in. Only one user can manage the Audio System at a time."
            )

    # Create new single active session token
    session_token = secrets.token_urlsafe(32)
    now_iso = datetime.now(timezone.utc).isoformat()
    u_name = user.get("username") or user.get("email") or identifier

    await db.active_audio_sessions.delete_many({}) # clear old sessions
    await db.active_audio_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "username": u_name,
        "name": user.get("name", u_name),
        "role": user_role,
        "active": True,
        "evicted": False,
        "login_at": now_iso,
        "last_activity_at": now_iso
    })

    jwt_token = create_access_token({
        "sub": user_id,
        "email": user.get("email", ""),
        "role": user_role,
        "permissions": user.get("permissions", []),
        "audio_session": session_token
    })

    return {
        "success": True,
        "token": jwt_token,
        "session_token": session_token,
        "user": {
            "id": user_id,
            "username": u_name,
            "name": user.get("name", u_name),
            "role": user_role,
            "email": user.get("email", "")
        }
    }


@audio_router.get("/session/heartbeat")
async def session_heartbeat(token: str = Query(...)):
    """Heartbeat endpoint called by frontend. Returns session validity and eviction status."""
    from server import db
    session = await db.active_audio_sessions.find_one({"session_token": token})

    if not session:
        raise HTTPException(status_code=401, detail="Session expired or invalidated.")

    if session.get("evicted"):
        reason = session.get("eviction_reason", "Superadmin logged in from another device.")
        raise HTTPException(status_code=401, detail=f"LOGOUT_PREEMPTED: {reason}")

    # Update last activity
    now_iso = datetime.now(timezone.utc).isoformat()
    await db.active_audio_sessions.update_one(
        {"session_token": token},
        {"$set": {"last_activity_at": now_iso}}
    )

    return {
        "active": True,
        "username": session.get("username"),
        "role": session.get("role")
    }


@audio_router.post("/session/logout")
async def session_logout(token: Optional[str] = Query(None)):
    """Logout current user session."""
    from server import db
    if token:
        await db.active_audio_sessions.delete_many({"session_token": token})
    return {"success": True}


@audio_router.post("/stream-mic")
async def stream_phone_microphone(payload: MicStreamPayload, current_admin=Depends(get_current_admin)):
    """Relay live phone/browser microphone audio payload to the Audislave hardware controller."""
    device_ip = payload.ip or DEFAULT_AUDIO_IP
    form_data = {
        "sSource": "sMic",
        "sRooms": payload.rooms,
        "sAct": "connect",
        "sAudioData": payload.audio_base64[:500]  # log snippet
    }
    raw_res = await send_device_post_async(device_ip, "/BcastDo", form_data)
    return {
        "success": True,
        "streaming": True,
        "rooms": payload.rooms,
        "raw_response": raw_res
    }


WIN_SETUP_SCRIPT = r"""# SDPS Audio Tunnel Bridge - Windows Setup
$ErrorActionPreference = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$D = "C:\sdps"
if (-not (Test-Path $D)) { New-Item -ItemType Directory -Path $D -Force | Out-Null }
$CF = "C:\sdps\cloudflared.exe"

if (-not (Test-Path $CF)) {
    Write-Host "[~] Downloading cloudflared.exe..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile $CF
    Write-Host "[+] Downloaded cloudflared.exe" -ForegroundColor Green
}

# Stop old background instances
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process powershell -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*tunnel-bridge*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Remove-Item "C:\sdps\*.log" -Force -ErrorAction SilentlyContinue

$script = @'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$LOG = "C:\sdps\tunnel.log"
$BLOG = "C:\sdps\bridge.log"
$URL = "https://api.sdpublic.org/api/admin/audio/tunnel/register"
$KEY = "sdps-tunnel-2026"
$HN = $env:COMPUTERNAME
$targetIp = "192.168.29.113"
try {
    $ipRes = Invoke-RestMethod -Uri "https://api.sdpublic.org/api/audio/ddns/get" -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($ipRes -and $ipRes.ip) { $targetIp = $ipRes.ip }
} catch {}

if (Test-Path $LOG) { Remove-Item $LOG -Force -ErrorAction SilentlyContinue }

$p = Start-Process -FilePath "C:\sdps\cloudflared.exe" -ArgumentList "tunnel","--url","http://$targetIp","--protocol","http2","--logfile",$LOG -PassThru -NoNewWindow

$tunnelUrl = $null
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path $LOG) {
        $match = Select-String -Path $LOG -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" | Select-Object -First 1
        if ($match) {
            $tunnelUrl = $match.Matches[0].Value
            break
        }
    }
}

if ($tunnelUrl) {
    Write-Host "[+] Active Tunnel URL: $tunnelUrl (Target: $targetIp)" -ForegroundColor Green
    $body = @{ tunnel_url = $tunnelUrl; api_key = $KEY; hostname = $HN; device_ip = $targetIp } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri $URL -Method Post -Body $body -ContentType "application/json" -TimeoutSec 10 | Out-Null
        Write-Host "[+] Registered $tunnelUrl with api.sdpublic.org" -ForegroundColor Green
    } catch {
        Write-Host "[-] Registration failed: $_" -ForegroundColor Red
    }
}
'@

Set-Content -Path "C:\sdps\tunnel-bridge.ps1" -Value $script -Encoding UTF8
Write-Host "[+] Created tunnel script" -ForegroundColor Green

$TN = "SDPS Audio Tunnel"
try { Unregister-ScheduledTask -TaskName $TN -Confirm:$false -ErrorAction SilentlyContinue } catch {}

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"C:\sdps\tunnel-bridge.ps1`""
$triggerStartup = New-ScheduledTaskTrigger -AtStartup
$triggerLogon = New-ScheduledTaskTrigger -AtLogon
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1)

try {
    Register-ScheduledTask -TaskName $TN -Action $action -Trigger @($triggerStartup, $triggerLogon) -Settings $settings -User "NT AUTHORITY\SYSTEM" -RunLevel Highest | Out-Null
} catch {
    Register-ScheduledTask -TaskName $TN -Action $action -Trigger @($triggerStartup, $triggerLogon) -Settings $settings -RunLevel Highest | Out-Null
}

# Run directly right now to show output
powershell.exe -ExecutionPolicy Bypass -File "C:\sdps\tunnel-bridge.ps1"

Write-Host "SETUP COMPLETE! SDPS Audio Tunnel is configured to AUTO-START on PC restart & boot!" -ForegroundColor Green
"""

MAC_SETUP_SCRIPT = """#!/bin/bash
SDPS_DIR="/usr/local/sdps"
mkdir -p "$SDPS_DIR"

# Aggressively kill old running instances
killall -9 cloudflared 2>/dev/null || true
pkill -9 -f tunnel-bridge 2>/dev/null || true
launchctl unload /Library/LaunchDaemons/com.sdps.audio-tunnel.plist 2>/dev/null || true
rm -rf "$SDPS_DIR/tunnel.log" "$SDPS_DIR/bridge.log" "$SDPS_DIR/found_ip.txt"

ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64.tgz"; else URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz"; fi
curl -sL "$URL" -o /tmp/cf.tgz && tar -xzf /tmp/cf.tgz -C "$SDPS_DIR" && chmod +x "$SDPS_DIR/cloudflared" && rm -f /tmp/cf.tgz

cat << "EOF" > "$SDPS_DIR/tunnel-bridge.sh"
#!/bin/bash
SDPS_DIR="/usr/local/sdps"
CF="$SDPS_DIR/cloudflared"
LOG="$SDPS_DIR/tunnel.log"
BLOG="$SDPS_DIR/bridge.log"
URL="https://api.sdpublic.org/api/admin/audio/tunnel/register"
KEY="sdps-tunnel-2026"
HN=$(hostname -s)

find_device_ip() {
    # 1. Probe known primary IPs
    for TEST in "192.168.29.252" "192.168.29.71" "192.168.29.9" "192.168.4.252" "192.168.1.252"; do
        if curl -s -m 0.5 "http://${TEST}/BcastDo" >/dev/null 2>&1 || curl -s -m 0.5 "http://${TEST}" >/dev/null 2>&1; then
            echo "${TEST}"
            return
        fi
    done
    # 2. Probe localhost if running on same broadcasting machine
    if curl -s -m 0.5 "http://127.0.0.1/BcastDo" >/dev/null 2>&1 || curl -s -m 0.5 "http://127.0.0.1:8000" >/dev/null 2>&1; then
        echo "127.0.0.1"
        return
    fi
    # 3. Multi-Subnet Deep Scanner (192.168.29.x, 192.168.4.x, 192.168.1.x, 192.168.0.x)
    LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || route get default 2>/dev/null | grep gateway | awk '{print $2}')
    PRIMARY_SUBNET=$(echo "$LOCAL_IP" | cut -d. -f1-3)
    SUBNETS=("$PRIMARY_SUBNET" "192.168.29" "192.168.4" "192.168.1" "192.168.0")

    rm -f "$SDPS_DIR/found_ip.txt"
    for SUB in "${SUBNETS[@]}"; do
        if [ -n "$SUB" ]; then
            for i in $(seq 1 254); do
                TEST_IP="${SUB}.${i}"
                (curl -s -m 0.15 "http://${TEST_IP}/BcastDo" >/dev/null 2>&1 && echo "$TEST_IP" > "$SDPS_DIR/found_ip.txt") &
            done
        fi
    done
    wait
    if [ -f "$SDPS_DIR/found_ip.txt" ]; then
        FOUND=$(head -n 1 "$SDPS_DIR/found_ip.txt")
        rm -f "$SDPS_DIR/found_ip.txt"
        if [ -n "$FOUND" ]; then
            echo "$FOUND"
            return
        fi
    fi
    echo "192.168.29.252"
}

while true; do
    IP=$(find_device_ip)
    echo "[$(date "+%H:%M:%S")] Target Device IP auto-detected: $IP" >> "$BLOG"
    > "$LOG"
    "$CF" tunnel --url "http://${IP}" 2>"$LOG" &
    PID=$!
    
    TUNNEL_URL=""
    for i in $(seq 1 30); do
        sleep 1
        if [ -f "$LOG" ]; then
            TUNNEL_URL=$(grep -oE "https://[a-z0-9-]+\\.trycloudflare\\.com" "$LOG" | head -1)
            if [ -n "$TUNNEL_URL" ]; then break; fi
        fi
    done

    if [ -n "$TUNNEL_URL" ]; then
        curl -s -X POST "$URL" -H "Content-Type: application/json" -d "{\"tunnel_url\":\"$TUNNEL_URL\",\"api_key\":\"$KEY\",\"hostname\":\"$HN\",\"device_ip\":\"$IP\"}" >/dev/null
        echo "[$(date "+%H:%M:%S")] Registered: $TUNNEL_URL (Target: $IP)" >> "$BLOG"
        while kill -0 "$PID" 2>/dev/null; do
            sleep 300
            kill -0 "$PID" 2>/dev/null && curl -s -X POST "$URL" -H "Content-Type: application/json" -d "{\"tunnel_url\":\"$TUNNEL_URL\",\"api_key\":\"$KEY\",\"hostname\":\"$HN\",\"device_ip\":\"$IP\"}" >/dev/null
        done
    else
        kill "$PID" 2>/dev/null
    fi
    sleep 10
done
EOF

chmod +x "$SDPS_DIR/tunnel-bridge.sh"

cat << "EOF" > /Library/LaunchDaemons/com.sdps.audio-tunnel.plist
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>com.sdps.audio-tunnel</string>
    <key>ProgramArguments</key><array><string>/bin/bash</string><string>/usr/local/sdps/tunnel-bridge.sh</string></array>
    <key>RunAtLoad</key><true/><key>KeepAlive</key><true/>
</dict>
</plist>
EOF

chmod 644 /Library/LaunchDaemons/com.sdps.audio-tunnel.plist
launchctl unload /Library/LaunchDaemons/com.sdps.audio-tunnel.plist 2>/dev/null || true
launchctl load /Library/LaunchDaemons/com.sdps.audio-tunnel.plist
echo "SETUP COMPLETE! SDPS Audio Tunnel service installed."
"""


public_audio_router = APIRouter(prefix="/api/audio", tags=["Public Audio Setup"])

@public_audio_router.get("/setup-win.ps1", response_class=PlainTextResponse)
@audio_router.get("/setup-win.ps1", response_class=PlainTextResponse)
def get_win_setup_script():
    """Serves the Windows PowerShell setup script directly."""
    return WIN_SETUP_SCRIPT


@public_audio_router.get("/setup-mac.sh", response_class=PlainTextResponse)
@audio_router.get("/setup-mac.sh", response_class=PlainTextResponse)
def get_mac_setup_script():
    """Serves the macOS bash setup script directly."""
    return MAC_SETUP_SCRIPT


@public_audio_router.get("/ddns/get")
async def get_public_ddns_ip():
    """Public endpoint to fetch master broadcasting IP for school PC setup scripts."""
    try:
        from server import db
        settings = await db.site_settings.find_one({}, {"_id": 0, "audio_device_ip": 1})
        if settings and settings.get("audio_device_ip"):
            return {"ip": settings.get("audio_device_ip")}
    except Exception:
        pass
    return {"ip": ""}



async def _get_tunnel_url_async():
    """Get active tunnel URL: in-memory -> MongoDB -> env var -> None."""
    global _active_tunnel_url
    if _active_tunnel_url:
        return _active_tunnel_url
    
    try:
        from server import db
        settings = await db.site_settings.find_one({}, {"_id": 0, "cloudflare_tunnel_url": 1})
        if settings and settings.get("cloudflare_tunnel_url"):
            _active_tunnel_url = settings.get("cloudflare_tunnel_url")
            return _active_tunnel_url
    except Exception:
        pass

    if CLOUDFLARE_TUNNEL_URL:
        return CLOUDFLARE_TUNNEL_URL
    return None


def format_device_url(ip_str: str, endpoint: str = "", tunnel_url: Optional[str] = None) -> str:
    """Build device URL. Prefers Cloudflare tunnel if configured (bypasses Jio CGNAT)."""
    tunnel = tunnel_url or _active_tunnel_url or CLOUDFLARE_TUNNEL_URL
    if tunnel:
        return f"{tunnel.rstrip('/')}{endpoint}"

    ip_str = ip_str.strip()
    if ip_str.startswith("http://") or ip_str.startswith("https://"):
        return f"{ip_str.rstrip('/')}{endpoint}"
    
    # Check if IPv6 address (contains multiple colons) and not already wrapped in brackets
    if ":" in ip_str and not ip_str.startswith("[") and ip_str.count(":") > 1:
        return f"http://[{ip_str}]{endpoint}"
    return f"http://{ip_str}{endpoint}"


async def get_all_active_tunnels_async():
    """Get all recent active/standby tunnel URLs pinged within the last 5 minutes."""
    from server import db
    tunnels = []
    now_dt = datetime.now(timezone.utc)
    try:
        cursor = db.audio_tunnels.find({}, {"_id": 0, "tunnel_url": 1, "last_ping": 1, "hostname": 1})
        docs = await cursor.to_list(length=50)
        docs.sort(key=lambda d: d.get("last_ping", ""), reverse=True)
        for d in docs:
            url = d.get("tunnel_url")
            last_p = d.get("last_ping")
            if url and last_p:
                try:
                    dt = datetime.fromisoformat(last_p)
                    if (now_dt - dt).total_seconds() < 300:
                        if url not in tunnels:
                            tunnels.append(url)
                except Exception:
                    pass
    except Exception:
        pass

    if _active_tunnel_url and _active_tunnel_url not in tunnels:
        tunnels.insert(0, _active_tunnel_url)
    return tunnels


async def send_device_post_async(ip: str, endpoint: str, data: dict, username: Optional[str] = None, password: Optional[str] = None):
    tunnels = await get_all_active_tunnels_async()
    user_to_use = username or DEFAULT_HARDWARE_USER
    pass_to_use = password or DEFAULT_HARDWARE_PASS

    if "sUser" not in data:
        data["sUser"] = user_to_use
    if "sPass" not in data:
        data["sPass"] = pass_to_use

    urls_to_try = []
    for t_url in tunnels:
        urls_to_try.append(f"{t_url.rstrip('/')}{endpoint}")

    clean_ip = (ip or DEFAULT_AUDIO_IP).strip()
    if clean_ip.startswith("http"):
        urls_to_try.append(f"{clean_ip.rstrip('/')}{endpoint}")
    else:
        urls_to_try.append(f"http://{clean_ip}{endpoint}")

    if "http://192.168.29.252" + endpoint not in urls_to_try:
        urls_to_try.append(f"http://192.168.29.252{endpoint}")

    last_error = None
    headers = {"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"}
    
    async with httpx.AsyncClient(timeout=3.5) as client:
        for url in urls_to_try:
            try:
                response = await client.post(url, data=data, headers=headers, auth=(user_to_use, pass_to_use))
                # Auto-promote working tunnel
                for t_url in tunnels:
                    if url.startswith(t_url):
                        global _active_tunnel_url
                        _active_tunnel_url = t_url
                        break
                return response.text
            except Exception as e:
                logger.warning(f"Error connecting to Audio Controller device at {url}: {e}")
                last_error = str(e)

    raise HTTPException(status_code=504, detail=f"Audio Controller device is unreachable: {last_error}")


from datetime import datetime, timezone

@audio_router.get("/ddns/sync")
async def sync_ddns_ip(request: Request, current_admin=Depends(get_current_admin)):
    """Auto-detect incoming Jio public IP and save it to MongoDB as current hardware IP."""
    from server import db
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else DEFAULT_AUDIO_IP

    if ":" in client_ip:
        client_ip = DEFAULT_AUDIO_IP
        
    await db.site_settings.update_one(
        {},
        {"$set": {"audio_device_ip": client_ip, "audio_ip_updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {
        "success": True,
        "ip": client_ip,
        "message": "SDPS DDNS auto-synced latest Jio public IP"
    }


class IpUpdatePayload(BaseModel):
    ip: str


@audio_router.post("/ip/update")
async def update_broadcasting_ip(payload: IpUpdatePayload, current_admin=Depends(get_current_admin)):
    """Save updated hardware broadcasting IP to MongoDB site_settings."""
    from server import db
    clean_ip = payload.ip.strip()
    if not clean_ip:
        raise HTTPException(status_code=400, detail="IP address cannot be empty.")
        
    now_iso = datetime.now(timezone.utc).isoformat()
    await db.site_settings.update_one(
        {},
        {"$set": {
            "audio_device_ip": clean_ip,
            "audio_ip_updated_at": now_iso
        }},
        upsert=True
    )
    await db.audio_tunnels.update_many(
        {},
        {"$set": {
            "target_ip": clean_ip,
            "updated_at": now_iso
        }}
    )
    return {
        "success": True,
        "ip": clean_ip,
        "message": f"Broadcasting IP updated to {clean_ip}"
    }


@audio_router.get("/ddns/get")
async def get_ddns_ip(current_admin=Depends(get_current_admin)):
    """Retrieve saved Broadcasting IP from MongoDB site_settings."""
    from server import db
    settings = await db.site_settings.find_one({}, {"_id": 0, "audio_device_ip": 1})
    saved_ip = settings.get("audio_device_ip") if settings else None
    return {
        "ip": saved_ip or ""
    }


@audio_router.get("/status")
async def get_audio_status(
    ip: Optional[str] = Query(None),
    username: Optional[str] = Query(None),
    password: Optional[str] = Query(None),
    current_admin=Depends(get_current_admin_optional)
):
    """Ping Audio Controller device to verify hardware connectivity with automatic failover."""
    from server import db
    tunnels = await get_all_active_tunnels_async()

    ips_to_try = []
    # Add active tunnels first
    for t_url in tunnels:
        if t_url.startswith("http") and t_url not in ips_to_try:
            ips_to_try.append(t_url)

    if ip and ip.strip() and ip.strip() not in ips_to_try:
        ips_to_try.append(ip.strip())

    if "192.168.29.252" not in ips_to_try:
        ips_to_try.append("192.168.29.252")
    if "192.168.29.71" not in ips_to_try:
        ips_to_try.append("192.168.29.71")

    user_to_use = username or DEFAULT_HARDWARE_USER
    pass_to_use = password or DEFAULT_HARDWARE_PASS
    
    last_error = None
    async with httpx.AsyncClient(timeout=2.5) as client:
        for attempt_ip in ips_to_try:
            urls_for_ip = []
            if attempt_ip.startswith("http"):
                urls_for_ip.append(attempt_ip.rstrip('/') + "/")
                urls_for_ip.append(attempt_ip.rstrip('/') + "/BcastDo")
            else:
                urls_for_ip.append(f"http://{attempt_ip}/")
                urls_for_ip.append(f"http://{attempt_ip}/BcastDo")

            for url in urls_for_ip:
                try:
                    res = await client.get(url, auth=(user_to_use, pass_to_use))
                    body = res.text
                    online = res.status_code in (200, 204, 302, 401, 403, 404) or "sMsg" in body or "Page Not Found" in body
                    if online:
                        if attempt_ip.startswith("http"):
                            global _active_tunnel_url
                            _active_tunnel_url = attempt_ip
                            await db.site_settings.update_one(
                                {},
                                {"$set": {"cloudflare_tunnel_url": attempt_ip, "tunnel_updated_at": datetime.now(timezone.utc).isoformat()}},
                                upsert=True
                            )
                        return {
                            "success": True,
                            "online": True,
                            "requires_auth": res.status_code in (401, 403),
                            "ip": attempt_ip,
                            "device": "SDPS Audio Controller",
                            "statusCode": res.status_code
                        }
                except Exception as e:
                    last_error = str(e)

    return {
        "success": False,
        "online": False,
        "ip": ip or DEFAULT_AUDIO_IP,
        "device": "SDPS Audio Controller",
        "error": f"Audio Controller unreachable: {last_error or 'Connection timed out'}"
    }


@audio_router.post("/hardware-login")
async def login_to_hardware(payload: HardwareLoginPayload, current_admin=Depends(get_current_admin)):
    """Authenticate with hardware /Login endpoint."""
    device_ip = payload.ip or DEFAULT_AUDIO_IP
    form_data = {
        "sUser": payload.sUser,
        "sPass": payload.sPass,
        "username": payload.sUser,
        "password": payload.sPass,
    }
    raw_res = await send_device_post_async(device_ip, "/Login", form_data, username=payload.sUser, password=payload.sPass)
    return {
        "success": True,
        "raw_response": raw_res
    }


@audio_router.post("/broadcast")
async def trigger_broadcast(payload: BroadcastPayload, current_admin=Depends(get_current_admin)):
    """Send broadcast command (Connect / Cancel / Listen / Local Speaker) to Audislave hardware."""
    device_ip = payload.ip or DEFAULT_AUDIO_IP
    form_data = {
        "sSource": payload.sSource,
        "sFilename": payload.sFilename or "1",
        "sDest": payload.sDest or "1-200",
        "sRooms": payload.sRooms,
        "sAct": payload.sAct
    }
    raw_res = await send_device_post_async(device_ip, "/BcastDo", form_data)
    return {
        "success": True,
        "action": payload.sAct,
        "rooms": payload.sRooms,
        "raw_response": raw_res
    }


@audio_router.post("/schedule/set")
async def set_current_schedule(payload: ScheduleSetPayload, current_admin=Depends(get_current_admin)):
    """Switch active bell schedule profile (Summer, Winter, Exam, Test, Off)."""
    device_ip = payload.ip or DEFAULT_AUDIO_IP
    form_data = {"sSchId": payload.sSchId}
    raw_res = await send_device_post_async(device_ip, "/SchCurrMod", form_data)
    return {
        "success": True,
        "schedule_id": payload.sSchId,
        "raw_response": raw_res
    }


@audio_router.post("/schedule/modify")
async def modify_schedule_entry(payload: ScheduleModifyPayload, current_admin=Depends(get_current_admin)):
    """Modify a specific bell schedule entry on the hardware controller."""
    device_ip = payload.ip or DEFAULT_AUDIO_IP
    form_data = {
        "sId": payload.sId,
        "sSchId": payload.sSchId,
        "iH": payload.iH,
        "iMi": payload.iMi,
        "iFile": payload.iFile,
        "sRoomB": payload.sRoomB,
        "sRoomE": payload.sRoomE,
    }
    if payload.days:
        for day, active in payload.days.items():
            if active:
                form_data[f"s{day}"] = "on"

    raw_res = await send_device_post_async(device_ip, "/SchListMod", form_data)
    return {
        "success": True,
        "schedule_entry": payload.sId,
        "raw_response": raw_res
    }


@audio_router.post("/rtc")
async def update_realtime_clock(payload: RtcPayload, current_admin=Depends(get_current_admin)):
    """Sync Real-Time Clock on Audislave hardware."""
    device_ip = payload.ip or DEFAULT_AUDIO_IP
    form_data = {
        "iH": payload.iH,
        "iMi": payload.iMi,
        "iD": payload.iD,
        "iMo": payload.iMo,
        "iY": payload.iY,
        "chSignTz": payload.chSignTz,
        "iHTz": payload.iHTz,
        "iMiTz": payload.iMiTz,
    }
    raw_res = await send_device_post_async(device_ip, "/RtcMod", form_data)
    return {
        "success": True,
        "raw_response": raw_res
    }


@audio_router.post("/group/save")
async def save_broadcast_group(payload: GroupPayload, current_admin=Depends(get_current_admin)):
    """Save a room group range on the hardware controller."""
    device_ip = payload.ip or DEFAULT_AUDIO_IP
    form_data = {
        "sIndex": str(payload.sIndex),
        "sGrpName": payload.sGrpName,
        "sStartRoom": payload.sStartRoom,
        "sEndRoom": payload.sEndRoom
    }
    raw_res = await send_device_post_async(device_ip, "/BcastGrpsDo", form_data)
    return {
        "success": True,
        "group_name": payload.sGrpName,
        "raw_response": raw_res
    }
    return {
        "success": True,
        "group_name": payload.sGrpName,
        "raw_response": raw_res
    }
