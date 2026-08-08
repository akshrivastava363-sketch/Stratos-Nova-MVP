-- =====================================================================
-- STRATOS NOVA — FULL SCHEMA (Platform 2.0)
-- For a FRESH Supabase project only. Run this top to bottom once.
-- If you already have the base MVP schema deployed, use
-- migration_2.0.sql instead — do not run this file on an existing project.
-- =====================================================================

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
create type user_role as enum ('candidate', 'employer', 'recruiter', 'admin');
create type job_status as enum ('draft', 'active', 'paused', 'closed');
create type employment_type as enum ('full_time', 'part_time', 'contract', 'internship');
create type work_mode as enum ('remote', 'onsite', 'hybrid');
create type application_status as enum (
  'applied', 'under_review', 'shortlisted', 'interview_scheduled',
  'interview_completed', 'on_hold', 'selected', 'offer_released', 'joined', 'rejected', 'withdrawn'
);
create type employer_approval_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type notification_type as enum ('application_update', 'interview_reminder', 'job_expiry', 'password_reset', 'system');
create type candidate_status as enum ('open_to_work', 'serving_notice', 'interviewing', 'immediate_joiner', 'not_looking', 'inactive');
create type verification_status as enum ('unverified', 'pending', 'verified', 'failed');
create type plan_tier as enum ('free', 'starter', 'growth', 'scale', 'enterprise');
create type assessment_run_status as enum ('not_started', 'in_progress', 'completed', 'flagged');
create type recruiter_assignment_status as enum ('active', 'completed', 'withdrawn');

-- ---------------------------------------------------------------------
-- USERS & PROFILES
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
  work_mode_preference work_mode,
  expected_salary_min integer,
  expected_salary_max integer,
  current_salary integer,
  notice_period text,
  languages text[] default '{}',
  candidate_status candidate_status default 'open_to_work',
  status_updated_at timestamptz default now(),
  resume_url text,
  resume_filename text,
  resume_ats_url text,
  resume_professional_url text,
  resume_generated_at timestamptz,
  linkedin_url text,
  portfolio_url text,
  github_url text,
  education jsonb default '[]',
  experience jsonb default '[]',
  startup_experience boolean default false,
  enterprise_experience boolean default false,
  current_employer text,
  availability text,
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
  proficiency text default 'intermediate',
  skill_category text default 'primary',
  primary key (candidate_id, skill_id)
);

