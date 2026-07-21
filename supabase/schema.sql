-- =====================================================================
-- STRATOS NOVA HR SOLUTIONS — CORE DATABASE SCHEMA
-- Run this in Supabase SQL Editor (Project > SQL Editor > New Query)
-- =====================================================================

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
create type user_role as enum ('candidate', 'employer', 'admin');
create type job_status as enum ('draft', 'active', 'paused', 'closed');
create type employment_type as enum ('full_time', 'part_time', 'contract', 'internship');
create type work_mode as enum ('remote', 'onsite', 'hybrid');
create type application_status as enum (
  'applied', 'under_review', 'shortlisted', 'interview_scheduled',
  'interview_completed', 'selected', 'offer_released', 'joined', 'rejected', 'withdrawn'
);
create type employer_approval_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type notification_type as enum (
  'application_update', 'interview_reminder', 'job_expiry', 'password_reset', 'system'
);

-- ---------------------------------------------------------------------
-- USERS & PROFILES  (users mirrors auth.users; profiles holds role-specific data)
-- ---------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  role user_role not null default 'candidate',
  full_name text,
  phone text,
  avatar_url text,
  is_active boolean default true,
  email_verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.profiles (
  id uuid primary key references public.users(id) on delete cascade,
  headline text,
  bio text,
  location text,
  preferred_location text,
  expected_salary_min integer,
  expected_salary_max integer,
  resume_url text,
  resume_filename text,
  linkedin_url text,
  portfolio_url text,
  github_url text,
  education jsonb default '[]',      -- [{degree, institution, year, grade}]
  experience jsonb default '[]',     -- [{title, company, start, end, description}]
  availability text,                 -- 'immediate', '15_days', '30_days', '60_days'
  profile_completion integer default 0,
  updated_at timestamptz default now()
);

create table public.skills (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null,
  category text
);

create table public.candidate_skills (
  candidate_id uuid references public.users(id) on delete cascade,
  skill_id uuid references public.skills(id) on delete cascade,
  proficiency text default 'intermediate', -- beginner/intermediate/advanced/expert
  primary key (candidate_id, skill_id)
);

