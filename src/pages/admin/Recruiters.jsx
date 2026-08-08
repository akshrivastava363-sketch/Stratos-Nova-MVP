import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../layouts/DashboardLayout';

export default function AdminRecruiters() {
  const [recruiters, setRecruiters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: rs } = await supabase.from('users').select('id,full_name,email,is_active,created_at').eq('role', 'recruiter');
      const withCounts = await Promise.all((rs || []).map(async (r) => {
        const { count } = await supabase.from('recruiter_assignments').select('*', { count: 'exact', head: true }).eq('recruiter_id', r.id).eq('status', 'active');
        return { ...r, activeCount: count || 0 };
      }));
      setRecruiters(withCounts); setLoading(false);
    })();
  }, []);

  return (
    <DashboardLayout role="admin">
      <h1 className="mb-1 font-display text-2xl font-bold">Recruiters</h1>
      <p className="mb-6 text-white/50">To create a recruiter, change a user's role to "recruiter" from the Users page.</p>
      {loading ? <div className="skeleton h-40" /> : recruiters.length === 0 ? (
        <div className="card py-16 text-center text-white/40">No recruiter accounts yet.</div>
      ) : (
        <div className="card !p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/[0.06] text-left text-xs text-white/40"><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Active Assignments</th><th className="px-4 py-3">Status</th></tr></thead>
            <tbody className="divide-y divide-white/[0.06]">
              {recruiters.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">{r.full_name}</td>
                  <td className="px-4 py-3 text-white/60">{r.email}</td>
                  <td className="px-4 py-3 text-white/60">{r.activeCount}</td>
                  <td className="px-4 py-3"><span className={`badge ${r.is_active ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'}`}>{r.is_active ? 'Active' : 'Suspended'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