-- ---------------------------------------------------------------------
-- STRUCTURED EDUCATION & EMPLOYMENT RECORDS
-- ---------------------------------------------------------------------
create table public.education_records (
  id uuid primary key default uuid_generate_v4(),
  candidate_id uuid references public.users(id) on delete cascade,
  qualification text,
  degree text,
  college text,
  university text,
  specialization text,
  passing_year integer,
  percentage numeric,
  document_url text,
  verification_status verification_status default 'unverified',
  verification_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.employment_records (
  id uuid primary key default uuid_generate_v4(),
  candidate_id uuid references public.users(id) on delete cascade,
  company text not null,
  designation text,
  joining_date date,
  exit_date date,
  is_current boolean default false,
  responsibilities text,
  industry text,
  experience_letter_url text,
  verification_status verification_status default 'unverified',
  verification_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_employment_candidate on public.employment_records(candidate_id);
create index idx_education_candidate on public.education_records(candidate_id);

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
  company_size text,
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
  department text,
  openings integer default 1,
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
  skill_category text default 'primary',
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
  mode text default 'video',
  meeting_link text,
  interviewer_name text,
  round text,
  status text default 'scheduled',
  feedback text,
  rating integer,
  scorecard jsonb default '{}',
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- ASSESSMENTS
-- ---------------------------------------------------------------------
create table public.assessment_templates (
  id uuid primary key default uuid_generate_v4(),
  role_category text not null,
  title text not null,
  description text,
  duration_minutes integer default 30,
  passing_score numeric default 60,
  question_count integer default 20,
  is_active boolean default true,
  created_by uuid references public.users(id),
  created_at timestamptz default now()
);

create table public.assessment_results (
  id uuid primary key default uuid_generate_v4(),
  candidate_id uuid references public.users(id) on delete cascade,
  template_id uuid references public.assessment_templates(id),
  score numeric,
  status assessment_run_status default 'not_started',
  proctoring_flags jsonb default '[]',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);

create index idx_assessment_results_candidate on public.assessment_results(candidate_id);

-- ---------------------------------------------------------------------
-- SUBSCRIPTIONS
-- ---------------------------------------------------------------------
create table public.subscription_plans (
  id uuid primary key default uuid_generate_v4(),
  tier plan_tier unique not null,
  name text not null,
  monthly_price integer default 0,
  active_job_limit integer,
  candidate_search_limit integer,
  recruiter_assist_included boolean default false,
  features jsonb default '[]',
  is_active boolean default true,
  created_at timestamptz default now()
);

create table public.company_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies(id) on delete cascade,
  plan_id uuid references public.subscription_plans(id),
  status text default 'active',
  started_at timestamptz default now(),
  renews_at timestamptz,
  created_at timestamptz default now()
);

insert into public.subscription_plans (tier, name, monthly_price, active_job_limit, candidate_search_limit, recruiter_assist_included, features) values
  ('free', 'Free', 0, 1, 20, false, '["Basic job posting","Basic candidate search"]'),
  ('starter', 'Starter', 2999, 3, 100, false, '["Priority listing","Candidate matching"]'),
  ('growth', 'Growth', 7999, 10, 500, true, '["Recruiter Assist","Advanced filters","Analytics"]'),
  ('scale', 'Scale', 19999, 30, null, true, '["Unlimited search","Dedicated support"]'),
  ('enterprise', 'Enterprise', null, null, null, true, '["Custom contract","API access","SSO"]');

-- ---------------------------------------------------------------------
-- RECRUITER ASSIST
-- ---------------------------------------------------------------------
create table public.recruiter_assignments (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid references public.jobs(id) on delete cascade,
  recruiter_id uuid references public.users(id),
  assigned_by uuid references public.users(id),
  status recruiter_assignment_status default 'active',
  notes text,
  assigned_at timestamptz default now(),
  completed_at timestamptz
);

-- ---------------------------------------------------------------------
-- VERIFICATION REGISTRY (modular — inert until a real provider is wired in)
-- ---------------------------------------------------------------------
create table public.verification_sources (
  id uuid primary key default uuid_generate_v4(),
  source_type text not null,
  provider_name text not null,
  is_active boolean default false,
  config jsonb default '{}',
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
alter table public.education_records enable row level security;
alter table public.employment_records enable row level security;
alter table public.assessment_templates enable row level security;
alter table public.assessment_results enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.company_subscriptions enable row level security;
alter table public.recruiter_assignments enable row level security;
alter table public.verification_sources enable row level security;
alter table public.skills enable row level security;
alter table public.candidate_skills enable row level security;
alter table public.job_skills enable row level security;

create or replace function public.is_admin()
returns boolean language sql security definer stable
set search_path = public
as $$
  select exists (select 1 from public.users where id = auth.uid() and role = 'admin');
$$;

-- Security-definer role lookup — used by policies that need to check the
-- caller's role from WITHIN a policy on the users table itself. A raw
-- subquery on public.users inside a users-table policy risks recursion;
-- this function bypasses RLS internally so it's safe to use here.
create or replace function public.my_role()
returns user_role language sql security definer stable
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

-- USERS
create policy "Users can view own record" on public.users for select using (auth.uid() = id);
create policy "Admins view all users" on public.users for select using (public.is_admin());
create policy "Users update own record" on public.users for update using (auth.uid() = id);
create policy "Admins update any user" on public.users for update using (public.is_admin());
create policy "Employer/recruiter/admin view other user records" on public.users for select using (
  public.my_role() in ('employer', 'recruiter', 'admin')
);

-- PROFILES
create policy "Candidate manages own profile" on public.profiles for all using (auth.uid() = id);
create policy "Employers/recruiters view candidate profiles" on public.profiles for select using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('employer', 'recruiter', 'admin'))
);

-- EDUCATION / EMPLOYMENT
create policy "Candidate manages own education" on public.education_records for all using (auth.uid() = candidate_id);
create policy "Candidate manages own employment" on public.employment_records for all using (auth.uid() = candidate_id);
create policy "Employers/recruiters view education" on public.education_records for select using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('employer', 'recruiter', 'admin'))
);
create policy "Employers/recruiters view employment" on public.employment_records for select using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('employer', 'recruiter', 'admin'))
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
create policy "Recruiter reads assigned job details" on public.jobs for select using (
  exists (select 1 from public.recruiter_assignments ra where ra.job_id = jobs.id and ra.recruiter_id = auth.uid() and ra.status = 'active')
);
create policy "Admin manages all jobs" on public.jobs for all using (public.is_admin());

