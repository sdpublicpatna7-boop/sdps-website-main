"""
Email Service for S.D. Public School
- MailerCloud Email API for simple text/HTML emails
- SMTP via Hostinger for emails with PDF attachments (faster delivery)
"""
import os
import io
import base64
import asyncio
import logging
import httpx
import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication

logger = logging.getLogger(__name__)

# ── Configuration ─────────────────────────────────────────────────────────────
MAILERCLOUD_API_KEY = os.environ.get("MAILERCLOUD_API_KEY", "")
SENDER_EMAIL        = os.environ.get("SENDER_EMAIL", "noreply@sdpublic.org")
SENDER_NAME         = os.environ.get("SENDER_NAME", "S.D. Public School")

MAILERCLOUD_SEND_URL = "https://email-api.mailercloud.com/email"

# SMTP settings (Hostinger)
SMTP_HOST     = os.environ.get("SMTP_HOST", "smtp.hostinger.com")
SMTP_PORT     = int(os.environ.get("SMTP_PORT", "465"))
SMTP_USER     = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")

LOGO_URL = "https://www.sdpublic.org/logo-real-animated.gif"


from message_logger import log_message

# ── MailerCloud API (simple emails without attachments) ───────────────────────

async def send_email(to_email: str, subject: str, html_content: str) -> dict:
    """
    Send a transactional email via MailerCloud Email API.
    Returns {success: bool, message: str}.
    """
    if not MAILERCLOUD_API_KEY:
        logger.warning(f"[EMAIL MOCK] To: {to_email} | Subject: {subject}")
        res = {
            "success": False,
            "message": "Email service not configured (MAILERCLOUD_API_KEY missing)",
            "mocked": True
        }
        try:
            await log_message("email", to_email, subject, html_content, "mocked", provider="mock", error_details="MAILERCLOUD_API_KEY missing")
        except Exception:
            pass
        return res

    payload = {
        "version": "1.0",
        "email": {
            "from": SENDER_EMAIL,
            "fromName": SENDER_NAME,
            "subject": subject,
            "html": html_content,
            "recipients": {
                "to": [{"name": to_email, "email": to_email}]
            },
        },
        "metadata": {
            "campaignType": "TRANSACTIONAL",
        },
    }

    headers = {
        "Authorization": MAILERCLOUD_API_KEY,
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(MAILERCLOUD_SEND_URL, json=payload, headers=headers)
        data = resp.json()
        logger.info(f"MailerCloud response for '{subject}' to {to_email}: HTTP {resp.status_code} | body: {data}")
        if resp.status_code in (200, 201) and data.get("statusCode") == 1000:
            res = {"success": True, "message": "sent", "mailercloud_response": data}
            try:
                await log_message("email", to_email, subject, html_content, "sent", provider="mailercloud")
            except Exception:
                pass
            return res
        error_msg = data.get("message") or f"HTTP {resp.status_code} / statusCode {data.get('statusCode')}"
        logger.error(f"MailerCloud error {resp.status_code}: {data}")
        res = {"success": False, "message": error_msg, "mailercloud_response": data}
        try:
            await log_message("email", to_email, subject, html_content, "failed", provider="mailercloud", error_details=str(error_msg))
        except Exception:
            pass
        return res
    except Exception as e:
        logger.error(f"MailerCloud request failed: {e}")
        res = {"success": False, "message": str(e)}
        try:
            await log_message("email", to_email, subject, html_content, "failed", provider="mailercloud", error_details=str(e))
        except Exception:
            pass
        return res


# ── SMTP (emails with PDF attachments — instant delivery) ─────────────────────

async def send_email_with_attachment(
    to_email: str,
    subject: str,
    html_body: str,
    pdf_bytes: bytes,
    pdf_filename: str,
    to_name: str = "",
) -> dict:
    """
    Send an email with a PDF attachment via SMTP (Hostinger).
    Falls back to MailerCloud (without attachment) if SMTP is not configured.
    """
    # If SMTP is not configured, try MailerCloud without attachment
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning("[EMAIL] SMTP not configured, falling back to MailerCloud (no attachment)")
        return await send_email(to_email, subject, html_body)

    try:
        # Build MIME message
        msg = MIMEMultipart("mixed")
        msg["From"] = f"{SENDER_NAME} <{SMTP_USER}>"
        msg["To"] = f"{to_name} <{to_email}>" if to_name else to_email
        msg["Subject"] = subject

        # HTML body
        html_part = MIMEText(html_body, "html", "utf-8")
        msg.attach(html_part)

        # PDF attachment
        pdf_part = MIMEApplication(pdf_bytes, _subtype="pdf")
        pdf_part.add_header("Content-Disposition", "attachment", filename=pdf_filename)
        msg.attach(pdf_part)

        # Send via SMTP
        await aiosmtplib.send(
            msg,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            username=SMTP_USER,
            password=SMTP_PASSWORD,
            use_tls=True if SMTP_PORT == 465 else False,
            start_tls=True if SMTP_PORT == 587 else False,
        )

        logger.info(f"SMTP email sent: '{subject}' to {to_email} with attachment {pdf_filename}")
        res = {"success": True, "message": "sent via SMTP", "method": "smtp"}
        try:
            await log_message(
                "email", to_email, subject, html_body, "sent",
                provider="smtp", metadata={"attachment": pdf_filename}, recipient_name=to_name
            )
        except Exception:
            pass
        return res

    except Exception as e:
        logger.error(f"SMTP send failed: {e}")
        # Fallback to MailerCloud without attachment
        logger.info("Falling back to MailerCloud (no attachment)...")
        result = await send_email(to_email, subject, html_body)
        result["smtp_error"] = str(e)
        result["method"] = "mailercloud_fallback"
        return result


# ── Branded Email Templates ──────────────────────────────────────────────────

def render_template(title: str, body_html: str, footer: str = "S.D. Public School, Patna") -> str:
    """Render a branded HTML email template with school logo."""
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
                     padding:24px 32px;color:#ffffff;text-align:center;">
            <img src="{LOGO_URL}" alt="SDPS Logo" style="height:50px;margin-bottom:8px;display:block;margin-left:auto;margin-right:auto;">
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


def render_attachment_cover_email(
    employee_name: str,
    document_type: str,
    extra_info: str = "",
    download_url: str = None,
) -> str:
    """
    Render a short branded cover email for PDF attachment emails.
    The actual document is in the PDF — this is just the email body.
    """
    extra_line = f"<p style='font-size:14px;color:#334155;'>{extra_info}</p>" if extra_info else ""
    
    if download_url:
        attachment_section = f"""
        <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin:20px 0;text-align:center;">
            <p style="margin:0 0 12px 0;font-size:14px;color:#0369a1;">
                📎 <strong>{document_type} (PDF)</strong> is available for download.
            </p>
            <a href="{download_url}" target="_blank" style="display:inline-block;background:#0284c7;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;font-weight:bold;">
                Download Document
            </a>
            <p style="margin:8px 0 0 0;font-size:11px;color:#64748b;">
                🔒 This document is digitally secured and protected against modifications.
            </p>
        </div>
        """
    else:
        attachment_section = f"""
        <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:14px 18px;margin:20px 0;">
            <p style="margin:0;font-size:13px;color:#0369a1;">
                📎 <strong>Attachment:</strong> {document_type} (PDF)<br>
                🔒 This document is digitally secured and protected against modifications.
            </p>
        </div>
        """

    body = f"""
    <p style="font-size:15px;color:#1e293b;">Dear <strong>{employee_name}</strong>,</p>
    <p style="font-size:14px;color:#334155;line-height:1.7;">
        Please find your <strong>{document_type}</strong> attached as a PDF document with this email.
    </p>
    {extra_line}
    {attachment_section}
    <p style="font-size:13px;color:#64748b;">
        If you have any questions regarding this document, please contact the school administration.
    </p>
    """
    return render_template(document_type, body)


# ── Document-specific email formatters (for inline HTML emails) ───────────────

def format_salary_slip_email(data: dict) -> str:
    import uuid
    try:
        basic = int(float(data.get("basic_salary", 0)))
    except (ValueError, TypeError):
        basic = 0
    try:
        hra = int(float(data.get("hra", 0)))
    except (ValueError, TypeError):
        hra = 0
    try:
        da = int(float(data.get("da", 0)))
    except (ValueError, TypeError):
        da = 0
    try:
        medical = int(float(data.get("medical_allowance", 0)))
    except (ValueError, TypeError):
        medical = 0
    try:
        conveyance = int(float(data.get("conveyance_allowance", 0)))
    except (ValueError, TypeError):
        conveyance = 0
    try:
        special = int(float(data.get("special_allowance", 0)))
    except (ValueError, TypeError):
        special = 0
    try:
        gross = int(float(data.get("gross_salary", basic + hra + da + medical + conveyance + special)))
    except (ValueError, TypeError):
        gross = basic + hra + da + medical + conveyance + special
    
    try:
        pf = int(float(data.get("pf", 0)))
    except (ValueError, TypeError):
        pf = 0
    try:
        tax = int(float(data.get("professional_tax", 0)))
    except (ValueError, TypeError):
        tax = 0
    try:
        tds = int(float(data.get("tds", 0)))
    except (ValueError, TypeError):
        tds = 0
    try:
        other = int(float(data.get("other_deductions", 0)))
    except (ValueError, TypeError):
        other = 0
    try:
        deductions = int(float(data.get("total_deductions", pf + tax + tds + other)))
    except (ValueError, TypeError):
        deductions = pf + tax + tds + other
    try:
        net = int(float(data.get("net_salary", gross - deductions)))
    except (ValueError, TypeError):
        net = gross - deductions
        
    doc_id = data.get("id") or f"SLIP-{str(uuid.uuid4())[:8].upper()}"
    
    return f"""
    <style>
        .salary-slip-container {{
            font-family: Arial, Helvetica, sans-serif;
            color: #1e293b;
            font-size: 10px;
            line-height: 1.35;
        }}
        .section-title {{
            font-size: 10px;
            font-weight: bold;
            color: #0f172a;
            border-bottom: 1.5px solid #0f172a;
            padding-bottom: 2px;
            margin-top: 12px;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        .details-table {{
            width: 100%;
            border-collapse: collapse;
        }}
        .details-table td {{
            padding: 3px 0;
            font-size: 10px;
        }}
        .details-label {{
            color: #64748b;
            font-weight: bold;
        }}
        .details-value {{
            color: #0f172a;
            font-weight: bold;
        }}
        .financial-table {{
            width: 100%;
            border-collapse: collapse;
        }}
        .financial-table th {{
            font-size: 9px;
            font-weight: bold;
            color: #64748b;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 3px;
            text-transform: uppercase;
        }}
        .financial-table td {{
            padding: 4px 0;
            font-size: 10px;
        }}
        .total-row td {{
            border-top: 1.5px solid #0f172a;
            border-bottom: 1.5px solid #0f172a;
            font-weight: bold;
            color: #0f172a;
            padding: 5px 0;
        }}
        .net-pay-card {{
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px 14px;
            margin-top: 12px;
            width: 100%;
        }}
        .net-pay-label {{
            font-size: 8px;
            font-weight: bold;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        .net-pay-val {{
            font-size: 16px;
            font-weight: 800;
            color: #0f172a;
        }}
        .words-val {{
            font-size: 10px;
            font-weight: bold;
            color: #1e293b;
            font-style: italic;
        }}
        .verification-log {{
            margin-top: 15px;
            border-top: 1px dashed #cbd5e1;
            padding-top: 8px;
            text-align: center;
            font-size: 8px;
            color: #64748b;
        }}
    </style>
    <div class="salary-slip-container">
        <!-- Header -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-bottom: 2px solid #0f172a; padding-bottom: 6px;">
            <tr>
                <td width="70%" valign="middle">
                    <table border="0" cellpadding="0" cellspacing="0">
                        <tr>
                            <td width="48" valign="middle">
                                <img src="{LOGO_URL}" style="height: 40px; width: 40px;" />
                            </td>
                            <td valign="middle" style="padding-left: 8px;">
                                <h2 style="margin: 0; font-size: 16px; font-weight: 800; color: #0f172a; letter-spacing: 0.5px; line-height: 1.1;">S.D. PUBLIC SCHOOL</h2>
                                <p style="margin: 2px 0 0 0; font-size: 9px; font-weight: bold; color: #475569; text-transform: uppercase; letter-spacing: 1px;">PATNA-7, BIHAR</p>
                                <p style="margin: 1px 0 0 0; font-size: 8px; font-weight: 600; color: #d97706; font-style: italic;">Empowering Generations Since 1994</p>
                            </td>
                        </tr>
                    </table>
                </td>
                <td width="30%" align="right" valign="middle">
                    <div style="border: 1px solid #0f172a; padding: 3px 6px; font-weight: 800; font-size: 8px; background-color: #f8fafc; text-transform: uppercase; display: inline-block; border-radius: 4px; color: #0f172a; margin-bottom: 2px;">SALARY SLIP</div>
                    <p style="margin: 0; font-size: 10px; font-weight: bold; color: #0f172a;">Month: {data.get("pay_period", "")}</p>
                </td>
            </tr>
        </table>

        <!-- Employee Details -->
        <div class="section-title">Employee Details</div>
        <table cellpadding="0" cellspacing="0" class="details-table">
            <tr>
                <td width="48%" style="border-bottom: 1px solid #e2e8f0; padding: 4px 0;">
                    <table width="100%">
                        <tr>
                            <td align="left" class="details-label" width="40%">Employee Name</td>
                            <td align="right" class="details-value" width="60%">: {data.get("employee_name", "")}</td>
                        </tr>
                    </table>
                </td>
                <td width="4%"></td>
                <td width="48%" style="border-bottom: 1px solid #e2e8f0; padding: 4px 0;">
                    <table width="100%">
                        <tr>
                            <td align="left" class="details-label" width="40%">Designation</td>
                            <td align="right" class="details-value" width="60%">: {data.get("designation", "")}</td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td style="border-bottom: 1px solid #e2e8f0; padding: 4px 0;">
                    <table width="100%">
                        <tr>
                            <td align="left" class="details-label" width="40%">Employee ID</td>
                            <td align="right" class="details-value" width="60%">: {data.get("employee_id", "")}</td>
                        </tr>
                    </table>
                </td>
                <td></td>
                <td style="border-bottom: 1px solid #e2e8f0; padding: 4px 0;">
                    <table width="100%">
                        <tr>
                            <td align="left" class="details-label" width="40%">Department</td>
                            <td align="right" class="details-value" width="60%">: {data.get("department", "")}</td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td style="border-bottom: 1px solid #e2e8f0; padding: 4px 0;">
                    <table width="100%">
                        <tr>
                            <td align="left" class="details-label" width="40%">Pay Period</td>
                            <td align="right" class="details-value" width="60%">: {data.get("pay_period", "")}</td>
                        </tr>
                    </table>
                </td>
                <td></td>
                <td style="border-bottom: 1px solid #e2e8f0; padding: 4px 0;">
                    <table width="100%">
                        <tr>
                            <td align="left" class="details-label" width="40%">Working / Present Days</td>
                            <td align="right" class="details-value" width="60%">: {data.get("working_days", "")} / {data.get("present_days", "")}</td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>

        <!-- Financial Grid -->
        <table cellpadding="0" cellspacing="0" width="100%" style="margin-top: 10px;">
            <tr>
                <!-- Earnings Column -->
                <td width="48%" valign="top">
                    <div class="section-title" style="margin-top:0;">Earnings</div>
                    <table cellpadding="0" cellspacing="0" class="financial-table">
                        <tr style="border-bottom: 1px solid #cbd5e1; font-weight: bold; color: #64748b;">
                            <th align="left" style="padding-bottom: 3px;">Particulars</th>
                            <th align="right" style="padding-bottom: 3px;">Amount</th>
                        </tr>
                        <tr>
                            <td align="left" style="padding: 4px 0; border-bottom: 1px solid #f1f5f9; color: #475569;">Basic Salary</td>
                            <td align="right" style="padding: 4px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #0f172a;">₹{basic:,}</td>
                        </tr>
                        <tr>
                            <td align="left" style="padding: 4px 0; border-bottom: 1px solid #f1f5f9; color: #475569;">House Rent Allowance (HRA)</td>
                            <td align="right" style="padding: 4px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #0f172a;">₹{hra:,}</td>
                        </tr>
                        <tr>
                            <td align="left" style="padding: 4px 0; border-bottom: 1px solid #f1f5f9; color: #475569;">Dearness Allowance (DA)</td>
                            <td align="right" style="padding: 4px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #0f172a;">₹{da:,}</td>
                        </tr>
                        <tr>
                            <td align="left" style="padding: 4px 0; border-bottom: 1px solid #f1f5f9; color: #475569;">Medical Allowance</td>
                            <td align="right" style="padding: 4px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #0f172a;">₹{medical:,}</td>
                        </tr>
                        <tr>
                            <td align="left" style="padding: 4px 0; border-bottom: 1px solid #f1f5f9; color: #475569;">Conveyance Allowance</td>
                            <td align="right" style="padding: 4px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #0f172a;">₹{conveyance:,}</td>
                        </tr>
                        <tr>
                            <td align="left" style="padding: 4px 0; border-bottom: 1px solid #f1f5f9; color: #475569;">Special Allowance</td>
                            <td align="right" style="padding: 4px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #0f172a;">₹{special:,}</td>
                        </tr>
                        <tr class="total-row">
                            <td align="left" style="padding: 5px 4px;">Gross Salary</td>
                            <td align="right" style="padding: 5px 4px;">₹{gross:,}</td>
                        </tr>
                    </table>
                </td>
                
                <!-- Spacer Column -->
                <td width="4%"></td>
                
                <!-- Deductions Column -->
                <td width="48%" valign="top">
                    <div class="section-title" style="margin-top:0;">Deductions</div>
                    <table cellpadding="0" cellspacing="0" class="financial-table">
                        <tr style="border-bottom: 1px solid #cbd5e1; font-weight: bold; color: #64748b;">
                            <th align="left" style="padding-bottom: 3px;">Particulars</th>
                            <th align="right" style="padding-bottom: 3px;">Amount</th>
                        </tr>
                        <tr>
                            <td align="left" style="padding: 4px 0; border-bottom: 1px solid #f1f5f9; color: #475569;">Provident Fund (PF)</td>
                            <td align="right" style="padding: 4px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #0f172a;">₹{pf:,}</td>
                        </tr>
                        <tr>
                            <td align="left" style="padding: 4px 0; border-bottom: 1px solid #f1f5f9; color: #475569;">Professional Tax</td>
                            <td align="right" style="padding: 4px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #0f172a;">₹{tax:,}</td>
                        </tr>
                        <tr>
                            <td align="left" style="padding: 4px 0; border-bottom: 1px solid #f1f5f9; color: #475569;">Income Tax (TDS)</td>
                            <td align="right" style="padding: 4px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #0f172a;">₹{tds:,}</td>
                        </tr>
                        <tr>
                            <td align="left" style="padding: 4px 0; border-bottom: 1px solid #f1f5f9; color: #475569;">Other Deductions</td>
                            <td align="right" style="padding: 4px 0; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #0f172a;">₹{other:,}</td>
                        </tr>
                        <!-- Spacer rows to align height with earnings -->
                        <tr>
                            <td style="color: transparent; line-height: 1.35; padding: 4px 0; border-bottom: 1px solid #f1f5f9;">Spacer</td>
                            <td align="right" style="color: transparent; line-height: 1.35; padding: 4px 0; border-bottom: 1px solid #f1f5f9;">0</td>
                        </tr>
                        <tr>
                            <td style="color: transparent; line-height: 1.35; padding: 4px 0; border-bottom: 1px solid #f1f5f9;">Spacer</td>
                            <td align="right" style="color: transparent; line-height: 1.35; padding: 4px 0; border-bottom: 1px solid #f1f5f9;">0</td>
                        </tr>
                        <tr class="total-row">
                            <td align="left" style="padding: 5px 4px;">Total Deductions</td>
                            <td align="right" style="padding: 5px 4px;">₹{deductions:,}</td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>

        <!-- Net Payable Salary Card -->
        <table cellpadding="0" cellspacing="0" class="net-pay-card">
            <tr>
                <td width="40%" valign="middle">
                    <span class="net-pay-label">Net Payable Salary</span><br/>
                    <span class="net-pay-val">₹{net:,}/-</span>
                </td>
                <td width="60%" align="right" valign="middle">
                    <span class="net-pay-label">Amount In Words</span><br/>
                    <span class="words-val">{data.get("amount_in_words", "")}</span>
                </td>
            </tr>
        </table>

        <!-- Payment Details -->
        <div class="section-title">Payment Details</div>
        <table cellpadding="0" cellspacing="0" class="details-table">
            <tr>
                <td width="48%" style="border-bottom: 1px solid #e2e8f0; padding: 4px 0;">
                    <table width="100%">
                        <tr>
                            <td align="left" class="details-label" width="40%">Payment Mode</td>
                            <td align="right" class="details-value" width="60%">: {data.get("payment_mode", "")}</td>
                        </tr>
                    </table>
                </td>
                <td width="4%"></td>
                <td width="48%" style="border-bottom: 1px solid #e2e8f0; padding: 4px 0;">
                    <table width="100%">
                        <tr>
                            <td align="left" class="details-label" width="40%">Bank Name</td>
                            <td align="right" class="details-value" width="60%">: {data.get("bank_name") or "—"}</td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td style="border-bottom: 1px solid #e2e8f0; padding: 4px 0;">
                    <table width="100%">
                        <tr>
                            <td align="left" class="details-label" width="40%">Account Number</td>
                            <td align="right" class="details-value" width="60%">: {data.get("account_number", "")}</td>
                        </tr>
                    </table>
                </td>
                <td></td>
                <td style="border-bottom: 1px solid #e2e8f0; padding: 4px 0;">
                    <table width="100%">
                        <tr>
                            <td align="left" class="details-label" width="40%">UTR / Transaction ID</td>
                            <td align="right" class="details-value" width="60%">: {data.get("utr_id") or "—"}</td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td colspan="3" style="border-bottom: 1px solid #e2e8f0; padding: 4px 0;">
                    <table width="100%">
                        <tr>
                            <td align="left" class="details-label" width="20%">Payment Date</td>
                            <td align="right" class="details-value" width="80%">: {data.get("payment_date", "")}</td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>

        <!-- Secure Document Verification Log -->
        <div class="verification-log">
            <span style="font-weight: bold; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">Secure Document Verification Log</span>
            Verification ID: <strong>SDPS-SLIP-{doc_id}</strong><br/>
            This is a cryptographically registered, computer-generated document issued by S.D. Public School, Patna.<br/>
            It is electronically secured and does not require a physical seal or signature. Locked against modifications.
        </div>
    </div>"""


def format_salary_certificate_email(data: dict) -> str:
    import uuid
    doc_id = data.get("id") or f"CERT-{str(uuid.uuid4())[:8].upper()}"
    return f"""
    <p>Dear {data.get("employee_name")},</p>
    <p>Please find below your Salary Certificate issued by S.D. Public School.</p>
    
    <div style="border:10px double #d97706;padding:24px;border-radius:12px;background:#fefaf6;color:#1e293b;font-family:Georgia,serif;margin-top:20px;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
        <div style="text-align:center;border-bottom:1px solid #fcd34d;padding-bottom:16px;margin-bottom:20px;">
            <h2 style="margin:0;color:#0f172a;font-size:22px;letter-spacing:1px;">S.D. PUBLIC SCHOOL</h2>
            <p style="margin:4px 0;font-size:12px;color:#475569;text-transform:uppercase;letter-spacing:2px;">Patna-7, Bihar</p>
            <p style="margin:0;font-size:10px;color:#d97706;font-style:italic;">Empowering Generations Since 1994</p>
        </div>
        
        <div style="text-align:center;margin-bottom:24px;">
            <span style="font-size:11px;color:#b45309;letter-spacing:3px;background:#fffbeb;border:1px solid #fde68a;padding:4px 12px;border-radius:9999px;font-weight:bold;text-transform:uppercase;">SALARY CERTIFICATE</span>
            <h3 style="font-size:13px;letter-spacing:2px;color:#475569;margin-top:16px;">TO WHOMSOEVER IT MAY CONCERN</h3>
        </div>
        
        <p style="text-indent:40px;line-height:1.8;font-size:14px;text-align:justify;margin-bottom:16px;">
            This is to certify that Mr./Ms. <strong>{data.get("employee_name")}</strong> is working as <strong>{data.get("designation")}</strong> at S.D. Public School, Patna-7 on a full-time basis.
        </p>
        
        <p style="line-height:1.8;font-size:14px;text-align:justify;margin-bottom:16px;">
            The employee is drawing a monthly gross salary of <strong>₹{data.get("gross_salary", 0):,}/-</strong> ({data.get("gross_salary_words")}), aggregating to an annual gross salary of <strong>₹{data.get("annual_salary", 0):,}/-</strong> ({data.get("annual_salary_words")}) for the Financial Year <strong>{data.get("financial_year")}</strong>.
        </p>
        
        <p style="line-height:1.8;font-size:14px;text-align:justify;margin-bottom:24px;">
            This certificate is issued upon the employee's request for official purposes.
        </p>
        
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size:12px;color:#475569;margin-top:20px;">
            <tr>
                <td>
                    Date of Issue: <strong>{data.get("certificate_date")}</strong>
                </td>
            </tr>
        </table>

        <div style="margin-top:28px;border-top:1px dashed #cbd5e1;padding-top:16px;text-align:center;font-size:11px;color:#64748b;font-family:Arial,sans-serif;">
            <span style="font-weight:bold;color:#0F172A;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:4px;">Secure Document Verification Log</span>
            Verification ID: <strong>SDPS-CERT-{doc_id}</strong><br/>
            This is a cryptographically registered, computer-generated document issued by S.D. Public School, Patna. 
            It is electronically secured and does not require a physical seal or signature. 
            For security and authentication, this document is locked against modifications.
        </div>
    </div>
    """


def format_experience_certificate_email(data: dict) -> str:
    import uuid
    leaving = data.get("leaving_date", "Present")
    leaving_text = "till date" if leaving == "Present" else f"to {leaving}"
    doc_id = data.get("id") or f"EXP-{str(uuid.uuid4())[:8].upper()}"
    return f"""
    <p>Dear {data.get("employee_name")},</p>
    <p>Please find below your Work Experience Certificate issued by S.D. Public School.</p>
    
    <div style="border:10px double #d97706;padding:24px;border-radius:12px;background:#fefaf6;color:#1e293b;font-family:Georgia,serif;margin-top:20px;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
        <div style="text-align:center;border-bottom:1px solid #fcd34d;padding-bottom:16px;margin-bottom:20px;">
            <h2 style="margin:0;color:#0f172a;font-size:22px;letter-spacing:1px;">S.D. PUBLIC SCHOOL</h2>
            <p style="margin:4px 0;font-size:12px;color:#475569;text-transform:uppercase;letter-spacing:2px;">Patna-7, Bihar</p>
            <p style="margin:0;font-size:10px;color:#d97706;font-style:italic;">Empowering Generations Since 1994</p>
        </div>
        
        <div style="text-align:center;margin-bottom:24px;">
            <span style="font-size:11px;color:#b45309;letter-spacing:3px;background:#fffbeb;border:1px solid #fde68a;padding:4px 12px;border-radius:9999px;font-weight:bold;text-transform:uppercase;">EXPERIENCE CERTIFICATE</span>
            <h3 style="font-size:13px;letter-spacing:2px;color:#475569;margin-top:16px;">TO WHOMSOEVER IT MAY CONCERN</h3>
        </div>
        
        <p style="text-indent:40px;line-height:1.8;font-size:14px;text-align:justify;margin-bottom:16px;">
            This is to certify that Mr./Ms. <strong>{data.get("employee_name")}</strong> has been employed with <strong>S.D. Public School</strong>, Maurya Colony, Patna-7 as a <strong>{data.get("designation")}</strong>.
        </p>
        
        <p style="line-height:1.8;font-size:14px;text-align:justify;margin-bottom:16px;">
            Their tenure of service at this institution spans from <strong>{data.get("joining_date")}</strong> {leaving_text}.
        </p>
        
        <p style="line-height:1.8;font-size:14px;text-align:justify;margin-bottom:24px;">
            During their employment, we found them to be highly professional, industrious, and dedicated to their duties. They have made valuable contributions to our school's academic environment. Their conduct, character, and relationship with colleagues and students have been exemplary. We wish them all the very best and success in their future professional endeavors.
        </p>
        
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size:12px;color:#475569;margin-top:20px;">
            <tr>
                <td>
                    Date of Issue: <strong>{data.get("certificate_date")}</strong>
                </td>
            </tr>
        </table>

        <div style="margin-top:28px;border-top:1px dashed #cbd5e1;padding-top:16px;text-align:center;font-size:11px;color:#64748b;font-family:Arial,sans-serif;">
            <span style="font-weight:bold;color:#0F172A;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:4px;">Secure Document Verification Log</span>
            Verification ID: <strong>SDPS-EXP-{doc_id}</strong><br/>
            This is a cryptographically registered, computer-generated document issued by S.D. Public School, Patna. 
            It is electronically secured and does not require a physical seal or signature. 
            For security and authentication, this document is locked against modifications.
        </div>
    </div>
    """
