-- =====================================================================
-- BUGFIX PATCH — run this in Supabase SQL Editor against your existing project.
-- Safe to run once. Fixes three issues found in review:
--
-- 1. Employers/recruiters had no permission to read other users' rows,
--    which silently blocked: candidate names in the applicant/ATS view,
--    the recruiter picker in "Recruiter Assist", and the assigned
--    recruiter's name once activated.
--
-- 2. The notifications table had RLS enabled but NO insert policy at
--    all, so every attempt to notify a candidate of a status change
--    was silently failing (the insert errored, but the app wasn't
--    checking/surfacing that error).
--
-- 3. skills, candidate_skills, and job_skills tables were created with
--    RLS never enabled at all — a real security gap, not just a
--    missing feature.
--
-- This patch does not touch or delete any existing data.
-- =====================================================================

create or replace function public.my_role()
returns user_role language sql security definer stable
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

create policy "Employer/recruiter/admin view other user records" on public.users for select using (
  public.my_role() in ('employer', 'recruiter', 'admin')
);

create policy "Employer/recruiter/admin create notifications" on public.notifications for insert with check (
  public.my_role() in ('employer', 'recruiter', 'admin')
);

-- =====================================================================
-- 3. skills, candidate_skills, job_skills had RLS never enabled at all —
--    a real security gap (any authenticated user could read/write/delete
--    freely), not caught until this follow-up review.
--    Skip this section if you already ran the updated migration_2.0.sql.
-- =====================================================================
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
