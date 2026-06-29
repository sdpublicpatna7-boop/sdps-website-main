-- =============================================================================
-- SDPS Question Paper Portal - Supabase DB Schema
-- Import this script into the Supabase SQL Editor to set up tables and RLS policies.
-- =============================================================================

-- Enable extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table (Holds metadata for auth.users)
create table if not exists public.qp_profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  name text not null,
  email text unique,
  phone text,
  role text not null check (role in ('teacher', 'incharge', 'printing_head', 'qp_admin')),
  password_set boolean default false,
  incharge_classes text[] default '{}',
  can_review boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Profiles
alter table public.qp_profiles enable row level security;

-- 2. Archives Table
create table if not exists public.qp_archives (
  id text primary key,
  session_name text not null,
  exam_type text not null,
  is_open boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.qp_archives enable row level security;

-- 3. Assignments Table
create table if not exists public.qp_assignments (
  id text primary key,
  archive_id text references public.qp_archives(id) on delete cascade,
  session_name text not null,
  exam_type text not null,
  class_name text not null,
  subject text not null,
  teacher_id uuid references public.qp_profiles(id),
  teacher_name text not null,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'incharge_approved', 'approved', 'printing')),
  submitted_at timestamp with time zone,
  rejection_reason text,
  rejected_by text,
  rejected_at timestamp with time zone
);

alter table public.qp_assignments enable row level security;

-- 4. Papers Table
create table if not exists public.qp_papers (
  id text primary key,
  assignment_id text references public.qp_assignments(id) on delete cascade unique,
  questions jsonb default '[]'::jsonb not null,
  sections jsonb default '[]'::jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.qp_papers enable row level security;

-- 5. Notifications Table
create table if not exists public.qp_notifications (
  id text primary key,
  user_id uuid references public.qp_profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null,
  assignment_id text,
  is_read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.qp_notifications enable row level security;

-- 6. OTPs Table (Security-restricted, bypassed by service-role functions)
create table if not exists public.qp_otps (
  username text primary key,
  phone text not null,
  code text not null,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.qp_otps enable row level security;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Global helper function to check if the user is a qp_admin
create or replace function public.is_qp_admin()
returns boolean security definer as $$
begin
  return exists (
    select 1 from public.qp_profiles 
    where id = auth.uid() and role = 'qp_admin'
  );
end;
$$ language plpgsql;

-- ── PROFILES POLICIES ──
create policy "Users can view their own profile" on public.qp_profiles
  for select using (auth.uid() = id or public.is_qp_admin());

create policy "Admins have full access to profiles" on public.qp_profiles
  for all using (public.is_qp_admin());

-- ── ARCHIVES POLICIES ──
create policy "Anyone authenticated can view open archives" on public.qp_archives
  for select using (auth.role() = 'authenticated');

create policy "Admins have full access to archives" on public.qp_archives
  for all using (public.is_qp_admin());

-- ── ASSIGNMENTS POLICIES ──
create policy "Teachers can view their own assignments" on public.qp_assignments
  for select using (auth.uid() = teacher_id or public.is_qp_admin());

create policy "Incharges can view assignments for classes they oversee" on public.qp_assignments
  for select using (
    exists (
      select 1 from public.qp_profiles
      where id = auth.uid() and role = 'incharge' and class_name = any(incharge_classes)
    ) or public.is_qp_admin()
  );

create policy "Printing heads can view approved/printing assignments" on public.qp_assignments
  for select using (
    (exists (select 1 from public.qp_profiles where id = auth.uid() and role = 'printing_head')
     and status in ('approved', 'printing'))
    or public.is_qp_admin()
  );

create policy "Admins have full access to assignments" on public.qp_assignments
  for all using (public.is_qp_admin());

-- ── PAPERS POLICIES ──
create policy "Teachers can read and update their draft papers" on public.qp_papers
  for all using (
    exists (
      select 1 from public.qp_assignments
      where id = assignment_id and (teacher_id = auth.uid() or public.is_qp_admin())
    )
  );

create policy "Incharges can read submitted papers for classes they oversee" on public.qp_papers
  for select using (
    exists (
      select 1 from public.qp_assignments a
      join public.qp_profiles p on p.id = auth.uid()
      where a.id = assignment_id 
        and p.role = 'incharge' 
        and a.class_name = any(p.incharge_classes)
        and a.status in ('submitted', 'incharge_approved', 'approved', 'printing')
    ) or public.is_qp_admin()
  );

create policy "Printing heads can read approved papers" on public.qp_papers
  for select using (
    exists (
      select 1 from public.qp_assignments a
      where a.id = assignment_id
        and a.status in ('approved', 'printing')
    ) and exists (
      select 1 from public.qp_profiles
      where id = auth.uid() and role = 'printing_head'
    ) or public.is_qp_admin()
  );

-- ── NOTIFICATIONS POLICIES ──
create policy "Users can read and update their own notifications" on public.qp_notifications
  for all using (auth.uid() = user_id or public.is_qp_admin());

create policy "Admins can manage all notifications" on public.qp_notifications
  for all using (public.is_qp_admin());
