"""BulkSMS service wrapper for sms.gungunerp.in."""
import os
import asyncio
import logging
import requests

logger = logging.getLogger(__name__)

BULKSMS_API_URL = os.environ.get("BULKSMS_API_URL", "")
BULKSMS_API_KEY = os.environ.get("BULKSMS_API_KEY", "")
BULKSMS_SENDER_ID = os.environ.get("BULKSMS_SENDER_ID", "SDPUBP")
BULKSMS_TEMPLATE_ID = os.environ.get("BULKSMS_TEMPLATE_ID", "")


from message_logger import log_message

def _send_sync(phone: str, message: str) -> dict:
    if not BULKSMS_API_URL or not BULKSMS_API_KEY:
        logger.warning(f"[SMS MOCK] To: {phone} | Msg: {message[:80]}")
        return {"success": False, "message": "SMS service not configured", "mocked": True}
    try:
        params = {
            "apikey": BULKSMS_API_KEY,
            "sender": BULKSMS_SENDER_ID,
            "number": phone,
            "message": message,
            "templateid": BULKSMS_TEMPLATE_ID,
        }
        r = requests.get(BULKSMS_API_URL, params=params, timeout=10)
        return {"success": r.ok, "status": r.status_code, "body": r.text[:200]}
    except Exception as e:
        logger.error(f"SMS send failed: {e}")
        return {"success": False, "message": str(e)}


async def send_sms(phone: str, message: str) -> dict:
    res = await asyncio.to_thread(_send_sync, phone, message)
    try:
        status_str = "sent" if res.get("success") else ("mocked" if res.get("mocked") else "failed")
        await log_message(
            channel="sms",
            recipient=phone,
            subject="SMS Notification",
            message_content=message,
            status=status_str,
            provider="bulksms",
            error_details=res.get("message") or res.get("body", "")
        )
    except Exception:
        pass
    return res
