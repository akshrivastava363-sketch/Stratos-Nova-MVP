-- Stratos Nova: consent-based verification workflow and registration safeguards
-- Additive migration. Does not connect external providers or alter candidate records.

-- Public sign-ups may create candidate or employer accounts only.
-- Never trust role values from user-editable auth metadata for privileged roles.
alter table public.users alter column role set default 'candidate';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_company_name text;
  v_phone text;
  v_requested_role text;
  v_safe_role public.user_role;
begin
  v_company_name := new.raw_user_meta_data->>'company_name';
  v_phone := new.raw_user_meta_data->>'phone';
  v_requested_role := lower(coalesce(new.raw_user_meta_data->>'role', 'candidate'));

  if v_requested_role = 'employer' then
    v_safe_role := 'employer'::public.user_role;
  else
    -- Candidate is the safe default. Recruiter/admin accounts are provisioned internally.
    v_safe_role := 'candidate'::public.user_role;
  end if;

  insert into public.users (id, email, role, full_name, phone)
  values (new.id, new.email, v_safe_role, new.raw_user_meta_data->>'full_name', v_phone);

  insert into public.profiles (id) values (new.id);

  if v_safe_role = 'employer' and v_company_name is not null and length(trim(v_company_name)) > 0 then
    insert into public.companies (
      owner_id, name, hiring_contact_name, hiring_contact_email,
      hiring_contact_phone, approval_status
    )
    values (
      new.id, v_company_name, new.raw_user_meta_data->>'full_name',
      new.email, v_phone, 'pending'
    );
  end if;

  return new;
end;
$function$;

-- Prevent candidates from assigning themselves a trusted verification state.
create or replace function public.guard_candidate_verification_fields()
returns trigger
language plpgsql
set search_path = public
as $function$
declare
  v_role public.user_role;
begin
  if auth.uid() is null then
    return new; -- trusted server-side maintenance
  end if;

  select role into v_role from public.users where id = auth.uid();
  if coalesce(v_role, 'candidate'::public.user_role) <> 'admin' then
    if tg_op = 'INSERT' then
      new.verification_status := 'unverified';
      new.verification_notes := null;
    elsif new.verification_status is distinct from old.verification_status
       or new.verification_notes is distinct from old.verification_notes then
      raise exception 'Verification status can only be changed by an authorised Stratos Nova reviewer';
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_guard_candidate_education_verification on public.education_records;
create trigger trg_guard_candidate_education_verification
before insert or update on public.education_records
for each row execute function public.guard_candidate_verification_fields();

drop trigger if exists trg_guard_candidate_employment_verification on public.employment_records;
create trigger trg_guard_candidate_employment_verification
before insert or update on public.employment_records
for each row execute function public.guard_candidate_verification_fields();

-- One record per consented verification request. No external provider is assumed to be connected.
create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.users(id) on delete cascade,
  record_type text not null check (record_type in ('education', 'employment')),
  record_id uuid not null,
  purpose text not null,
  consent_version text not null,
  consent_text text not null,
  consented_at timestamptz not null,
  candidate_withdrawn_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending', 'in_review', 'verified', 'discrepancy', 'unable_to_verify', 'candidate_action_required', 'withdrawn')),
  verification_method text
    check (verification_method is null or verification_method in (
      'manual_document_review', 'issuing_institution', 'digilocker', 'nad',
      'background_verification_provider', 'epfo_limited_record', 'other'
    )),
  source_name text,
  source_reference text,
  result_summary text,
  discrepancy_details text,
  evidence_reference text,
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  retention_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_verification_requests_candidate_created
  on public.verification_requests(candidate_id, created_at desc);
create index if not exists idx_verification_requests_status_created
  on public.verification_requests(status, created_at desc);
create index if not exists idx_verification_requests_record
  on public.verification_requests(record_type, record_id);

alter table public.verification_requests enable row level security;
revoke all on public.verification_requests from anon;
grant select, insert, update on public.verification_requests to authenticated;

