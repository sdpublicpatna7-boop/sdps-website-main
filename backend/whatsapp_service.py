"""
WhatsApp transactional messaging via the Baileys Node microservice.

Used for "we received your submission, we'll contact you" style confirmations
on enquiry / alumni / career forms. All sends are best-effort: if the WhatsApp
service is down or not linked, we log and return a failure dict WITHOUT raising,
so form submissions never break because of WhatsApp.
"""
import os
import logging
import httpx

logger = logging.getLogger("sdps.whatsapp")

WA_SERVICE_URL = os.environ.get("WA_SERVICE_URL", "http://localhost:3001")
WA_API_SECRET = os.environ.get("WA_API_SECRET", "")
_WA_HEADERS = {"X-WA-Secret": WA_API_SECRET}


from message_logger import log_message

async def send_whatsapp_text(phone: str, message: str, subject: str = "Transactional Message") -> dict:
    """Send a single transactional WhatsApp text. Best-effort, logs to DB."""
    if not phone or not message:
        res = {"success": False, "message": "missing phone or message"}
        try:
            await log_message("whatsapp", phone or "unknown", subject, message or "", "failed", provider="baileys", error_details="missing phone or message")
        except Exception:
            pass
        return res
    if not WA_API_SECRET:
        logger.warning("[WA MOCK] WA_API_SECRET not set; skipping WhatsApp send")
        res = {"success": False, "message": "WhatsApp service not configured", "mocked": True}
        try:
            await log_message("whatsapp", phone, subject, message, "mocked", provider="mock", error_details="WA_API_SECRET not configured")
        except Exception:
            pass
        return res
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            r = await client.post(
                f"{WA_SERVICE_URL}/send-text",
                headers=_WA_HEADERS,
                json={"phone": phone, "message": message},
            )
        if r.status_code < 300:
            res = {"success": True, "message": "sent"}
            try:
                await log_message("whatsapp", phone, subject, message, "sent", provider="baileys")
            except Exception:
                pass
            return res
        error_msg = f"status {r.status_code}: {r.text[:200]}"
        logger.warning(f"WhatsApp send failed {r.status_code}: {r.text[:200]}")
        res = {"success": False, "message": f"status {r.status_code}"}
        try:
            await log_message("whatsapp", phone, subject, message, "failed", provider="baileys", error_details=error_msg)
        except Exception:
            pass
        return res
    except Exception as e:
        logger.warning(f"WhatsApp send error: {e}")
        res = {"success": False, "message": str(e)}
        try:
            await log_message("whatsapp", phone, subject, message, "failed", provider="baileys", error_details=str(e))
        except Exception:
            pass
        return res
