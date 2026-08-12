import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      setReady(!!session);
      setChecking(false);
    };

    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(!!session);
        setChecking(false);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setMessage('Password updated successfully. You can now sign in with your new password.');
    setTimeout(() => navigate('/login', { replace: true }), 1500);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-nova-950 px-6 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600" />
          <span className="font-display text-lg font-bold">Stratos Nova</span>
        </Link>

        <div className="card">
          <h1 className="mb-1 font-display text-2xl font-bold">Set a new password</h1>
          <p className="mb-6 text-sm text-white/50">Choose a new password for your Stratos Nova account.</p>

          {checking ? (
            <p className="text-sm text-white/50">Preparing your secure password reset…</p>
          ) : message ? (
            <div className="space-y-4">
              <p className="text-sm text-accent-400">{message}</p>
              <Link to="/login" className="btn-primary block w-full text-center">Go to sign in</Link>
            </div>
          ) : !ready ? (
            <div className="space-y-4">
              <p className="text-sm text-red-300">
                This reset link is invalid or has expired. Please request a new password reset link.
              </p>
              <Link to="/forgot-password" className="btn-primary block w-full text-center">Request new link</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-white/60">New password</label>
                <input
                  required
                  minLength={8}
                  type="password"
                  className="input-field"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-white/60">Confirm new password</label>
                <input
                  required
                  minLength={8}
                  type="password"
                  className="input-field"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Enter password again"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-white/50">
            <Link to="/login" className="text-accent-400 hover:text-accent-300">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
