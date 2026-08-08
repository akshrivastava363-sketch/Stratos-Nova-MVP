-- =====================================================================
-- REPAIR — STEP 2 of 2
-- Only run this AFTER Step 1 has shown "Success" on its own.
-- Everything here is idempotent — every CREATE is guarded, every POLICY
-- is dropped-then-recreated, every INSERT skips existing rows. Safe to
-- run more than once if you're ever unsure what state the database is in.
-- =====================================================================

-- ---------------------------------------------------------------------
-- PROFILE COLUMN ADDITIONS (Platform 2.0 + candidate outreach)
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists work_mode_preference work_mode;
alter table public.profiles add column if not exists notice_period text;
alter table public.profiles add column if not exists languages text[] default '{}';
alter table public.profiles add column if not exists candidate_status candidate_status default 'open_to_work';
alter table public.profiles add column if not exists status_updated_at timestamptz default now();
alter table public.profiles add column if not exists resume_ats_url text;
alter table public.profiles add column if not exists resume_professional_url text;
alter table public.profiles add column if not exists resume_generated_at timestamptz;
alter table public.profiles add column if not exists startup_experience boolean default false;
alter table public.profiles add column if not exists enterprise_experience boolean default false;
alter table public.profiles add column if not exists current_employer text;
alter table public.profiles add column if not exists current_salary integer;
alter table public.profiles add column if not exists outreach_status outreach_status default 'new';
alter table public.profiles add column if not exists outreach_status_updated_at timestamptz default now();
alter table public.profiles add column if not exists profile_confirmed_at timestamptz;

create index if not exists idx_profiles_outreach_status on public.profiles(outreach_status);

-- ---------------------------------------------------------------------
-- APPLICATIONS / INTERVIEWS / SKILLS COLUMN ADDITIONS
-- ---------------------------------------------------------------------
alter table public.interviews add column if not exists scorecard jsonb default '{}';
alter table public.candidate_skills add column if not exists skill_category text default 'primary';
alter table public.job_skills add column if not exists skill_category text default 'primary';

