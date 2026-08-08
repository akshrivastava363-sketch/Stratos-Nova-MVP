import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../layouts/DashboardLayout';

const statusLabel = {
  open_to_work: 'Open to Work', serving_notice: 'Serving Notice', interviewing: 'Interviewing',
  immediate_joiner: 'Immediate Joiner', not_looking: 'Not Looking', inactive: 'Inactive',
};

export default function RepositoryHealth() {
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState({});
  const [freshness, setFreshness] = useState({ fresh: 0, stale: 0, veryStale: 0 });
  const [verification, setVerification] = useState({ education: {}, employment: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: profiles, count } = await supabase.from('profiles').select('candidate_status,updated_at', { count: 'exact' });
      setTotal(count || 0);

      const sCounts = {};
      const now = Date.now();
      let fresh = 0, stale = 0, veryStale = 0;
      (profiles || []).forEach((p) => {
        sCounts[p.candidate_status || 'open_to_work'] = (sCounts[p.candidate_status || 'open_to_work'] || 0) + 1;
        const ageDays = (now - new Date(p.updated_at).getTime()) / (1000 * 60 * 60 * 24);
        if (ageDays < 30) fresh++; else if (ageDays < 90) stale++; else veryStale++;
      });
      setStatusCounts(sCounts);
      setFreshness({ fresh, stale, veryStale });

      const { data: edu } = await supabase.from('education_records').select('verification_status');
      const { data: emp } = await supabase.from('employment_records').select('verification_status');
      const eduCounts = {}; (edu || []).forEach((e) => { eduCounts[e.verification_status] = (eduCounts[e.verification_status] || 0) + 1; });
      const empCounts = {}; (emp || []).forEach((e) => { empCounts[e.verification_status] = (empCounts[e.verification_status] || 0) + 1; });
      setVerification({ education: eduCounts, employment: empCounts });

      setLoading(false);
    })();
  }, []);

  return (
    <DashboardLayout role="admin">
      <h1 className="mb-1 font-display text-2xl font-bold">Repository Health</h1>
      <p className="mb-6 text-white/50">How fresh, active, and verified the talent repository is.</p>

      {loading ? <div className="skeleton h-64" /> : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-4">
            <div className="card"><div className="font-display text-2xl font-bold">{total}</div><div className="text-xs text-white/40">Total Profiles</div></div>
            <div className="card"><div className="font-display text-2xl font-bold text-green-400">{freshness.fresh}</div><div className="text-xs text-white/40">Updated &lt;30 days</div></div>
            <div className="card"><div className="font-display text-2xl font-bold text-yellow-400">{freshness.stale}</div><div className="text-xs text-white/40">30–90 days</div></div>
            <div className="card"><div className="font-display text-2xl font-bold text-red-400">{freshness.veryStale}</div><div className="text-xs text-white/40">90+ days</div></div>
          </div>

          <div className="mb-6 card">
            <h2 className="mb-4 text-lg font-semibold">Candidate Status Distribution</h2>
            <div className="space-y-2">
              {Object.entries(statusLabel).map(([key, label]) => {
                const count = statusCounts[key] || 0;
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <div className="w-32 shrink-0 text-xs text-white/50">{label}</div>
                    <div className="h-5 flex-1 overflow-hidden rounded-full bg-white/[0.05]"><div className="h-full rounded-full bg-accent-500" style={{ width: `${pct}%` }} /></div>
                    <div className="w-8 text-right text-xs text-white/50">{count}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="card">
              <h2 className="mb-3 text-sm font-semibold">Education Verification</h2>
              {Object.entries(verification.education).length === 0 ? <p className="text-sm text-white/40">No records yet.</p> : (
                <div className="space-y-1 text-sm text-white/60">{Object.entries(verification.education).map(([k, v]) => <div key={k} className="flex justify-between"><span className="capitalize">{k}</span><span>{v}</span></div>)}</div>
              )}
            </div>
            <div className="card">
              <h2 className="mb-3 text-sm font-semibold">Employment Verification</h2>
              {Object.entries(verification.employment).length === 0 ? <p className="text-sm text-white/40">No records yet.</p> : (
                <div className="space-y-1 text-sm text-white/60">{Object.entries(verification.employment).map(([k, v]) => <div key={k} className="flex justify-between"><span className="capitalize">{k}</span><span>{v}</span></div>)}</div>
              )}
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
