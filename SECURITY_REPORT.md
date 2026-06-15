# Security Review — SDPS Website

Date: 2026-06-12
Scope: `backend/` (FastAPI + MongoDB), `frontend/` (React CRA), QP portal static pages.

This report lists findings ordered by severity, with the affected file, the risk, and a concrete fix.

---

## Remediation status (updated 2026-06-12)

| ID | Issue | Status |
|----|-------|--------|
| C1 | Unauthenticated admission payment confirmation | **Fixed** — added `/admission/create-order`; `payment-confirm` now verifies the Razorpay signature and matches the server-stored order. Frontend updated. |
| C2 | Predictable default JWT secret | **Fixed** — `auth.py` fails fast unless `JWT_SECRET` is set and ≥32 chars; `routes_qp.py` now imports the same validated secret. |
| H1 | Client-controlled payment amount | **Fixed (alumni/admission), Mitigated (fees)** — alumni and admission amounts are now server-authoritative; generic fee orders are bounds-checked (a structured per-student fee table is still recommended). |
| H2 | Unauthenticated arbitrary file upload → stored XSS | **Fixed** — upload allow/block-list in `image_utils.save_raw_file`; uploads served with `Content-Disposition: attachment` + `nosniff`. |
| H3 | Mass-assignment via raw `$set` | **Fixed** — `_sanitize_update()` whitelists payloads to model fields across admin CRUD/settings updates. |
| M1 | CSP `unsafe-inline` + unsanitized admin HTML | **Fixed** — admin HTML sanitized with DOMPurify; strict CSP (no `unsafe-inline`/`unsafe-eval` in `script-src`) injected into the production build; the one inline script was externalized and the runtime chunk is no longer inlined. |
| M2 | Default WhatsApp service secret | **Fixed** — fails fast on the default `change-me-secret`. |
| M3 | No rate limiting on public write endpoints | **Fixed** — `slowapi` limits added to enquiry, contact, admission/career apply, alumni register, and all order/verify endpoints. |
| M4 | HTML injection into outbound emails | **Fixed** — user input is `html.escape`d before templating. |
| M5 | JWT in `localStorage` | **Fixed** — auth tokens are now delivered as `HttpOnly`, `Secure`, `SameSite` cookies (admin + QP portals). Tokens are no longer persisted in `localStorage`; the SPA keeps only an in-memory fallback header and restores sessions via the cookie. Added `/logout` endpoints that clear the cookie. |
| L1 | Verbose payment error leakage | **Fixed** — payment errors logged server-side, generic messages returned. |
| L2 | Admin login ignores `is_active` | **Fixed** — disabled accounts are rejected at login. |
| L5 | Integration keys readable by staff | **Fixed** — endpoint now requires superadmin. |
| L6 | No root `.gitignore` | **Fixed** — added (ignores `.env`, uploads, build artifacts). |

**Deferred items and why**
- **L3 (proxy IP for rate limiting):** deployment/infra configuration (trusted `X-Forwarded-For`), not a code change.
- **L4 (dependency pinning / `pip-audit`):** operational hygiene; run `pip-audit` in CI and pin exact versions.

**New environment variables introduced by these fixes**
- `JWT_SECRET` (required, ≥32 chars) — app refuses to start without it.
- `WA_API_SECRET` (required if the WhatsApp router is mounted) — must not be the default.
- `ADMISSION_REG_FEE_INR` (optional, default `500`) — server-authoritative admission fee.
- `COOKIE_SECURE` (optional, default `true`) — set `false` only for local HTTP dev.
- `COOKIE_SAMESITE` (optional, default `lax`) — set `none` (with `COOKIE_SECURE=true`) only if the SPA and API live on different registrable domains.

---

## Critical

### C1. Payment confirmation has no signature verification (payment fraud)
**File:** `backend/routes_public.py` → `POST /api/admission/payment-confirm`