-- ---------------------------------------------------------------------
-- NEW TABLES
-- ---------------------------------------------------------------------
create table if not exists public.education_records (
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

create table if not exists public.employment_records (
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

create index if not exists idx_employment_candidate on public.employment_records(candidate_id);
create index if not exists idx_education_candidate on public.education_records(candidate_id);

create table if not exists public.assessment_templates (
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

create table if not exists public.assessment_results (
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

create index if not exists idx_assessment_results_candidate on public.assessment_results(candidate_id);

create table if not exists public.subscription_plans (
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

create table if not exists public.company_subscriptions (
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
  ('enterprise', 'Enterprise', null, null, null, true, '["Custom contract","API access","SSO"]')
on conflict (tier) do nothing;

create table if not exists public.recruiter_assignments (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid references public.jobs(id) on delete cascade,
  recruiter_id uuid references public.users(id),
  assigned_by uuid references public.users(id),
  status recruiter_assignment_status default 'active',
  notes text,
  assigned_at timestamptz default now(),
  completed_at timestamptz
);

create table if not exists public.verification_sources (
  id uuid primary key default uuid_generate_v4(),
  source_type text not null,
  provider_name text not null,
  is_active boolean default false,
  config jsonb default '{}',
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- RLS — enabling is always safe to re-run, never errors if already on
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- FUNCTIONS — CREATE OR REPLACE is always idempotent-safe
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql security definer stable
set search_path = public
as $$
  select exists (select 1 from public.users where id = auth.uid() and role = 'admin');
$$;

create or replace function public.my_role()
returns user_role language sql security definer stable
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.set_candidate_outreach_status(p_candidate_id uuid, p_status outreach_status)
returns void language plpgsql security definer
set search_path = public
as $$
begin
  if public.my_role() not in ('recruiter', 'admin') then
    raise exception 'Not authorized to update candidate outreach status';
  end if;
  update public.profiles
  set outreach_status = p_status, outreach_status_updated_at = now()
  where id = p_candidate_id;
end;
$$;

-- ---------------------------------------------------------------------
-- POLICIES — each one is dropped first (safe no-op if it doesn't exist)
-- then recreated fresh, so this section can be re-run any number of times.
-- ---------------------------------------------------------------------

-- USERS
drop policy if exists "Employer/recruiter/admin view other user records" on public.users;
create policy "Employer/recruiter/admin view other user records" on public.users for select using (
  public.my_role() in ('employer', 'recruiter', 'admin')
);

-- PROFILES
drop policy if exists "Employers/recruiters view candidate profiles" on public.profiles;
drop policy if exists "Employer/recruiter/admin view candidate profiles" on public.profiles;
create policy "Employer/recruiter/admin view candidate profiles" on public.profiles for select using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('employer', 'recruiter', 'admin'))
);

-- EDUCATION / EMPLOYMENT
drop policy if exists "Candidate manages own education" on public.education_records;
create policy "Candidate manages own education" on public.education_records for all using (auth.uid() = candidate_id);

drop policy if exists "Candidate manages own employment" on public.employment_records;
create policy "Candidate manages own employment" on public.employment_records for all using (auth.uid() = candidate_id);

drop policy if exists "Employers/recruiters view education" on public.education_records;
drop policy if exists "Employer/recruiter/admin view education" on public.education_records;
create policy "Employer/recruiter/admin view education" on public.education_records for select using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('employer', 'recruiter', 'admin'))
);

drop policy if exists "Employers/recruiters view employment" on public.employment_records;
drop policy if exists "Employer/recruiter/admin view employment" on public.employment_records;
create policy "Employer/recruiter/admin view employment" on public.employment_records for select using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('employer', 'recruiter', 'admin'))
);

-- JOBS (recruiter access to assigned jobs)
drop policy if exists "Recruiter reads assigned job details" on public.jobs;
create policy "Recruiter reads assigned job details" on public.jobs for select using (
  exists (select 1 from public.recruiter_assignments ra where ra.job_id = jobs.id and ra.recruiter_id = auth.uid() and ra.status = 'active')
);

-- APPLICATIONS (recruiter access)
drop policy if exists "Recruiter views applications on assigned jobs" on public.applications;
create policy "Recruiter views applications on assigned jobs" on public.applications for select using (
  exists (select 1 from public.recruiter_assignments ra where ra.job_id = applications.job_id and ra.recruiter_id = auth.uid() and ra.status = 'active')
);
drop policy if exists "Recruiter updates applications on assigned jobs" on public.applications;
create policy "Recruiter updates applications on assigned jobs" on public.applications for update using (
  exists (select 1 from public.recruiter_assignments ra where ra.job_id = applications.job_id and ra.recruiter_id = auth.uid() and ra.status = 'active')
);

-- INTERVIEWS (recruiter access)
drop policy if exists "Recruiter manages interviews on assigned jobs" on public.interviews;
create policy "Recruiter manages interviews on assigned jobs" on public.interviews for all using (
  exists (
    select 1 from public.applications a join public.recruiter_assignments ra on ra.job_id = a.job_id
    where a.id = interviews.application_id and ra.recruiter_id = auth.uid() and ra.status = 'active'
  )
);

-- ASSESSMENTS
drop policy if exists "Public reads active assessment templates" on public.assessment_templates;
create policy "Public reads active assessment templates" on public.assessment_templates for select using (is_active = true);
drop policy if exists "Admin manages assessment templates" on public.assessment_templates;
create policy "Admin manages assessment templates" on public.assessment_templates for all using (public.is_admin());

drop policy if exists "Candidate manages own assessment results" on public.assessment_results;
create policy "Candidate manages own assessment results" on public.assessment_results for all using (auth.uid() = candidate_id);
drop policy if exists "Employers/recruiters view assessment results" on public.assessment_results;
drop policy if exists "Employer/recruiter/admin view assessment results" on public.assessment_results;
create policy "Employer/recruiter/admin view assessment results" on public.assessment_results for select using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('employer', 'recruiter', 'admin'))
);

