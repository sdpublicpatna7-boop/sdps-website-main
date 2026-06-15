"""Backend pytest suite for S.D. Public School redesign.
Covers public endpoints, admin auth, admin CRUD, singletons, TC flow,
image upload, integration keys, mocked services, and Razorpay 503.
"""
import io
import os
import time
import uuid
import pytest
import requests
from PIL import Image

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # Read from frontend .env as fallback
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL"):
                    BASE_URL = line.split("=", 1)[1].strip().strip('"')
                    break
    except FileNotFoundError:
        pass

BASE_URL = (BASE_URL or "").rstrip("/")
ADMIN_EMAIL = "admin@sdpublic.org"
ADMIN_PASSWORD = "admin@sdps"


# ============== Fixtures ==============
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(session):
    r = session.post(f"{BASE_URL}/api/admin/login",
                     json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "access_token" in data
    return data["access_token"]


@pytest.fixture(scope="session")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ============== Public Endpoints ==============
PUBLIC_GET_ENDPOINTS = [
    "/api/site-settings",
    "/api/popup",
    "/api/news",
    "/api/notices",
    "/api/gallery",
    "/api/videos",
    "/api/calendar",
    "/api/holidays",
    "/api/council/profiles",
    "/api/council/posters",
    "/api/council/results",
    "/api/admission/enquiry-questions",
    "/api/admission/form-fields",
    "/api/career/posts",
    "/api/career/questions",
    "/api/alumni/settings",
    "/api/alumni/questions",
    "/api/alumni/meets",
]


@pytest.mark.parametrize("ep", PUBLIC_GET_ENDPOINTS)
def test_public_get_endpoints(session, ep):
    r = session.get(f"{BASE_URL}{ep}")
    assert r.status_code == 200, f"{ep} -> {r.status_code} {r.text[:200]}"
    data = r.json()
    assert isinstance(data, (list, dict))


def test_public_admission_enquiry_mocked(session):
    payload = {
        "parent_name": "TEST_Parent",
        "student_name": "TEST_Student",
        "contact_phone": "9999999999",
        "email": "test_parent@example.com",
        "student_class": "5",
        "answers": {"prev_school": "ABC"}
    }
    r = session.post(f"{BASE_URL}/api/admission/enquiry", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "id" in data
    # Email and SMS services should return mocked status when keys empty
    assert "email" in data
    assert "sms" in data


def test_public_contact(session):
    payload = {"name": "TEST_Contact", "email": "tc@example.com",
               "phone": "9000000000", "subject": "Test", "message": "Hello"}
    r = session.post(f"{BASE_URL}/api/contact", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("status") == "received"
    assert "id" in data


def test_public_tc_download_not_found(session):
    payload = {"student_name": "NOPERSON", "dob": "2000-01-01", "admission_number": "ZZZZZ"}
    r = session.post(f"{BASE_URL}/api/tc/download", json=payload)
    assert r.status_code == 404
    assert "detail" in r.json()


def test_fees_create_order_503(session):
    payload = {
        "student_name": "TEST_Stu", "admission_number": "A1", "student_class": "5",
        "fee_type": "tuition", "amount": 100, "contact": "9999999999",
        "email": "t@example.com"
    }
    r = session.post(f"{BASE_URL}/api/fees/create-order", json=payload)
    assert r.status_code == 503
    assert "configured" in r.json().get("detail", "").lower()


# ============== Admin Auth ==============
def test_admin_login_success(session):
    r = session.post(f"{BASE_URL}/api/admin/login",
                     json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert data["user"]["email"] == ADMIN_EMAIL


def test_admin_login_wrong_password(session):
    r = session.post(f"{BASE_URL}/api/admin/login",
                     json={"email": ADMIN_EMAIL, "password": "wrongpass"})
    assert r.status_code == 401


def test_admin_me_valid(auth_headers):
    r = requests.get(f"{BASE_URL}/api/admin/me", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["email"] == ADMIN_EMAIL


def test_admin_me_no_token():
    r = requests.get(f"{BASE_URL}/api/admin/me")
    assert r.status_code in (401, 403)


def test_admin_forgot_password(session):
    r = session.post(f"{BASE_URL}/api/admin/forgot-password",
                     json={"email": ADMIN_EMAIL})
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


# ============== Admin Stats & Singletons ==============
def test_admin_stats(auth_headers):
    r = requests.get(f"{BASE_URL}/api/admin/stats", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    for key in ["news", "notices", "gallery", "videos", "enquiries"]:
        assert key in data
        assert isinstance(data[key], int)


@pytest.mark.parametrize("ep", ["popup-settings", "site-settings", "alumni-settings"])
def test_admin_singletons_get(auth_headers, ep):
    r = requests.get(f"{BASE_URL}/api/admin/{ep}", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), dict)


def test_admin_site_settings_update_persists(auth_headers):
    r = requests.get(f"{BASE_URL}/api/admin/site-settings", headers=auth_headers)
    assert r.status_code == 200
    cur = r.json()
    new_tag = f"TEST_TAG_{uuid.uuid4().hex[:6]}"
    payload = {**cur, "tagline": new_tag}
    r2 = requests.put(f"{BASE_URL}/api/admin/site-settings",
                      headers=auth_headers, json=payload)
    assert r2.status_code == 200
    assert r2.json()["tagline"] == new_tag
    # Verify via public endpoint
    r3 = requests.get(f"{BASE_URL}/api/site-settings")
    assert r3.json()["tagline"] == new_tag


def test_admin_popup_update_persists(auth_headers):
    r = requests.get(f"{BASE_URL}/api/admin/popup-settings", headers=auth_headers)
    cur = r.json()
    new_title = f"TEST_POPUP_{uuid.uuid4().hex[:6]}"
    cur["title"] = new_title
    r2 = requests.put(f"{BASE_URL}/api/admin/popup-settings",
                      headers=auth_headers, json=cur)
    assert r2.status_code == 200
    assert r2.json()["title"] == new_title
    r3 = requests.get(f"{BASE_URL}/api/popup")
    assert r3.json()["title"] == new_title


# ============== Admin CRUD - parametrized ==============
CRUD_CASES = [
    ("news", {"title": "TEST_News", "content": "body", "date": "2026-01-01"}),
    ("notices", {"title": "TEST_Notice", "description": "desc", "date": "2026-01-01"}),
    ("gallery", {"title": "TEST_Gal", "url": "https://example.com/i.jpg", "category": "events"}),
    ("videos", {"title": "TEST_Vid", "url": "https://youtu.be/abc", "platform": "youtube"}),
    ("calendar", {"name": "TEST_Cal", "date": "2026-01-15", "type": "event"}),
    ("holidays", {"name": "TEST_Holiday", "date": "2026-08-15"}),
    ("council-members", {"name": "TEST_Cap", "position": "Captain", "year": "2026"}),
    ("election-posters", {"candidate_name": "TEST_Cand", "position": "Captain",
                          "poster_url": "https://example.com/p.jpg", "year": "2026"}),
    ("council-results", {"year": "2026", "position": "Captain", "winner": "TEST_Win"}),
    ("career-posts", {"title": "TEST_Job", "description": "desc"}),
    ("career-questions", {"label": "TEST_Q", "type": "text"}),
    ("enquiry-questions", {"label": "TEST_EQ", "type": "text"}),
    ("admission-fields", {"label": "TEST_AF", "type": "text"}),
    ("alumni-questions", {"label": "TEST_AQ", "type": "text"}),
    ("alumni-meets", {"title": "TEST_Meet", "date": "2026-12-25"}),
]


@pytest.mark.parametrize("path,payload", CRUD_CASES)
def test_admin_crud_lifecycle(auth_headers, path, payload):
    base = f"{BASE_URL}/api/admin/{path}"
    # CREATE
    cr = requests.post(base, headers=auth_headers, json=payload)
    assert cr.status_code == 200, f"CREATE {path} failed: {cr.status_code} {cr.text[:300]}"
    created = cr.json()
    assert "id" in created
    item_id = created["id"]
    # LIST
    lr = requests.get(base, headers=auth_headers)
    assert lr.status_code == 200
    assert any(x.get("id") == item_id for x in lr.json())
    # GET single
    gr = requests.get(f"{base}/{item_id}", headers=auth_headers)
    assert gr.status_code == 200
    assert gr.json()["id"] == item_id
    # UPDATE - use a string field present in payload
    update_field = next((k for k, v in payload.items() if isinstance(v, str)), None)
    if update_field:
        new_val = f"TEST_UPDATED_{uuid.uuid4().hex[:6]}"
        ur = requests.put(f"{base}/{item_id}", headers=auth_headers,
                          json={update_field: new_val})
        assert ur.status_code == 200
        # Verify persisted
        gr2 = requests.get(f"{base}/{item_id}", headers=auth_headers)
        assert gr2.json().get(update_field) == new_val
    # DELETE
    dr = requests.delete(f"{base}/{item_id}", headers=auth_headers)
    assert dr.status_code == 200
    assert dr.json().get("deleted", 0) >= 1
    # Verify gone
    gr3 = requests.get(f"{base}/{item_id}", headers=auth_headers)
    assert gr3.status_code == 404


# ============== Image Upload (compression) ==============
def _make_png(size=(800, 600), color=(180, 60, 30)):
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf


def test_admin_upload_image_png(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    files = {"file": ("test.png", _make_png(), "image/png")}
    data = {"sub_dir": "gallery"}
    r = requests.post(f"{BASE_URL}/api/admin/upload-image",
                      headers=headers, files=files, data=data)
    assert r.status_code == 200, r.text
    res = r.json()
    assert "url" in res
    assert "size_kb" in res or "size" in res


# ============== TC Records flow ==============
def test_tc_create_and_public_download(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    # Create TC via multipart
    tc_content = b"%PDF-1.4 fake tc file content"
    files = {"file": ("tc.pdf", tc_content, "application/pdf")}
    sname = f"TEST_TCStudent_{uuid.uuid4().hex[:6]}"
    data = {
        "student_name": sname,
        "dob": "2010-05-20",
        "admission_number": f"ADM{uuid.uuid4().hex[:6].upper()}",
        "notes": "Test TC",
    }
    r = requests.post(f"{BASE_URL}/api/admin/tc-records",
                      headers=headers, files=files, data=data)
    assert r.status_code == 200, r.text
    rec = r.json()
    assert rec["student_name"] == sname
    assert "tc_file_url" in rec

    # Public TC download with matching details
    r2 = requests.post(f"{BASE_URL}/api/tc/download", json={
        "student_name": sname,
        "dob": "2010-05-20",
        "admission_number": data["admission_number"],
    })
    assert r2.status_code == 200, r2.text
    assert r2.json()["tc_file_url"] == rec["tc_file_url"]

    # Cleanup
    requests.delete(f"{BASE_URL}/api/admin/tc-records/{rec['id']}", headers=headers)


# ============== Integration Keys ==============
def test_integration_keys(auth_headers):
    r = requests.get(f"{BASE_URL}/api/admin/integration-keys", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    for k in ["resend_api_key", "razorpay_key_id", "bulksms_api_key", "erp_login_url"]:
        assert k in data


# ============== View-only lists ==============
@pytest.mark.parametrize("ep", [
    "admission-enquiries", "admissions", "career-applications",
    "alumni-members", "payments", "contact-messages",
])
def test_admin_readonly_lists(auth_headers, ep):
    r = requests.get(f"{BASE_URL}/api/admin/{ep}", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)
