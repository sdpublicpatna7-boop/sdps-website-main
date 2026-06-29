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

-- ── DROP EXISTING POLICIES (allows re-running this script repeatedly without errors) ──
drop policy if exists "Users can view their own profile" on public.qp_profiles;
drop policy if exists "Admins have full access to profiles" on public.qp_profiles;
drop policy if exists "Anyone authenticated can view open archives" on public.qp_archives;
drop policy if exists "Admins have full access to archives" on public.qp_archives;
drop policy if exists "Teachers can view their own assignments" on public.qp_assignments;
drop policy if exists "Incharges can view assignments for classes they oversee" on public.qp_assignments;
drop policy if exists "Printing heads can view approved/printing assignments" on public.qp_assignments;
drop policy if exists "Admins have full access to assignments" on public.qp_assignments;
drop policy if exists "Teachers can read and update their draft papers" on public.qp_papers;
drop policy if exists "Incharges can read submitted papers for classes they oversee" on public.qp_papers;
drop policy if exists "Printing heads can read approved papers" on public.qp_papers;
drop policy if exists "Users can read and update their own notifications" on public.qp_notifications;
drop policy if exists "Admins can manage all notifications" on public.qp_notifications;
drop policy if exists "Anyone can read news" on public.site_news;
drop policy if exists "Admins can manage news" on public.site_news;
drop policy if exists "Anyone can read gallery" on public.site_gallery;
drop policy if exists "Admins can manage gallery" on public.site_gallery;
drop policy if exists "Anyone can read videos" on public.site_videos;
drop policy if exists "Admins can manage videos" on public.site_videos;
drop policy if exists "Anyone can read calendar" on public.site_calendar;
drop policy if exists "Admins can manage calendar" on public.site_calendar;
drop policy if exists "Anyone can read holidays" on public.site_holidays;
drop policy if exists "Admins can manage holidays" on public.site_holidays;
drop policy if exists "Anyone can read council profiles" on public.site_council_profiles;
drop policy if exists "Admins can manage council profiles" on public.site_council_profiles;
drop policy if exists "Anyone can read council posters" on public.site_council_posters;
drop policy if exists "Admins can manage council posters" on public.site_council_posters;
drop policy if exists "Anyone can read council results" on public.site_council_results;
drop policy if exists "Admins can manage council results" on public.site_council_results;
drop policy if exists "Anyone can read approved alumni" on public.alumni_members;
drop policy if exists "Admins can manage alumni" on public.alumni_members;
drop policy if exists "Anyone can read alumni meets" on public.alumni_meets;
drop policy if exists "Admins can manage alumni meets" on public.alumni_meets;
drop policy if exists "Anyone can read testimonials" on public.site_testimonials;
drop policy if exists "Admins can manage testimonials" on public.site_testimonials;
drop policy if exists "Anyone can read legal pages" on public.site_legal_pages;
drop policy if exists "Admins can manage legal pages" on public.site_legal_pages;
drop policy if exists "Anyone can view TCs" on public.tc_records;
drop policy if exists "Admins can manage TCs" on public.tc_records;
drop policy if exists "Anyone can read exam papers" on public.site_exam_papers;
drop policy if exists "Admins can manage exam papers" on public.site_exam_papers;
drop policy if exists "Anyone can read holiday homework" on public.site_holiday_homework;
drop policy if exists "Admins can manage holiday homework" on public.site_holiday_homework;
drop policy if exists "Anyone can read site settings" on public.site_settings;
drop policy if exists "Admins can manage site settings" on public.site_settings;
drop policy if exists "Public can submit admission enquiries" on public.admission_enquiries;
drop policy if exists "Admins can manage enquiries" on public.admission_enquiries;
drop policy if exists "Public can submit admission applications" on public.admission_applications;
drop policy if exists "Public can view their own application status" on public.admission_applications;
drop policy if exists "Admins can manage applications" on public.admission_applications;
drop policy if exists "Public can apply for careers" on public.career_applications;
drop policy if exists "Admins can manage career applications" on public.career_applications;
drop policy if exists "Public can register for alumni" on public.alumni_members;
drop policy if exists "Admins can manage birthday students" on public.birthday_students;
drop policy if exists "Anyone authenticated can view birthday students" on public.birthday_students;

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

