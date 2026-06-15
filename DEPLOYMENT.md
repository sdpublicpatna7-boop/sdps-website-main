# Deployment configuration — sdpublic.org

Frontend: `https://sdpublic.org`
Backend (current): `https://sdps-website-main.onrender.com`

These are **different registrable domains**, so the auth cookie is a *third-party*
cookie. That has security and reliability implications — pick one of the two
options below.

---

## ✅ Recommended: put the API on a subdomain of sdpublic.org

Add a custom domain on Render so the backend is reachable at, e.g.
`https://api.sdpublic.org` (Render → your service → Settings → Custom Domains,
then add the CNAME at your DNS provider).

Once the API is `api.sdpublic.org`, it is **same-site** with `sdpublic.org`, so the
`HttpOnly` auth cookie is a first-party cookie: reliable in every browser and not
readable by JavaScript.

### Backend env vars (Render)
```
JWT_SECRET=<run: python -c "import secrets; print(secrets.token_urlsafe(48))">
CORS_ORIGINS=https://sdpublic.org,https://www.sdpublic.org
COOKIE_SECURE=true
COOKIE_SAMESITE=lax
MONGO_URL=<your mongodb connection string>
DB_NAME=<your db name>
ADMIN_SEED_EMAIL=admin@sdpublic.org
ADMIN_SEED_PASSWORD=<strong password>
STAFF_SEED_PASSWORD=<strong password>
QP_ADMIN_PASSWORD=<strong password>
# Optional integrations
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
MAILERCLOUD_API_KEY=...
BULKSMS_API_URL=...
BULKSMS_API_KEY=...
ADMISSION_REG_FEE_INR=500
# AI Assist in the QP portal (free Google Gemini). Get a free key at
# https://aistudio.google.com/app/apikey — no billing required for the free tier.
GEMINI_API_KEY=<your free Gemini API key>
GEMINI_MODEL=gemini-2.0-flash
# QP portal staff onboarding + phone/WhatsApp-OTP login
QP_PORTAL_URL=https://sdpublic.org/qp-portal/   # link sent in WhatsApp invites
QP_OTP_TTL_MIN=10                                # OTP validity (minutes)
# WhatsApp (Baileys microservice) — see "WhatsApp service" section below
WA_SERVICE_URL=http://whatsapp-service:3001
WA_API_SECRET=<strong random secret, shared with the WhatsApp service>
WA_BULK_DELAY_MS=2000
```

### Frontend env (build time)
```
REACT_APP_BACKEND_URL=https://api.sdpublic.org              # primary API base
REACT_APP_BACKEND_FALLBACK=https://sdps-website-main.onrender.com   # fallback if primary is down/unreachable
```
`REACT_APP_BACKEND_URL` is the primary API for the whole site. `REACT_APP_BACKEND_FALLBACK`
is an automatic failover: if the primary can't be reached (DNS not found, server down,
CORS/network error), the React app **and** the static QP portal transparently retry on
the fallback and pin it for the session. So you can keep `api.sdpublic.org` as primary
even before its DNS is live — the site keeps working via the Render URL until it resolves.

At build time `scripts/inject-qp-config.js` writes `build/qp-portal/config.js` from these
same vars, so the QP portal shares one source of truth. Rebuild after changing them
(`npm run build` runs the injection automatically).

---

## ⚠️ Alternative: keep the API on onrender.com (cross-domain)

If you must keep `sds-website-main.onrender.com`, the cookie has to be cross-site:

```
COOKIE_SECURE=true
COOKIE_SAMESITE=none     # required for cross-site; backend forces Secure automatically
CORS_ORIGINS=https://sdpublic.org,https://www.sdpublic.org
```
(other env vars same as above)

Frontend build:
```
REACT_APP_BACKEND_URL=https://sdps-website-main.onrender.com
```

**Caveat:** Safari, Firefox, and Brave block third-party cookies by default. In
those browsers the `HttpOnly` cookie won't be stored, so a logged-in admin will be
signed out after a page refresh (the in-memory token keeps the *active* session
working, but it doesn't survive reloads). This is a browser limitation, not a bug —
which is exactly why the subdomain option above is recommended.

---

## Notes
- `CORS_ORIGINS` must list the exact frontend origins (no wildcard). The app
  refuses to start with `*`.
- The backend refuses to start unless `JWT_SECRET` is set (≥32 chars).
- Render runs behind a proxy; for accurate per-client rate limiting, configure the
  app/proxy to pass a trusted `X-Forwarded-For`.
- After deploying, change the seeded admin/staff/QP passwords from their initial
  values.

---

## WhatsApp service (Baileys)

The WhatsApp features (transactional confirmations + the **WhatsApp Marketing**
admin page) are powered by a separate Node microservice in `whatsapp-service/`.

### Deploy
1. Deploy `whatsapp-service/` as its own service (Docker image provided). It must
   be **private** — reachable by the backend, not the public internet.
2. Persist `WA_AUTH_DIR` (default `/app/auth_state`) on a volume so the linked
   WhatsApp session survives restarts.
3. Set on the service:
   ```
   WA_API_SECRET=<same secret as the backend>
   WA_BULK_DELAY_MS=2000
   PORT=3001
   ```
4. Point the backend at it: `WA_SERVICE_URL=http://<service-host>:3001` and the
   matching `WA_API_SECRET`.

### Link the WhatsApp account
Admin panel → **WhatsApp Marketing** → scan the QR (phone: WhatsApp → Linked
Devices → Link a Device). Status turns **Connected**.

### Campaign flow
1. Type the message (use `{name}` for personalisation from a CSV `name` column).
2. Optionally attach a poster/image or video/reel (≤16MB).
3. **Send Test** to one number and verify it on WhatsApp.
4. Add recipients (paste numbers or upload a `phone,name` CSV) and **Launch
   Campaign**. Messages send with a 2s delay; progress is shown live and can be
   stopped.

> ⚠️ Use a dedicated number. Unofficial (Baileys) bulk sending can get a number
> banned by WhatsApp; the delay + test-first flow reduce but don't eliminate that
> risk. Keep volumes modest and message content non-spammy.

## QP staff onboarding & phone login (WhatsApp OTP)

Teachers are onboarded and authenticated through WhatsApp, so the WhatsApp service
above must be **linked/connected** for staff login and onboarding to work.

### Onboard teachers (CSV)
QP Admin → **Onboard Teachers**: pick an exam archive, upload a CSV with columns
`name, phone, class, subject`. For each row the portal creates the teacher
(passwordless), creates the class/subject assignment under that archive, and sends a
WhatsApp invite containing the portal link (`QP_PORTAL_URL`) and the teacher's phone.

### Login flows
- **QP Admin** → `Admin · Email` tab: email + password (no OTP).
- **Staff (teacher/incharge/printing)** → `Staff · Phone` tab:
  - **First sign-in:** enter phone → WhatsApp one-time code → set a password → in.
  - **Returning:** enter phone → password → WhatsApp one-time code → in.

OTP codes are 6 digits, valid `QP_OTP_TTL_MIN` minutes, max 5 attempts. If WhatsApp
is disconnected, staff cannot receive codes — keep the service linked.

### User activity
QP Admin → **User Activity** shows every login: who, role, sign-in time, last-seen,
IP address, device, and a live online/offline indicator (online = active session
seen within the last 15 minutes).
