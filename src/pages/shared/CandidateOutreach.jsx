import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, MessageSquare, Clock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../layouts/DashboardLayout';

const statusLabel = {
  new: 'New',
  profile_update_required: 'Profile Update Required',
  profile_updated: 'Profile Updated',
  verification_pending: 'Verification Pending',
  verified: 'Verified',
  communication_pending: 'Communication Pending',
  contacted: 'Contacted',
  responded: 'Responded',
};

const statusColor = {
  new: 'bg-white/10 text-white/50',
  profile_update_required: 'bg-red-500/15 text-red-300',
  profile_updated: 'bg-green-500/15 text-green-300',
  verification_pending: 'bg-yellow-500/15 text-yellow-300',
  verified: 'bg-green-500/15 text-green-300',
  communication_pending: 'bg-orange-500/15 text-orange-300',
  contacted: 'bg-accent-500/15 text-accent-300',
  responded: 'bg-purple-500/15 text-purple-300',
};

const PAGE_SIZE = 25;

export default function CandidateOutreach({ role = 'admin' }) {
  const [candidates, setCandidates] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [staleOnly, setStaleOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [repliedIds, setRepliedIds] = useState(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('profiles')
      .select('id,outreach_status,outreach_status_updated_at,profile_confirmed_at,headline,users!inner(full_name,email)', { count: 'exact' });

    if (statusFilter) q = q.eq('outreach_status', statusFilter);
    if (query) q = q.or(`full_name.ilike.%${query}%,email.ilike.%${query}%`, { foreignTable: 'users' });
    if (staleOnly) {
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      q = q.or(`profile_confirmed_at.is.null,profile_confirmed_at.lt.${cutoff}`);
    }

    q = q.order('outreach_status_updated_at', { ascending: true }).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    const { data, count } = await q;
    const rows = data || [];
    setCandidates(rows);
    setTotal(count || 0);

    // Determine which of these candidates have replied to a staff message
    // (derived from the existing messages table — no new table needed).
    const ids = rows.map((r) => r.id);
    if (ids.length > 0) {
      const { data: replies } = await supabase.from('messages').select('sender_id').in('sender_id', ids);
      setRepliedIds(new Set((replies || []).map((r) => r.sender_id)));
    } else {
      setRepliedIds(new Set());
    }
    setLoading(false);
  }, [query, statusFilter, staleOnly, page]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (candidateId, status) => {
    const { error } = await supabase.rpc('set_candidate_outreach_status', { p_candidate_id: candidateId, p_status: status });
    if (error) { toast.error(error.message); return; }
    setCandidates((prev) => prev.map((c) => (c.id === candidateId ? { ...c, outreach_status: status } : c)));
    toast.success(`Marked ${statusLabel[status]}`);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <DashboardLayout role={role}>
      <h1 className="mb-1 font-display text-2xl font-bold">Candidate Updates</h1>
      <p className="mb-6 text-white/50">Keep candidate information current and track outreach.</p>

      <div className="card mb-6 space-y-3">
        <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-4 py-3">
          <Search size={16} className="text-white/40" />
          <input className="w-full bg-transparent text-sm outline-none placeholder:text-white/30" placeholder="Search by name or email" value={query} onChange={(e) => { setPage(0); setQuery(e.target.value); }} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select className="input-field !py-2 w-56 text-sm" value={statusFilter} onChange={(e) => { setPage(0); setStatusFilter(e.target.value); }}>
            <option value="">All statuses</option>
            {Object.entries(statusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-white/60">
            <input type="checkbox" checked={staleOnly} onChange={(e) => { setPage(0); setStaleOnly(e.target.checked); }} />
            Not confirmed in 90+ days
          </label>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-20" />)}</div>
      ) : candidates.length === 0 ? (
        <div className="card py-16 text-center text-white/40">No candidates match this filter.</div>
      ) : (
        <div className="space-y-3">
          {candidates.map((c) => {
            const responded = repliedIds.has(c.id);
            return (
              <div key={c.id} className="card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{c.users?.full_name || 'Candidate'}</div>
                    <div className="text-xs text-white/40">{c.users?.email} · {c.headline}</div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-white/30">
                      <Clock size={11} />
                      {c.profile_confirmed_at ? `Confirmed ${new Date(c.profile_confirmed_at).toLocaleDateString()}` : 'Never confirmed'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {responded && <span className="badge bg-purple-500/15 text-purple-300">Replied</span>}
                    <span className={`badge ${statusColor[c.outreach_status] || 'bg-white/10'}`}>{statusLabel[c.outreach_status] || c.outreach_status}</span>
                    <Link to={`/${role}/messages?to=${c.id}`} className="btn-secondary !py-1.5 !px-3 text-xs">
                      <MessageSquare size={13} /> Message
                    </Link>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-white/[0.06] pt-3">
                  <button onClick={() => setStatus(c.id, 'profile_update_required')} className="badge bg-white/[0.05] text-white/50 hover:bg-white/[0.1]">Request Update</button>
                  <button onClick={() => setStatus(c.id, 'verification_pending')} className="badge bg-white/[0.05] text-white/50 hover:bg-white/[0.1]">Verification Pending</button>
                  <button onClick={() => setStatus(c.id, 'verified')} className="badge bg-white/[0.05] text-white/50 hover:bg-white/[0.1]">Verified</button>
                  <button onClick={() => setStatus(c.id, 'communication_pending')} className="badge bg-white/[0.05] text-white/50 hover:bg-white/[0.1]">Communication Pending</button>
                  <button onClick={() => setStatus(c.id, 'contacted')} className="badge bg-white/[0.05] text-white/50 hover:bg-white/[0.1]">Mark Contacted</button>
                  {responded && (
                    <button onClick={() => setStatus(c.id, 'responded')} className="badge bg-white/[0.05] text-white/50 hover:bg-white/[0.1]">Mark Responded</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="btn-secondary !py-1.5 !px-3 text-xs disabled:opacity-30">Prev</button>
          <span className="text-xs text-white/40">Page {page + 1} of {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} className="btn-secondary !py-1.5 !px-3 text-xs disabled:opacity-30">Next <ArrowRight size={12} /></button>
        </div>
      )}
    </DashboardLayout>
  );
}
