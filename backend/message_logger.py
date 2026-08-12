"""
Message Logger for Email and WhatsApp transmissions.
Logs all outgoing transactional and bulk emails/WhatsApp messages to MongoDB.
"""
import uuid
import logging

db = None

def init_db(database):
    global db
    db = database

async def log_message(
    channel: str,
    recipient: str,
    subject: str,
    message_content: str,
    status: str,
    provider: str = "",
    error_details: str = "",
    metadata: dict = None,
    recipient_name: str = ""
) -> dict:
    """Log an email or WhatsApp transmission record to MongoDB message_logs."""
    import datetime
    doc = {
        "id": f"MSG-{uuid.uuid4().hex[:12].upper()}",
        "channel": channel.lower(),           # "email" | "whatsapp"
        "recipient": recipient or "",
        "recipient_name": recipient_name or "",
        "subject": subject or "",
        "message_content": message_content or "",
        "status": status.lower(),             # "sent" | "failed" | "mocked"
        "provider": provider or "",
        "error_details": str(error_details or ""),
        "metadata": metadata or {},
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    
    if db is not None:
        try:
            await db.message_logs.insert_one(doc.copy())
            logging.info(f"[{channel.upper()} LOG] Recorded {status} message to {recipient}")
        except Exception as e:
            logging.error(f"Failed to record message log to DB: {e}")
            
    return doc
