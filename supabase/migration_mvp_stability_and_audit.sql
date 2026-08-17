-- STRATOS NOVA — ADDITIVE MVP STABILITY / SECURITY / AUDIT PATCH
-- Intentionally left unchanged by request: certification entry, institution
-- verification workflow, offer management, candidate recommendations,
-- company verification workflow.

-- 1) Complete Admin audit trail ------------------------------------------------
alter table public.activity_logs add column if not exists actor_role text;
alter table public.activity_logs add column if not exists old_values jsonb;
alter table public.activity_logs add column if not exists new_values jsonb;
alter table public.activity_logs add column if not exists changed_fields jsonb;
alter table public.activity_logs add column if not exists description text;
create index if not exists idx_activity_logs_created_at on public.activity_logs(created_at desc);
create index if not exists idx_activity_logs_user_created on public.activity_logs(user_id, created_at desc);
create index if not exists idx_activity_logs_entity_created on public.activity_logs(entity_type, entity_id, created_at desc);
create index if not exists idx_activity_logs_action_created on public.activity_logs(action, created_at desc);

drop policy if exists "Authenticated users can insert activity logs" on public.activity_logs;
create or replace function public.audit_sanitize(p jsonb) returns jsonb language sql immutable as $$
  select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) from jsonb_each(coalesce(p,'{}'::jsonb))
  where lower(key) not like '%password%' and lower(key) not like '%token%'
    and lower(key) not like '%secret%' and lower(key) not like '%api_key%';
$$;
create or replace function public.audit_diff(oldv jsonb,newv jsonb) returns jsonb language plpgsql immutable as $$
declare r jsonb:='{}'::jsonb; k text; o jsonb; n jsonb;
begin
  for k in select distinct key from (select key from jsonb_each(coalesce(oldv,'{}'::jsonb)) union select key from jsonb_each(coalesce(newv,'{}'::jsonb))) s loop
    o:=coalesce(oldv->k,'null'::jsonb); n:=coalesce(newv->k,'null'::jsonb);
    if o is distinct from n then r:=r||jsonb_build_object(k,jsonb_build_object('old',o,'new',n)); end if;
  end loop; return r;
end $$;
create or replace function public.write_audit_log() returns trigger language plpgsql security definer set search_path=public as $$
declare oldv jsonb:='{}'::jsonb; newv jsonb:='{}'::jsonb; payload jsonb; entity uuid:=null; role_name text:=null; action_name text;
begin
  if tg_op in ('UPDATE','DELETE') then oldv:=public.audit_sanitize(to_jsonb(old)); end if;
  if tg_op in ('INSERT','UPDATE') then newv:=public.audit_sanitize(to_jsonb(new)); end if;
  payload:=case when tg_op='DELETE' then oldv else newv end;
  begin role_name:=public.my_role()::text; exception when others then role_name:=null; end;
  if payload ? 'id' then begin entity:=(payload->>'id')::uuid; exception when others then entity:=null; end;
  elsif payload ? 'candidate_id' then begin entity:=(payload->>'candidate_id')::uuid; exception when others then entity:=null; end;
  elsif payload ? 'job_id' then begin entity:=(payload->>'job_id')::uuid; exception when others then entity:=null; end;
  elsif payload ? 'company_id' then begin entity:=(payload->>'company_id')::uuid; exception when others then entity:=null; end;
  end if;
  action_name:=lower(tg_op)||'_'||tg_table_name;
  insert into public.activity_logs(user_id,actor_role,action,entity_type,entity_id,metadata,old_values,new_values,changed_fields,description)
  values(auth.uid(),role_name,action_name,tg_table_name,entity,jsonb_build_object('table',tg_table_name,'operation',tg_op),oldv,newv,case when tg_op='UPDATE' then public.audit_diff(oldv,newv) else '{}'::jsonb end,
         case when tg_op='INSERT' then 'Created ' when tg_op='UPDATE' then 'Updated ' else 'Deleted ' end||replace(tg_table_name,'_',' '));
  return coalesce(new,old);
exception when others then
  raise warning 'audit failed for %.%: %',tg_table_schema,tg_table_name,sqlerrm; return coalesce(new,old);
end $$;

