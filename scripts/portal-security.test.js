import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const login = read('../src/pages/auth/Login.jsx');
const callback = read('../src/pages/auth/AuthCallback.jsx');
const auth = read('../src/context/AuthContext.jsx');
const protectedRoute = read('../src/components/ProtectedRoute.jsx');
const register = read('../src/pages/auth/Register.jsx');
const forgot = read('../src/pages/auth/ForgotPassword.jsx');
const reset = read('../src/pages/auth/ResetPassword.jsx');
const verification = read('../supabase/migration_verification_readiness.sql');
const hardening = read('../supabase/migration_security_hardening.sql');

test('password login enforces the selected portal role and clears mismatched sessions', () => {
  assert.match(login, /if \(expectedRole && role !== expectedRole\)/);
  assert.match(login, /await supabase\.auth\.signOut\(\)/);
  assert.match(login, /dashboardByRole\[role\]/);
});

test('OAuth callback enforces role and rejects missing account profiles', () => {
  assert.match(callback, /expected_role/);
  assert.match(callback, /role !== expectedRole/);
  assert.match(callback, /profileError \|\| !userRow\?\.role/);
});

test('public signup only permits candidate or employer metadata roles', () => {
  assert.match(auth, /role === 'employer' \? 'employer' : 'candidate'/);
  assert.match(verification, /v_safe_role := 'candidate'::public\.user_role/);
  assert.match(verification, /v_safe_role := 'employer'::public\.user_role/);
  assert.doesNotMatch(register, /candidate_limit|employer_limit|max_candidates|max_employers/i);
});

test('portal routes require an authenticated user with the allowed database role', () => {
  assert.match(protectedRoute, /if \(!user\)/);
  assert.match(protectedRoute, /allowedRoles\.includes\(role\)/);
});

test('password reset requests a Supabase recovery link and updates the password only with a recovery session', () => {
  assert.match(forgot, /resetPasswordForEmail/);
  assert.match(reset, /event === 'PASSWORD_RECOVERY'/);
  assert.match(reset, /supabase\.auth\.updateUser\(\{ password: newPassword \}\)/);
});

test('verification requests are consent-backed and row-scoped', () => {
  assert.match(verification, /consented_at IS NOT NULL/);
  assert.match(verification, /candidate_id = auth\.uid\(\)/);
  assert.match(verification, /Candidates withdraw own verification requests/);
  assert.match(verification, /Admins update verification requests/);
});

test('security migration removes public execution from trigger-only SECURITY DEFINER functions', () => {
  assert.match(hardening, /REVOKE ALL ON FUNCTION %s FROM PUBLIC/);
  assert.match(hardening, /REVOKE ALL ON FUNCTION %s FROM anon/);
  assert.match(hardening, /REVOKE ALL ON FUNCTION %s FROM authenticated/);
  assert.match(hardening, /audit_sanitize\(jsonb\) SET search_path = pg_catalog/);
});
