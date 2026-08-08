import { useEffect, useState } from 'react';
import { Briefcase, Bookmark, Send, Award, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../layouts/DashboardLayout';

const statusColor = {
  applied: 'bg-blue-500/15 text-blue-300', under_review: 'bg-yellow-500/15 text-yellow-300',
  shortlisted: 'bg-purple-500/15 text-purple-300', interview_scheduled: 'bg-accent-500/15 text-accent-300',
  interview_completed: 'bg-accent-500/15 text-accent-300', on_hold: 'bg-orange-500/15 text-orange-300',
  selected: 'bg-green-500/15 text-green-300', offer_released: 'bg-green-500/15 text-green-300',
  joined: 'bg-green-500/15 text-green-300', rejected: 'bg-red-500/15 text-red-300', withdrawn: 'bg-white/10 text-white/50',
};

const statusLabel = {
  open_to_work: 'Open to Work', serving_notice: 'Serving Notice', interviewing: 'Interviewing',
  immediate_joiner: 'Immediate Joiner', not_looking: 'Not Looking', inactive: 'Inactive',
};

export default function CandidateDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [applications, setApplications] = useState([]);
  const [savedCount, setSavedCount] = useState(0);
  const [assessmentCount, setAssessmentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: apps }, { count }, { count: assessCount }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('applications').select('id,status,applied_at,jobs(title,companies(name))').eq('candidate_id', user.id).order('applied_at', { ascending: false }).limit(10),
        supabase.from('saved_jobs').select('*', { count: 'exact', head: true }).eq('candidate_id', user.id),
        supabase.from('assessment_results').select('*', { count: 'exact', head: true }).eq('candidate_id', user.id).eq('status', 'completed'),
      ]);
      setProfile(p); setApplications(apps || []); setSavedCount(count || 0); setAssessmentCount(assessCount || 0);
      setLoading(false);
    })();
  }, [user]);

  const completion = profile?.profile_completion ?? 0;
  const updateStatus = async (status) => {
    await supabase.from('profiles').update({ candidate_status: status, status_updated_at: new Date().toISOString() }).eq('id', user.id);
    setProfile((p) => ({ ...p, candidate_status: status }));
  };

  return (
    <DashboardLayout role="candidate">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Welcome back</h1>
          <p className="text-white/50">Here's what's happening with your job search.</p>
        </div>
        <select value={profile?.candidate_status || 'open_to_work'} onChange={(e) => updateStatus(e.target.value)} className="input-field !py-2 w-48 text-sm">
          {Object.entries(statusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="card mb-8">
        <div className="mb-2 flex items-center justify-between"><span className="text-sm font-medium">Profile completion</span><span className="text-sm text-accent-400">{completion}%</span></div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-400" style={{ width: `${completion}%` }} /></div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Applied Jobs', value: applications.length, icon: Send },
          { label: 'Saved Jobs', value: savedCount, icon: Bookmark },
          { label: 'Assessments Done', value: assessmentCount, icon: Award },
          { label: 'Interviews', value: applications.filter((a) => a.status?.includes('interview')).length, icon: Briefcase },
        ].map((s) => (
          <div key={s.label} className="card"><s.icon size={18} className="mb-3 text-accent-400" /><div className="font-display text-2xl font-bold">{s.value}</div><div className="text-xs text-white/40">{s.label}</div></div>
        ))}
      </div>

      <div className="card">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">Recent Applications</h2><TrendingUp size={16} className="text-white/30" /></div>
        {loading ? <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-14" />)}</div>
        : applications.length === 0 ? <div className="py-12 text-center text-white/40"><Briefcase size={32} className="mx-auto mb-3 opacity-30" />No applications yet.</div>
        : <div className="divide-y divide-white/[0.06]">
            {applications.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-3">
                <div><div className="text-sm font-medium">{a.jobs?.title}</div><div className="text-xs text-white/40">{a.jobs?.companies?.name}</div></div>
                <span className={`badge ${statusColor[a.status] || 'bg-white/10'}`}>{a.status?.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>}
      </div>
    </DashboardLayout>
  );
}
