import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    // Surface any error Supabase appended to the redirect URL (e.g. ?error=...&error_description=...)
    const params = new URLSearchParams(window.location.search || window.location.hash.replace('#', '?'));
    const oauthError = params.get('error_description') || params.get('error');
    if (oauthError) {
      setError(decodeURIComponent(oauthError.replace(/\+/g, ' ')));
      return;
    }

    (async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        setError(sessionError?.message || 'Could not complete sign-in.');
        return;
      }

      // Give the handle_new_user trigger a moment, then fetch role
      const { data: userRow } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();

      const role = userRow?.role || 'candidate';
      const dest = role === 'employer' ? '/employer/dashboard'
        : role === 'admin' ? '/admin/dashboard'
        : '/candidate/dashboard';
      navigate(dest, { replace: true });
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
