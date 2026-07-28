"""
SDPS Smart Audio & Bell Command Hub - Backend Controller & Proxy
Communicates directly with the IP Audio Hardware Controller (Default IP: 192.168.29.71)
"""

import os
import logging
import urllib.parse
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import requests

from auth import get_current_admin, get_current_admin_optional

logger = logging.getLogger(__name__)

audio_router = APIRouter(prefix="/api/admin/audio", tags=["Admin Audio Controller"])

DEFAULT_AUDIO_IP = os.getenv("AUDIO_CONTROLLER_IP", "49.47.128.46")
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


def send_device_post(ip: str, endpoint: str, data: dict, username: Optional[str] = None, password: Optional[str] = None):
    url = f"http://{ip.strip()}{endpoint}"
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
        raise HTTPException(status_code=504, detail=f"Audio Controller device at {ip} is unreachable: {str(e)}")


from datetime import datetime, timezone

@audio_router.get("/ddns/sync")
async def sync_ddns_ip(request: Request, current_admin=Depends(get_current_admin)):
    """Auto-detect incoming Jio public IP and save it to MongoDB as current hardware IP."""
    from server import db
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else "49.47.128.46"
        
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
    if not ip or ip == "192.168.29.71":
        settings = await db.site_settings.find_one({}, {"_id": 0, "audio_device_ip": 1})
        target_ip = settings.get("audio_device_ip") if (settings and settings.get("audio_device_ip")) else DEFAULT_AUDIO_IP
    else:
        target_ip = ip.strip()

    user_to_use = username or DEFAULT_HARDWARE_USER
    pass_to_use = password or DEFAULT_HARDWARE_PASS
    
    # Try specified IP/port first, then fallback to :5060 and :8080 if standard port fails
    ips_to_try = [target_ip]
    if ":" not in target_ip and not target_ip.startswith("http"):
        ips_to_try.append(f"{target_ip}:5060")
        ips_to_try.append(f"{target_ip}:8080")

    last_error = None
    for attempt_ip in ips_to_try:
        url = f"http://{attempt_ip}/" if not attempt_ip.startswith("http") else attempt_ip
        kwargs = {"timeout": 3.0, "auth": (user_to_use, pass_to_use)}
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
def login_to_hardware(payload: HardwareLoginPayload, current_admin=Depends(get_current_admin)):
    """Authenticate with hardware /Login endpoint."""
    device_ip = payload.ip or DEFAULT_AUDIO_IP
    form_data = {
        "sUser": payload.sUser,
        "sPass": payload.sPass,
        "username": payload.sUser,
        "password": payload.sPass,
    }
    raw_res = send_device_post(device_ip, "/Login", form_data, username=payload.sUser, password=payload.sPass)
    return {
        "success": True,
        "raw_response": raw_res
    }


@audio_router.post("/broadcast")
def trigger_broadcast(payload: BroadcastPayload, current_admin=Depends(get_current_admin)):
    """Send broadcast command (Connect / Cancel / Listen / Local Speaker) to Audislave hardware."""
    device_ip = payload.ip or DEFAULT_AUDIO_IP
    form_data = {
        "sSource": payload.sSource,
        "sFilename": payload.sFilename or "1",
        "sDest": payload.sDest or "1-200",
        "sRooms": payload.sRooms,
        "sAct": payload.sAct
    }
    raw_res = send_device_post(device_ip, "/BcastDo", form_data)
    return {
        "success": True,
        "action": payload.sAct,
        "rooms": payload.sRooms,
        "raw_response": raw_res
    }


@audio_router.post("/schedule/set")
def set_current_schedule(payload: ScheduleSetPayload, current_admin=Depends(get_current_admin)):
    """Switch active bell schedule profile (Summer, Winter, Exam, Test, Off)."""
    device_ip = payload.ip or DEFAULT_AUDIO_IP
    form_data = {"sSchId": payload.sSchId}
    raw_res = send_device_post(device_ip, "/SchCurrMod", form_data)
    return {
        "success": True,
        "schedule_id": payload.sSchId,
        "raw_response": raw_res
    }


@audio_router.post("/schedule/modify")
def modify_schedule_entry(payload: ScheduleModifyPayload, current_admin=Depends(get_current_admin)):
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

    raw_res = send_device_post(device_ip, "/SchListMod", form_data)
    return {
        "success": True,
        "schedule_entry": payload.sId,
        "raw_response": raw_res
    }


@audio_router.post("/rtc")
def update_realtime_clock(payload: RtcPayload, current_admin=Depends(get_current_admin)):
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
    raw_res = send_device_post(device_ip, "/RtcMod", form_data)
    return {
        "success": True,
        "raw_response": raw_res
    }


@audio_router.post("/group/save")
def save_broadcast_group(payload: GroupPayload, current_admin=Depends(get_current_admin)):
    """Save a room group range on the hardware controller."""
    device_ip = payload.ip or DEFAULT_AUDIO_IP
    form_data = {
        "sIndex": str(payload.sIndex),
        "sGrpName": payload.sGrpName,
        "sStartRoom": payload.sStartRoom,
        "sEndRoom": payload.sEndRoom
    }
    raw_res = send_device_post(device_ip, "/BcastGrpsDo", form_data)
    return {
        "success": True,
        "group_name": payload.sGrpName,
        "raw_response": raw_res
    }
