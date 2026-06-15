"""Image compression utilities (server-side, any aspect ratio)."""
import io
import os
import uuid
from pathlib import Path
from PIL import Image
from dotenv import load_dotenv
import cloudinary
import cloudinary.uploader

# Load environment variables (useful for direct module execution / tests)
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")

CLOUDINARY_ENABLED = bool(CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET)

if CLOUDINARY_ENABLED:
    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME,
        api_key=CLOUDINARY_API_KEY,
        api_secret=CLOUDINARY_API_SECRET,
        secure=True
    )

UPLOAD_ROOT = Path(__file__).parent / "uploads"
UPLOAD_ROOT.mkdir(exist_ok=True)

# Allow-list of file extensions accepted for raw (non-image-compressed) uploads.
# Everything served from /api/uploads is also forced to download (Content-Disposition
# attachment) so even an allowed type cannot execute as active content in the browser.
ALLOWED_RAW_EXTENSIONS = {
    ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp",
    ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt",
}
# Extensions that must never be stored/served (active content / scripts).
# Explicitly blocked even if other logic accepts them.
BLOCKED_EXTENSIONS = {
    ".html", ".htm", ".svg", ".xml", ".js", ".mjs", ".php", ".phtml",
    ".jsp", ".asp", ".aspx", ".sh", ".bat", ".exe", ".py", ".rb", ".pl",
}


class UnsafeUploadError(ValueError):
    """Raised when an uploaded file fails validation."""


def _file_ext(filename: str) -> str:
    return os.path.splitext(filename or "")[1].lower()


def validate_raw_upload(filename: str) -> str:
    """Validate an uploaded filename against the allow/block lists.

    Returns the lowercased extension. Raises UnsafeUploadError if not allowed.
    """
    ext = _file_ext(filename)
    if not ext:
        raise UnsafeUploadError("File must have an extension")
    if ext in BLOCKED_EXTENSIONS:
        raise UnsafeUploadError(f"File type '{ext}' is not allowed")
    if ext not in ALLOWED_RAW_EXTENSIONS:
        raise UnsafeUploadError(
            f"File type '{ext}' is not allowed. "
            f"Allowed: {', '.join(sorted(ALLOWED_RAW_EXTENSIONS))}"
        )
    return ext


def compress_and_save(file_bytes: bytes, sub_dir: str = "gallery", max_dimension: int = 1600,
                      quality: int = 78, target_format: str = "JPEG") -> dict:
    """Compress image, preserve aspect ratio, save to uploads/<sub_dir>/ or upload to Cloudinary.
    Returns {filename, url, size_kb, width, height}.
    """
    img = Image.open(io.BytesIO(file_bytes))
    if img.mode in ("RGBA", "P", "LA"):
        bg = Image.new("RGB", img.size, (255, 255, 255))
        try:
            bg.paste(img, mask=img.split()[-1] if img.mode != "P" else None)
        except Exception:
            bg.paste(img.convert("RGBA"), mask=None)
        img = bg
    elif img.mode != "RGB":
        img = img.convert("RGB")

    w, h = img.size
    if max(w, h) > max_dimension:
        if w >= h:
            nw = max_dimension
            nh = int(h * (max_dimension / w))
        else:
            nh = max_dimension
            nw = int(w * (max_dimension / h))
        img = img.resize((nw, nh), Image.LANCZOS)

    if CLOUDINARY_ENABLED:
        buffer = io.BytesIO()
        img.save(buffer, format=target_format, quality=quality, optimize=True, progressive=True)
        buffer.seek(0)
        
        upload_result = cloudinary.uploader.upload(
            buffer,
            folder=f"sdps/{sub_dir}",
            resource_type="image"
        )
        url = upload_result["secure_url"]
        size_kb = round(upload_result.get("bytes", 0) / 1024, 2)
        return {
            "filename": upload_result.get("public_id"),
            "url": url,
            "size_kb": size_kb,
            "width": img.size[0],
            "height": img.size[1],
        }

    target_dir = UPLOAD_ROOT / sub_dir
    target_dir.mkdir(parents=True, exist_ok=True)
    ext = "jpg" if target_format.upper() == "JPEG" else target_format.lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = target_dir / filename

    img.save(filepath, format=target_format, quality=quality, optimize=True, progressive=True)
    size_kb = round(os.path.getsize(filepath) / 1024, 2)
    return {
        "filename": filename,
        "url": f"/api/uploads/{sub_dir}/{filename}",
        "size_kb": size_kb,
        "width": img.size[0],
        "height": img.size[1],
    }


def save_raw_file(file_bytes: bytes, sub_dir: str, filename: str) -> dict:
    # Validate against allow/block lists before writing anything.
    ext = validate_raw_upload(filename)
    
    if CLOUDINARY_ENABLED:
        # Sanitize filename stem for public_id prefix
        stem = os.path.splitext(os.path.basename(filename))[0]
        safe_stem = "".join(c for c in stem if c.isalnum() or c in ("-", "_"))[:50] or "file"
        public_id = f"{uuid.uuid4().hex}_{safe_stem}"
        
        upload_result = cloudinary.uploader.upload(
            io.BytesIO(file_bytes),
            folder=f"sdps/{sub_dir}",
            resource_type="raw",
            public_id=public_id
        )
        url = upload_result["secure_url"]
        size_kb = round(upload_result.get("bytes", 0) / 1024, 2)
        return {
            "filename": upload_result.get("public_id"),
            "url": url,
            "size_kb": size_kb,
        }

    target_dir = UPLOAD_ROOT / sub_dir
    target_dir.mkdir(parents=True, exist_ok=True)
    # Build a safe stored name: random prefix + sanitized original stem + validated ext.
    stem = os.path.splitext(os.path.basename(filename))[0]
    safe_stem = "".join(c for c in stem if c.isalnum() or c in ("-", "_"))[:60] or "file"
    safe_name = f"{uuid.uuid4().hex}_{safe_stem}{ext}"
    filepath = target_dir / safe_name
    with open(filepath, "wb") as f:
        f.write(file_bytes)
    return {
        "filename": safe_name,
        "url": f"/api/uploads/{sub_dir}/{safe_name}",
        "size_kb": round(os.path.getsize(filepath) / 1024, 2),
    }

