-- =============================================================================
-- SECURITY FIXES MIGRATION — 2026-07-06
-- Run this in the Supabase SQL Editor against the LIVE database.
-- It removes overly-permissive RLS policies that exposed PII to the anon key
-- and replaces public table reads with narrow security-definer RPCs.
-- =============================================================================

-- ── 1. admission_applications: remove public read of all applications ──
-- (child names, DOB, address, phone, email, payment ids were readable by anyone)
drop policy if exists "Public can view their own application status" on public.admission_applications;

-- Secure status lookup: requires application id AND matching phone or email.
create or replace function public.lookup_admission_application(p_app_id text, p_contact text)
returns table (id text, student_name text, class_applied text, status text, payment_status text, created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select a.id::text, a.student_name, a.class_applied, a.status, a.payment_status, a.created_at
  from public.admission_applications a
  where a.id::text = p_app_id
    and (a.phone = p_contact or lower(a.email) = lower(p_contact));
$$;

-- ── 2. tc_records: remove public read of the full TC registry ──
drop policy if exists "Anyone can view TCs" on public.tc_records;

-- Secure TC verification: exact admission number required.
create or replace function public.verify_tc_record(p_admission_no text)
returns table (student_name text, admission_no text, issue_date date, status text, file_url text)
language sql
security definer
set search_path = public
as $$
  select t.student_name, t.admission_no, t.issue_date, t.status, t.file_url
  from public.tc_records t
  where t.admission_no = p_admission_no;
$$;

-- ── 3. election_voters: remove public read of the full voter roster ──
drop policy if exists "Voters can view their own details" on public.election_voters;

-- Secure voter check-in lookup: exact admission number required.
create or replace function public.election_voter_lookup(p_admission_no text)
returns table (admission_no text, name text, role text, already_voted boolean, class_name text, father_name text)
language sql
security definer
set search_path = public
as $$
  select v.admission_no, v.name, v.role, v.already_voted, v.class_name, v.father_name
  from public.election_voters v
  where v.admission_no = p_admission_no;
$$;

-- ── 4. election_settings: hide sensitive keys from public reads ──
drop policy if exists "Anyone can view election settings" on public.election_settings;
drop policy if exists "Anyone can view non-sensitive election settings" on public.election_settings;
create policy "Anyone can view non-sensitive election settings" on public.election_settings
  for select using (key not in ('voting_access_code'));

-- ── 5. qp_otps: track failed verification attempts (OTP brute-force guard) ──
alter table public.qp_otps add column if not exists attempts integer not null default 0;

-- ── 6. Lock down RPC execution grants ──
-- Allow public execution of the narrow lookup functions only.
grant execute on function public.lookup_admission_application(text, text) to anon, authenticated;
grant execute on function public.verify_tc_record(text) to anon, authenticated;
grant execute on function public.election_voter_lookup(text) to anon, authenticated;
