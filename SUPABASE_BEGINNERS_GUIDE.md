# Beginner's Guide: Migrating your Entire Backend to Supabase

This is a complete, beginner-friendly walkthrough to move your Question Paper Portal from Render/MongoDB to a serverless **Supabase** backend. 

Follow these steps one by one.

---

## Step 1: Make Sure Your Git Repo is Up-to-Date
I have committed and pushed all the necessary files (`supabase_schema.sql`, `migrate_to_supabase.py`, and the updated mobile JS configuration adapter) to your GitHub repository.

To make sure your local repository is updated with these changes, run this command in your terminal inside `/Users/aarav/Downloads/sdps-website-main`:
```bash
git pull origin main
```

---

## Step 2: Create a Supabase Project
1. Go to [database.new](https://database.new) (Supabase signup).
2. Log in with your GitHub account.
3. Click **New Project** and select an Organization.
4. Fill in:
   * **Name**: `SDPS QP Portal`
   * **Database Password**: *Write this down somewhere safe!*
   * **Region**: Choose the closest one to India (e.g., Singapore or Mumbai).
5. Click **Create new project** and wait 1–2 minutes for the database to provision.

---

## Step 3: Run the Database Schema SQL
1. On your Supabase dashboard, click on the **SQL Editor** icon in the left menu (looks like `>_`).
2. Click **New Query** (or **New query from template**).
3. Open the file [`supabase_schema.sql`](./supabase_schema.sql) in your code editor.
4. Copy the entire content of `supabase_schema.sql`.
5. Paste it into the query window in Supabase.
6. Click the **Run** button at the top right. You should see a message saying "Success. No rows returned."

---

## Step 4: Configure Supabase Keys in the Backend Environment
1. In the Supabase sidebar, go to **Project Settings** (gear icon at the bottom left) ➔ **API**.
2. Find the following values:
   * **Project URL** (under Project API keys)
   * **`anon` public key**
   * **`service_role` secret key** (Click *Reveal* to show. *WARNING: Keep this private!*)
3. Open your local file `backend/.env` in your editor.
4. Add these keys at the bottom of the file:
   ```env
   SUPABASE_URL="YOUR_PROJECT_URL_HERE"
   SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_SECRET_KEY_HERE"
   ```

---

## Step 5: Migrate Your Data from MongoDB to Supabase
We will now run the python script to copy all current teacher accounts, assignments, notifications, and question papers to Supabase:
1. Open your terminal.
2. Navigate to your backend directory:
   ```bash
   cd /Users/aarav/Downloads/sdps-website-main/backend
   ```
3. Run the migration script using your virtual environment Python:
   ```bash
   venv/bin/python migrate_to_supabase.py
   ```
4. You will see outputs showing each user, assignment, archive, notification, and paper migrating to Supabase PostgreSQL!

---

## Step 6: Deploy Edge Functions (AI & Auth Handler)
To handle AI completions and password changes safely, we need to deploy the serverless functions:
1. In your terminal, make sure you are in the project root:
   ```bash
   cd /Users/aarav/Downloads/sdps-website-main
   ```
2. Install the Supabase command-line tool (CLI) using Homebrew:
   ```bash
   brew install supabase/tap/supabase
   ```
3. Log in to your Supabase account:
   ```bash
   supabase login
   ```
   *(This will open a browser window asking you to authorize the CLI. Click Authorize)*
4. Link the local folder to your online project:
   ```bash
   supabase link --project-ref YOUR_SUPABASE_PROJECT_REF_ID
   ```
   *(Your Project Ref ID is the short code in your project URL: e.g. `https://[this-part].supabase.co`)*
5. Deploy your secrets (your Groq API key and the URL of the WhatsApp microservice running on Render):
   ```bash
   supabase secrets set GROQ_API_KEY="YOUR_GROQ_API_KEY_HERE" WA_SERVICE_URL="https://your-whatsapp-microservice.onrender.com"
   ```
6. Deploy the two functions:
   ```bash
   supabase functions deploy generate-questions
   supabase functions deploy auth-handler
   ```

---

## Step 7: Configure the Frontend Mobile Code
1. Open the file `frontend/public/qp-portal/app/config.js` in your editor.
2. Update the `SUPABASE_URL` and `SUPABASE_ANON_KEY` values:
   ```javascript
   window.QP_CONFIG = {
     apiBases: [ ... ],
     SUPABASE_URL: "YOUR_PROJECT_URL_HERE",
     SUPABASE_ANON_KEY: "YOUR_ANON_PUBLIC_KEY_HERE"
   };
   ```

---

## Step 8: Build the Mobile Application
Now, compile your React application and update the Android / iOS files:
1. In your terminal, go to the frontend directory:
   ```bash
   cd /Users/aarav/Downloads/sdps-website-main/frontend
   ```
2. Rebuild the bundle and sync Capacitor assets:
   ```bash
   npm run build && npx cap copy
   ```
3. Open Xcode or Android Studio to run the app. It will now communicate directly and instantly with your Supabase database!
