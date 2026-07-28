"""
SDPS Smart Audio & Bell Command Hub - Backend Controller & Proxy
Communicates directly with the Audislave Hitech IP Audio Hardware Controller (Default IP: 192.168.29.71)
"""

import os
import logging
import urllib.parse
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import requests

from auth import get_current_admin_user

logger = logging.getLogger(__name__)

audio_router = APIRouter(prefix="/api/admin/audio", tags=["Admin Audio Controller"])

DEFAULT_AUDISLAVE_IP = os.getenv("AUDISLAVE_IP", "192.168.29.71")


class DeviceConfig(BaseModel):
    ip: str = DEFAULT_AUDISLAVE_IP


class BroadcastPayload(BaseModel):
    ip: Optional[str] = DEFAULT_AUDISLAVE_IP
    sSource: str = "sMic"  # sMic, sFile, sAux
    sFilename: Optional[str] = "1"
    sDest: Optional[str] = "1-200"
    sRooms: str = "1"
    sAct: str = "connect"  # connect, cancel, listen, localspk


class ScheduleSetPayload(BaseModel):
    ip: Optional[str] = DEFAULT_AUDISLAVE_IP
    sSchId: str  # 0..9 (Summer, Winter, Test, Exam, etc.)


class ScheduleModifyPayload(BaseModel):
    ip: Optional[str] = DEFAULT_AUDISLAVE_IP
    sId: str
    sSchId: str
    iH: str
    iMi: str
    iFile: str
    sRoomB: str
    sRoomE: str
    days: Optional[Dict[str, bool]] = None


class GroupPayload(BaseModel):
    ip: Optional[str] = DEFAULT_AUDISLAVE_IP
    sIndex: int
    sGrpName: str
    sStartRoom: str
    sEndRoom: str


class RtcPayload(BaseModel):
    ip: Optional[str] = DEFAULT_AUDISLAVE_IP
    iH: str
    iMi: str
    iD: str
    iMo: str
    iY: str
    chSignTz: str = "+"
    iHTz: str = "05"
    iMiTz: str = "30"


def send_device_post(ip: str, endpoint: str, data: dict):
    url = f"http://{ip.strip()}{endpoint}"
    try:
        response = requests.post(
            url,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"},
            timeout=5.0
        )
        return response.text
    except requests.exceptions.RequestException as e:
        logger.error(f"Error connecting to Audislave device at {url}: {e}")
        raise HTTPException(status_code=504, detail=f"Audislave device at {ip} is unreachable: {str(e)}")


@audio_router.get("/status")
def get_audio_status(ip: str = Query(DEFAULT_AUDISLAVE_IP), current_admin=Depends(get_current_admin_user)):
    """Ping Audislave device to verify hardware connectivity."""
    url = f"http://{ip.strip()}/"
    try:
        res = requests.get(url, timeout=3.0)
        online = res.status_code == 200
        return {
            "success": True,
            "online": online,
            "ip": ip,
            "device": "Audislave Hitech IP Audio Controller",
            "statusCode": res.status_code
        }
    except Exception as e:
        return {
            "success": False,
            "online": False,
            "ip": ip,
            "device": "Audislave Hitech IP Audio Controller",
            "error": str(e)
        }


@audio_router.post("/broadcast")
def trigger_broadcast(payload: BroadcastPayload, current_admin=Depends(get_current_admin_user)):
    """Send broadcast command (Connect / Cancel / Listen / Local Speaker) to Audislave hardware."""
    device_ip = payload.ip or DEFAULT_AUDISLAVE_IP
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
def set_current_schedule(payload: ScheduleSetPayload, current_admin=Depends(get_current_admin_user)):
    """Switch active bell schedule profile (Summer, Winter, Exam, Test, Off)."""
    device_ip = payload.ip or DEFAULT_AUDISLAVE_IP
    form_data = {"sSchId": payload.sSchId}
    raw_res = send_device_post(device_ip, "/SchCurrMod", form_data)
    return {
        "success": True,
        "schedule_id": payload.sSchId,
        "raw_response": raw_res
    }


@audio_router.post("/schedule/modify")
def modify_schedule_entry(payload: ScheduleModifyPayload, current_admin=Depends(get_current_admin_user)):
    """Modify a specific bell schedule entry on the hardware controller."""
    device_ip = payload.ip or DEFAULT_AUDISLAVE_IP
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
def update_realtime_clock(payload: RtcPayload, current_admin=Depends(get_current_admin_user)):
    """Sync Real-Time Clock on Audislave hardware."""
    device_ip = payload.ip or DEFAULT_AUDISLAVE_IP
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
def save_broadcast_group(payload: GroupPayload, current_admin=Depends(get_current_admin_user)):
    """Save a room group range on the hardware controller."""
    device_ip = payload.ip or DEFAULT_AUDISLAVE_IP
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
