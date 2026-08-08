import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../layouts/DashboardLayout';

export default function EmployerSubscription() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [company, setCompany] = useState(null);
  const [currentSub, setCurrentSub] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('subscription_plans').select('*').eq('is_active', true).order('monthly_price', { ascending: true, nullsFirst: false }),
      supabase.from('companies').select('id').eq('owner_id', user.id).maybeSingle(),
    ]);
    setPlans(p || []); setCompany(c);
    if (c) {
      const { data: sub } = await supabase.from('company_subscriptions').select('*,subscription_plans(*)').eq('company_id', c.id).eq('status', 'active').maybeSingle();
      setCurrentSub(sub);
    }
    setLoading(false);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const choosePlan = async (planId) => {
    if (!company) { toast.error('Set up your company profile first.'); return; }
    if (currentSub) await supabase.from('company_subscriptions').update({ status: 'cancelled' }).eq('id', currentSub.id);
    const { error } = await supabase.from('company_subscriptions').insert({ company_id: company.id, plan_id: planId, status: 'active' });
    if (error) { toast.error(error.message); return; }
    toast.success('Plan updated');
    load();
  };

  return (
    <DashboardLayout role="employer">
      <h1 className="mb-1 font-display text-2xl font-bold">Subscription</h1>
      <p className="mb-6 text-white/50">Job posting and search limits scale with your plan.</p>
      {loading ? <div className="skeleton h-64" /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {plans.map((p) => {
            const active = currentSub?.plan_id === p.id;
            return (
              <div key={p.id} className={`card ${active ? 'border-accent-500/50 ring-1 ring-accent-500/30' : ''}`}>
                <div className="text-sm text-white/50">{p.name}</div>
                <div className="mt-1 font-display text-xl font-bold">{p.monthly_price == null ? 'Custom' : p.monthly_price === 0 ? '₹0' : `₹${p.monthly_price.toLocaleString('en-IN')}`}</div>
                <ul className="mt-4 space-y-1.5 text-xs text-white/60">
                  <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-accent-400" /> {p.active_job_limit ?? 'Unlimited'} jobs</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-accent-400" /> {p.candidate_search_limit ?? 'Unlimited'} searches</li>
                  {p.recruiter_assist_included && <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-accent-400" /> Recruiter Assist</li>}
                </ul>
                <button onClick={() => choosePlan(p.id)} disabled={active} className={active ? 'btn-secondary mt-4 w-full !py-2 text-sm' : 'btn-primary mt-4 w-full !py-2 text-sm'}>
                  {active ? 'Current Plan' : 'Choose Plan'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
