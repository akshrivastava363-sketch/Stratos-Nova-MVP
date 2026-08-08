import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Briefcase, UserRound, Chrome } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export default function Register() {
  const [params] = useSearchParams();
  const initialRole = params.get('role');
  const [role, setRole] = useState(['employer', 'candidate'].includes(initialRole) ? initialRole : 'candidate');
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    const { error } = await signUp({ email: form.email, password: form.password, fullName: form.fullName, role });
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success('Check your email to verify your account.'); navigate('/login'); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-nova-950 px-6 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600" />
          <span className="font-display text-lg font-bold">Stratos Nova</span>
        </Link>
        <div className="card">
          <h1 className="mb-1 font-display text-2xl font-bold">Create your account</h1>
          <p className="mb-6 text-sm text-white/50">Join as a candidate or an employer</p>
          <div className="mb-6 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setRole('candidate')} className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition ${role === 'candidate' ? 'border-accent-500 bg-accent-500/10' : 'border-white/10 hover:border-white/20'}`}>
              <UserRound size={20} /><span className="text-sm font-medium">I'm a Candidate</span>
            </button>
            <button type="button" onClick={() => setRole('employer')} className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition ${role === 'employer' ? 'border-accent-500 bg-accent-500/10' : 'border-white/10 hover:border-white/20'}`}>
              <Briefcase size={20} /><span className="text-sm font-medium">I'm an Employer</span>
            </button>
          </div>
          <p className="mb-4 text-xs text-white/30">Recruiter and admin accounts are created internally — contact your Stratos Nova admin.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input required placeholder="Full name" className="input-field" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            <input required type="email" placeholder="Email address" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input required type="password" placeholder="Password (min. 8 characters)" className="input-field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Creating account…' : 'Create account'}</button>
          </form>
          <div className="my-4 flex items-center gap-3"><div className="h-px flex-1 bg-white/10" /><span className="text-xs text-white/30">OR</span><div className="h-px flex-1 bg-white/10" /></div>
          <button onClick={signInWithGoogle} className="btn-secondary w-full"><Chrome size={18} /> Continue with Google</button>
          <p className="mt-6 text-center text-sm text-white/50">Already have an account? <Link to="/login" className="text-accent-400 hover:text-accent-300">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}
