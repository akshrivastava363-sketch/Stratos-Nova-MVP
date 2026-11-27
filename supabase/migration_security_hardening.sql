-- Stratos Nova MVP security hardening.
-- Keep RLS helper execution available where policies require it; prevent direct calls to trigger-only functions.
-- No user records, auth users, or application data are changed.

ALTER FUNCTION public.audit_sanitize(jsonb) SET search_path = pg_catalog;
ALTER FUNCTION public.audit_diff(jsonb, jsonb) SET search_path = pg_catalog;

-- These helpers are called by RLS policies. They must derive identity from the
-- verified Supabase JWT, never from a caller-supplied user id.
CREATE OR REPLACE FUNCTION public.employer_owns_job(p_job_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.jobs j
    JOIN public.companies c ON c.id = j.company_id
    WHERE j.id = p_job_id
      AND c.owner_id = auth.uid()
      AND p_user_id = auth.uid()
  );
$function$;

CREATE OR REPLACE FUNCTION public.recruiter_has_job_assignment(p_job_id uuid, p_recruiter_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.recruiter_assignments ra
    WHERE ra.job_id = p_job_id
      AND ra.recruiter_id = auth.uid()
      AND p_recruiter_id = auth.uid()
      AND ra.status = 'active'
  );
$function$;

-- Lifecycle maintenance is an administrative operation, not a public RPC.
CREATE OR REPLACE FUNCTION public.refresh_candidate_lifecycle(p_days_threshold integer DEFAULT 45)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE changed integer;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role'
     AND public.my_role() IS DISTINCT FROM 'admin'::public.user_role THEN
    RAISE EXCEPTION 'Not authorized to refresh candidate lifecycle';
  END IF;

  UPDATE public.profiles p
  SET candidate_status = 'inactive', status_updated_at = now()
  FROM public.users u
  WHERE p.id = u.id
    AND u.role = 'candidate'
    AND p.updated_at < now() - make_interval(days => greatest(1, least(p_days_threshold, 3650)))
    AND coalesce(p.candidate_status, 'open_to_work') NOT IN ('not_looking', 'inactive');

  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN changed;
END;
$function$;

-- Start from least privilege for every SECURITY DEFINER function in the exposed schema.
DO $block$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f.signature);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f.signature);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', f.signature);
  END LOOP;
END;
$block$;

-- Safe identity helpers are used in policies that also cover public content.
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_role() TO anon, authenticated;

-- Application RPCs and policy helpers used by signed-in users.
GRANT EXECUTE ON FUNCTION public.consume_candidate_search(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_assessment_questions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.employer_owns_job(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recruiter_has_job_assignment(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_candidate_outreach_status(uuid, public.outreach_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_assessment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_assessment(uuid, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_candidate_lifecycle(integer) TO authenticated, service_role;

-- Trigger functions remain callable by PostgreSQL triggers, not by API roles.
