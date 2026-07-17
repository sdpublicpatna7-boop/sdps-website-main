# Walkthrough: Native School Elections Portal Refactoring

We have successfully completed the native refactoring of the school election portal, integrating all frontend pages and backend API endpoints directly into the core project directories. The duplicate `election-src/` directory has been removed, and the local dev servers are running.

---

## Changes Implemented

### 1. Backend Core Integration
* **FastAPI Elections Router (`backend/routes_elections.py`)**:
  * Implemented native Python routes mapped to `/api/elections/...`.
  * Integrates securely with Supabase REST endpoints using `httpx` to handle all operations (voter roster queries, candidate nominations, voter registrations).
  * **Server-side Results Tallying**: Refactored the `/archive` compilation to compute totals, determine winners, archive results, clear active votes, and update voter flags 100% on the server in a clean sequence.
* **Server Setup (`backend/server.py`)**:
  * Mounted `elections_router` under `/api/elections` routes.

---

### 2. Frontend Core Refactoring
* **Client-side API Adapter (`frontend/src/lib/api_elections.js`)**:
  * Refactored to query local FastAPI routes (`/api/elections`) directly.
  * Eliminates the need for any Supabase key exposure or anon key setup on client-side browsers.
* **Dashboard Control Panel (`frontend/src/pages/admin/AdminElections.jsx`)**:
  * Refactored all data handlers (fetching stats, nominating candidates, uploading Excel voters, archiving results) to use the FastAPI elections routes.
* **Kiosk and Board Views**:
  * Updated `NoticeBoard.jsx`, `LiveResults.jsx`, and `Declaration.jsx` to request their live stats, cover layouts, and winner declarations directly from the local FastAPI backend.

---

### 3. Cleanup
* Deleted the duplicate `election-src/` repository folder from the project root.

---

## Verification Results
1. React production bundles built successfully (`Compiled successfully`).
2. FastAPI server started successfully on `http://127.0.0.1:8000`.
3. React dev server running on `http://localhost:3000`.

---

