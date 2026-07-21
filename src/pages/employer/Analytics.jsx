import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../layouts/DashboardLayout';

const stages = ['applied', 'under_review', 'shortlisted', 'interview_scheduled', 'selected', 'offer_released', 'joined'];

export default function EmployerAnalytics() {
  const { user } = useAuth();
  const [funnel, setFunnel] = useState({});
  const [topSkills, setTopSkills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: c } = await supabase.from('companies').select('id').eq('owner_id', user.id).maybeSingle();
      if (!c) { setLoading(false); return; }

      const { data: apps } = await supabase
        .from('applications').select('status, jobs!inner(company_id)').eq('jobs.company_id', c.id);
      const counts = {};
      (apps || []).forEach((a) => { counts[a.status] = (counts[a.status] || 0) + 1; });
      setFunnel(counts);

      const { data: skills } = await supabase
        .from('job_skills').select('skills(name), jobs!inner(company_id)').eq('jobs.company_id', c.id);
      const skillCounts = {};
      (skills || []).forEach((s) => {
        const name = s.skills?.name;
        if (name) skillCounts[name] = (skillCounts[name] || 0) + 1;
      });
      setTopSkills(Object.entries(skillCounts).sort((a, b) => b[1] - a[1]).slice(0, 8));
      setLoading(false);
    })();
  }, [user]);

  const maxCount = Math.max(1, ...stages.map((s) => funnel[s] || 0));

  return (
    <DashboardLayout role="employer">
      <h1 className="mb-1 font-display text-2xl font-bold">Hiring Analytics</h1>
      <p className="mb-6 text-white/50">See how candidates move through your pipeline.</p>

      <div className="card mb-6">
        <h2 className="mb-4 text-lg font-semibold">Hiring Funnel</h2>
        {loading ? <div className="skeleton h-40" /> : (
          <div className="space-y-3">
            {stages.map((s) => (
              <div key={s} className="flex items-center gap-3">
                <div className="w-36 shrink-0 text-xs capitalize text-white/50">{s.replace(/_/g, ' ')}</div>
                <div className="h-6 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                  <div className="h-full rounded-full bg-accent-500" style={{ width: `${((funnel[s] || 0) / maxCount) * 100}%` }} />
                </div>
                <div className="w-8 text-right text-xs text-white/50">{funnel[s] || 0}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="mb-4 text-lg font-semibold">Most Requested Skills (your postings)</h2>
        {topSkills.length === 0 ? (
          <p className="text-sm text-white/40">Post jobs with tagged skills to see this data.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {topSkills.map(([name, count]) => (
              <span key={name} className="rounded-full bg-white/[0.05] px-3 py-1.5 text-xs text-white/70">
                {name} <span className="text-white/40">×{count}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
