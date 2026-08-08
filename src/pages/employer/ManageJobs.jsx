import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Pause, Play, XCircle, Edit2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../layouts/DashboardLayout';

const statusStyle = { active: 'bg-green-500/15 text-green-300', paused: 'bg-yellow-500/15 text-yellow-300', closed: 'bg-red-500/15 text-red-300', draft: 'bg-white/10 text-white/50' };

export default function ManageJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: c } = await supabase.from('companies').select('id').eq('owner_id', user.id).maybeSingle();
    if (!c) { setLoading(false); return; }
    const { data } = await supabase.from('jobs').select('id,title,status,location,created_at,applications(count)').eq('company_id', c.id).order('created_at', { ascending: false });
    setJobs(data || []); setLoading(false);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const updateStatus = async (jobId, status) => {
    const { error } = await supabase.from('jobs').update({ status }).eq('id', jobId);
    if (error) { toast.error(error.message); return; }
    toast.success(`Job ${status}`);
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status } : j)));
  };

  return (
    <DashboardLayout role="employer">
      <div className="mb-8 flex items-center justify-between">
        <div><h1 className="font-display text-2xl font-bold">Manage Jobs</h1><p className="text-white/50">Edit, pause, or close your postings.</p></div>
        <Link to="/employer/jobs/new" className="btn-primary !py-2.5 !px-4 text-sm"><PlusCircle size={16} /> Post a Job</Link>
      </div>
      <div className="card">
        {loading ? <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-16" />)}</div>
        : jobs.length === 0 ? <div className="py-12 text-center text-white/40">No jobs yet.</div>
        : <div className="divide-y divide-white/[0.06]">
            {jobs.map((j) => (
              <div key={j.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div><div className="font-medium">{j.title}</div><div className="text-xs text-white/40">{j.location} · Posted {new Date(j.created_at).toLocaleDateString()}</div></div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${statusStyle[j.status]}`}>{j.status}</span>
                  <Link to={`/employer/jobs/${j.id}/applicants`} className="btn-secondary !py-1.5 !px-3 text-xs"><Users size={14} /> {j.applications?.[0]?.count ?? 0}</Link>
                  <Link to={`/employer/jobs/${j.id}/edit`} className="rounded-lg p-2 text-white/50 hover:bg-white/[0.06] hover:text-white"><Edit2 size={15} /></Link>
                  {j.status === 'active' ? <button onClick={() => updateStatus(j.id, 'paused')} className="rounded-lg p-2 text-white/50 hover:bg-white/[0.06] hover:text-white"><Pause size={15} /></button>
                  : j.status !== 'closed' ? <button onClick={() => updateStatus(j.id, 'active')} className="rounded-lg p-2 text-white/50 hover:bg-white/[0.06] hover:text-white"><Play size={15} /></button> : null}
                  {j.status !== 'closed' && <button onClick={() => updateStatus(j.id, 'closed')} className="rounded-lg p-2 text-white/50 hover:bg-red-500/10 hover:text-red-400"><XCircle size={15} /></button>}
                </div>
              </div>
            ))}
          </div>}
      </div>
    </DashboardLayout>
  );
}