drop policy if exists "Candidates view own verification requests" on public.verification_requests;
create policy "Candidates view own verification requests"
on public.verification_requests for select to authenticated
using (candidate_id = auth.uid());

drop policy if exists "Admins view all verification requests" on public.verification_requests;
create policy "Admins view all verification requests"
on public.verification_requests for select to authenticated
using (public.is_admin());

drop policy if exists "Candidates submit consented verification requests" on public.verification_requests;
create policy "Candidates submit consented verification requests"
on public.verification_requests for insert to authenticated
with check (
  candidate_id = auth.uid()
  and consented_at is not null
  and length(trim(consent_text)) > 20
  and status = 'pending'
  and candidate_withdrawn_at is null
  and reviewed_by is null
  and reviewed_at is null
);

drop policy if exists "Candidates withdraw own verification requests" on public.verification_requests;
create policy "Candidates withdraw own verification requests"
on public.verification_requests for update to authenticated
using (candidate_id = auth.uid() and candidate_withdrawn_at is null)
with check (candidate_id = auth.uid() and candidate_withdrawn_at is not null and status = 'withdrawn');

drop policy if exists "Admins update verification requests" on public.verification_requests;
create policy "Admins update verification requests"
on public.verification_requests for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.guard_verification_request_changes()
returns trigger
language plpgsql
set search_path = public
as $function$
declare
  v_role public.user_role;
  v_record_owner uuid;
begin
  if auth.uid() is null then
    return new;
  end if;

  select role into v_role from public.users where id = auth.uid();

  if tg_op = 'INSERT' then
    if auth.uid() is distinct from new.candidate_id
       and coalesce(v_role, 'candidate'::public.user_role) <> 'admin' then
      raise exception 'You can only request verification for your own records';
    end if;
    if new.consented_at is null or length(trim(coalesce(new.consent_text, ''))) < 20 then
      raise exception 'Explicit candidate consent is required';
    end if;
    if new.record_type = 'education' then
      select candidate_id into v_record_owner from public.education_records where id = new.record_id;
    else
      select candidate_id into v_record_owner from public.employment_records where id = new.record_id;
    end if;
    if v_record_owner is distinct from new.candidate_id then
      raise exception 'The selected record does not belong to this candidate';
    end if;
    new.status := 'pending';
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.updated_at := now();
    return new;
  end if;

  if coalesce(v_role, 'candidate'::public.user_role) = 'admin' then
    new.updated_at := now();
    if new.status in ('verified', 'discrepancy', 'unable_to_verify') and new.reviewed_at is null then
      new.reviewed_at := now();
    end if;
    if new.status in ('verified', 'discrepancy', 'unable_to_verify') then
      new.reviewed_by := auth.uid();
    end if;
    return new;
  end if;

  if auth.uid() is distinct from old.candidate_id then
    raise exception 'Not authorised to update this verification request';
  end if;
  if old.candidate_withdrawn_at is not null then
    raise exception 'This verification request has already been withdrawn';
  end if;
  if (to_jsonb(new) - array['candidate_withdrawn_at','status','updated_at'])
     is distinct from
     (to_jsonb(old) - array['candidate_withdrawn_at','status','updated_at']) then
    raise exception 'Candidates may only withdraw their own verification request';
  end if;
  new.candidate_withdrawn_at := now();
  new.status := 'withdrawn';
  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists trg_guard_verification_request_changes on public.verification_requests;
create trigger trg_guard_verification_request_changes
before insert or update on public.verification_requests
for each row execute function public.guard_verification_request_changes();

create or replace function public.set_verification_request_updated_at()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists trg_verification_request_updated_at on public.verification_requests;
create trigger trg_verification_request_updated_at
before update on public.verification_requests
for each row execute function public.set_verification_request_updated_at();

comment on table public.verification_requests is
'Consent-backed candidate education/employment verification workflow. Provider integrations remain inactive until separately authorised and configured.';
comment on column public.verification_requests.consent_text is
'Exact consent wording shown to and accepted by the candidate at request time.';
comment on column public.verification_requests.evidence_reference is
'Reference to evidence stored in an access-controlled location; do not store public document URLs.';
