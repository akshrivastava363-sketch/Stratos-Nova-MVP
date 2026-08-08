-- =====================================================================
-- STRATOS NOVA — PLATFORM 2.0 MIGRATION
-- Run this in Supabase SQL Editor. It only ADDS to your existing schema —
-- no existing tables are dropped, no existing data is touched.
-- Run top to bottom in one go.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. EXTEND EXISTING ENUMS
-- ---------------------------------------------------------------------
-- Postgres requires enum additions to run outside a larger transaction
-- block in some versions — if this errors, run each ALTER TYPE line
-- individually as its own query.
alter type user_role add value if not exists 'recruiter';
alter type application_status add value if not exists 'on_hold';

-- ---------------------------------------------------------------------
-- 2. NEW ENUMS
-- ---------------------------------------------------------------------
create type candidate_status as enum (
  'open_to_work', 'serving_notice', 'interviewing', 'immediate_joiner', 'not_looking', 'inactive'
);
create type verification_status as enum ('unverified', 'pending', 'verified', 'failed');
create type plan_tier as enum ('free', 'starter', 'growth', 'scale', 'enterprise');
create type assessment_run_status as enum ('not_started', 'in_progress', 'completed', 'flagged');
create type recruiter_assignment_status as enum ('active', 'completed', 'withdrawn');

-- ---------------------------------------------------------------------
-- 3. PROFILE EXTENSIONS (candidate)
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists work_mode_preference work_mode;
alter table public.profiles add column if not exists notice_period text; -- 'immediate','15_days','30_days','60_days','90_days'
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

-- ---------------------------------------------------------------------
-- 4. STRUCTURED EDUCATION RECORDS (replaces free-text jsonb for new data;
--    old profiles.education jsonb is left in place for backward compatibility)
-- ---------------------------------------------------------------------
create table public.education_records (
  id uuid primary key default uuid_generate_v4(),
  candidate_id uuid references public.users(id) on delete cascade,
  qualification text,          -- e.g. 'Bachelor's', 'Master's', 'Diploma'
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

-- ---------------------------------------------------------------------
-- 5. STRUCTURED EMPLOYMENT RECORDS (enables gap/duplicate detection)
-- ---------------------------------------------------------------------
create table public.employment_records (
  id uuid primary key default uuid_generate_v4(),
  candidate_id uuid references public.users(id) on delete cascade,
  company text not null,
  designation text,
  joining_date date,
  exit_date date,              -- null = current employer
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
-- 6. SKILL CATEGORIZATION
-- ---------------------------------------------------------------------
alter table public.candidate_skills add column if not exists skill_category text default 'primary';
-- values: 'primary','secondary','tool','technology','domain'
alter table public.job_skills add column if not exists skill_category text default 'primary';

-- ---------------------------------------------------------------------
-- 7. ASSESSMENTS MODULE
-- ---------------------------------------------------------------------
create table public.assessment_templates (
  id uuid primary key default uuid_generate_v4(),
  role_category text not null,   -- 'developer','hr','finance','marketing','sales','support','store'
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
  -- AI proctoring surfaces flags only; it never sets status or decides pass/fail
  proctoring_flags jsonb default '[]',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);

create index idx_assessment_results_candidate on public.assessment_results(candidate_id);

-- ---------------------------------------------------------------------
-- 8. SUBSCRIPTIONS (modular — limits live in data, never hardcoded in app code)
-- ---------------------------------------------------------------------
create table public.subscription_plans (
  id uuid primary key default uuid_generate_v4(),
  tier plan_tier unique not null,
  name text not null,
  monthly_price integer default 0,
  active_job_limit integer,          -- null = unlimited
  candidate_search_limit integer,    -- null = unlimited, per month
  recruiter_assist_included boolean default false,
  features jsonb default '[]',
  is_active boolean default true,
  created_at timestamptz default now()
);

create table public.company_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies(id) on delete cascade,
  plan_id uuid references public.subscription_plans(id),
  status text default 'active',      -- active, cancelled, past_due
  started_at timestamptz default now(),
  renews_at timestamptz,
  created_at timestamptz default now()
);

-- Seed the five plan tiers (limits are placeholders — adjust freely later,
-- since the whole point is these are data, not code)
insert into public.subscription_plans (tier, name, monthly_price, active_job_limit, candidate_search_limit, recruiter_assist_included, features)
values
  ('free', 'Free', 0, 1, 20, false, '["Basic job posting","Basic candidate search"]'),
  ('starter', 'Starter', 2999, 3, 100, false, '["Priority listing","Candidate matching"]'),
  ('growth', 'Growth', 7999, 10, 500, true, '["Recruiter Assist","Advanced filters","Analytics"]'),
  ('scale', 'Scale', 19999, 30, null, true, '["Unlimited search","Dedicated support"]'),
  ('enterprise', 'Enterprise', null, null, null, true, '["Custom contract","API access","SSO"]')
on conflict (tier) do nothing;

-- ---------------------------------------------------------------------
-- 9. RECRUITER ASSIST
-- ---------------------------------------------------------------------
create table public.recruiter_assignments (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid references public.jobs(id) on delete cascade,
  recruiter_id uuid references public.users(id),
  assigned_by uuid references public.users(id),   -- the employer who activated it
  status recruiter_assignment_status default 'active',
  notes text,
  assigned_at timestamptz default now(),
  completed_at timestamptz
);

-- ---------------------------------------------------------------------
-- 10. ATS — STRUCTURED SCORECARDS
-- ---------------------------------------------------------------------
alter table public.interviews add column if not exists scorecard jsonb default '{}';
-- e.g. {"communication": 4, "technical": 5, "culture_fit": 4, "notes": "..."}

-- ---------------------------------------------------------------------
-- 11. MODULAR VERIFICATION LAYER
-- (This is deliberately just a registry table, not a hardcoded integration.
--  Real verification providers get wired in later via Edge Functions that
--  read from this table — the app never assumes a specific verifier.)
-- ---------------------------------------------------------------------
create table public.verification_sources (
  id uuid primary key default uuid_generate_v4(),
  source_type text not null,       -- 'education' or 'employment'
  provider_name text not null,
  is_active boolean default false, -- inactive until a real integration is wired in
  config jsonb default '{}',
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 12. ROW LEVEL SECURITY ON NEW TABLES
-- ---------------------------------------------------------------------
alter table public.education_records enable row level security;
alter table public.employment_records enable row level security;
alter table public.assessment_templates enable row level security;
alter table public.assessment_results enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.company_subscriptions enable row level security;
alter table public.recruiter_assignments enable row level security;
alter table public.verification_sources enable row level security;

-- Candidates manage their own education/employment records
create policy "Candidate manages own education" on public.education_records for all using (auth.uid() = candidate_id);
create policy "Candidate manages own employment" on public.employment_records for all using (auth.uid() = candidate_id);
create policy "Employers view candidate education" on public.education_records for select using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('employer', 'recruiter', 'admin'))
);
create policy "Employers view candidate employment" on public.employment_records for select using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('employer', 'recruiter', 'admin'))
);