-- ---------------------------------------------------------------------
-- COMPANIES & EMPLOYERS
-- ---------------------------------------------------------------------
create table public.companies (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references public.users(id) on delete cascade,
  name text not null,
  website text,
  logo_url text,
  gst_number text,
  company_size text,       -- '1-10','11-50','51-200','201-500','500+'
  industry text,
  about text,
  hiring_contact_name text,
  hiring_contact_email text,
  hiring_contact_phone text,
  approval_status employer_approval_status default 'pending',
  approved_at timestamptz,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- JOBS
-- ---------------------------------------------------------------------
create table public.jobs (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies(id) on delete cascade,
  posted_by uuid references public.users(id),
  title text not null,
  description text not null,
  responsibilities text,
  requirements text,
  location text,
  employment_type employment_type not null default 'full_time',
  work_mode work_mode not null default 'onsite',
  experience_min numeric default 0,
  experience_max numeric,
  salary_min integer,
  salary_max integer,
  salary_currency text default 'INR',
  industry text,
  status job_status default 'draft',
  expires_at timestamptz,
  views_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.job_skills (
  job_id uuid references public.jobs(id) on delete cascade,
  skill_id uuid references public.skills(id) on delete cascade,
  is_required boolean default true,
  primary key (job_id, skill_id)
);

-- ---------------------------------------------------------------------
-- APPLICATIONS & INTERVIEWS
-- ---------------------------------------------------------------------
create table public.applications (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid references public.jobs(id) on delete cascade,
  candidate_id uuid references public.users(id) on delete cascade,
  status application_status default 'applied',
  cover_note text,
  resume_url text,
  applied_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (job_id, candidate_id)
);

create table public.interviews (
  id uuid primary key default uuid_generate_v4(),
  application_id uuid references public.applications(id) on delete cascade,
  scheduled_at timestamptz not null,
  duration_minutes integer default 30,
  mode text default 'video', -- video/phone/onsite
  meeting_link text,
  interviewer_name text,
  round text,                -- 'screening','technical','hr','final'
  status text default 'scheduled', -- scheduled/completed/cancelled/rescheduled
  feedback text,
  rating integer,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- SAVED JOBS, MESSAGES, NOTIFICATIONS, ACTIVITY LOG
-- ---------------------------------------------------------------------
create table public.saved_jobs (
  candidate_id uuid references public.users(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete cascade,
  saved_at timestamptz default now(),
  primary key (candidate_id, job_id)
);

create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid references public.users(id) on delete cascade,
  recipient_id uuid references public.users(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  body text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text,
  link text,
  is_read boolean default false,
  created_at timestamptz default now()
);

create table public.activity_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb default '{}',
  ip_address text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- CMS: BLOGS, TESTIMONIALS, FAQS, CONTACT, NEWSLETTER
-- ---------------------------------------------------------------------
create table public.blogs (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid references public.users(id),
  title text not null,
  slug text unique not null,
  excerpt text,
  content text not null,
  cover_image_url text,
  is_published boolean default false,
  published_at timestamptz,
  created_at timestamptz default now()
);

create table public.testimonials (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  role text,
  company text,
  avatar_url text,
  quote text not null,
  rating integer default 5,
  is_featured boolean default false,
  created_at timestamptz default now()
);

create table public.faqs (
  id uuid primary key default uuid_generate_v4(),
  question text not null,
  answer text not null,
  category text default 'general',
  sort_order integer default 0
);

create table public.contact_queries (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null,
  phone text,
  subject text,
  message text not null,
  is_resolved boolean default false,
  created_at timestamptz default now()
);

create table public.newsletter (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  subscribed_at timestamptz default now(),
  is_active boolean default true
);

-- =====================================================================
-- INDEXES
-- =====================================================================
create index idx_jobs_status on public.jobs(status);
create index idx_jobs_company on public.jobs(company_id);
create index idx_applications_job on public.applications(job_id);
create index idx_applications_candidate on public.applications(candidate_id);
create index idx_notifications_user on public.notifications(user_id, is_read);
create index idx_companies_owner on public.companies(owner_id);
create index idx_messages_recipient on public.messages(recipient_id, is_read);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.interviews enable row level security;
alter table public.saved_jobs enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;
alter table public.blogs enable row level security;
alter table public.testimonials enable row level security;
alter table public.faqs enable row level security;
alter table public.contact_queries enable row level security;
alter table public.newsletter enable row level security;

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.users where id = auth.uid() and role = 'admin');
$$;

-- USERS
create policy "Users can view own record" on public.users for select using (auth.uid() = id);
create policy "Admins view all users" on public.users for select using (public.is_admin());
create policy "Users update own record" on public.users for update using (auth.uid() = id);

-- PROFILES
create policy "Candidate manages own profile" on public.profiles for all using (auth.uid() = id);
create policy "Employers view candidate profiles" on public.profiles for select using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('employer','admin'))
);

-- COMPANIES
create policy "Employer manages own company" on public.companies for all using (auth.uid() = owner_id);
create policy "Public views approved companies" on public.companies for select using (approval_status = 'approved');
create policy "Admin manages all companies" on public.companies for all using (public.is_admin());

-- JOBS
create policy "Public views active jobs" on public.jobs for select using (status = 'active');
create policy "Employer manages own jobs" on public.jobs for all using (
  exists (select 1 from public.companies c where c.id = jobs.company_id and c.owner_id = auth.uid())
);
create policy "Admin manages all jobs" on public.jobs for all using (public.is_admin());

-- APPLICATIONS
create policy "Candidate manages own applications" on public.applications for all using (auth.uid() = candidate_id);
create policy "Employer views applications to own jobs" on public.applications for select using (
  exists (
    select 1 from public.jobs j join public.companies c on c.id = j.company_id
    where j.id = applications.job_id and c.owner_id = auth.uid()
  )
);
create policy "Employer updates application status" on public.applications for update using (
  exists (
    select 1 from public.jobs j join public.companies c on c.id = j.company_id
    where j.id = applications.job_id and c.owner_id = auth.uid()
  )
);

-- INTERVIEWS
create policy "Involved parties view interviews" on public.interviews for select using (
  exists (
    select 1 from public.applications a
    where a.id = interviews.application_id
    and (a.candidate_id = auth.uid()
      or exists (select 1 from public.jobs j join public.companies c on c.id = j.company_id
                 where j.id = a.job_id and c.owner_id = auth.uid()))
  )
);
create policy "Employer manages interviews" on public.interviews for all using (
  exists (
    select 1 from public.applications a join public.jobs j on j.id = a.job_id
    join public.companies c on c.id = j.company_id
    where a.id = interviews.application_id and c.owner_id = auth.uid()
  )
);

-- SAVED JOBS
create policy "Candidate manages saved jobs" on public.saved_jobs for all using (auth.uid() = candidate_id);

-- MESSAGES
create policy "Users view own messages" on public.messages for select using (
  auth.uid() = sender_id or auth.uid() = recipient_id
);
create policy "Users send messages" on public.messages for insert with check (auth.uid() = sender_id);

-- NOTIFICATIONS
create policy "Users view own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "Users update own notifications" on public.notifications for update using (auth.uid() = user_id);

-- ACTIVITY LOGS (admin only read)
create policy "Admin views activity logs" on public.activity_logs for select using (public.is_admin());

-- CMS TABLES (public read, admin write)
create policy "Public reads published blogs" on public.blogs for select using (is_published = true);
create policy "Admin manages blogs" on public.blogs for all using (public.is_admin());

create policy "Public reads testimonials" on public.testimonials for select using (true);
create policy "Admin manages testimonials" on public.testimonials for all using (public.is_admin());

create policy "Public reads faqs" on public.faqs for select using (true);
create policy "Admin manages faqs" on public.faqs for all using (public.is_admin());

create policy "Anyone submits contact query" on public.contact_queries for insert with check (true);
create policy "Admin views contact queries" on public.contact_queries for select using (public.is_admin());

create policy "Anyone subscribes newsletter" on public.newsletter for insert with check (true);
create policy "Admin views newsletter" on public.newsletter for select using (public.is_admin());

-- =====================================================================
-- TRIGGERS: auto-create users row on signup, auto-update timestamps
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, role, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'candidate')::user_role,
    new.raw_user_meta_data->>'full_name'
  );
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_jobs_updated before update on public.jobs
  for each row execute function public.set_updated_at();
