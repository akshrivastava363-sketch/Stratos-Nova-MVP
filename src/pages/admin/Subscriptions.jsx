import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../layouts/DashboardLayout';

export default function AdminSubscriptions() {
  const [plans, setPlans] = useState([]);
  const [companySubs, setCompanySubs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [{ data: p }, { data: cs }] = await Promise.all([
      supabase.from('subscription_plans').select('*').order('monthly_price', { ascending: true, nullsFirst: false }),
      supabase.from('company_subscriptions').select('*,companies(name),subscription_plans(name)').eq('status', 'active'),
    ]);
    setPlans(p || []); setCompanySubs(cs || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const updatePlan = async (id, field, value) => {
    const { error } = await supabase.from('subscription_plans').update({ [field]: value === '' ? null : Number(value) }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value === '' ? null : Number(value) } : p)));
  };

  return (
    <DashboardLayout role="admin">
      <h1 className="mb-1 font-display text-2xl font-bold">Subscriptions</h1>
      <p className="mb-6 text-white/50">Plan limits live in the database — edit them here, no code changes needed.</p>

      {loading ? <div className="skeleton h-64" /> : (
        <div className="card mb-8 !p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/[0.06] text-left text-xs text-white/40"><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Price (₹/mo)</th><th className="px-4 py-3">Job Limit</th><th className="px-4 py-3">Search Limit</th><th className="px-4 py-3">Recruiter Assist</th></tr></thead>
            <tbody className="divide-y divide-white/[0.06]">
              {plans.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3"><input type="number" className="input-field !py-1.5 !px-2 w-24 text-xs" defaultValue={p.monthly_price ?? ''} onBlur={(e) => updatePlan(p.id, 'monthly_price', e.target.value)} /></td>
                  <td className="px-4 py-3"><input type="number" className="input-field !py-1.5 !px-2 w-20 text-xs" placeholder="∞" defaultValue={p.active_job_limit ?? ''} onBlur={(e) => updatePlan(p.id, 'active_job_limit', e.target.value)} /></td>
                  <td className="px-4 py-3"><input type="number" className="input-field !py-1.5 !px-2 w-20 text-xs" placeholder="∞" defaultValue={p.candidate_search_limit ?? ''} onBlur={(e) => updatePlan(p.id, 'candidate_search_limit', e.target.value)} /></td>
                  <td className="px-4 py-3"><span className={`badge ${p.recruiter_assist_included ? 'bg-green-500/15 text-green-300' : 'bg-white/10'}`}>{p.recruiter_assist_included ? 'Included' : 'No'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold">Active Company Subscriptions</h2>
      <div className="card !p-0">
        {companySubs.length === 0 ? <p className="p-6 text-center text-sm text-white/40">No active subscriptions yet.</p> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/[0.06] text-left text-xs text-white/40"><th className="px-4 py-3">Company</th><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Started</th></tr></thead>
            <tbody className="divide-y divide-white/[0.06]">
              {companySubs.map((cs) => (
                <tr key={cs.id}><td className="px-4 py-3">{cs.companies?.name}</td><td className="px-4 py-3 text-white/60">{cs.subscription_plans?.name}</td><td className="px-4 py-3 text-white/40">{new Date(cs.started_at).toLocaleDateString()}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardLayout>
  );
}