```python
@public_router.post("/admission/payment-confirm")
async def confirm_admission_payment(payload: AdmissionPaymentConfirm):
    await db.admissions.update_one({"id": payload.application_id}, {"$set": {
        "payment_id": payload.payment_id, "status": "payment_received", ...}})
    return {"confirmed": True, ...}
```
The endpoint is **public and unauthenticated** and marks an admission as paid using a client-supplied `payment_id` with **no Razorpay signature check**. Anyone can mark any application as paid for free. Note the fee/alumni endpoints *do* verify (`client.utility.verify_payment_signature(...)`) — this one was missed.

**Fix:** Require `razorpay_order_id` + `razorpay_payment_id` + `razorpay_signature` and call `verify_payment_signature` before updating status, exactly like `/api/fees/verify`. Cross-check the verified amount against the expected registration fee.

### C2. Predictable default JWT secret (full auth bypass / token forgery)
**Files:** `backend/auth.py`, `backend/routes_qp.py`

```python
JWT_SECRET = os.environ.get("JWT_SECRET", "change-me")
```
If `JWT_SECRET` is not set in the environment, the app boots with the well-known value `change-me`. An attacker who knows this (it is in the source) can forge a valid admin/superadmin JWT (`{"sub","email","role":"superadmin"}`) and take over the entire admin and QP portals. `server.py` already hard-fails on missing seed passwords and CORS, but **not** on the JWT secret.

**Fix:** Fail fast at startup if `JWT_SECRET` is unset or equals `change-me`. Generate a strong random secret (≥32 bytes) per environment. Use the same secret source in `auth.py` and `routes_qp.py`.

---

## High

### H1. Client-controlled payment amount (pay-what-you-want)
**Files:** `backend/routes_public.py` → `/api/fees/create-order`, `/api/alumni/create-order`

The order `amount` comes straight from the request body (`payload.amount`). Signature verification confirms the user paid *the amount they chose*, not the amount actually owed. A user can create a fee order for ₹1 for any `fee_type`/class.

**Fix:** Keep an authoritative server-side fee table (or `AlumniSettings.membership_amount`, which already exists) and derive the amount server-side from `fee_type`/`student_class`. Never trust the amount from the client.

### H2. Unauthenticated arbitrary file upload → stored XSS / malicious hosting
**Files:** `backend/routes_public.py` (`/api/admission/apply`, `/api/career/apply`), `backend/image_utils.py` (`save_raw_file`), served by `/api/uploads/{sub_dir}/{filename}`

Public endpoints accept arbitrary files. `save_raw_file` preserves the original extension, and `FileResponse` serves it with a content-type guessed from that extension. An attacker can upload `evil.html` or an `.svg` containing script and get a same-origin URL that executes JavaScript when opened — stored XSS plus free file hosting. `X-Content-Type-Options: nosniff` does not stop a file already served as `text/html`.

**Fix:**
- Whitelist allowed extensions/MIME types (pdf, jpg, png, docx) and validate the actual content (e.g. Pillow for images, magic bytes for PDFs).
- Force a safe `Content-Type` and `Content-Disposition: attachment` when serving uploads, or serve them from a separate non-app domain/bucket.
- Add size + rate limits (see M3).

### H3. Mass-assignment via raw dict `$set` updates
**Files:** `backend/routes_admin.py` generic CRUD (`update_item`), most `PUT` handlers, `backend/routes_qp.py` (`save_paper`, `update_user`, `update_archive`)

Update handlers accept `payload: Dict[str, Any]` and write it directly with `{"$set": payload}` after only stripping `id`/`_id`. Any authenticated user can set arbitrary fields on a document (e.g. flip `published`, `status`, `is_active`, inject unexpected keys). The QP `update_user` strips `password_hash` but the website CRUD generally does not validate against the model.

**Fix:** Validate update payloads against the Pydantic model (e.g. `Model(**payload).model_dump(exclude_unset=True)`) and whitelist updatable fields per endpoint.

---

## Medium

### M1. Content Security Policy allows `script-src 'unsafe-inline'`
**File:** `backend/server.py` (`SecurityHeadersMiddleware`)

