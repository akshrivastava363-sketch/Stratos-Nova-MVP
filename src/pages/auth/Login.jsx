import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Chrome } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(form);
    setLoading(false);
    if (error) toast.error(error.message);
    else navigate('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-nova-950 px-6 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600" />
          <span className="font-display text-lg font-bold">Stratos Nova</span>
        </Link>
        <div className="card">
          <h1 className="mb-1 font-display text-2xl font-bold">Welcome back</h1>
          <p className="mb-6 text-sm text-white/50">Sign in to your account</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input required type="email" placeholder="Email address" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input required type="password" placeholder="Password" className="input-field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <div className="flex justify-end"><Link to="/forgot-password" className="text-xs text-accent-400 hover:text-accent-300">Forgot password?</Link></div>
            <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Signing in…' : 'Sign in'}</button>
          </form>
          <div className="my-4 flex items-center gap-3"><div className="h-px flex-1 bg-white/10" /><span className="text-xs text-white/30">OR</span><div className="h-px flex-1 bg-white/10" /></div>
          <button onClick={signInWithGoogle} className="btn-secondary w-full"><Chrome size={18} /> Continue with Google</button>
          <p className="mt-6 text-center text-sm text-white/50">New here? <Link to="/register" className="text-accent-400 hover:text-accent-300">Create an account</Link></p>
        </div>
      </div>
    </div>
  );
}
