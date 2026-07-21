import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Download, MessageSquare, CalendarPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../layouts/DashboardLayout';

const stages = [
  'applied', 'under_review', 'shortlisted', 'interview_scheduled',
  'interview_completed', 'selected', 'offer_released', 'joined',
];

export default function JobApplicants() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState(null);

  const load = async () => {
    const { data: j } = await supabase.from('jobs').select('id,title').eq('id', id).single();
    setJob(j);
    const { data } = await supabase
      .from('applications')
      .select('id,status,applied_at,cover_note,resume_url,candidate_id,users(full_name,email),profiles(headline,location,resume_url)')
      .eq('job_id', id).order('applied_at', { ascending: false });
    setApplications(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const updateStatus = async (appId, status) => {
    const { error } = await supabase.from('applications').update({ status }).eq('id', appId);
    if (error) { toast.error(error.message); return; }
    setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, status } : a)));
    await supabase.from('notifications').insert({
      user_id: applications.find((a) => a.id === appId)?.candidate_id,
      type: 'application_update',
      title: 'Application status updated',
      body: `Your application for ${job?.title} is now "${status.replace(/_/g, ' ')}"`,
    });
    toast.success('Status updated');
  };

  const scheduleInterview = async (appId, dateStr) => {
    if (!dateStr) return;
    const { error } = await supabase.from('interviews').insert({
      application_id: appId, scheduled_at: new Date(dateStr).toISOString(), round: 'screening',
    });
    if (error) { toast.error(error.message); return; }
    await updateStatus(appId, 'interview_scheduled');
    setScheduling(null);
    toast.success('Interview scheduled');
  };

  return (
    <DashboardLayout role="employer">
      <div className="mb-8">
        <Link to="/employer/jobs" className="text-sm text-white/40 hover:text-white">← Back to jobs</Link>
        <h1 className="mt-2 font-display text-2xl font-bold">{job?.title || 'Applicants'}</h1>
        <p className="text-white/50">{applications.length} applicant{applications.length !== 1 ? 's' : ''}</p>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24" />)}</div>
      ) : applications.length === 0 ? (
        <div className="card py-16 text-center text-white/40">No applicants yet for this role.</div>
      ) : (
        <div className="space-y-4">
          {applications.map((a) => (
            <div key={a.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="font-medium">{a.users?.full_name || 'Candidate'}</div>
                  <div className="text-sm text-white/50">{a.profiles?.headline}</div>
                  <div className="text-xs text-white/40">{a.profiles?.location} · Applied {new Date(a.applied_at).toLocaleDateString()}</div>
                  {a.cover_note && <p className="mt-2 max-w-xl text-sm text-white/60">"{a.cover_note}"</p>}
                </div>
                <div className="flex items-center gap-2">
                  {a.profiles?.resume_url && (
                    <a href={a.profiles.resume_url} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-white/50 hover:bg-white/[0.06] hover:text-white" title="Download resume">
                      <Download size={16} />
                    </a>
                  )}
                  <Link to={`/employer/messages?to=${a.candidate_id}`} className="rounded-lg p-2 text-white/50 hover:bg-white/[0.06] hover:text-white" title="Message">
                    <MessageSquare size={16} />
                  </Link>
                  <button onClick={() => setScheduling(scheduling === a.id ? null : a.id)} className="rounded-lg p-2 text-white/50 hover:bg-white/[0.06] hover:text-white" title="Schedule interview">
                    <CalendarPlus size={16} />
                  </button>
                </div>
              </div>

              {scheduling === a.id && (
                <div className="mt-4 flex items-center gap-2 border-t border-white/[0.06] pt-4">
                  <input type="datetime-local" id={`sched-${a.id}`} className="input-field !py-2 text-sm" />
                  <button
                    onClick={() => scheduleInterview(a.id, document.getElementById(`sched-${a.id}`).value)}
                    className="btn-primary !py-2 !px-3 text-sm"
                  >
                    Confirm
                  </button>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
                {stages.map((s) => (
                  <button
                    key={s}
                    onClick={() => updateStatus(a.id, s)}
                    className={`rounded-full px-3 py-1.5 text-xs transition ${
                      a.status === s ? 'bg-accent-500 text-white' : 'bg-white/[0.05] text-white/50 hover:bg-white/[0.1]'
                    }`}
                  >
                    {s.replace(/_/g, ' ')}
                  </button>
                ))}
                <button
                  onClick={() => updateStatus(a.id, 'rejected')}
                  className={`rounded-full px-3 py-1.5 text-xs transition ${
                    a.status === 'rejected' ? 'bg-red-500 text-white' : 'bg-white/[0.05] text-white/50 hover:bg-red-500/20'
                  }`}
                >
                  rejected
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
