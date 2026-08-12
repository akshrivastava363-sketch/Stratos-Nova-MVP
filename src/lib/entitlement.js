import { supabase } from './supabase';
import { isTestSubscribedEmail } from './testAccess';

// Centralized entitlement lookup for employer-side feature gates.
// Every place in the app that needs to know "what plan does this company
// effectively have" should call this — not query company_subscriptions
// directly — so the test override only ever needs to exist in one place.
export async function getEffectivePlan({ userEmail, companyId }) {
  if (isTestSubscribedEmail(userEmail)) {
    // Reuse the real, existing Enterprise plan row rather than inventing
    // a synthetic shape — this is genuinely unlimited on every field that
    // is actually enforced anywhere in the app today.
    const { data } = await supabase.from('subscription_plans').select('*').eq('tier', 'enterprise').maybeSingle();
    if (data) return data;
    // Fallback in the unlikely case the enterprise row was ever deleted —
    // still fully unlocked, just not tied to a real plan row.
    return { tier: 'enterprise', name: 'Enterprise', active_job_limit: null, candidate_search_limit: null, recruiter_assist_included: true };
  }

  if (!companyId) return null;
  const { data } = await supabase
    .from('company_subscriptions')
    .select('subscription_plans(*)')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .maybeSingle();
  return data?.subscription_plans || null;
}
