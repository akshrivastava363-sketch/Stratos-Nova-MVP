import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Building2, Briefcase, FileCheck, ShieldAlert, UserCog } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../layouts/DashboardLayout';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [pendingEmployers, setPendingEmployers] = useState([]);

  useEffect(() => {
    (async () => {
      const [users, candidates, employers, recruiters, jobs, applications, pending] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'candidate'),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'employer'),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'recruiter'),
        supabase.from('jobs').select('*', { count: 'exact', head: true }),
        supabase.from('applications').select('*', { count: 'exact', head: true }),
        supabase.from('companies').select('id,name,created_at').eq('approval_status', 'pending').limit(5),
      ]);
      setStats({ totalUsers: users.count || 0, candidates: candidates.count || 0, employers: employers.count || 0, recruiters: recruiters.count || 0, jobs: jobs.count || 0, applications: applications.count || 0 });
      setPendingEmployers(pending.data || []);
    })();
  }, []);

  const approveEmployer = async (id) => {
    await supabase.from('companies').update({ approval_status: 'approved', approved_at: new Date().toISOString() }).eq('id', id);
    setPendingEmployers((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <DashboardLayout role="admin">
      <h1 className="mb-1 font-display text-2xl font-bold">Platform Overview</h1>
      <p className="mb-6 text-white/50">Monitor and manage the entire Stratos Nova platform.</p>
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ['Total Users', stats?.totalUsers, Users], ['Candidates', stats?.candidates, Users], ['Employers', stats?.employers, Building2],
          ['Recruiters', stats?.recruiters, UserCog], ['Jobs Posted', stats?.jobs, Briefcase], ['Applications', stats?.applications, FileCheck],
        ].map(([label, value, Icon]) => (
          <div key={label} className="card"><Icon size={18} className="mb-3 text-accent-400" /><div className="font-display text-2xl font-bold">{value ?? '—'}</div><div className="text-xs text-white/40">{label}</div></div>
        ))}
      </div>
      <div className="card">
        <div className="mb-4 flex items-center gap-2"><ShieldAlert size={18} className="text-gold-400" /><h2 className="text-lg font-semibold">Pending Employer Approvals</h2></div>
        {pendingEmployers.length === 0 ? <p className="py-8 text-center text-white/40">No pending approvals.</p> : (
          <div className="divide-y divide-white/[0.06]">
            {pendingEmployers.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-3">
                <div><div className="text-sm font-medium">{c.name}</div><div className="text-xs text-white/40">Requested {new Date(c.created_at).toLocaleDateString()}</div></div>
                <button onClick={() => approveEmployer(c.id)} className="btn-primary !py-1.5 !px-3 text-xs">Approve</button>
              </div>
            ))}
          </div>
        )}
        <Link to="/admin/employers" className="mt-4 inline-block text-sm text-accent-400 hover:text-accent-300">View all employers →</Link>
      </div>
    </DashboardLayout>
  );
}
