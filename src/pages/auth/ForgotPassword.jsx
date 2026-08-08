import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setLoading(false);
    if (error) toast.error(error.message); else setSent(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-nova-950 px-6 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600" />
          <span className="font-display text-lg font-bold">Stratos Nova</span>
        </Link>
        <div className="card">
          <h1 className="mb-1 font-display text-2xl font-bold">Reset your password</h1>
          <p className="mb-6 text-sm text-white/50">We'll email you a reset link.</p>
          {sent ? <p className="text-sm text-accent-400">Check your inbox for a reset link.</p> : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input required type="email" placeholder="Email address" className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} />
              <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Sending…' : 'Send reset link'}</button>
            </form>
          )}
          <p className="mt-6 text-center text-sm text-white/50"><Link to="/login" className="text-accent-400 hover:text-accent-300">Back to sign in</Link></p>
        </div>
      </div>
    </div>
  );
}
