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

DEFAULT_AUDIO_IP = os.getenv("AUDIO_CONTROLLER_IP", "192.168.29.71")
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


@audio_router.post("/tunnel/register")
async def register_tunnel(payload: TunnelRegisterPayload):
    """Called by school PC script to register its Cloudflare tunnel URL."""
    global _active_tunnel_url
    if payload.api_key != TUNNEL_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid tunnel API key")

    _active_tunnel_url = payload.tunnel_url.rstrip("/")
    from server import db
    await db.site_settings.update_one(
        {},
        {"$set": {
            "cloudflare_tunnel_url": _active_tunnel_url,
            "tunnel_hostname": payload.hostname or "unknown",
            "tunnel_updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    logger.info(f"Tunnel registered: {_active_tunnel_url} from {payload.hostname}")
    return {"success": True, "tunnel_url": _active_tunnel_url}


@audio_router.get("/tunnel/status")
async def get_tunnel_status(current_admin=Depends(get_current_admin_optional)):
    """Check current active tunnel URL. Masks URL for non-superadmin users."""
    from server import db
    settings = await db.site_settings.find_one({}, {"_id": 0, "cloudflare_tunnel_url": 1, "tunnel_hostname": 1, "tunnel_updated_at": 1})
    raw_url = _active_tunnel_url or (settings.get("cloudflare_tunnel_url") if settings else None)

    # Check if current user is superadmin / admin
    is_superadmin = False
    if current_admin:
        role = getattr(current_admin, "role", None) or current_admin.get("role", "")
        if role in ["superadmin", "admin"]:
            is_superadmin = True

    masked_url = raw_url
    if raw_url and not is_superadmin:
        # Mask domain string for non-superadmin e.g. club-strikes-explains-colony -> club-st-XXXXXX.trycloudflare.com
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
        "hostname": settings.get("tunnel_hostname") if settings else None,
        "updated_at": settings.get("tunnel_updated_at") if settings else None,
    }


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

    # Send via Email
    email = user.get("email")
    if email:
        try:
            subject = "🔑 Your SDPS Audio Hub Login OTP"
            html = f"""
            <div style="font-family: sans-serif; padding: 20px; max-width: 500px; border: 1px solid #e2e8f0; border-radius: 16px;">
                <h2 style="color: #0e3b91;">SDPS Audio Command Hub OTP</h2>
                <p>Your one-time login verification code is:</p>
                <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #f87d0e; margin: 20px 0;">{otp_code}</div>
                <p style="font-size: 12px; color: #64748b;">This code expires in 5 minutes. Do not share it with anyone.</p>
            </div>
            """
            await send_email(email, subject, html)
        except Exception as e:
            logger.warning(f"Failed to send OTP email: {e}")

    # Send via WhatsApp if phone available
    phone = user.get("phone")
    if phone:
        try:
            msg = f"🔑 *SDPS Audio Command Hub OTP*: Your login code is *{otp_code}*. Expires in 5 minutes."
            await send_whatsapp_text(phone, msg, "Audio Hub OTP")
        except Exception as e:
            logger.warning(f"Failed to send OTP whatsapp: {e}")

    logger.info(f"[AUDIO OTP GENERATED] For user {target_username}: OTP={otp_code}")

    dest_hint = email or phone or "registered contact"
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
$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$D = "C:\sdps"
New-Item -ItemType Directory -Path $D -Force | Out-Null
$CF = "C:\sdps\cloudflared.exe"

if (-not (Test-Path $CF)) {
    Write-Host "[~] Downloading cloudflared..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile $CF
    Write-Host "[+] Downloaded cloudflared.exe" -ForegroundColor Green
}

try {
    Remove-NetFirewallRule -DisplayName "SDPS Cloudflared Out" -ErrorAction SilentlyContinue
    Remove-NetFirewallRule -DisplayName "SDPS Cloudflared In" -ErrorAction SilentlyContinue
} catch {}

New-NetFirewallRule -DisplayName "SDPS Cloudflared Out" -Direction Outbound -Program "C:\sdps\cloudflared.exe" -Action Allow | Out-Null
New-NetFirewallRule -DisplayName "SDPS Cloudflared In" -Direction Inbound -Program "C:\sdps\cloudflared.exe" -Action Allow | Out-Null

# Stop old background instances
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process powershell -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*tunnel-bridge*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Remove-Item "C:\sdps\bridge.log" -Force -ErrorAction SilentlyContinue
Remove-Item "C:\sdps\tunnel.log" -Force -ErrorAction SilentlyContinue

$script = @'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$D = "C:\sdps"
$CF = "C:\sdps\cloudflared.exe"
$LOG = "C:\sdps\tunnel.log"
$BLOG = "C:\sdps\bridge.log"
$URL = "https://api.sdpublic.org/api/admin/audio/tunnel/register"
$KEY = "sdps-tunnel-2026"
$HN = $env:COMPUTERNAME

while ($true) {
    if (Test-Path $LOG) { Remove-Item $LOG -Force -ErrorAction SilentlyContinue }
    Add-Content $BLOG "[$(Get-Date -Format 'HH:mm:ss')] Starting Cloudflare tunnel..."
    
    $p = Start-Process -FilePath $CF -ArgumentList "tunnel","--url","http://192.168.29.71","--logfile",$LOG -PassThru -NoNewWindow

    $tunnelUrl = $null
    for ($i = 0; $i -lt 25; $i++) {
        Start-Sleep -Seconds 1
        if (Test-Path $LOG) {
            $c = Get-Content $LOG -Raw -ErrorAction SilentlyContinue
            if ($c -match '(https://[a-z0-9-]+\.trycloudflare\.com)') {
                $tunnelUrl = $Matches[1]
                break
            }
        }
    }

    if ($tunnelUrl) {
        Add-Content $BLOG "[$(Get-Date -Format 'HH:mm:ss')] Live Tunnel URL: $tunnelUrl"
        $body = @{ tunnel_url = $tunnelUrl; api_key = $KEY; hostname = $HN } | ConvertTo-Json
        try {
            Invoke-RestMethod -Uri $URL -Method Post -Body $body -ContentType "application/json" -TimeoutSec 10 | Out-Null
            Add-Content $BLOG "[$(Get-Date -Format 'HH:mm:ss')] Registered $tunnelUrl with api.sdpublic.org"
        } catch {
            Add-Content $BLOG "[$(Get-Date -Format 'HH:mm:ss')] Registration error: $_"
        }

        while (-not $p.HasExited) {
            Start-Sleep -Seconds 180
            if (-not $p.HasExited) {
                try { Invoke-RestMethod -Uri $URL -Method Post -Body $body -ContentType "application/json" -TimeoutSec 10 | Out-Null } catch {}
            }
        }
    } else {
        if (-not $p.HasExited) { $p | Stop-Process -Force -ErrorAction SilentlyContinue }
    }
    Add-Content $BLOG "[$(Get-Date -Format 'HH:mm:ss')] Tunnel exited. Restarting in 5s..."
    Start-Sleep -Seconds 5
}
'@

Set-Content -Path "C:\sdps\tunnel-bridge.ps1" -Value $script -Encoding UTF8
Write-Host "[+] Created tunnel script" -ForegroundColor Green

$TN = "SDPS Audio Tunnel"
try { Unregister-ScheduledTask -TaskName $TN -Confirm:$false -ErrorAction SilentlyContinue } catch {}

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"C:\sdps\tunnel-bridge.ps1`""
$trigger = New-ScheduledTaskTrigger -AtLogon
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 9999 -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask -TaskName $TN -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest | Out-Null

# Launch in background right now
Start-Process -FilePath "powershell.exe" -ArgumentList "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"C:\sdps\tunnel-bridge.ps1`"" -NoNewWindow
Start-ScheduledTask -TaskName $TN -ErrorAction SilentlyContinue

Write-Host "SETUP COMPLETE! SDPS Audio Tunnel is running and registered." -ForegroundColor Green
"""

MAC_SETUP_SCRIPT = """#!/bin/bash
SDPS_DIR="/usr/local/sdps"
mkdir -p "$SDPS_DIR"
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64.tgz"; else URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz"; fi
curl -sL "$URL" -o /tmp/cf.tgz && tar -xzf /tmp/cf.tgz -C "$SDPS_DIR" && chmod +x "$SDPS_DIR/cloudflared" && rm -f /tmp/cf.tgz

cat << "EOF" > "$SDPS_DIR/tunnel-bridge.sh"
#!/bin/bash
SDPS_DIR="/usr/local/sdps"
CF="$SDPS_DIR/cloudflared"
LOG="$SDPS_DIR/tunnel.log"
BLOG="$SDPS_DIR/bridge.log"
IP="192.168.29.71"
URL="https://api.sdpublic.org/api/admin/audio/tunnel/register"
KEY="sdps-tunnel-2026"
HN=$(hostname -s)

while true; do
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
        curl -s -X POST "$URL" -H "Content-Type: application/json" -d "{\\"tunnel_url\\":\\"$TUNNEL_URL\\",\\"api_key\\":\\"$KEY\\",\\"hostname\\":\\"$HN\\"}" >/dev/null
        echo "[$(date "+%H:%M:%S")] Registered: $TUNNEL_URL" >> "$BLOG"
        while kill -0 "$PID" 2>/dev/null; do
            sleep 300
            kill -0 "$PID" 2>/dev/null && curl -s -X POST "$URL" -H "Content-Type: application/json" -d "{\\"tunnel_url\\":\\"$TUNNEL_URL\\",\\"api_key\\":\\"$KEY\\",\\"hostname\\":\\"$HN\\"}" >/dev/null
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


@audio_router.get("/setup-win.ps1", response_class=PlainTextResponse)
def get_win_setup_script():
    """Serves the Windows PowerShell setup script directly."""
    return WIN_SETUP_SCRIPT


@audio_router.get("/setup-mac.sh", response_class=PlainTextResponse)
def get_mac_setup_script():
    """Serves the macOS bash setup script directly."""
    return MAC_SETUP_SCRIPT



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


async def send_device_post_async(ip: str, endpoint: str, data: dict, username: Optional[str] = None, password: Optional[str] = None):
    tunnel = await _get_tunnel_url_async()
    url = format_device_url(ip, endpoint, tunnel_url=tunnel)
    user_to_use = username or DEFAULT_HARDWARE_USER
    pass_to_use = password or DEFAULT_HARDWARE_PASS

    if "sUser" not in data:
        data["sUser"] = user_to_use
    if "sPass" not in data:
        data["sPass"] = pass_to_use

    kwargs = {
        "data": data,
        "headers": {"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"},
        "auth": (user_to_use, pass_to_use),
        "timeout": 5.0
    }
    try:
        response = requests.post(url, **kwargs)
        return response.text
    except requests.exceptions.RequestException as e:
        logger.error(f"Error connecting to Audio Controller device at {url}: {e}")
        raise HTTPException(status_code=504, detail=f"Audio Controller device at {url} is unreachable: {str(e)}")



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

    # If incoming client is IPv6 (contains colons), fallback to Jio Public IPv4 for hardware port forwarding
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


@audio_router.get("/ddns/get")
async def get_ddns_ip(current_admin=Depends(get_current_admin)):
    """Retrieve saved DDNS IP from MongoDB."""
    from server import db
    settings = await db.site_settings.find_one({}, {"_id": 0, "audio_device_ip": 1})
    saved_ip = settings.get("audio_device_ip") if settings else None
    return {
        "ip": saved_ip or DEFAULT_AUDIO_IP
    }


@audio_router.get("/status")
async def get_audio_status(
    ip: Optional[str] = Query(None),
    username: Optional[str] = Query(None),
    password: Optional[str] = Query(None),
    current_admin=Depends(get_current_admin_optional)
):
    """Ping Audio Controller device to verify hardware connectivity."""
    from server import db

    # If Cloudflare tunnel is configured (env var or auto-registered), always use it
    tunnel = await _get_tunnel_url_async()
    if tunnel and tunnel.startswith("http"):
        target_ip = tunnel
    else:
        target_ip = "192.168.29.71"

    user_to_use = username or DEFAULT_HARDWARE_USER
    pass_to_use = password or DEFAULT_HARDWARE_PASS
    
    # Try specified IP/port first, then fallback to :5060 and :8080 if standard port fails
    ips_to_try = [target_ip]
    if not tunnel and ":" not in target_ip and not target_ip.startswith("http"):
        ips_to_try.append(f"{target_ip}:5060")
        ips_to_try.append(f"{target_ip}:8080")

    last_error = None
    for attempt_ip in ips_to_try:
        url = format_device_url(attempt_ip, "/", tunnel_url=tunnel)
        kwargs = {"timeout": 4.0, "auth": (user_to_use, pass_to_use)}
        try:
            res = requests.get(url, **kwargs)
            online = res.status_code in (200, 401, 403)
            requires_auth = res.status_code in (401, 403)
            return {
                "success": True,
                "online": online,
                "requires_auth": requires_auth,
                "ip": attempt_ip,
                "device": "SDPS Audio Controller",
                "statusCode": res.status_code
            }
        except Exception as e:
            last_error = str(e)

    return {
        "success": False,
        "online": False,
        "ip": target_ip,
        "device": "SDPS Audio Controller",
        "error": last_error
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
