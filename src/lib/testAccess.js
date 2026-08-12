// TEST-ONLY entitlement override.
//
// This is NOT a general-purpose mechanism and is never surfaced in the
// UI. Any email listed here is treated as if they hold the Enterprise
// plan, regardless of their actual company_subscriptions record. It does
// not touch, create, or modify any real subscription row — it only
// changes what getEffectivePlan() (see entitlement.js) returns in memory
// for that one session.
//
// To grant access: add the email below (case doesn't matter).
// To revoke access: remove it. Nothing else needs to change anywhere
// else in the codebase — this is the single source of truth.
const TEST_SUBSCRIBED_EMAILS = [
  'stratoshrsolutions@gmail.com',
];

export function isTestSubscribedEmail(email) {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return TEST_SUBSCRIBED_EMAILS.some((e) => e.trim().toLowerCase() === normalized);
}
