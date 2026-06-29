# Admin Setup & Migration Guide: Shifting to Supabase

This guide outlines the steps required to deploy the SQL tables, Deno Edge Functions, and connect the mobile application to your new serverless Supabase backend.

---

## Step 1: Initialize Database Tables & RLS Policies
1. Log in to your [Supabase Dashboard](https://supabase.com).
2. Create a new project or select an existing one.
3. In the left sidebar, click on the **SQL Editor**.
4. Open a new query window, copy the entire contents of the [`supabase_schema.sql`](./supabase_schema.sql) file, paste it into the editor, and click **Run**.
5. This will create all required tables (`qp_profiles`, `qp_archives`, `qp_assignments`, `qp_papers`, `qp_notifications`, `qp_otps`) and activate the Row-Level Security (RLS) policies.

---

## Step 2: Configure Secrets & Environment Keys
Go to **Project Settings** ➔ **Edge Functions** in your Supabase dashboard, and set the following environment keys:
1. `GROQ_API_KEY`: Your Groq completions API key (used by the AI generator).
2. `GROQ_MODEL`: Set to `llama3-8b-8192` (default) or any preferred model.
3. `WA_SERVICE_URL`: The URL of your active Baileys WhatsApp microservice hosted on Render (e.g. `https://your-whatsapp-service.onrender.com`).

Alternatively, set them using the Supabase CLI:
```bash
supabase secrets set GROQ_API_KEY="gsk_..." WA_SERVICE_URL="https://..."
```

---

## Step 3: Deploy Serverless Edge Functions
Deploy the two Edge Functions (`auth-handler` and `generate-questions`) from your terminal using the Supabase CLI:
1. Install Supabase CLI locally (if not already installed):
   ```bash
   brew install supabase/tap/supabase
   ```
2. Log in and link your project:
   ```bash
   supabase login
   supabase link --project-ref your-supabase-project-id
   ```
3. Deploy the functions:
   ```bash
   supabase functions deploy generate-questions
   supabase functions deploy auth-handler
   ```

---

## Step 4: Configure the Mobile Frontend
Locate the configuration file at `frontend/public/qp-portal/app/config.js` and input your project keys:
```javascript
window.QP_CONFIG = {
  apiBases: [ ... ],
  SUPABASE_URL: "https://your-project-id.supabase.co", // <-- Replace with your Supabase URL
  SUPABASE_ANON_KEY: "eyJhbGciOi..."                  // <-- Replace with your Anon Key
};
```
*Note: Make sure to run `npm run build && npx cap copy` in the `frontend` folder to compile and sync these changes to your Android and iOS native builds.*

---

## Step 5: Onboarding Staff & Seeding Accounts
To add staff members:
1. Go to **Authentication** ➔ **Users** in the Supabase dashboard and click **Add user** (sign them up using their email and a temporary password).
2. In the **SQL Editor**, insert a corresponding metadata row in the `qp_profiles` table mapping their User ID:
   ```sql
   insert into public.qp_profiles (id, username, name, email, phone, role)
   values (
     'auth-user-uuid-here', 
     'teacher_username', 
     'Teacher Name', 
     'teacher@sdpublic.org', 
     '919955190262', 
     'teacher'
   );
   ```
   *Note: For the `qp_admin` role, set the `role` field to `qp_admin`.*