-- APPLICATIONS
create policy "Candidate manages own applications" on public.applications for all using (auth.uid() = candidate_id);
create policy "Employer views applications to own jobs" on public.applications for select using (
  exists (select 1 from public.jobs j join public.companies c on c.id = j.company_id where j.id = applications.job_id and c.owner_id = auth.uid())
);
create policy "Employer updates application status" on public.applications for update using (
  exists (select 1 from public.jobs j join public.companies c on c.id = j.company_id where j.id = applications.job_id and c.owner_id = auth.uid())
);
create policy "Recruiter views applications on assigned jobs" on public.applications for select using (
  exists (select 1 from public.recruiter_assignments ra where ra.job_id = applications.job_id and ra.recruiter_id = auth.uid() and ra.status = 'active')
);
create policy "Recruiter updates applications on assigned jobs" on public.applications for update using (
  exists (select 1 from public.recruiter_assignments ra where ra.job_id = applications.job_id and ra.recruiter_id = auth.uid() and ra.status = 'active')
);

-- INTERVIEWS
create policy "Involved parties view interviews" on public.interviews for select using (
  exists (
    select 1 from public.applications a
    where a.id = interviews.application_id
    and (a.candidate_id = auth.uid()
      or exists (select 1 from public.jobs j join public.companies c on c.id = j.company_id where j.id = a.job_id and c.owner_id = auth.uid()))
  )
);
create policy "Employer manages interviews" on public.interviews for all using (
  exists (
    select 1 from public.applications a join public.jobs j on j.id = a.job_id join public.companies c on c.id = j.company_id
    where a.id = interviews.application_id and c.owner_id = auth.uid()
  )
);
create policy "Recruiter manages interviews on assigned jobs" on public.interviews for all using (
  exists (
    select 1 from public.applications a join public.recruiter_assignments ra on ra.job_id = a.job_id
    where a.id = interviews.application_id and ra.recruiter_id = auth.uid() and ra.status = 'active'
  )
);

-- ASSESSMENTS
create policy "Public reads active assessment templates" on public.assessment_templates for select using (is_active = true);
create policy "Admin manages assessment templates" on public.assessment_templates for all using (public.is_admin());
create policy "Candidate manages own assessment results" on public.assessment_results for all using (auth.uid() = candidate_id);
create policy "Employers/recruiters view assessment results" on public.assessment_results for select using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('employer', 'recruiter', 'admin'))
);

-- SUBSCRIPTIONS
create policy "Public reads subscription plans" on public.subscription_plans for select using (is_active = true);
create policy "Admin manages subscription plans" on public.subscription_plans for all using (public.is_admin());
create policy "Employer views own subscription" on public.company_subscriptions for select using (
  exists (select 1 from public.companies c where c.id = company_subscriptions.company_id and c.owner_id = auth.uid())
);
create policy "Employer manages own subscription" on public.company_subscriptions for insert with check (
  exists (select 1 from public.companies c where c.id = company_subscriptions.company_id and c.owner_id = auth.uid())
);
create policy "Employer updates own subscription" on public.company_subscriptions for update using (
  exists (select 1 from public.companies c where c.id = company_subscriptions.company_id and c.owner_id = auth.uid())
);
create policy "Admin manages company subscriptions" on public.company_subscriptions for all using (public.is_admin());

-- RECRUITER ASSIGNMENTS
create policy "Recruiter views own assignments" on public.recruiter_assignments for select using (auth.uid() = recruiter_id);
create policy "Employer manages assignments on own jobs" on public.recruiter_assignments for all using (
  exists (select 1 from public.jobs j join public.companies c on c.id = j.company_id where j.id = recruiter_assignments.job_id and c.owner_id = auth.uid())
);
create policy "Admin manages all assignments" on public.recruiter_assignments for all using (public.is_admin());

-- VERIFICATION SOURCES
create policy "Admin manages verification sources" on public.verification_sources for all using (public.is_admin());