do $$ declare t text; begin foreach t in array array['users','profiles','education_records','employment_records','candidate_skills','applications','assessment_results','companies','jobs','job_skills','interviews','company_subscriptions','recruiter_assignments','saved_jobs','messages'] loop
  execute format('drop trigger if exists trg_audit_%s on public.%I',t,t);
  execute format('create trigger trg_audit_%s after insert or update or delete on public.%I for each row execute function public.write_audit_log()',t,t);
end loop; end $$;

-- 2) Candidate application status protection ---------------------------------
create or replace function public.guard_candidate_application_update() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if public.my_role()='candidate' then
    if new.candidate_id is distinct from old.candidate_id or new.job_id is distinct from old.job_id then raise exception 'Candidates cannot reassign an application'; end if;
    if new.status is distinct from old.status and new.status<>'withdrawn' then raise exception 'Candidates may only withdraw an application'; end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_candidate_application_update on public.applications;
create trigger trg_guard_candidate_application_update before update on public.applications for each row execute function public.guard_candidate_application_update();
drop policy if exists "Candidate manages own applications" on public.applications;
drop policy if exists "Candidate views own applications" on public.applications;
drop policy if exists "Candidate inserts own applications" on public.applications;
drop policy if exists "Candidate withdraws own applications" on public.applications;
create policy "Candidate views own applications" on public.applications for select using(auth.uid()=candidate_id);
create policy "Candidate inserts own applications" on public.applications for insert with check(auth.uid()=candidate_id);
create policy "Candidate withdraws own applications" on public.applications for update using(auth.uid()=candidate_id) with check(auth.uid()=candidate_id and status in('applied','withdrawn'));
drop policy if exists "Admin manages all applications" on public.applications;
create policy "Admin manages all applications" on public.applications for all using(public.is_admin());

