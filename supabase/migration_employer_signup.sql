-- =====================================================================
-- EMPLOYER SIGNUP FIELDS — additive migration
-- Updates the signup trigger so that when an employer registers with a
-- company name and phone number, a `companies` row is created for them
-- immediately (status: pending) — rather than requiring a second visit
-- to the Company Profile page to create it from scratch.
--
-- This runs inside the trigger (security definer, bypasses RLS) rather
-- than as a client-side insert, because at the moment of signup — before
-- email confirmation completes — there is no active session yet, so a
-- normal RLS-protected insert from the browser would fail.
--
-- Idempotent. Safe to run even if already applied.
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_name text;
  v_phone text;
begin
  v_company_name := new.raw_user_meta_data->>'company_name';
  v_phone := new.raw_user_meta_data->>'phone';

  insert into public.users (id, email, role, full_name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'candidate')::public.user_role,
    new.raw_user_meta_data->>'full_name',
    v_phone
  );

  insert into public.profiles (id) values (new.id);

  -- Only employers get an auto-created company, and only if a name was provided
  if coalesce(new.raw_user_meta_data->>'role', 'candidate') = 'employer' and v_company_name is not null and length(trim(v_company_name)) > 0 then
    insert into public.companies (owner_id, name, hiring_contact_name, hiring_contact_email, hiring_contact_phone, approval_status)
    values (
      new.id,
      v_company_name,
      new.raw_user_meta_data->>'full_name',
      new.email,
      v_phone,
      'pending'
    );
  end if;

  return new;
end;
$$;