`'unsafe-inline'` in `script-src` largely defeats CSP as an XSS mitigation. Combined with admin-controlled HTML rendered via `dangerouslySetInnerHTML` (`frontend/src/pages/public/TermsPrivacy.jsx`, `SpecialPages.jsx`), a compromised/abused admin field becomes a site-wide XSS.

**Fix:** Move to hashed/nonce-based inline scripts and drop `'unsafe-inline'`. Sanitize admin-authored HTML (e.g. DOMPurify) before rendering.

### M2. Default WhatsApp service secret + unmounted router
**File:** `backend/routes_whatsapp.py`

`WA_API_SECRET = os.environ.get("WA_API_SECRET", "change-me-secret")`. If the Baileys microservice trusts this header, the default makes it spoofable. Note `wa_router` is **defined but never included** in `server.py` — currently dead code, but if mounted later the default secret ships with it.

**Fix:** Fail fast on the default secret (same as C2). Remove or mount-and-secure the router intentionally.

### M3. No rate limiting / anti-abuse on public write endpoints
**File:** `backend/routes_public.py`

Enquiry, contact, admission apply, career apply, alumni register, and order-creation endpoints have no rate limiting or CAPTCHA. This enables spam, storage exhaustion (file uploads), and email/SMS cost abuse (each enquiry triggers an email + SMS).

**Fix:** Apply `slowapi` limits (already a dependency) to public POSTs, add a CAPTCHA on forms, and debounce email/SMS sends.

### M4. HTML injection into outbound emails
**Files:** `backend/routes_public.py`, `backend/email_service.py`

User-supplied values (`parent_name`, `student_name`, `name`, etc.) are interpolated into HTML email bodies without escaping. This allows HTML injection into emails sent to applicants/staff.

**Fix:** HTML-escape all user input before embedding in templates.

### M5. JWT tokens stored in `localStorage`
**File:** `frontend/public/qp-portal/qp-common.js` (and admin app)

Tokens in `localStorage` are readable by any XSS payload. The QP portal does escape table output (`esc()`), which is good, but token theft risk remains if any XSS slips through.

**Fix:** Prefer `HttpOnly`, `Secure`, `SameSite` cookies for auth tokens; keep CSP strict (M1).

---

## Low / Hardening

- **L1. Verbose error leakage:** Razorpay/verification errors are returned to clients (`detail=f"Razorpay error: {e}"`). Log server-side, return generic messages.
- **L2. Website admin login ignores `is_active`:** QP login checks `is_active`; website `admin_users` has no disable mechanism. Add one so revoked staff can be locked out.
- **L3. Rate limiter keyed on remote address:** `get_remote_address` behind a reverse proxy may see only the proxy IP. Configure trusted `X-Forwarded-For` handling.
- **L4. `bcrypt` pinned to 3.2.2** while `passlib[bcrypt]>=1.7.4` — verify compatibility and patch level; run `pip-audit` regularly. Pin remaining deps to exact versions for reproducible, auditable builds.
- **L5. Integration keys endpoint** returns masked secrets — confirm masking is sufficient and the endpoint stays superadmin-gated (currently `get_current_admin`, i.e. staff can read masked keys; consider `get_superadmin`).
- **L6. No `.gitignore` at repo root:** add one to avoid accidentally committing `.env`, `uploads/`, and build artifacts.

---

## What's already done well
- Passwords hashed with bcrypt; login does not leak account existence on password reset; OTP reset has attempt capping and expiry.
- CORS rejects wildcard and requires explicit origins; seed passwords are mandatory (no hardcoded defaults).
- Path traversal is explicitly handled in `/api/uploads` serving.
- TC lookup uses exact match with collation instead of user-controlled `$regex` (ReDoS avoided) — good, and a model the other endpoints should follow.
- Security headers (X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy) are set globally.

---

## Suggested priority order
1. C1 — add signature verification to `payment-confirm` (active fraud path).
2. C2 — enforce a strong `JWT_SECRET` at startup.
3. H1 — server-side authoritative payment amounts.
4. H2 — lock down file uploads (type validation + safe serving).
5. H3 — model-validate update payloads.
6. Medium/Low items as hardening.
