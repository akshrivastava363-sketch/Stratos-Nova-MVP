import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Users, TrendingUp, Percent, PlusCircle, AlertCircle, CreditCard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { getEffectivePlan } from '../../lib/entitlement';
import DashboardLayout from '../../layouts/DashboardLayout';

export default function EmployerDashboard() {
  const { user } = useAuth();
  const [company, setCompany] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [appCount, setAppCount] = useState(0);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: c } = await supabase.from('companies').select('*').eq('owner_id', user.id).maybeSingle();
      setCompany(c);
      if (c) {
        const { data: j } = await supabase.from('jobs').select('id,title,status,created_at,applications(count)').eq('company_id', c.id).order('created_at', { ascending: false }).limit(10);
        setJobs(j || []);
        const { count } = await supabase.from('applications').select('id, jobs!inner(company_id)', { count: 'exact', head: true }).eq('jobs.company_id', c.id);
        setAppCount(count || 0);
        const effectivePlan = await getEffectivePlan({ userEmail: user.email, companyId: c.id });
        setPlan(effectivePlan);
      }
      setLoading(false);
    })();
  }, [user]);

  const openPositions = jobs.filter((j) => j.status === 'active').length;

  return (
    <DashboardLayout role="employer">
      {!loading && !company && (
        <div className="card mb-8 flex items-center gap-4 border-gold-500/30 bg-gold-500/[0.06]">
          <AlertCircle className="shrink-0 text-gold-400" size={20} />
          <div className="flex-1"><div className="font-medium">Complete your company profile</div><div className="text-sm text-white/50">Needed before you can post jobs.</div></div>
          <Link to="/employer/company" className="btn-primary !py-2 !px-4 text-sm shrink-0">Set up now</Link>
        </div>
      )}
      {!loading && company && !plan && (
        <div className="card mb-8 flex items-center gap-4 border-accent-500/30 bg-accent-500/[0.06]">
          <CreditCard className="shrink-0 text-accent-400" size={20} />
          <div className="flex-1"><div className="font-medium">No active subscription</div><div className="text-sm text-white/50">You're on limited free access. Pick a plan to unlock more.</div></div>
          <Link to="/employer/subscription" className="btn-primary !py-2 !px-4 text-sm shrink-0">View Plans</Link>
        </div>
      )}
      <div className="mb-8 flex items-center justify-between">
        <div><h1 className="font-display text-2xl font-bold">{company?.name || 'Your Hiring'} Overview</h1><p className="text-white/50">Track your open roles and applicant pipeline.</p></div>
        <Link to="/employer/jobs/new" className="btn-primary !py-2.5 !px-4 text-sm"><PlusCircle size={16} /> Post a Job</Link>
      </div>
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Open Positions', value: openPositions, icon: Briefcase },
          { label: 'Total Applications', value: appCount, icon: Users },
          { label: 'Active Jobs', value: jobs.length, icon: TrendingUp },
          { label: 'Plan', value: plan?.name || 'Free', icon: Percent },
        ].map((s) => (
          <div key={s.label} className="card"><s.icon size={18} className="mb-3 text-accent-400" /><div className="font-display text-2xl font-bold">{s.value}</div><div className="text-xs text-white/40">{s.label}</div></div>
        ))}
      </div>
      <div className="card">
        <h2 className="mb-4 text-lg font-semibold">Your Jobs</h2>
        {loading ? <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-14" />)}</div>
        : jobs.length === 0 ? <div className="py-12 text-center text-white/40"><Briefcase size={32} className="mx-auto mb-3 opacity-30" />No jobs posted yet.</div>
        : <div className="divide-y divide-white/[0.06]">
            {jobs.map((j) => (
              <Link to={`/employer/jobs/${j.id}/applicants`} key={j.id} className="flex items-center justify-between py-3">
                <div className="text-sm font-medium">{j.title}</div>
                <div className="flex items-center gap-4 text-xs text-white/40">
                  <span>{j.applications?.[0]?.count ?? 0} applicants</span>
                  <span className={`badge ${j.status === 'active' ? 'bg-green-500/15 text-green-300' : 'bg-white/10'}`}>{j.status}</span>
                </div>
              </Link>
            ))}
          </div>}
      </div>
    </DashboardLayout>
  );
}