create trigger trg_applications_updated before update on public.applications
  for each row execute function public.set_updated_at();
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- =====================================================================
-- STORAGE BUCKETS (resumes, avatars, company logos)
-- =====================================================================
insert into storage.buckets (id, name, public) values ('resumes', 'resumes', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('company-logos', 'company-logos', true)
  on conflict (id) do nothing;

create policy "Candidate manages own resume" on storage.objects for all using (
  bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "Employers read applicant resumes" on storage.objects for select using (
  bucket_id = 'resumes' and exists (
    select 1 from public.applications a
    join public.jobs j on j.id = a.job_id
    join public.companies c on c.id = j.company_id
    where a.candidate_id::text = (storage.foldername(name))[1] and c.owner_id = auth.uid()
  )
);

create policy "Public reads avatars" on storage.objects for select using (bucket_id = 'avatars');
create policy "Users manage own avatar" on storage.objects for insert with check (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "Users update own avatar" on storage.objects for update using (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Public reads company logos" on storage.objects for select using (bucket_id = 'company-logos');
create policy "Employers manage own logo" on storage.objects for insert with check (
  bucket_id = 'company-logos' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "Employers update own logo" on storage.objects for update using (
  bucket_id = 'company-logos' and (storage.foldername(name))[1] = auth.uid()::text
);
