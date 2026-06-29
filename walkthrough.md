# Walkthrough: Supabase Migration

We have successfully migrated the Question Paper Portal database, user authentication rules, and AI generation tasks to a serverless **Supabase** backend architecture, leaving only the stateful WhatsApp Baileys service running on Render.

---

## Changes Implemented

### 1. Database Schema (`supabase_schema.sql`)
Created a PostgreSQL schema script setting up:
* `qp_profiles`: maps user credentials, roles (`teacher`, `incharge`, `printing_head`, `qp_admin`), phone numbers, and oversaw classes.
* `qp_archives`: exam session years.
* `qp_assignments`: teacher paper assignments.
* `qp_papers`: stores JSONB dynamic sections and questions.
* `qp_notifications`: stores user notifications.
* `qp_otps`: holds temporary WhatsApp reset security tokens.
* **RLS Policies**: Restricts access based on user role (e.g. teachers can only read/edit their own papers; incharges review oversee classes).

---

### 2. Deno Serverless Edge Functions
Implemented Deno microservices:
* `generate-questions`: Handles Claude Fable 5 AI completion requests securely using a server-side Groq completion endpoint.
* `auth-handler`: Manages phone number validations, generates verification tokens, triggers OTP WhatsApp text messages via your Render Baileys microservice, verifies user input, and securely updates passwords inside `auth.users`.

---

### 3. Frontend Client Integration
* **Library Integration**: Loaded the official `@supabase/supabase-js` library inside `index.html`.
* **API Adapter**: Implemented a complete Supabase translation handler `apiFetchSupabase` inside `qp-common-mobile.js`. If `SUPABASE_URL` is set in `config.js`, the app intercepts all server requests and executes them directly on the Supabase database.
* **Fallback Compatibility**: If no Supabase credentials are set, the app seamlessly falls back to hitting the FastAPI Render server (zero breaking changes for current deployments).

---

## Verification Results
1. React production bundles compiled successfully.
2. Android Gradle compiler successfully assembled target debug APKs (`BUILD SUCCESSFUL`).
