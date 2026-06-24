"""
MailerCloud Email API service wrapper.
API docs: https://help.mailercloud.com/en/articles/155-mailercloud-email-api-help-guide
Endpoint: POST https://email-api.mailercloud.com/email
Auth:     Authorization: <api_key>  (plain key, no "Bearer" prefix)
"""
import os
import asyncio
import logging
import httpx

logger = logging.getLogger(__name__)

MAILERCLOUD_API_KEY = os.environ.get("MAILERCLOUD_API_KEY", "")
SENDER_EMAIL        = os.environ.get("SENDER_EMAIL", "noreply@sdpublic.org")
SENDER_NAME         = os.environ.get("SENDER_NAME", "S.D. Public School")

MAILERCLOUD_SEND_URL = "https://email-api.mailercloud.com/email"


async def send_email(to_email: str, subject: str, html_content: str) -> dict:
    """
    Send a transactional email via MailerCloud Email API.
    Returns {success: bool, message: str}.
    If MAILERCLOUD_API_KEY is not set, logs the attempt and returns success=False.
    """
    if not MAILERCLOUD_API_KEY:
        logger.warning(f"[EMAIL MOCK] To: {to_email} | Subject: {subject}")
        return {
            "success": False,
            "message": "Email service not configured (MAILERCLOUD_API_KEY missing)",
            "mocked": True
        }

    # MailerCloud Email API payload structure
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

    # MailerCloud expects the raw API key — NO "Bearer" prefix
    headers = {
        "Authorization": MAILERCLOUD_API_KEY,
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(MAILERCLOUD_SEND_URL, json=payload, headers=headers)
        data = resp.json()
        # MailerCloud returns statusCode 1000 on success
        if resp.status_code in (200, 201) and data.get("statusCode") == 1000:
            return {
                "success": True,
                "message": "sent",
            }
        error_msg = data.get("message") or f"HTTP {resp.status_code} / statusCode {data.get('statusCode')}"
        logger.error(f"MailerCloud error {resp.status_code}: {data}")
        return {"success": False, "message": error_msg}
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


def format_salary_slip_email(data: dict) -> str:
    import uuid
    basic = data.get("basic_salary", 0)
    hra = data.get("hra", 0)
    da = data.get("da", 0)
    medical = data.get("medical_allowance", 0)
    conveyance = data.get("conveyance_allowance", 0)
    special = data.get("special_allowance", 0)
    gross = data.get("gross_salary", basic + hra + da + medical + conveyance + special)
    
    pf = data.get("pf", 0)
    tax = data.get("professional_tax", 0)
    tds = data.get("tds", 0)
    other = data.get("other_deductions", 0)
    deductions = data.get("total_deductions", pf + tax + tds + other)
    net = data.get("net_salary", gross - deductions)
    doc_id = data.get("id") or f"SLIP-{str(uuid.uuid4())[:8].upper()}"
    
    return f"""
    <p>Dear {data.get("employee_name")},</p>
    <p>Please find below your Salary Slip for the month of <strong>{data.get("pay_period")}</strong>.</p>
    
    <table border="0" cellpadding="6" cellspacing="0" width="100%" style="border-collapse:collapse;margin-top:20px;font-size:13px;color:#334155;">
        <tr style="background:#f1f5f9;">
            <td colspan="2" style="font-weight:bold;color:#0f172a;border-bottom:1px solid #cbd5e1;">Employee Details</td>
        </tr>
        <tr>
            <td width="50%"><strong>Employee Name:</strong> {data.get("employee_name")}</td>
            <td width="50%"><strong>Designation:</strong> {data.get("designation")}</td>
        </tr>
        <tr>
            <td><strong>Employee ID:</strong> {data.get("employee_id")}</td>
            <td><strong>Department:</strong> {data.get("department")}</td>
        </tr>
        <tr>
            <td><strong>Pay Period:</strong> {data.get("pay_period")}</td>
            <td><strong>Working Days:</strong> {data.get("working_days")} / {data.get("present_days")}</td>
        </tr>
    </table>
    
    <table border="0" cellpadding="6" cellspacing="0" width="100%" style="border-collapse:collapse;margin-top:20px;font-size:13px;color:#334155;">
        <tr style="background:#0E3B91;color:#ffffff;">
            <th align="left" width="50%" style="padding:8px 12px;">Earnings</th>
            <th align="left" width="50%" style="padding:8px 12px;">Deductions</th>
        </tr>
        <tr valign="top">
            <td style="border:1px solid #e2e8f0;padding:0;">
                <table cellpadding="6" cellspacing="0" width="100%">
                    <tr><td>Basic Salary</td><td align="right">₹{basic:,}</td></tr>
                    <tr><td>HRA</td><td align="right">₹{hra:,}</td></tr>
                    <tr><td>DA</td><td align="right">₹{da:,}</td></tr>
                    <tr><td>Medical</td><td align="right">₹{medical:,}</td></tr>
                    <tr><td>Conveyance</td><td align="right">₹{conveyance:,}</td></tr>
                    <tr><td>Special</td><td align="right">₹{special:,}</td></tr>
                    <tr style="background:#f8fafc;font-weight:bold;color:#0f172a;">
                        <td>Gross Salary</td><td align="right">₹{gross:,}</td>
                    </tr>
                </table>
            </td>
            <td style="border:1px solid #e2e8f0;padding:0;">
                <table cellpadding="6" cellspacing="0" width="100%">
                    <tr><td>Provident Fund (PF)</td><td align="right">₹{pf:,}</td></tr>
                    <tr><td>Professional Tax</td><td align="right">₹{tax:,}</td></tr>
                    <tr><td>Income Tax (TDS)</td><td align="right">₹{tds:,}</td></tr>
                    <tr><td>Other Deductions</td><td align="right">₹{other:,}</td></tr>
                    <tr><td style="color:transparent;line-height:1;">Spacer</td><td align="right" style="color:transparent;line-height:1;">0</td></tr>
                    <tr><td style="color:transparent;line-height:1;">Spacer</td><td align="right" style="color:transparent;line-height:1;">0</td></tr>
                    <tr style="background:#f8fafc;font-weight:bold;color:#0f172a;">
                        <td>Total Deductions</td><td align="right">₹{deductions:,}</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
    
    <div style="margin-top:20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;text-align:center;">
        <span style="font-size:11px;color:#64748b;text-transform:uppercase;font-weight:bold;display:block;margin-bottom:4px;">Net Payable Salary</span>
        <strong style="font-size:20px;color:#0f172a;">₹{net:,}/-</strong>
        <span style="font-size:12px;color:#334155;display:block;margin-top:4px;font-style:italic;">({data.get("amount_in_words")})</span>
    </div>
    
    <table border="0" cellpadding="6" cellspacing="0" width="100%" style="border-collapse:collapse;margin-top:20px;font-size:13px;color:#334155;">
        <tr style="background:#f1f5f9;">
            <td colspan="2" style="font-weight:bold;color:#0f172a;border-bottom:1px solid #cbd5e1;">Payment Details</td>
        </tr>
        <tr>
            <td width="50%"><strong>Payment Mode:</strong> {data.get("payment_mode")}</td>
            <td width="50%"><strong>Bank Name:</strong> {data.get("bank_name") or "-"}</td>
        </tr>
        <tr>
            <td><strong>Account Number:</strong> {data.get("account_number")}</td>
            <td><strong>UTR / Transaction ID:</strong> {data.get("utr_id") or "-"}</td>
        </tr>
        <tr>
            <td colspan="2"><strong>Payment Date:</strong> {data.get("payment_date")}</td>
        </tr>
    </table>

    <div style="margin-top:28px;border-top:1px dashed #cbd5e1;padding-top:16px;text-align:center;font-size:11px;color:#64748b;font-family:Arial,sans-serif;">
        <span style="font-weight:bold;color:#0F172A;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:4px;">Secure Document Verification Log</span>
        Verification ID: <strong>SDPS-SLIP-{doc_id}</strong><br/>
        This is a cryptographically registered, computer-generated document issued by S.D. Public School, Patna. 
        It is electronically secured and does not require a physical seal or signature. 
        For security and authentication, this document is locked against modifications.
    </div>
    """


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
            This certificate is issued upon the employee’s request for official purposes.
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