-- 3) Real role-based assessments ---------------------------------------------
create table if not exists public.assessment_questions(
 id uuid primary key default uuid_generate_v4(), template_id uuid not null references public.assessment_templates(id) on delete cascade,
 prompt text not null, options jsonb not null default '[]'::jsonb, correct_option integer not null, points integer not null default 1,
 sort_order integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index if not exists idx_assessment_questions_template on public.assessment_questions(template_id,sort_order);
create table if not exists public.assessment_answers(
 id uuid primary key default uuid_generate_v4(), result_id uuid not null references public.assessment_results(id) on delete cascade,
 question_id uuid not null references public.assessment_questions(id) on delete cascade, candidate_id uuid not null references public.users(id) on delete cascade,
 selected_option integer, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(result_id,question_id));
create index if not exists idx_assessment_answers_result on public.assessment_answers(result_id);
alter table public.assessment_questions enable row level security;
alter table public.assessment_answers enable row level security;
drop policy if exists "Admin manages assessment questions" on public.assessment_questions;
create policy "Admin manages assessment questions" on public.assessment_questions for all using(public.is_admin());
drop policy if exists "Candidate inserts own assessment answers" on public.assessment_answers;
drop policy if exists "Candidate updates own assessment answers" on public.assessment_answers;
create policy "Candidate inserts own assessment answers" on public.assessment_answers for insert with check(auth.uid()=candidate_id);
create policy "Candidate updates own assessment answers" on public.assessment_answers for update using(auth.uid()=candidate_id) with check(auth.uid()=candidate_id);
drop policy if exists "Admin reads assessment answers" on public.assessment_answers;
create policy "Admin reads assessment answers" on public.assessment_answers for select using(public.is_admin());
drop policy if exists "Candidate manages own assessment results" on public.assessment_results;
drop policy if exists "Candidate views own assessment results" on public.assessment_results;
create policy "Candidate views own assessment results" on public.assessment_results for select using(auth.uid()=candidate_id);
drop policy if exists "Employers/recruiters view assessment results" on public.assessment_results;
drop policy if exists "Employer/recruiter/admin view assessment results" on public.assessment_results;
create policy "Employer/recruiter/admin view assessment results" on public.assessment_results for select using(public.my_role() in('employer','recruiter','admin'));
drop policy if exists "Admin manages all interviews" on public.interviews;
create policy "Admin manages all interviews" on public.interviews for all using(public.is_admin());

create or replace function public.start_assessment(p_template_id uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare rid uuid; required integer; available integer;
begin
 if public.my_role()<>'candidate' then raise exception 'Only candidates can start assessments'; end if;
 select question_count into required from public.assessment_templates where id=p_template_id and is_active=true;
 if required is null or required<=0 then raise exception 'Assessment is not available'; end if;
 select count(*) into available from public.assessment_questions where template_id=p_template_id;
 if available<required then raise exception 'This assessment is not ready yet. Please contact the administrator.'; end if;
 select id into rid from public.assessment_results where candidate_id=auth.uid() and template_id=p_template_id and status='in_progress' order by created_at desc limit 1;
 if rid is not null then return rid; end if;
 insert into public.assessment_results(candidate_id,template_id,status,started_at) values(auth.uid(),p_template_id,'in_progress',now()) returning id into rid;
 return rid;
end $$;
grant execute on function public.start_assessment(uuid) to authenticated;
create or replace function public.get_assessment_questions(p_result_id uuid) returns table(id uuid,prompt text,options jsonb,sort_order integer) language plpgsql security definer set search_path=public as $$
declare tid uuid;
begin select template_id into tid from public.assessment_results where id=p_result_id and candidate_id=auth.uid(); if tid is null then raise exception 'Assessment run not found'; end if; return query select q.id,q.prompt,q.options,q.sort_order from public.assessment_questions q where q.template_id=tid order by q.sort_order; end $$;
grant execute on function public.get_assessment_questions(uuid) to authenticated;
create or replace function public.submit_assessment(p_result_id uuid,p_answers jsonb,p_flags jsonb default '[]'::jsonb) returns table(score numeric,passed boolean,status assessment_run_status) language plpgsql security definer set search_path=public as $$
declare cid uuid; tid uuid; passing numeric; total numeric; correct numeric; final_score numeric; run_status assessment_run_status; item jsonb;
begin
 select candidate_id,template_id,status into cid,tid,run_status from public.assessment_results where id=p_result_id;
 if cid is null or cid<>auth.uid() then raise exception 'Assessment run not found'; end if;
 if run_status='completed' then select ar.score, ar.status into final_score,run_status from public.assessment_results ar where ar.id=p_result_id; select passing_score into passing from public.assessment_templates where id=tid; return query select final_score,(final_score>=passing),run_status; return; end if;
 delete from public.assessment_answers where result_id=p_result_id and candidate_id=auth.uid();
 for item in select value from jsonb_array_elements(coalesce(p_answers,'[]'::jsonb)) loop
   insert into public.assessment_answers(result_id,question_id,candidate_id,selected_option) values(p_result_id,(item->>'question_id')::uuid,auth.uid(),nullif(item->>'selected_option','')::integer)
   on conflict(result_id,question_id) do update set selected_option=excluded.selected_option,updated_at=now();
 end loop;
 select coalesce(sum(q.points),0),coalesce(sum(case when a.selected_option=q.correct_option then q.points else 0 end),0) into total,correct
 from public.assessment_questions q left join public.assessment_answers a on a.question_id=q.id and a.result_id=p_result_id where q.template_id=tid;
 if total<=0 then raise exception 'Assessment has no valid questions'; end if;
 final_score:=round((correct/total)*100.0,2); select passing_score into passing from public.assessment_templates where id=tid;
 update public.assessment_results set score=final_score,status='completed',completed_at=now(),proctoring_flags=coalesce(p_flags,'[]'::jsonb) where id=p_result_id;
 return query select final_score,(final_score>=passing),'completed'::assessment_run_status;
end $$;
grant execute on function public.submit_assessment(uuid,jsonb,jsonb) to authenticated;
create or replace function public.sync_assessment_question_count() returns trigger language plpgsql security definer set search_path=public as $$ begin update public.assessment_templates set question_count=(select count(*) from public.assessment_questions where template_id=coalesce(new.template_id,old.template_id)) where id=coalesce(new.template_id,old.template_id); return coalesce(new,old); end $$;
drop trigger if exists trg_sync_assessment_question_count on public.assessment_questions;
create trigger trg_sync_assessment_question_count after insert or update or delete on public.assessment_questions for each row execute function public.sync_assessment_question_count();
drop trigger if exists trg_audit_assessment_questions on public.assessment_questions;
create trigger trg_audit_assessment_questions after insert or update or delete on public.assessment_questions for each row execute function public.write_audit_log();
drop trigger if exists trg_audit_assessment_answers on public.assessment_answers;
create trigger trg_audit_assessment_answers after insert or update or delete on public.assessment_answers for each row execute function public.write_audit_log();

-- 4) Subscription-based candidate search usage ------------------------------
create table if not exists public.candidate_search_usage(
 company_id uuid not null references public.companies(id) on delete cascade, month_start date not null,
 searches_used integer not null default 0, updated_at timestamptz not null default now(), primary key(company_id,month_start));
alter table public.candidate_search_usage enable row level security;
drop policy if exists "Employer views own search usage" on public.candidate_search_usage;
create policy "Employer views own search usage" on public.candidate_search_usage for select using(exists(select 1 from public.companies c where c.id=company_id and c.owner_id=auth.uid()));
drop policy if exists "Admin manages search usage" on public.candidate_search_usage;
create policy "Admin manages search usage" on public.candidate_search_usage for all using(public.is_admin());
create or replace function public.consume_candidate_search(p_company_id uuid) returns table(allowed boolean,remaining integer) language plpgsql security definer set search_path=public as $$
declare lim integer; used integer:=0; m date:=date_trunc('month',now())::date; role_name user_role;
begin role_name:=public.my_role(); if role_name not in('employer','recruiter','admin') then raise exception 'Not authorized'; end if;
 if role_name='employer' then
   if not exists(select 1 from public.companies where id=p_company_id and owner_id=auth.uid()) then raise exception 'Not authorized'; end if;
   select sp.candidate_search_limit into lim from public.company_subscriptions cs join public.subscription_plans sp on sp.id=cs.plan_id where cs.company_id=p_company_id and cs.status='active' order by cs.started_at desc limit 1;
   if lim is null then return query select true,null::integer; return; end if;
   select searches_used into used from public.candidate_search_usage where company_id=p_company_id and month_start=m;
   if coalesce(used,0)>=lim then return query select false,0; return; end if;
   insert into public.candidate_search_usage(company_id,month_start,searches_used) values(p_company_id,m,1)
   on conflict(company_id,month_start) do update set searches_used=public.candidate_search_usage.searches_used+1,updated_at=now();
   return query select true,lim-coalesce(used,0)-1;
 else return query select true,null::integer; end if;
end $$;
grant execute on function public.consume_candidate_search(uuid) to authenticated;

-- 5) Candidate lifecycle maintenance -----------------------------------------
create or replace function public.refresh_candidate_lifecycle(p_days_threshold integer default 45) returns integer language plpgsql security definer set search_path=public as $$
declare changed integer;
begin update public.profiles p set candidate_status='inactive',status_updated_at=now() from public.users u where p.id=u.id and u.role='candidate' and p.updated_at<now()-make_interval(days=>p_days_threshold) and coalesce(p.candidate_status,'open_to_work') not in('not_looking','inactive'); get diagnostics changed=row_count; return changed; end $$;
grant execute on function public.refresh_candidate_lifecycle(integer) to authenticated;
-- Supabase installations with pg_cron enabled can schedule this function. The
-- portal also invokes it at repository/admin health load so stale profiles are
-- not left active when the scheduler is unavailable.


