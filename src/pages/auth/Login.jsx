import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Chrome } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

const dashboardByRole = {
  employer: '/employer/dashboard',
  admin: '/admin/dashboard',
  recruiter: '/recruiter/dashboard',
  candidate: '/candidate/dashboard',
};

export default function Login({ expectedRole, heading, registerHref = '/register' }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await signIn(form);
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    const { data: userRow, error: profileError } = await supabase
      .from('users').select('role').eq('id', data.user.id).maybeSingle();

    if (profileError || !userRow?.role) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error('Your account profile could not be verified. Please contact support.');
      return;
    }

    const role = userRow.role;
    if (expectedRole && role !== expectedRole) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error(`This is not a ${expectedRole} account. Please use the correct sign-in page.`);
      return;
    }

    if (!dashboardByRole[role]) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error('This account does not have an authorised portal role.');
      return;
    }

    setLoading(false);
    navigate(dashboardByRole[role], { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-nova-950 px-6 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600" />
          <span className="font-display text-lg font-bold">Stratos Nova</span>
        </Link>
        <div className="card">
          <h1 className="mb-1 font-display text-2xl font-bold">{heading || 'Welcome back'}</h1>
          <p className="mb-6 text-sm text-white/50">
            {expectedRole === 'employer' ? 'Sign in to your employer account' : expectedRole === 'candidate' ? 'Sign in to your candidate account' : expectedRole === 'admin' ? 'Authorised administrator access only' : 'Sign in to your account'}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input required type="email" autoComplete="username" placeholder="Email address" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input required type="password" autoComplete="current-password" placeholder="Password" className="input-field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <div className="flex justify-end"><Link to="/forgot-password" className="text-xs text-accent-400 hover:text-accent-300">Forgot password?</Link></div>
            <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Signing in…' : 'Sign in'}</button>
          </form>
          {expectedRole !== 'admin' && <>
            <div className="my-4 flex items-center gap-3"><div className="h-px flex-1 bg-white/10" /><span className="text-xs text-white/30">OR</span><div className="h-px flex-1 bg-white/10" /></div>
            <button onClick={() => signInWithGoogle(expectedRole)} className="btn-secondary w-full"><Chrome size={18} /> Continue with Google</button>
            <p className="mt-6 text-center text-sm text-white/50">New here? <Link to={registerHref} className="text-accent-400 hover:text-accent-300">Create an account</Link></p>
            {expectedRole === 'candidate' && <p className="mt-3 text-center text-xs text-white/30"><Link to="/employer/login" className="hover:text-white/50">Hiring instead? Employer sign in</Link></p>}
            {expectedRole === 'employer' && <p className="mt-3 text-center text-xs text-white/30"><Link to="/candidate/login" className="hover:text-white/50">Looking for a job? Candidate sign in</Link></p>}
          </>}
        </div>
      </div>
    </div>
  );
}