-- Assessment templates: public read of active ones, admin write
create policy "Public reads active assessment templates" on public.assessment_templates for select using (is_active = true);
create policy "Admin manages assessment templates" on public.assessment_templates for all using (public.is_admin());

-- Assessment results: candidate owns theirs, employers/recruiters/admin can read
create policy "Candidate manages own assessment results" on public.assessment_results for all using (auth.uid() = candidate_id);
create policy "Employers view assessment results" on public.assessment_results for select using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('employer', 'recruiter', 'admin'))
);

-- Subscription plans: public read (so pricing pages work), admin write
create policy "Public reads subscription plans" on public.subscription_plans for select using (is_active = true);
create policy "Admin manages subscription plans" on public.subscription_plans for all using (public.is_admin());

-- Company subscriptions: employer sees their own, admin sees all
create policy "Employer views own subscription" on public.company_subscriptions for select using (
  exists (select 1 from public.companies c where c.id = company_subscriptions.company_id and c.owner_id = auth.uid())
);
create policy "Admin manages company subscriptions" on public.company_subscriptions for all using (public.is_admin());

-- Recruiter assignments: recruiter sees their own, employer sees jobs they own, admin sees all
create policy "Recruiter views own assignments" on public.recruiter_assignments for select using (auth.uid() = recruiter_id);
create policy "Employer manages assignments on own jobs" on public.recruiter_assignments for all using (
  exists (
    select 1 from public.jobs j join public.companies c on c.id = j.company_id
    where j.id = recruiter_assignments.job_id and c.owner_id = auth.uid()
  )
);
create policy "Admin manages all assignments" on public.recruiter_assignments for all using (public.is_admin());