-- Optional automatic lifecycle scheduler when pg_cron is enabled by Supabase.
do $$
begin
  if exists(select 1 from pg_available_extensions where name='pg_cron') then
    begin
      execute 'create extension if not exists pg_cron';
      if not exists(select 1 from cron.job where jobname='stratos_nova_candidate_lifecycle') then
        perform cron.schedule('stratos_nova_candidate_lifecycle','0 2 * * *','select public.refresh_candidate_lifecycle();');
      end if;
    exception when others then
      raise notice 'pg_cron lifecycle schedule skipped: %', sqlerrm;
    end;
  end if;
end $$;

-- 6) Secure private resume/document reads ------------------------------------
drop policy if exists "Employers/recruiters read applicant resumes" on storage.objects;
drop policy if exists "Employers/recruiters/admin read authorized resumes" on storage.objects;
create policy "Employers/recruiters/admin read authorized resumes" on storage.objects for select to authenticated using(
 bucket_id='resumes' and name~'^[0-9a-fA-F-]{36}/' and (
  public.is_admin() or auth.uid()=substring(name from 1 for 36)::uuid or
  exists(select 1 from public.applications a join public.jobs j on j.id=a.job_id join public.companies c on c.id=j.company_id where a.candidate_id=substring(name from 1 for 36)::uuid and c.owner_id=auth.uid()) or
  exists(select 1 from public.recruiter_assignments ra join public.applications a on a.job_id=ra.job_id where a.candidate_id=substring(name from 1 for 36)::uuid and ra.recruiter_id=auth.uid() and ra.status='active')
 ));

