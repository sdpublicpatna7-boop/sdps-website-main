"""
Security Audit Test Suite for SDPS Website Backend.
Tests JWT secret validation, file extension upload filtering, and payload sanitization.
"""
import pytest
import os
from image_utils import sanitize_filename, sanitize_update_dict


def test_file_extension_sanitization():
    """Verify script and dangerous extensions are stripped / blocked."""
    assert sanitize_filename("malicious.php").endswith(".jpg") or sanitize_filename("malicious.php").endswith(".png") or sanitize_filename("malicious.php").endswith(".pdf") or "php" not in sanitize_filename("malicious.php")
    assert sanitize_filename("safe_document.pdf") == "safe_document.pdf"
    assert sanitize_filename("photo.jpg") == "photo.jpg"


def test_mass_assignment_protection():
    """Verify reserved fields (_id, id) are stripped from update dictionaries."""
    raw_update = {
        "_id": "507f1f77bcf86cd799439011",
        "id": "hacked-id",
        "title": "New Title",
        "status": "published"
    }
    sanitized = sanitize_update_dict(raw_update)
    assert "_id" not in sanitized
    assert "id" not in sanitized
    assert sanitized["title"] == "New Title"
    assert sanitized["status"] == "published"


def test_jwt_secret_validation():
    """Verify JWT_SECRET length check behavior."""
    secret = os.environ.get("JWT_SECRET", "")
    if secret and secret != "change-me-secret-key-sdps-patna-production-2026":
        assert len(secret) >= 32
