import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import Navbar from '../../components/Navbar';
import { supabase } from '../../lib/supabase';

export default function Pricing() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('subscription_plans').select('*').eq('is_active', true).order('monthly_price', { ascending: true, nullsFirst: false })
      .then(({ data }) => { setPlans(data || []); setLoading(false); });
  }, []);

  return (
    <div className="min-h-screen bg-nova-950">
      <Navbar />
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-14 text-center">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Simple, Modular Pricing</h1>
          <p className="mt-3 text-white/50">Limits scale with your plan. No surprises.</p>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-3 lg:grid-cols-5">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-72" />)}</div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {plans.map((p) => (
              <div key={p.id} className={`card text-left ${p.tier === 'growth' ? 'border-accent-500/50 ring-1 ring-accent-500/30' : ''}`}>
                <div className="text-sm text-white/50">{p.name}</div>
                <div className="mt-2 font-display text-2xl font-bold">
                  {p.monthly_price === null ? 'Custom' : p.monthly_price === 0 ? '₹0' : `₹${p.monthly_price.toLocaleString('en-IN')}`}
                  {p.monthly_price ? <span className="text-sm font-normal text-white/40">/mo</span> : null}
                </div>
                <ul className="mt-5 space-y-2 text-sm text-white/70">
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-accent-400" /> {p.active_job_limit ?? 'Unlimited'} active job{p.active_job_limit === 1 ? '' : 's'}</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-accent-400" /> {p.candidate_search_limit ?? 'Unlimited'} searches/mo</li>
                  {p.recruiter_assist_included && <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-accent-400" /> Recruiter Assist included</li>}
                  {(p.features || []).map((f) => (
                    <li key={f} className="flex items-center gap-2"><CheckCircle2 size={14} className="text-accent-400" /> {f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
