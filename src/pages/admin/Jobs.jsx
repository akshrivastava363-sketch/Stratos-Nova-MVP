import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../layouts/DashboardLayout';

export default function AdminJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from('jobs').select('id,title,status,location,created_at,companies(name)').order('created_at', { ascending: false }).limit(100);
    setJobs(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (id, status) => {
    const { error } = await supabase.from('jobs').update({ status }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status } : j)));
    toast.success(`Job ${status}`);
  };

  return (
    <DashboardLayout role="admin">
      <h1 className="mb-1 font-display text-2xl font-bold">Manage Jobs</h1>
      <p className="mb-6 text-white/50">Platform-wide job oversight.</p>
      <div className="card !p-0">
        {loading ? <div className="p-6"><div className="skeleton h-40" /></div> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/[0.06] text-left text-xs text-white/40"><th className="px-4 py-3">Title</th><th className="px-4 py-3">Company</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th></tr></thead>
            <tbody className="divide-y divide-white/[0.06]">
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td className="px-4 py-3">{j.title}</td>
                  <td className="px-4 py-3 text-white/60">{j.companies?.name}</td>
                  <td className="px-4 py-3 text-white/60">{j.location}</td>
                  <td className="px-4 py-3"><span className={`badge ${j.status === 'active' ? 'bg-green-500/15 text-green-300' : 'bg-white/10 text-white/50'}`}>{j.status}</span></td>
                  <td className="px-4 py-3">{j.status !== 'closed' && <button onClick={() => setStatus(j.id, 'closed')} className="text-xs text-red-400 hover:text-red-300">Force close</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardLayout>
  );
}