-- 7) Admin role safety ---------------------------------------------------------
create or replace function public.guard_admin_role_change() returns trigger language plpgsql security definer set search_path=public as $$ declare admins integer; begin
 if auth.uid()=old.id and new.role is distinct from old.role then raise exception 'You cannot change your own role'; end if;
 if old.role='admin' and new.role<>'admin' then select count(*) into admins from public.users where role='admin'; if admins<=1 then raise exception 'The last administrator cannot be demoted'; end if; end if; return new;
end $$;
drop trigger if exists trg_guard_admin_role_change on public.users;
create trigger trg_guard_admin_role_change before update of role on public.users for each row execute function public.guard_admin_role_change();

-- 8) Interview index ----------------------------------------------------------
create index if not exists idx_interviews_application_scheduled on public.interviews(application_id,scheduled_at desc);


-- 9) Employer company approval protection + pending-job restriction ----------
-- Employers may edit their company profile, but Admin controls approval state.
create or replace function public.guard_employer_company_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.my_role() = 'employer' then
    if tg_op = 'INSERT' then
      if new.owner_id is distinct from auth.uid() then
        raise exception 'Employers may only create their own company record';
      end if;
      new.approval_status := 'pending';
      new.approved_at := null;
    elsif tg_op = 'UPDATE' then
      if old.owner_id is distinct from auth.uid() then
        raise exception 'Employers may only update their own company record';
      end if;
      new.owner_id := old.owner_id;
      new.approval_status := old.approval_status;
      new.approved_at := old.approved_at;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_employer_company_changes on public.companies;
create trigger trg_guard_employer_company_changes
before insert or update on public.companies
for each row execute function public.guard_employer_company_changes();

-- An employer may create/update jobs only after the employer's company is approved.
-- Admin/recruiter/system paths are unaffected by this employer-only guard.
create or replace function public.guard_employer_job_company_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_approval employer_approval_status;
begin
  if public.my_role() = 'employer' then
    select owner_id, approval_status
      into v_owner, v_approval
      from public.companies
     where id = new.company_id;

    if v_owner is null or v_owner is distinct from auth.uid() then
      raise exception 'You can only manage jobs belonging to your company';
    end if;

    if v_approval is distinct from 'approved'::employer_approval_status then
      raise exception 'Company approval is required before posting or editing jobs';
    end if;

    if tg_op = 'UPDATE' and old.company_id is distinct from new.company_id then
      raise exception 'A job cannot be moved to another company';
    end if;

    if tg_op = 'UPDATE' then
      new.company_id := old.company_id;
      new.posted_by := coalesce(old.posted_by, auth.uid());
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_employer_job_company_approval on public.jobs;
create trigger trg_guard_employer_job_company_approval
before insert or update on public.jobs
for each row execute function public.guard_employer_job_company_approval();

-- 10) Admin approval timestamp consistency -----------------------------------
-- Admin approval/rejection actions keep approved_at synchronized.
create or replace function public.sync_company_approval_timestamp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.approval_status = 'approved'::employer_approval_status then
    if new.approved_at is null then new.approved_at := now(); end if;
  else
    new.approved_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_company_approval_timestamp on public.companies;
create trigger trg_sync_company_approval_timestamp
before insert or update of approval_status, approved_at on public.companies
for each row execute function public.sync_company_approval_timestamp();
