import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../layouts/DashboardLayout';

const statusStyle = { pending: 'bg-yellow-500/15 text-yellow-300', approved: 'bg-green-500/15 text-green-300', rejected: 'bg-red-500/15 text-red-300', suspended: 'bg-red-500/15 text-red-300' };

export default function AdminEmployers() {
  const [companies, setCompanies] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    let q = supabase.from('companies').select('*, users!companies_owner_id_fkey(email)').order('created_at', { ascending: false });
    if (filter) q = q.eq('approval_status', filter);
    const { data } = await q; setCompanies(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, [filter]);

  const setStatus = async (id, status) => {
    const payload = { approval_status: status };
    if (status === 'approved') payload.approved_at = new Date().toISOString();
    const { error } = await supabase.from('companies').update(payload).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, ...payload } : c)));
    toast.success(`Company ${status}`);
  };

  return (
    <DashboardLayout role="admin">
      <h1 className="mb-1 font-display text-2xl font-bold">Manage Employers</h1>
      <p className="mb-6 text-white/50">Approve, reject, or suspend employer accounts.</p>
      <div className="mb-6 flex gap-2">
        {['', 'pending', 'approved', 'rejected', 'suspended'].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`badge capitalize ${filter === s ? 'bg-accent-500 text-white' : 'bg-white/[0.05] text-white/50'}`}>{s || 'All'}</button>
        ))}
      </div>
      {loading ? <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20" />)}</div>
      : companies.length === 0 ? <div className="card py-16 text-center text-white/40">No employers found for this filter.</div>
      : <div className="space-y-3">
          {companies.map((c) => (
            <div key={c.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div><div className="font-medium">{c.name}</div><div className="text-xs text-white/40">{c.users?.email} · {c.industry || 'Industry not set'}</div></div>
              <div className="flex items-center gap-2">
                <span className={`badge ${statusStyle[c.approval_status]}`}>{c.approval_status}</span>
                {c.approval_status !== 'approved' && <button onClick={() => setStatus(c.id, 'approved')} className="btn-primary !py-1.5 !px-3 text-xs">Approve</button>}
                {c.approval_status !== 'rejected' && c.approval_status !== 'suspended' && <button onClick={() => setStatus(c.id, 'rejected')} className="btn-secondary !py-1.5 !px-3 text-xs">Reject</button>}
                {c.approval_status === 'approved' && <button onClick={() => setStatus(c.id, 'suspended')} className="text-xs text-red-400 hover:text-red-300">Suspend</button>}
              </div>
            </div>
          ))}
        </div>}
    </DashboardLayout>
  );
}
