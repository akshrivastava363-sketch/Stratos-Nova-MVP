import { useEffect, useState } from 'react';
import { Briefcase, Bookmark, Send, Bell, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../layouts/DashboardLayout';

const statusColor = {
  applied: 'bg-blue-500/15 text-blue-300',
  under_review: 'bg-yellow-500/15 text-yellow-300',
  shortlisted: 'bg-purple-500/15 text-purple-300',
  interview_scheduled: 'bg-accent-500/15 text-accent-300',
  interview_completed: 'bg-accent-500/15 text-accent-300',
  selected: 'bg-green-500/15 text-green-300',
  offer_released: 'bg-green-500/15 text-green-300',
  joined: 'bg-green-500/15 text-green-300',
  rejected: 'bg-red-500/15 text-red-300',
  withdrawn: 'bg-white/10 text-white/50',
};

export default function CandidateDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [applications, setApplications] = useState([]);
  const [savedCount, setSavedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: apps }, { count }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('applications')
          .select('id,status,applied_at,jobs(title,companies(name))')
          .eq('candidate_id', user.id).order('applied_at', { ascending: false }).limit(10),
        supabase.from('saved_jobs').select('*', { count: 'exact', head: true }).eq('candidate_id', user.id),
      ]);
      setProfile(p);
      setApplications(apps || []);
      setSavedCount(count || 0);
      setLoading(false);
    })();
  }, [user]);

  const completion = profile?.profile_completion ?? 0;

  return (
    <DashboardLayout role="candidate">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold">Welcome back{profile?.headline ? ',' : ''}</h1>
        <p className="text-white/50">Here's what's happening with your job search.</p>
      </div>

      {/* Profile completion */}
      <div className="card mb-8">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">Profile completion</span>
          <span className="text-sm text-accent-400">{completion}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-400" style={{ width: `${completion}%` }} />
        </div>
        {completion < 100 && (
          <p className="mt-3 text-xs text-white/40">Complete your profile to get better job matches.</p>
        )}
      </div>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Applied Jobs', value: applications.length, icon: Send },
          { label: 'Saved Jobs', value: savedCount, icon: Bookmark },
          { label: 'Interviews', value: applications.filter((a) => a.status?.includes('interview')).length, icon: Briefcase },
          { label: 'Notifications', value: '—', icon: Bell },
        ].map((s) => (
          <div key={s.label} className="card">
            <s.icon size={18} className="mb-3 text-accent-400" />
            <div className="font-display text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-white/40">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Applications */}
      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Applications</h2>
          <TrendingUp size={16} className="text-white/30" />
        </div>
        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-14" />)}</div>
        ) : applications.length === 0 ? (
          <div className="py-12 text-center text-white/40">
            <Briefcase size={32} className="mx-auto mb-3 opacity-30" />
            No applications yet. Start applying to jobs that match your profile.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {applications.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium">{a.jobs?.title}</div>
                  <div className="text-xs text-white/40">{a.jobs?.companies?.name}</div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs ${statusColor[a.status] || 'bg-white/10'}`}>
                  {a.status?.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
