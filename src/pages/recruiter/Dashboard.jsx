import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Users, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../layouts/DashboardLayout';

export default function RecruiterDashboard() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from('recruiter_assignments').select('*,jobs(id,title,companies(name)),status').eq('recruiter_id', user.id).order('assigned_at', { ascending: false })
      .then(({ data }) => { setAssignments(data || []); setLoading(false); });
  }, [user]);

  const active = assignments.filter((a) => a.status === 'active');
  const completed = assignments.filter((a) => a.status === 'completed');

  return (
    <DashboardLayout role="recruiter">
      <h1 className="mb-1 font-display text-2xl font-bold">Recruiter Dashboard</h1>
      <p className="mb-6 text-white/50">Jobs employers have handed to you via Recruiter Assist.</p>
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { label: 'Active Assignments', value: active.length, icon: Briefcase },
          { label: 'Completed', value: completed.length, icon: CheckCircle2 },
          { label: 'Total', value: assignments.length, icon: Users },
        ].map((s) => (
          <div key={s.label} className="card"><s.icon size={18} className="mb-3 text-accent-400" /><div className="font-display text-2xl font-bold">{s.value}</div><div className="text-xs text-white/40">{s.label}</div></div>
        ))}
      </div>
      <div className="card">
        <h2 className="mb-4 text-lg font-semibold">Your Assignments</h2>
        {loading ? <div className="skeleton h-40" /> : assignments.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/40">No assignments yet — employers will activate Recruiter Assist on jobs they need help with.</p>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {assignments.map((a) => (
              <Link to={`/recruiter/jobs/${a.jobs?.id}/applicants`} key={a.id} className="flex items-center justify-between py-3">
                <div><div className="text-sm font-medium">{a.jobs?.title}</div><div className="text-xs text-white/40">{a.jobs?.companies?.name}</div></div>
                <span className={`badge ${a.status === 'active' ? 'bg-green-500/15 text-green-300' : 'bg-white/10 text-white/50'}`}>{a.status}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
