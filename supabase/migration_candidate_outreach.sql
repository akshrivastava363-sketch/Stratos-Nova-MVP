-- =====================================================================
-- CANDIDATE OUTREACH MVP — additive migration
-- Adds ONLY what's needed for: candidate profile freshness confirmation
-- + a lightweight recruiter/admin communication status tracker.
-- Does not touch, rename, or repurpose the existing `candidate_status`
-- field (that's the candidate's own job-seeking availability — a
-- separate, already-working concept used in CandidateSearch and
-- RepositoryHealth). Safe to run once against your existing project.
-- =====================================================================

-- Distinct from the existing candidate_status enum on purpose.
create type outreach_status as enum (
  'new', 'profile_update_required', 'profile_updated',
  'verification_pending', 'verified', 'communication_pending', 'contacted', 'responded'
);

alter table public.profiles add column if not exists outreach_status outreach_status default 'new';
alter table public.profiles add column if not exists outreach_status_updated_at timestamptz default now();
alter table public.profiles add column if not exists profile_confirmed_at timestamptz;

create index if not exists idx_profiles_outreach_status on public.profiles(outreach_status);

-- Defensive: this migration depends on my_role(), added in the earlier
-- bugfix patch. Re-creating it here (identical definition) means this
-- file works standalone even if that patch wasn't run yet.
create or replace function public.my_role()
returns user_role language sql security definer stable
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

-- Candidates already have full UPDATE rights on their own profile row
-- (see "Candidate manages own profile" policy), so no new policy is
-- needed for the "confirm my info is current" action.
--
-- Staff (recruiter/admin) updating a DIFFERENT candidate's outreach
-- status is the part that needs new access. Rather than granting a
-- broad UPDATE policy on the whole profiles table (which would let
-- staff edit any field on any candidate, not just the status), this
-- uses a narrow, purpose-built function that only ever touches these
-- two columns.
create or replace function public.set_candidate_outreach_status(p_candidate_id uuid, p_status outreach_status)
returns void
language plpgsql
security definer
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