-- Verification sources: admin only (internal config, not user-facing)
create policy "Admin manages verification sources" on public.verification_sources for all using (public.is_admin());

-- ---------------------------------------------------------------------
-- 13. AUTO-INACTIVITY FOR CANDIDATE STATUS
-- (This function exists so it CAN be called — actually scheduling it
--  requires Supabase's pg_cron extension, enabled separately. See notes below.)
-- ---------------------------------------------------------------------
create or replace function public.mark_inactive_candidates(days_threshold integer default 45)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set candidate_status = 'inactive'
  where candidate_status not in ('inactive', 'not_looking')
    and status_updated_at < now() - (days_threshold || ' days')::interval;
end;
$$;

-- To actually run this on a schedule, enable pg_cron in Supabase
-- (Database > Extensions > pg_cron), then run:
--   select cron.schedule('mark-inactive-candidates', '0 3 * * *', $$select public.mark_inactive_candidates(45)$$);
-- This is commented out deliberately — enable it when you're ready,
-- since it needs the extension turned on first.

-- ---------------------------------------------------------------------
-- 14. RECRUITER ACCESS TO ASSIGNED JOBS' APPLICATIONS/INTERVIEWS
-- (Recruiter Assist means the assigned recruiter needs the same ATS
--  access as the employer on that specific job — added here since the
--  base schema's policies only covered the company owner.)
-- ---------------------------------------------------------------------
create policy "Recruiter views applications on assigned jobs" on public.applications for select using (
  exists (
    select 1 from public.recruiter_assignments ra
    where ra.job_id = applications.job_id and ra.recruiter_id = auth.uid() and ra.status = 'active'
  )
);
create policy "Recruiter updates applications on assigned jobs" on public.applications for update using (
  exists (
    select 1 from public.recruiter_assignments ra
    where ra.job_id = applications.job_id and ra.recruiter_id = auth.uid() and ra.status = 'active'
  )
);
create policy "Recruiter manages interviews on assigned jobs" on public.interviews for all using (
  exists (
    select 1 from public.applications a
    join public.recruiter_assignments ra on ra.job_id = a.job_id
    where a.id = interviews.application_id and ra.recruiter_id = auth.uid() and ra.status = 'active'
  )
);
create policy "Recruiter reads assigned job details" on public.jobs for select using (
  exists (select 1 from public.recruiter_assignments ra where ra.job_id = jobs.id and ra.recruiter_id = auth.uid() and ra.status = 'active')
);

-- ---------------------------------------------------------------------
-- 15. BUGFIX: employer/recruiter could not read other users' rows
-- (blocked candidate names in ATS, recruiter picker for Recruiter Assist,
--  and assigned recruiter's name from displaying)
-- ---------------------------------------------------------------------
create or replace function public.my_role()
returns user_role language sql security definer stable
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

create policy "Employer/recruiter/admin view other user records" on public.users for select using (
  public.my_role() in ('employer', 'recruiter', 'admin')
);

-- ---------------------------------------------------------------------
-- 16. BUGFIX: notifications table had no INSERT policy at all, so
-- status-update notifications to candidates were silently failing
-- ---------------------------------------------------------------------
create policy "Employer/recruiter/admin create notifications" on public.notifications for insert with check (
  public.my_role() in ('employer', 'recruiter', 'admin')
);

-- ---------------------------------------------------------------------
-- 17. BUGFIX: skills, candidate_skills, job_skills had RLS never enabled
-- at all — a real security gap, not just a missing feature. Any
-- authenticated user could read/write/delete rows in these tables.
-- ---------------------------------------------------------------------
alter table public.skills enable row level security;
alter table public.candidate_skills enable row level security;
alter table public.job_skills enable row level security;

create policy "Anyone reads skills" on public.skills for select using (true);
create policy "Authenticated users add skills" on public.skills for insert with check (auth.role() = 'authenticated');

create policy "Candidate manages own skills" on public.candidate_skills for all using (auth.uid() = candidate_id);
create policy "Employer/recruiter/admin view candidate skills" on public.candidate_skills for select using (
  public.my_role() in ('employer', 'recruiter', 'admin')
);

create policy "Public reads job skills" on public.job_skills for select using (true);
create policy "Employer manages own job skills" on public.job_skills for all using (
  exists (select 1 from public.jobs j join public.companies c on c.id = j.company_id where j.id = job_skills.job_id and c.owner_id = auth.uid())
);
create policy "Admin manages job skills" on public.job_skills for all using (public.is_admin());
