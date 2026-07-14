"""
PDF Service — Generate protected PDFs from HTML content.
Uses xhtml2pdf for HTML→PDF conversion and pikepdf for AES-256 encryption.
"""
import os
import io
import logging
from xhtml2pdf import pisa
import pikepdf

import secrets
logger = logging.getLogger(__name__)

PDF_OWNER_PASSWORD = os.environ.get("PDF_OWNER_PASSWORD") or secrets.token_hex(16)

LOGO_URL = "https://sdpublic.org/assets/img/logo.png"


def html_to_pdf(html_content: str) -> bytes:
    """Convert HTML string to PDF bytes using xhtml2pdf."""
    buffer = io.BytesIO()
    status = pisa.CreatePDF(io.StringIO(html_content), dest=buffer)
    if status.err:
        logger.error(f"xhtml2pdf conversion error: {status.err}")
        raise RuntimeError(f"PDF generation failed: {status.err}")
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes


def protect_pdf(pdf_bytes: bytes) -> bytes:
    """
    Apply owner-password encryption to PDF with edit restrictions.
    - Can open without password
    - Can print (high + low resolution)
    - Cannot edit, copy, modify, or fill forms
    - Uses AES-256 encryption (strongest available)
    """
    inp = io.BytesIO(pdf_bytes)
    out = io.BytesIO()
    with pikepdf.open(inp) as pdf:
        permissions = pikepdf.Permissions(
            accessibility=True,
            extract=False,
            modify_annotation=False,
            modify_assembly=False,
            modify_form=False,
            modify_other=False,
            print_lowres=True,
            print_highres=True,
        )
        pdf.save(
            out,
            encryption=pikepdf.Encryption(
                user="",
                owner=PDF_OWNER_PASSWORD,
                allow=permissions,
                aes=True,
                R=6,
            ),
        )
    return out.getvalue()


def generate_protected_pdf(html_content: str) -> bytes:
    """Full pipeline: HTML → PDF → AES-256 encrypted with edit restrictions."""
    raw_pdf = html_to_pdf(html_content)
    protected = protect_pdf(raw_pdf)
    logger.info(f"Generated protected PDF: {len(protected)} bytes")
    return protected


def wrap_for_pdf(title: str, body_html: str) -> str:
    """
    Wrap document body HTML in an A4-sized PDF template with school header and footer.
    This is separate from the email template — optimized for print/PDF rendering.
    """
    if "Salary Slip" in title:
        return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
    @page {{
        size: A4;
        margin: 12mm 12mm 12mm 12mm;
    }}
    body {{
        font-family: Arial, Helvetica, sans-serif;
        color: #1e293b;
        margin: 0;
        padding: 0;
    }}
</style>
</head>
<body>
    {body_html}
</body>
</html>"""

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
    @page {{
        size: A4;
        margin: 20mm 15mm 20mm 15mm;
    }}
    body {{
        font-family: Arial, Helvetica, sans-serif;
        color: #1e293b;
        font-size: 13px;
        line-height: 1.6;
        margin: 0;
        padding: 0;
    }}
    .header {{
        text-align: center;
        border-bottom: 2px solid #0E3B91;
        padding-bottom: 12px;
        margin-bottom: 20px;
    }}
    .header img {{
        height: 60px;
        margin-bottom: 4px;
    }}
    .header h1 {{
        margin: 0;
        font-size: 22px;
        color: #0E3B91;
        letter-spacing: 2px;
    }}
    .header .subtitle {{
        margin: 2px 0 0;
        font-size: 11px;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 2px;
    }}
    .header .tagline {{
        margin: 0;
        font-size: 10px;
        color: #d97706;
        font-style: italic;
    }}
    table {{
        width: 100%;
        border-collapse: collapse;
    }}
    td, th {{
        padding: 6px 8px;
        font-size: 13px;
    }}
    .footer {{
        margin-top: 30px;
        border-top: 1px dashed #cbd5e1;
        padding-top: 12px;
        text-align: center;
        font-size: 10px;
        color: #64748b;
    }}
</style>
</head>
<body>
    <div class="header">
        <img src="{LOGO_URL}" alt="SDPS Logo">
        <h1>S.D. PUBLIC SCHOOL</h1>
        <p class="subtitle">Maurya Colony, Gulzarbagh Road, Patna - 800007, Bihar</p>
        <p class="tagline">Empowering Generations Since 1994</p>
    </div>

    {body_html}

    <div class="footer">
        S.D. Public School, Maurya Colony, Gulzarbagh Road, Patna - 800007, Bihar<br>
        This is a computer-generated document and is electronically secured.
    </div>
</body>
</html>"""