-- SKILLS TAXONOMY (shared, no owner — any authenticated user can read/add,
-- since candidates and employers both contribute new skill tags on the fly)
create policy "Anyone reads skills" on public.skills for select using (true);
create policy "Authenticated users add skills" on public.skills for insert with check (auth.role() = 'authenticated');

-- CANDIDATE SKILLS
create policy "Candidate manages own skills" on public.candidate_skills for all using (auth.uid() = candidate_id);
create policy "Employer/recruiter/admin view candidate skills" on public.candidate_skills for select using (
  public.my_role() in ('employer', 'recruiter', 'admin')
);

-- JOB SKILLS
create policy "Public reads job skills" on public.job_skills for select using (true);
create policy "Employer manages own job skills" on public.job_skills for all using (
  exists (select 1 from public.jobs j join public.companies c on c.id = j.company_id where j.id = job_skills.job_id and c.owner_id = auth.uid())
);
create policy "Admin manages job skills" on public.job_skills for all using (public.is_admin());

-- SAVED JOBS / MESSAGES / NOTIFICATIONS
create policy "Candidate manages saved jobs" on public.saved_jobs for all using (auth.uid() = candidate_id);
create policy "Users view own messages" on public.messages for select using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "Users send messages" on public.messages for insert with check (auth.uid() = sender_id);
create policy "Users view own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "Users update own notifications" on public.notifications for update using (auth.uid() = user_id);
create policy "Employer/recruiter/admin create notifications" on public.notifications for insert with check (
  public.my_role() in ('employer', 'recruiter', 'admin')
);

-- ACTIVITY LOGS
create policy "Admin views activity logs" on public.activity_logs for select using (public.is_admin());

-- CMS
create policy "Public reads published blogs" on public.blogs for select using (is_published = true);
create policy "Admin manages blogs" on public.blogs for all using (public.is_admin());
create policy "Public reads testimonials" on public.testimonials for select using (true);
create policy "Admin manages testimonials" on public.testimonials for all using (public.is_admin());
create policy "Public reads faqs" on public.faqs for select using (true);
create policy "Admin manages faqs" on public.faqs for all using (public.is_admin());
create policy "Anyone submits contact query" on public.contact_queries for insert with check (true);
create policy "Admin views contact queries" on public.contact_queries for select using (public.is_admin());
create policy "Admin updates contact queries" on public.contact_queries for update using (public.is_admin());
create policy "Anyone subscribes newsletter" on public.newsletter for insert with check (true);
create policy "Admin views newsletter" on public.newsletter for select using (public.is_admin());

-- =====================================================================
-- TRIGGERS
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, role, full_name)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'role', 'candidate')::public.user_role,
    new.raw_user_meta_data->>'full_name'
  );
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_jobs_updated before update on public.jobs for each row execute function public.set_updated_at();
create trigger trg_applications_updated before update on public.applications for each row execute function public.set_updated_at();
create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger trg_education_updated before update on public.education_records for each row execute function public.set_updated_at();
create trigger trg_employment_updated before update on public.employment_records for each row execute function public.set_updated_at();

-- Auto-inactivity for candidate status (call manually or via pg_cron — see README)
create or replace function public.mark_inactive_candidates(days_threshold integer default 45)
returns void language plpgsql security definer
set search_path = public
as $$
begin
  update public.profiles
  set candidate_status = 'inactive'
  where candidate_status not in ('inactive', 'not_looking')
    and status_updated_at < now() - (days_threshold || ' days')::interval;
end;
$$;

-- =====================================================================
-- STORAGE BUCKETS
-- =====================================================================
insert into storage.buckets (id, name, public) values ('resumes', 'resumes', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('company-logos', 'company-logos', true) on conflict (id) do nothing;

create policy "Candidate manages own resume" on storage.objects for all using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Employers/recruiters read applicant resumes" on storage.objects for select using (
  bucket_id = 'resumes' and (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('employer', 'recruiter', 'admin'))
  )
);
create policy "Public reads avatars" on storage.objects for select using (bucket_id = 'avatars');
create policy "Users manage own avatar" on storage.objects for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users update own avatar" on storage.objects for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Public reads company logos" on storage.objects for select using (bucket_id = 'company-logos');
create policy "Employers manage own logo" on storage.objects for insert with check (bucket_id = 'company-logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Employers update own logo" on storage.objects for update using (bucket_id = 'company-logos' and (storage.foldername(name))[1] = auth.uid()::text);
