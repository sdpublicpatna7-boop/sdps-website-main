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


async def send_whatsapp_text(phone: str, message: str) -> dict:
    """Send a single transactional WhatsApp text. Best-effort, never raises."""
    if not phone or not message:
        return {"success": False, "message": "missing phone or message"}
    if not WA_API_SECRET:
        logger.warning("[WA MOCK] WA_API_SECRET not set; skipping WhatsApp send")
        return {"success": False, "message": "WhatsApp service not configured", "mocked": True}
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            r = await client.post(
                f"{WA_SERVICE_URL}/send-text",
                headers=_WA_HEADERS,
                json={"phone": phone, "message": message},
            )
        if r.status_code < 300:
            return {"success": True, "message": "sent"}
        logger.warning(f"WhatsApp send failed {r.status_code}: {r.text[:200]}")
        return {"success": False, "message": f"status {r.status_code}"}
    except Exception as e:
        logger.warning(f"WhatsApp send error: {e}")
        return {"success": False, "message": str(e)}