-- =============================================================================
-- PUBLIC WEBSITE TABLES
-- =============================================================================

-- 7. News & Notices Table
create table if not exists public.site_news (
  id text primary key,
  title text not null,
  content text not null,
  date date default current_date not null,
  category text not null check (category in ('news', 'notice', 'event')),
  attachment_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.site_news enable row level security;

-- 8. Gallery Table
create table if not exists public.site_gallery (
  id text primary key,
  title text not null,
  image_url text not null,
  category text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.site_gallery enable row level security;

-- 9. Videos Table
create table if not exists public.site_videos (
  id text primary key,
  title text not null,
  youtube_id text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.site_videos enable row level security;

-- 10. Calendar Events Table
create table if not exists public.site_calendar (
  id text primary key,
  title text not null,
  start_date timestamp with time zone not null,
  end_date timestamp with time zone not null,
  color text default '#3b82f6',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.site_calendar enable row level security;

-- 11. Holidays Table
create table if not exists public.site_holidays (
  id text primary key,
  title text not null,
  date date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.site_holidays enable row level security;

-- 12. Student Council Profiles Table
create table if not exists public.site_council_profiles (
  id text primary key,
  name text not null,
  post text not null,
  class_name text not null,
  image_url text,
  votes integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.site_council_profiles enable row level security;

create table if not exists public.site_council_posters (
  id text primary key,
  candidate_name text not null,
  post text not null,
  image_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.site_council_posters enable row level security;

create table if not exists public.site_council_results (
  id text primary key,
  candidate_name text not null,
  post text not null,
  votes integer not null,
  is_winner boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.site_council_results enable row level security;

-- 13. Admissions Enquiry Table
create table if not exists public.admission_enquiries (
  id text primary key,
  parent_name text not null,
  phone text not null,
  email text not null,
  child_name text not null,
  child_class text not null,
  message text,
  status text default 'pending' check (status in ('pending', 'contacted', 'resolved')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.admission_enquiries enable row level security;

-- 14. Admissions Application Table
create table if not exists public.admission_applications (
  id text primary key,
  student_name text not null,
  father_name text not null,
  mother_name text not null,
  dob date not null,
  class_applied text not null,
  email text not null,
  phone text not null,
  address text not null,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  payment_status text default 'unpaid' check (payment_status in ('unpaid', 'paid')),
  payment_id text,
  order_id text,
  amount_inr integer default 500 not null,
  receipt_sent boolean default false not null,
  receipt_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.admission_applications enable row level security;

-- 15. Career Applications Table
create table if not exists public.career_applications (
  id text primary key,
  name text not null,
  email text not null,
  phone text not null,
  post text not null,
  resume_url text not null,
  experience text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.career_applications enable row level security;

-- 16. Alumni Members Table
create table if not exists public.alumni_members (
  id text primary key,
  name text not null,
  email text unique not null,
  phone text,
  batch_year integer not null,
  current_occupation text,
  location text,
  approved boolean default false not null,
  payment_status text default 'unpaid' check (payment_status in ('unpaid', 'paid')),
  payment_id text,
  order_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.alumni_members enable row level security;

create table if not exists public.alumni_meets (
  id text primary key,
  title text not null,
  date date not null,
  location text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.alumni_meets enable row level security;

-- 17. Transfer Certificate (TC) Records Table
create table if not exists public.tc_records (
  id text primary key,
  student_name text not null,
  admission_no text not null,
  issue_date date not null,
  status text default 'active' check (status in ('active', 'cancelled')),
  file_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.tc_records enable row level security;

-- 18. Testimonials Table
create table if not exists public.site_testimonials (
  id text primary key,
  author text not null,
  role text default 'Parent' not null,
  content text not null,
  rating integer default 5 not null check (rating >= 1 and rating <= 5),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.site_testimonials enable row level security;

-- 19. Legal Pages Table
create table if not exists public.site_legal_pages (
  id text primary key,
  title text not null,
  content text not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.site_legal_pages enable row level security;

-- 20. Annual Exam Papers Table
create table if not exists public.site_exam_papers (
  id text primary key,
  title text not null,
  class_name text not null,
  subject text not null,
  file_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.site_exam_papers enable row level security;

-- 21. Holiday Homework Table
create table if not exists public.site_holiday_homework (
  id text primary key,
  title text not null,
  class_name text not null,
  subject text not null,
  file_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.site_holiday_homework enable row level security;

-- 22. Site Settings Table
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.site_settings enable row level security;

-- =============================================================================
-- PUBLIC WEBSITE RLS SECURITY POLICIES
-- =============================================================================

-- ── READ FOR EVERYONE, WRITE FOR ADMINS POLICIES ──
create policy "Anyone can read news" on public.site_news for select using (true);
create policy "Admins can manage news" on public.site_news for all using (public.is_qp_admin());

create policy "Anyone can read gallery" on public.site_gallery for select using (true);
create policy "Admins can manage gallery" on public.site_gallery for all using (public.is_qp_admin());

create policy "Anyone can read videos" on public.site_videos for select using (true);
create policy "Admins can manage videos" on public.site_videos for all using (public.is_qp_admin());

create policy "Anyone can read calendar" on public.site_calendar for select using (true);
create policy "Admins can manage calendar" on public.site_calendar for all using (public.is_qp_admin());

create policy "Anyone can read holidays" on public.site_holidays for select using (true);
create policy "Admins can manage holidays" on public.site_holidays for all using (public.is_qp_admin());

create policy "Anyone can read council profiles" on public.site_council_profiles for select using (true);
create policy "Admins can manage council profiles" on public.site_council_profiles for all using (public.is_qp_admin());

create policy "Anyone can read council posters" on public.site_council_posters for select using (true);
create policy "Admins can manage council posters" on public.site_council_posters for all using (public.is_qp_admin());

create policy "Anyone can read council results" on public.site_council_results for select using (true);
create policy "Admins can manage council results" on public.site_council_results for all using (public.is_qp_admin());

create policy "Anyone can read approved alumni" on public.alumni_members for select using (approved = true or public.is_qp_admin());
create policy "Admins can manage alumni" on public.alumni_members for all using (public.is_qp_admin());

create policy "Anyone can read alumni meets" on public.alumni_meets for select using (true);
create policy "Admins can manage alumni meets" on public.alumni_meets for all using (public.is_qp_admin());

create policy "Anyone can read testimonials" on public.site_testimonials for select using (true);
create policy "Admins can manage testimonials" on public.site_testimonials for all using (public.is_qp_admin());

create policy "Anyone can read legal pages" on public.site_legal_pages for select using (true);
create policy "Admins can manage legal pages" on public.site_legal_pages for all using (public.is_qp_admin());

create policy "Anyone can view TCs" on public.tc_records for select using (true);
create policy "Admins can manage TCs" on public.tc_records for all using (public.is_qp_admin());

create policy "Anyone can read exam papers" on public.site_exam_papers for select using (true);
create policy "Admins can manage exam papers" on public.site_exam_papers for all using (public.is_qp_admin());

create policy "Anyone can read holiday homework" on public.site_holiday_homework for select using (true);
create policy "Admins can manage holiday homework" on public.site_holiday_homework for all using (public.is_qp_admin());

create policy "Anyone can read site settings" on public.site_settings for select using (true);
create policy "Admins can manage site settings" on public.site_settings for all using (public.is_qp_admin());

-- ── WRITE/INSERT BY PUBLIC, READ/MANAGE BY ADMIN POLICIES ──
create policy "Public can submit admission enquiries" on public.admission_enquiries for insert with check (true);
create policy "Admins can manage enquiries" on public.admission_enquiries for all using (public.is_qp_admin());

create policy "Public can submit admission applications" on public.admission_applications for insert with check (true);
create policy "Public can view their own application status" on public.admission_applications for select using (true);
create policy "Admins can manage applications" on public.admission_applications for all using (public.is_qp_admin());

create policy "Public can apply for careers" on public.career_applications for insert with check (true);
create policy "Admins can manage career applications" on public.career_applications for all using (public.is_qp_admin());

create policy "Public can register for alumni" on public.alumni_members for insert with check (true);

-- 23. Birthday Students Table
create table if not exists public.birthday_students (
  id text primary key,
  student_name text not null,
  class_name text not null,
  dob date not null,
  phone text,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.birthday_students enable row level security;
create policy "Admins can manage birthday students" on public.birthday_students for all using (public.is_qp_admin());
create policy "Anyone authenticated can view birthday students" on public.birthday_students for select using (auth.role() = 'authenticated');


