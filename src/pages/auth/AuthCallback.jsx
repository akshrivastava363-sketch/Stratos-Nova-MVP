import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const dashboardByRole = {
  employer: '/employer/dashboard',
  admin: '/admin/dashboard',
  recruiter: '/recruiter/dashboard',
  candidate: '/candidate/dashboard',
};

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search || window.location.hash.replace('#', '?'));
    const oauthError = params.get('error_description') || params.get('error');
    if (oauthError) { setError(decodeURIComponent(oauthError.replace(/\+/g, ' '))); return; }

    (async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) { setError(sessionError?.message || 'Could not complete sign-in.'); return; }
      const { data: userRow, error: profileError } = await supabase.from('users').select('role').eq('id', session.user.id).maybeSingle();
      if (profileError || !userRow?.role) {
        await supabase.auth.signOut();
        setError('Your account profile could not be verified. Please contact support.');
        return;
      }
      const role = userRow.role;
      const expectedRole = new URLSearchParams(window.location.search).get('expected_role');
      if (expectedRole && role !== expectedRole) {
        await supabase.auth.signOut();
        setError(`This account is not registered as ${expectedRole}. Please use the correct sign-in page.`);
        return;
      }
      navigate(dashboardByRole[role] || '/login', { replace: true });
    })();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-nova-950 px-6 text-center">
      {error ? (
        <div className="max-w-md">
          <h1 className="mb-2 font-display text-xl font-bold text-red-400">Sign-in failed</h1>
          <p className="mb-6 text-sm text-white/50">{error}</p>
          <button onClick={() => navigate('/login')} className="btn-primary">Back to login</button>
        </div>
      ) : (
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      )}
    </div>
  );
}
