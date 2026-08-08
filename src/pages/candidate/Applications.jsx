import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../layouts/DashboardLayout';

const statusColor = {
  applied: 'bg-blue-500/15 text-blue-300', under_review: 'bg-yellow-500/15 text-yellow-300',
  shortlisted: 'bg-purple-500/15 text-purple-300', interview_scheduled: 'bg-accent-500/15 text-accent-300',
  interview_completed: 'bg-accent-500/15 text-accent-300', on_hold: 'bg-orange-500/15 text-orange-300',
  selected: 'bg-green-500/15 text-green-300', offer_released: 'bg-green-500/15 text-green-300',
  joined: 'bg-green-500/15 text-green-300', rejected: 'bg-red-500/15 text-red-300', withdrawn: 'bg-white/10 text-white/50',
};

export default function CandidateApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from('applications').select('id,status,applied_at,jobs(id,title,location,companies(name))').eq('candidate_id', user.id).order('applied_at', { ascending: false });
    setApplications(data || []); setLoading(false);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const withdraw = async (appId) => {
    const { error } = await supabase.from('applications').update({ status: 'withdrawn' }).eq('id', appId);
    if (error) { toast.error(error.message); return; }
    setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, status: 'withdrawn' } : a)));
    toast.success('Application withdrawn');
  };

  return (
    <DashboardLayout role="candidate">
      <h1 className="mb-1 font-display text-2xl font-bold">Your Applications</h1>
      <p className="mb-6 text-white/50">Track every role you've applied to.</p>
      {loading ? <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20" />)}</div>
      : applications.length === 0 ? <div className="card py-16 text-center text-white/40"><Briefcase size={32} className="mx-auto mb-3 opacity-30" />No applications yet. <Link to="/jobs" className="text-accent-400 hover:text-accent-300">Browse jobs →</Link></div>
      : <div className="space-y-3">
          {applications.map((a) => (
            <div key={a.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link to={`/jobs/${a.jobs?.id}`} className="font-medium hover:text-accent-400">{a.jobs?.title}</Link>
                <div className="text-xs text-white/40">{a.jobs?.companies?.name} · {a.jobs?.location}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`badge ${statusColor[a.status] || 'bg-white/10'}`}>{a.status?.replace(/_/g, ' ')}</span>
                {!['withdrawn', 'rejected', 'joined'].includes(a.status) && <button onClick={() => withdraw(a.id)} className="text-xs text-white/40 hover:text-red-400">Withdraw</button>}
              </div>
            </div>
          ))}
        </div>}
    </DashboardLayout>
  );
}
