# Walkthrough: Whole Website Supabase Migration

We have successfully migrated the entire S.D. Public School website backend and database (including Admissions, Gallery, News, Payments, and Chatbot) from Render and MongoDB to **Supabase** (Postgres + Serverless Edge Functions).

The only stateful service remaining on Render is the Baileys WhatsApp microservice.

---

## Changes Implemented

### 1. Unified Database Schema (`supabase_schema.sql`)
Extended the SQL database schema script to create all public site tables:
* `site_news`: stores announcements, news, circulars, and notices.
* `site_gallery` & `site_videos`: photo and video gallery items.
* `site_calendar` & `site_holidays`: school events calendar.
* `site_council_profiles`, `site_posters` & `site_results`: student election metrics.
* `admission_enquiries` & `admission_applications`: tracks parent inquiries and student applications.
* `career_applications`: stores candidate resume file attachments.
* `alumni_members` & `alumni_meets`: directory of verified school graduates.
* `tc_records`: verifies school transfer certificates.
* `site_testimonials`, `site_legal_pages` & `site_settings`: web config data.
* **RLS Policies**: Implemented read-only permissions for public tables and write restrictions for authenticated admin accounts.

---

### 2. Deno Serverless Edge Functions (`supabase/functions/`)
Added 5 serverless functions:
* `generate-questions`: Handles Claude AI question paper helper generations using Groq completions.
* `auth-handler`: Manages staff OTP creation, resets, and passwords securely.
* `chat-assistant`: Grounds the school chatbot (Sal AI) with notices and event updates via Postgres, and queries Groq.
* `razorpay-payments`: Creates and verifies Razorpay orders for admissions and alumni registration fees.
* `pdf-receipt`: Sends registration HTML email receipts to parents using MailerCloud.

---

### 3. React Frontend Axios Adapter (`frontend/src/lib/api.js`)
* **Axios Custom Adapter**: Configured a custom adapter in the central Axios client. If `REACT_APP_SUPABASE_URL` is set, Axios intercepts all GET/POST requests and queries Supabase directly instead of hitting the FastAPI server.
* **Compatibility**: If no Supabase environment keys are provided, Axios defaults back to the Render FastAPI server. This ensures 100% backward-compatibility.

---

## Verification Results
1. React production bundles built successfully (`Compiled successfully`).
2. Android Gradle compilation compiled successfully (`BUILD SUCCESSFUL`).
