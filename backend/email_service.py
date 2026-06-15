"""
MailerCloud email service wrapper.
API docs: https://www.mailercloud.com/
Endpoint: POST https://cloudapi.mailercloud.com/v1/message/send
"""
import os
import asyncio
import logging
import httpx

logger = logging.getLogger(__name__)

MAILERCLOUD_API_KEY = os.environ.get("MAILERCLOUD_API_KEY", "")
SENDER_EMAIL        = os.environ.get("SENDER_EMAIL", "noreply@sdpublic.org")
SENDER_NAME         = os.environ.get("SENDER_NAME", "S.D. Public School")

MAILERCLOUD_SEND_URL = "https://cloudapi.mailercloud.com/v1/message/send"


async def send_email(to_email: str, subject: str, html_content: str) -> dict:
    """
    Send a transactional email via MailerCloud.
    Returns {success: bool, message: str, email_id?: str}.
    If MAILERCLOUD_API_KEY is not set, logs the attempt and returns success=False.
    """
    if not MAILERCLOUD_API_KEY:
        logger.warning(f"[EMAIL MOCK] To: {to_email} | Subject: {subject}")
        return {
            "success": False,
            "message": "Email service not configured (MAILERCLOUD_API_KEY missing)",
            "mocked": True
        }

    payload = {
        "from": {
            "name": SENDER_NAME,
            "email": SENDER_EMAIL,
        },
        "to": [
            {"email": to_email}
        ],
        "subject": subject,
        "html_body": html_content,
    }

    headers = {
        "Authorization": MAILERCLOUD_API_KEY,
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(MAILERCLOUD_SEND_URL, json=payload, headers=headers)
        data = resp.json()
        if resp.status_code in (200, 201, 202):
            return {
                "success": True,
                "message": "sent",
                "email_id": data.get("message_id") or data.get("id") or "",
            }
        logger.error(f"MailerCloud error {resp.status_code}: {data}")
        return {"success": False, "message": data.get("message") or str(data)}
    except Exception as e:
        logger.error(f"MailerCloud request failed: {e}")
        return {"success": False, "message": str(e)}


def render_template(title: str, body_html: str, footer: str = "S.D. Public School, Patna") -> str:
    """Render a branded HTML email template."""
    return f"""
    <!DOCTYPE html>
    <html><head><meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    </head>
    <body style="margin:0;font-family:Arial,sans-serif;background:#f8fafc;padding:24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
             style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;
                    overflow:hidden;border:1px solid #e2e8f0;">
        <tr>
          <td style="background:linear-gradient(135deg,#0E3B91 0%,#1e4cb8 100%);
                     padding:24px 32px;color:#ffffff;">
            <h2 style="margin:0;font-size:20px;letter-spacing:0.5px;">S.D. Public School</h2>
            <p style="margin:4px 0 0;font-size:13px;opacity:0.9;">
              Empowering Generations Since 1994
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#0f172a;">
            <h3 style="color:#0E3B91;margin-top:0;">{title}</h3>
            {body_html}
          </td>
        </tr>
        <tr>
          <td style="background:#f1f5f9;padding:16px 32px;text-align:center;
                     color:#64748b;font-size:12px;">
            {footer}<br/>
            Maurya Colony, Gulzarbagh Road, Patna 800007
          </td>
        </tr>
      </table>
    </body></html>
    """
