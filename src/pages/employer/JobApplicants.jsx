import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Download, MessageSquare, CalendarPlus, UserPlus, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../layouts/DashboardLayout';

const stages = [
  'applied', 'under_review', 'shortlisted', 'interview_scheduled',
  'interview_completed', 'on_hold', 'selected', 'offer_released', 'joined',
];

export default function JobApplicants({ role = 'employer' }) {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState(null);
  const [scoring, setScoring] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [recruiters, setRecruiters] = useState([]);
  const [showAssist, setShowAssist] = useState(false);

  const load = async () => {
    const { data: j } = await supabase.from('jobs').select('id,title').eq('id', id).single();
    setJob(j);
    const { data: apps } = await supabase
      .from('applications')
      .select('id,status,applied_at,cover_note,candidate_id,users(full_name,email)')
      .eq('job_id', id).order('applied_at', { ascending: false });

    // 'profiles' has no direct foreign key from 'applications' (only via users),
    // so PostgREST can't embed it in one query — fetch separately and merge.
    const candidateIds = (apps || []).map((a) => a.candidate_id).filter(Boolean);
    let profilesById = {};
    if (candidateIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id,headline,location,resume_url,expected_salary_min,notice_period')
        .in('id', candidateIds);
      profilesById = Object.fromEntries((profs || []).map((p) => [p.id, p]));
    }
    setApplications((apps || []).map((a) => ({ ...a, profiles: profilesById[a.candidate_id] || {} })));

    const { data: assign } = await supabase.from('recruiter_assignments').select('*,users!recruiter_assignments_recruiter_id_fkey(full_name,email)').eq('job_id', id).eq('status', 'active').maybeSingle();
    setAssignment(assign);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const loadRecruiters = async () => {
    const { data } = await supabase.from('users').select('id,full_name,email').eq('role', 'recruiter').eq('is_active', true);
    setRecruiters(data || []);
  };

  const activateRecruiterAssist = async (recruiterId) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('recruiter_assignments').insert({ job_id: id, recruiter_id: recruiterId, assigned_by: user.id });
    if (error) { toast.error(error.message); return; }
    toast.success('Recruiter Assist activated');
    setShowAssist(false);
    load();
  };

  const updateStatus = async (appId, status) => {
    const { error } = await supabase.from('applications').update({ status }).eq('id', appId);
    if (error) { toast.error(error.message); return; }
    setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, status } : a)));
    const { error: notifError } = await supabase.from('notifications').insert({
      user_id: applications.find((a) => a.id === appId)?.candidate_id,
      type: 'application_update', title: 'Application status updated',
      body: `Your application for ${job?.title} is now "${status.replace(/_/g, ' ')}"`,
    });
    if (notifError) console.error('Notification failed:', notifError.message);
    toast.success('Status updated');
  };

  const scheduleInterview = async (appId, dateStr) => {
    if (!dateStr) return;
    const { error } = await supabase.from('interviews').insert({ application_id: appId, scheduled_at: new Date(dateStr).toISOString(), round: 'screening' });
    if (error) { toast.error(error.message); return; }
    await updateStatus(appId, 'interview_scheduled');
    setScheduling(null);
    toast.success('Interview scheduled');
  };

  const saveScorecard = async (appId, scorecard) => {
    const { data: interview } = await supabase.from('interviews').select('id').eq('application_id', appId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (!interview) { toast.error('Schedule an interview first before adding a scorecard.'); return; }
    await supabase.from('interviews').update({ scorecard }).eq('id', interview.id);
    toast.success('Scorecard saved');
    setScoring(null);
  };

  return (
    <DashboardLayout role={role}>
      <div className="mb-6">
        <Link to={role === 'recruiter' ? '/recruiter/jobs' : '/employer/jobs'} className="text-sm text-white/40 hover:text-white">← Back to jobs</Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="font-display text-2xl font-bold">{job?.title || 'Applicants'}</h1><p className="text-white/50">{applications.length} applicant{applications.length !== 1 ? 's' : ''}</p></div>
          {assignment ? (
            <span className="badge bg-accent-500/15 text-accent-300">Recruiter Assist: {assignment.users?.full_name}</span>
          ) : (
            <button onClick={() => { setShowAssist(true); loadRecruiters(); }} className="btn-secondary !py-2 !px-4 text-sm"><UserPlus size={15} /> Activate Recruiter Assist</button>
          )}
        </div>
      </div>

      {showAssist && (
        <div className="card mb-6">
          <h3 className="mb-3 text-sm font-semibold">Assign an internal recruiter</h3>
          {recruiters.length === 0 ? <p className="text-sm text-white/40">No recruiter accounts available yet.</p> : (
            <div className="space-y-2">
              {recruiters.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
                  <div><div className="text-sm">{r.full_name}</div><div className="text-xs text-white/40">{r.email}</div></div>
                  <button onClick={() => activateRecruiterAssist(r.id)} className="btn-primary !py-1.5 !px-3 text-xs">Assign</button>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => setShowAssist(false)} className="btn-secondary mt-3 !py-1.5 !px-3 text-xs">Cancel</button>
        </div>
      )}

      {loading ? <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24" />)}</div>
      : applications.length === 0 ? <div className="card py-16 text-center text-white/40">No applicants yet.</div>
      : <div className="space-y-4">
          {applications.map((a) => (
            <div key={a.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="font-medium">{a.users?.full_name || 'Candidate'}</div>
                  <div className="text-sm text-white/50">{a.profiles?.headline}</div>
                  <div className="text-xs text-white/40">{a.profiles?.location} · Notice: {a.profiles?.notice_period || '—'} · Applied {new Date(a.applied_at).toLocaleDateString()}</div>
                  {a.cover_note && <p className="mt-2 max-w-xl text-sm text-white/60">"{a.cover_note}"</p>}
                </div>
                <div className="flex items-center gap-2">
                  {a.profiles?.resume_url && <a href={a.profiles.resume_url} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-white/50 hover:bg-white/[0.06] hover:text-white"><Download size={16} /></a>}
                  <Link to={`/${role}/messages?to=${a.candidate_id}`} className="rounded-lg p-2 text-white/50 hover:bg-white/[0.06] hover:text-white"><MessageSquare size={16} /></Link>
                  <button onClick={() => setScheduling(scheduling === a.id ? null : a.id)} className="rounded-lg p-2 text-white/50 hover:bg-white/[0.06] hover:text-white"><CalendarPlus size={16} /></button>
                  <button onClick={() => setScoring(scoring === a.id ? null : a.id)} className="rounded-lg p-2 text-white/50 hover:bg-white/[0.06] hover:text-white"><Star size={16} /></button>
                </div>
              </div>

              {scheduling === a.id && (
                <div className="mt-4 flex items-center gap-2 border-t border-white/[0.06] pt-4">
                  <input type="datetime-local" id={`sched-${a.id}`} className="input-field !py-2 text-sm" />
                  <button onClick={() => scheduleInterview(a.id, document.getElementById(`sched-${a.id}`).value)} className="btn-primary !py-2 !px-3 text-sm">Confirm</button>
                </div>
              )}

              {scoring === a.id && (
                <ScorecardForm onSave={(sc) => saveScorecard(a.id, sc)} onCancel={() => setScoring(null)} />
              )}

              <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
                {stages.map((s) => (
                  <button key={s} onClick={() => updateStatus(a.id, s)} className={`badge transition ${a.status === s ? 'bg-accent-500 text-white' : 'bg-white/[0.05] text-white/50 hover:bg-white/[0.1]'}`}>{s.replace(/_/g, ' ')}</button>
                ))}
                <button onClick={() => updateStatus(a.id, 'rejected')} className={`badge transition ${a.status === 'rejected' ? 'bg-red-500 text-white' : 'bg-white/[0.05] text-white/50 hover:bg-red-500/20'}`}>rejected</button>
              </div>
            </div>
          ))}
        </div>}
    </DashboardLayout>
  );
}

function ScorecardForm({ onSave, onCancel }) {
  const [communication, setCommunication] = useState(3);
  const [technical, setTechnical] = useState(3);
  const [cultureFit, setCultureFit] = useState(3);
  const [notes, setNotes] = useState('');

  return (
    <div className="mt-4 space-y-3 border-t border-white/[0.06] pt-4">
      <div className="grid grid-cols-3 gap-3 text-sm">
        {[['Communication', communication, setCommunication], ['Technical', technical, setTechnical], ['Culture Fit', cultureFit, setCultureFit]].map(([label, val, setter]) => (
          <div key={label}>
            <label className="mb-1 block text-xs text-white/50">{label}</label>
            <input type="number" min="1" max="5" className="input-field !py-2" value={val} onChange={(e) => setter(Number(e.target.value))} />
          </div>
        ))}
      </div>
      <textarea className="input-field !py-2 text-sm" rows={2} placeholder="Interview notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex gap-2">
        <button onClick={onCancel} className="btn-secondary !py-1.5 !px-3 text-xs">Cancel</button>
        <button onClick={() => onSave({ communication, technical, culture_fit: cultureFit, notes })} className="btn-primary !py-1.5 !px-3 text-xs">Save Scorecard</button>
      </div>
    </div>
  );
}
