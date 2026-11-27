import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ShieldCheck, Clock3, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layouts/DashboardLayout';

const statusOptions = [
  ['pending', 'Pending'],
  ['in_review', 'In review'],
  ['verified', 'Verified'],
  ['discrepancy', 'Discrepancy found'],
  ['unable_to_verify', 'Unable to verify'],
  ['candidate_action_required', 'Candidate action required'],
  ['withdrawn', 'Withdrawn'],
];
const methodOptions = [
  ['', 'Select verification method'],
  ['manual_document_review', 'Manual document review'],
  ['issuing_institution', 'Issuing institution confirmation'],
  ['digilocker', 'DigiLocker (only after approval)'],
  ['nad', 'NAD (only after approval)'],
  ['background_verification_provider', 'Authorised BGV provider'],
  ['epfo_limited_record', 'EPFO corroboration (limited)'],
  ['other', 'Other'],
];

export default function VerificationRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [candidates, setCandidates] = useState({});
  const [records, setRecords] = useState({});
  const [drafts, setDrafts] = useState({});
  const [filter, setFilter] = useState('open');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('verification_requests').select('*').order('created_at', { ascending: false });
    if (error) { toast.error(error.message); setLoading(false); return; }
    const rows = data || [];
    setRequests(rows);
    setDrafts(Object.fromEntries(rows.map((r) => [r.id, {
      status: r.status,
      verification_method: r.verification_method || '',
      source_name: r.source_name || '',
      source_reference: r.source_reference || '',
      result_summary: r.result_summary || '',
      discrepancy_details: r.discrepancy_details || '',
      evidence_reference: r.evidence_reference || '',
    }])));
    const ids = [...new Set(rows.map((r) => r.candidate_id))];
    const eduIds = rows.filter((r) => r.record_type === 'education').map((r) => r.record_id);
    const empIds = rows.filter((r) => r.record_type === 'employment').map((r) => r.record_id);
    const [usersResult, eduResult, empResult] = await Promise.all([
      ids.length ? supabase.from('users').select('id,full_name,email').in('id', ids) : Promise.resolve({ data: [] }),
      eduIds.length ? supabase.from('education_records').select('id,degree,college,university,passing_year').in('id', eduIds) : Promise.resolve({ data: [] }),
      empIds.length ? supabase.from('employment_records').select('id,company,designation,joining_date,exit_date,is_current').in('id', empIds) : Promise.resolve({ data: [] }),
    ]);
    setCandidates(Object.fromEntries((usersResult.data || []).map((u) => [u.id, u])));
    setRecords({
      ...Object.fromEntries((eduResult.data || []).map((r) => [r.id, { ...r, type: 'Education' }])),
      ...Object.fromEntries((empResult.data || []).map((r) => [r.id, { ...r, type: 'Employment' }])),
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const visible = useMemo(() => requests.filter((r) => {
    if (filter === 'open') return ['pending', 'in_review', 'candidate_action_required'].includes(r.status);
    if (filter === 'completed') return ['verified', 'discrepancy', 'unable_to_verify'].includes(r.status);
    return true;
  }), [requests, filter]);

  const changeDraft = (id, key, value) => setDrafts((current) => ({
    ...current, [id]: { ...current[id], [key]: value },
  }));

  const save = async (request) => {
    const draft = drafts[request.id];
    if (!draft) return;
    if (draft.status === 'verified' && (!draft.verification_method || !draft.source_name.trim() || !draft.result_summary.trim())) {
      toast.error('For a verified result, enter the method, source and result summary.');
      return;
    }
    setSaving(request.id);
    const terminal = ['verified', 'discrepancy', 'unable_to_verify'].includes(draft.status);
    const { error } = await supabase.from('verification_requests').update({
      ...draft,
      verification_method: draft.verification_method || null,
      source_name: draft.source_name.trim() || null,
      source_reference: draft.source_reference.trim() || null,
      result_summary: draft.result_summary.trim() || null,
      discrepancy_details: draft.discrepancy_details.trim() || null,
      evidence_reference: draft.evidence_reference.trim() || null,
      reviewed_by: user.id,
      reviewed_at: terminal ? new Date().toISOString() : null,
    }).eq('id', request.id);
    setSaving('');
    if (error) { toast.error(error.message); return; }
    toast.success('Verification record updated');
    await load();
  };

  return (
    <DashboardLayout role="admin">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Candidate Verification</h1>
          <p className="mt-1 max-w-3xl text-sm text-white/50">Consent-backed review of education and employment claims. No DigiLocker, NAD, EPFO or BGV provider is connected yet; record only checks actually performed.</p>
        </div>
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/[0.06] px-3 py-2 text-xs text-yellow-200">Provider integrations inactive</div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="card"><div className="text-2xl font-bold">{requests.length}</div><div className="text-xs text-white/40">Total requests</div></div>
        <div className="card"><div className="text-2xl font-bold text-yellow-300">{requests.filter((r) => ['pending','in_review','candidate_action_required'].includes(r.status)).length}</div><div className="text-xs text-white/40">Open requests</div></div>
        <div className="card"><div className="text-2xl font-bold text-green-300">{requests.filter((r) => r.status === 'verified').length}</div><div className="text-xs text-white/40">Verified outcomes</div></div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {[['open','Open'],['completed','Completed'],['all','All requests']].map(([key,label]) => (
          <button key={key} onClick={() => setFilter(key)} className={`rounded-lg px-3 py-2 text-xs ${filter === key ? 'bg-accent-500/20 text-accent-200' : 'bg-white/[0.05] text-white/55'}`}>{label}</button>
        ))}
        <button onClick={load} className="ml-auto rounded-lg bg-white/[0.05] px-3 py-2 text-xs text-white/60">Refresh</button>
      </div>

      {loading ? <div className="skeleton h-64" /> : visible.length === 0 ? (
        <div className="card py-12 text-center text-sm text-white/45"><ShieldCheck className="mx-auto mb-3 opacity-40" size={28} />No verification requests in this view.</div>
      ) : (
        <div className="space-y-4">
          {visible.map((request) => {
            const candidate = candidates[request.candidate_id] || {};
            const record = records[request.record_id] || {};
            const draft = drafts[request.id] || {};
            return (
              <section key={request.id} className="card space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{candidate.full_name || 'Candidate'} <span className="font-normal text-white/40">· {candidate.email || request.candidate_id}</span></div>
                    <div className="mt-1 text-sm text-white/70">{record.type || request.record_type} — {record.degree || record.designation || ''} {record.college || record.company || ''}</div>
                    <div className="mt-1 text-xs text-white/40">Requested {new Date(request.created_at).toLocaleString()} · Consent version {request.consent_version}</div>
                  </div>
                  <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-white/70">{request.status.replaceAll('_',' ')}</span>
                </div>

                <details className="rounded-lg bg-white/[0.03] p-3">
                  <summary className="cursor-pointer text-xs text-accent-300">View recorded candidate consent</summary>
                  <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-white/60">{request.consent_text}</p>
                  <p className="mt-2 text-[11px] text-white/35">Accepted: {new Date(request.consented_at).toLocaleString()}</p>
                </details>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-xs text-white/50">Outcome
                    <select className="input-field mt-1" value={draft.status || request.status} onChange={(e) => changeDraft(request.id,'status',e.target.value)}>
                      {statusOptions.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </label>
                  <label className="text-xs text-white/50">Verification method
                    <select className="input-field mt-1" value={draft.verification_method || ''} onChange={(e) => changeDraft(request.id,'verification_method',e.target.value)}>
                      {methodOptions.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </label>
                  <label className="text-xs text-white/50">Source / issuing organisation
                    <input className="input-field mt-1" value={draft.source_name || ''} onChange={(e) => changeDraft(request.id,'source_name',e.target.value)} placeholder="e.g. University registrar / provider name" />
                  </label>
                  <label className="text-xs text-white/50">Source reference (optional)
                    <input className="input-field mt-1" value={draft.source_reference || ''} onChange={(e) => changeDraft(request.id,'source_reference',e.target.value)} placeholder="Reference / ticket ID — no passwords or access tokens" />
                  </label>
                  <label className="text-xs text-white/50 md:col-span-2">Outcome summary
                    <textarea className="input-field mt-1" rows={2} value={draft.result_summary || ''} onChange={(e) => changeDraft(request.id,'result_summary',e.target.value)} placeholder="Record what was checked and what the source confirmed." />
                  </label>
                  <label className="text-xs text-white/50 md:col-span-2">Discrepancy details (if applicable)
                    <textarea className="input-field mt-1" rows={2} value={draft.discrepancy_details || ''} onChange={(e) => changeDraft(request.id,'discrepancy_details',e.target.value)} />
                  </label>
                  <label className="text-xs text-white/50 md:col-span-2">Restricted evidence reference (optional)
                    <input className="input-field mt-1" value={draft.evidence_reference || ''} onChange={(e) => changeDraft(request.id,'evidence_reference',e.target.value)} placeholder="Private storage object path; never paste a public document URL" />
                  </label>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
                  <div className="text-[11px] text-white/35">Reviewed by: {request.reviewed_by || 'Not reviewed'} {request.reviewed_at ? `· ${new Date(request.reviewed_at).toLocaleString()}` : ''}</div>
                  <button disabled={saving === request.id} onClick={() => save(request)} className="btn-primary !py-2 !px-4 text-sm">{saving === request.id ? 'Saving…' : 'Save review'}</button>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
