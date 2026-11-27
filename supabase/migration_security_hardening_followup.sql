-- The lifecycle refresh is a maintenance RPC; ordinary authenticated users must not invoke it.
REVOKE ALL ON FUNCTION public.refresh_candidate_lifecycle(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_candidate_lifecycle(integer) TO service_role;