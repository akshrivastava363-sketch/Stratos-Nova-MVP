import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../layouts/DashboardLayout';

export default function AdminAnalytics() {
  const [stats, setStats] = useState(null);
  const [topSkills, setTopSkills] = useState([]);
  const [topJobs, setTopJobs] = useState([]);
  const [growth, setGrowth] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [users, candidates, employers, jobs, applications] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'candidate'),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'employer'),
        supabase.from('jobs').select('*', { count: 'exact', head: true }),
        supabase.from('applications').select('*', { count: 'exact', head: true }),
      ]);
      setStats({ totalUsers: users.count || 0, candidates: candidates.count || 0, employers: employers.count || 0, jobs: jobs.count || 0, applications: applications.count || 0 });

      const { data: skills } = await supabase.from('job_skills').select('skills(name)');
      const skillCounts = {};
      (skills || []).forEach((s) => { const n = s.skills?.name; if (n) skillCounts[n] = (skillCounts[n] || 0) + 1; });
      setTopSkills(Object.entries(skillCounts).sort((a, b) => b[1] - a[1]).slice(0, 10));

      const { data: apps } = await supabase.from('applications').select('job_id, jobs(title)');
      const jobCounts = {};
      (apps || []).forEach((a) => { const title = a.jobs?.title; if (title) jobCounts[title] = (jobCounts[title] || 0) + 1; });
      setTopJobs(Object.entries(jobCounts).sort((a, b) => b[1] - a[1]).slice(0, 8));

      const { data: recentUsers } = await supabase.from('users').select('created_at').order('created_at', { ascending: false }).limit(500);
      const byMonth = {};
      (recentUsers || []).forEach((u) => { const key = new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }); byMonth[key] = (byMonth[key] || 0) + 1; });
      setGrowth(Object.entries(byMonth).reverse().slice(0, 6));

      setLoading(false);
    })();
  }, []);

  return (
    <DashboardLayout role="admin">
      <h1 className="mb-1 font-display text-2xl font-bold">Platform Analytics</h1>
      <p className="mb-6 text-white/50">Trends across the entire Stratos Nova platform.</p>
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {stats && [['Total Users', stats.totalUsers], ['Candidates', stats.candidates], ['Employers', stats.employers], ['Jobs', stats.jobs], ['Applications', stats.applications]].map(([label, val]) => (
          <div key={label} className="card"><div className="font-display text-2xl font-bold">{val}</div><div className="text-xs text-white/40">{label}</div></div>
        ))}
      </div>
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold">Monthly Growth</h2>
          {loading ? <div className="skeleton h-40" /> : growth.length === 0 ? <p className="text-sm text-white/40">Not enough data yet.</p> : (
            <div className="flex h-40 items-end gap-3">
              {growth.map(([label, count]) => {
                const max = Math.max(...growth.map((g) => g[1]), 1);
                return (<div key={label} className="flex flex-1 flex-col items-center gap-2"><div className="w-full rounded-t-lg bg-accent-500" style={{ height: `${(count / max) * 100}%`, minHeight: 4 }} /><span className="text-[10px] text-white/40">{label}</span></div>);
              })}
            </div>
          )}
        </div>
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold">Most Applied Jobs</h2>
          {topJobs.length === 0 ? <p className="text-sm text-white/40">No applications yet.</p> : (
            <div className="space-y-2">{topJobs.map(([title, count]) => (<div key={title} className="flex items-center justify-between text-sm"><span className="truncate text-white/70">{title}</span><span className="text-white/40">{count}</span></div>))}</div>
          )}
        </div>
      </div>
      <div className="card">
        <h2 className="mb-4 text-lg font-semibold">Top Skills in Demand</h2>
        {topSkills.length === 0 ? <p className="text-sm text-white/40">No tagged skills yet.</p> : (
          <div className="flex flex-wrap gap-2">{topSkills.map(([name, count]) => (<span key={name} className="badge bg-white/[0.05] text-white/70">{name} <span className="text-white/40">×{count}</span></span>))}</div>
        )}
      </div>
    </DashboardLayout>
  );
}