-- SUBSCRIPTIONS
drop policy if exists "Public reads subscription plans" on public.subscription_plans;
create policy "Public reads subscription plans" on public.subscription_plans for select using (is_active = true);
drop policy if exists "Admin manages subscription plans" on public.subscription_plans;
create policy "Admin manages subscription plans" on public.subscription_plans for all using (public.is_admin());

drop policy if exists "Employer views own subscription" on public.company_subscriptions;
create policy "Employer views own subscription" on public.company_subscriptions for select using (
  exists (select 1 from public.companies c where c.id = company_subscriptions.company_id and c.owner_id = auth.uid())
);
drop policy if exists "Employer manages own subscription" on public.company_subscriptions;
create policy "Employer manages own subscription" on public.company_subscriptions for insert with check (
  exists (select 1 from public.companies c where c.id = company_subscriptions.company_id and c.owner_id = auth.uid())
);
drop policy if exists "Employer updates own subscription" on public.company_subscriptions;
create policy "Employer updates own subscription" on public.company_subscriptions for update using (
  exists (select 1 from public.companies c where c.id = company_subscriptions.company_id and c.owner_id = auth.uid())
);
drop policy if exists "Admin manages company subscriptions" on public.company_subscriptions;
create policy "Admin manages company subscriptions" on public.company_subscriptions for all using (public.is_admin());

-- RECRUITER ASSIGNMENTS
drop policy if exists "Recruiter views own assignments" on public.recruiter_assignments;
create policy "Recruiter views own assignments" on public.recruiter_assignments for select using (auth.uid() = recruiter_id);
drop policy if exists "Employer manages assignments on own jobs" on public.recruiter_assignments;
create policy "Employer manages assignments on own jobs" on public.recruiter_assignments for all using (
  exists (select 1 from public.jobs j join public.companies c on c.id = j.company_id where j.id = recruiter_assignments.job_id and c.owner_id = auth.uid())
);
drop policy if exists "Admin manages all assignments" on public.recruiter_assignments;
create policy "Admin manages all assignments" on public.recruiter_assignments for all using (public.is_admin());

-- VERIFICATION SOURCES
drop policy if exists "Admin manages verification sources" on public.verification_sources;
create policy "Admin manages verification sources" on public.verification_sources for all using (public.is_admin());

-- SKILLS / CANDIDATE_SKILLS / JOB_SKILLS
drop policy if exists "Anyone reads skills" on public.skills;
create policy "Anyone reads skills" on public.skills for select using (true);
drop policy if exists "Authenticated users add skills" on public.skills;
create policy "Authenticated users add skills" on public.skills for insert with check (auth.role() = 'authenticated');

drop policy if exists "Candidate manages own skills" on public.candidate_skills;
create policy "Candidate manages own skills" on public.candidate_skills for all using (auth.uid() = candidate_id);
drop policy if exists "Employer/recruiter/admin view candidate skills" on public.candidate_skills;
create policy "Employer/recruiter/admin view candidate skills" on public.candidate_skills for select using (
  public.my_role() in ('employer', 'recruiter', 'admin')
);

drop policy if exists "Public reads job skills" on public.job_skills;
create policy "Public reads job skills" on public.job_skills for select using (true);
drop policy if exists "Employer manages own job skills" on public.job_skills;
create policy "Employer manages own job skills" on public.job_skills for all using (
  exists (select 1 from public.jobs j join public.companies c on c.id = j.company_id where j.id = job_skills.job_id and c.owner_id = auth.uid())
);
drop policy if exists "Admin manages job skills" on public.job_skills;
create policy "Admin manages job skills" on public.job_skills for all using (public.is_admin());

-- NOTIFICATIONS
drop policy if exists "Employer/recruiter/admin create notifications" on public.notifications;
create policy "Employer/recruiter/admin create notifications" on public.notifications for insert with check (
  public.my_role() in ('employer', 'recruiter', 'admin')
);

-- =====================================================================
-- Done. Run the verification query below to confirm the fix worked —
-- it should return a single row and no error.
-- =====================================================================
-- select 'recruiter'::user_role, 'on_hold'::application_status, 'new'::outreach_status;