## 4. Hardening & UX Adjustments (Latest Updates)
* **Proxy-Aware Rate Limiting**:
  * Upgraded all standard `slowapi` limiters to resolve client IPs using `X-Forwarded-For` header inspection. This prevents proxy-wide blocking behind reverse proxies (like Render load balancers).
  * Affected files: [routes_admin.py](file:///Users/aarav/Downloads/sdps-website-main/backend/routes_admin.py), [routes_elections.py](file:///Users/aarav/Downloads/sdps-website-main/backend/routes_elections.py), [routes_public.py](file:///Users/aarav/Downloads/sdps-website-main/backend/routes_public.py), [routes_qp.py](file:///Users/aarav/Downloads/sdps-website-main/backend/routes_qp.py), [routes_whatsapp.py](file:///Users/aarav/Downloads/sdps-website-main/backend/routes_whatsapp.py).
* **Dynamic Logo Branding in Emails & PDFs**:
  * Implemented an async/dependency synchronization routine (`sync_logo_url`) that queries the current database configuration to set active school brand assets.
  * Ensures that salary slips, salary certificates, experience certificates, admission receipts, and public contact emails dynamically render the brand logo.
  * Affected files: [routes_admin.py](file:///Users/aarav/Downloads/sdps-website-main/backend/routes_admin.py), [routes_public.py](file:///Users/aarav/Downloads/sdps-website-main/backend/routes_public.py).
* **Robust PDF Delivery Fallback**:
  * Added a dynamic PDF download fallback link to all admin documents (salary slips, salary certificates, experience certificates).
  * If SMTP fails or is not configured (e.g., in developer/local setups falling back to MailerCloud REST API), the system generates a cryptographically random, secure local download URL for the generated PDF document, rendering a professional "Download Document" button in the email template.
  * Affected files: [email_service.py](file:///Users/aarav/Downloads/sdps-website-main/backend/email_service.py), [routes_admin.py](file:///Users/aarav/Downloads/sdps-website-main/backend/routes_admin.py).
* **Enhanced Linktree Experience**:
  * Fixed keyword matching order priority so that `"Save Our Contact"` matches contact card tags correctly instead of falling back to the `"school"` keyword (which rendered the Globe icon).
  * Upgraded icon and bubble colors: added support for **Star icon** (gold/amber) for Google Maps review/rating items, and **UserPlus icon** (indigo) for contact-card downloads.
  * Integrated a live **Search and Filter bar** with custom empty-state messaging, allowing real-time searching through links.
  * Added an **Interactive Theme Toggle** on the landing page so visitors can preview light or dark modes.
  * Added a **QR Code generator modal** allowing users to instantly display/scan a QR code to share the Linktree.
  * Upgraded the admin interactive phone preview simulator to render all matching icons and custom bubble styles in real-time.
  * Affected files: [LinksPage.jsx](file:///Users/aarav/Downloads/sdps-website-main/frontend/src/pages/public/LinksPage.jsx), [AdminLinktree.jsx](file:///Users/aarav/Downloads/sdps-website-main/frontend/src/pages/admin/AdminLinktree.jsx).
* **Salary Slip PDF Design Alignment**:
  * Completely redesigned the backend generated PDF salary slip attachment in `email_service.py` (`format_salary_slip_email`) to match the premium, single-page, print-ready grid design viewed inside the Admin Portal.
  * Used `xhtml2pdf`-compatible table positioning structures (side-by-side tables for Earnings vs Deductions) with clean grey border lines, custom badge headings, and a highlighted Net Payable card to ensure zero formatting issues and prevent layout overflow to page 2.
  * Cleaned up the PDF document body by stripping out the email-specific greetings (e.g. "Dear Principal, Please find below..."), which are now cleanly contained only within the cover email itself.
  * Overrode the page margins inside `pdf_service.py` to `12mm` and bypassed the duplicate school letterhead headers/footers specifically when compiling `"Salary Slip"` documents.
  * Affected files: [email_service.py](file:///Users/aarav/Downloads/sdps-website-main/backend/email_service.py), [pdf_service.py](file:///Users/aarav/Downloads/sdps-website-main/backend/pdf_service.py).
* **APAAR Consent Module Bug Fixes**:
  * Removed the `"Transgender"` choice option from the public-facing APAAR Card registration consent form's Gender selection dropdown.
  * Refactored the backend class name queries in both the Submissions tally endpoint and the School Roster student list endpoint. Replaced strict regex boundaries (`^class_name$`) with a precise word-boundary search (`(?:\b|[^a-zA-Z])class_name(?:\b|[^a-zA-Z])`) that correctly filters out overlapping Roman numerals (e.g. preventing `"I"` from matching `"IX"` or `"XI"`) while successfully finding entries with suffixes/prefixes (like `"Class I"`, `"I A"`, or `"I-A"`).
  * Added lookbehinds to the regex query (`(?<!\bKG)(?<!\bK\.G\.)(?<!\bKG\s)(?<!\bKG-)`) to prevent classes like `"KG-II"` or `"KG II"` from matching when the user filters specifically by `"II"`, ensuring that selecting Class II only shows Class II students.
  * Updated the admin classes dropdown list in the frontend to include `"KG-I"` and `"KG-II"` so that the admin can view and filter by these classes.
  * Implemented client-side sort filters on both the Submissions and School Roster table headers, allowing the admin to sort student records in ascending or descending order dynamically by fields such as Student Name, Father's Name, Admission Number, Student (Aadhaar), Mobile Number, and Date.
  * Updated detail modal navigation logic to correctly traverse matching sorted orders when navigating between previous/next records.
  * Affected files: [routes_admin.py](file:///Users/aarav/Downloads/sdps-website-main/backend/routes_admin.py), [ApaarForm.jsx](file:///Users/aarav/Downloads/sdps-website-main/frontend/src/pages/public/ApaarForm.jsx), [AdminApaarManager.jsx](file:///Users/aarav/Downloads/sdps-website-main/frontend/src/pages/admin/special/AdminApaarManager.jsx).
* **Real-time Admin Notifications**:
  * Implemented automatic toast popups that appear after entering the Admin Panel (and periodically poll every 30 seconds) if there are any new/unread submissions for:
    * **Admission Enquiry Forms** (`AdmissionEnquiry`)
    * **Teacher Job Applications** (`CareerApplication`)
    * **Full Admission Applications** (`FullAdmission`)
    * **Contact Form Messages** (`ContactMessage`)
  * Included a call-to-action button ("View") directly inside each notification toast, allowing the admin to jump directly to the relevant management page with a single click.
  * Synchronized the counts dynamically using the browser's `localStorage` so that notifications only trigger when new items have actually arrived since the admin's last visit or viewing of that module.
  * Affected files: [AdminLayout.jsx](file:///Users/aarav/Downloads/sdps-website-main/frontend/src/components/admin/AdminLayout.jsx).
