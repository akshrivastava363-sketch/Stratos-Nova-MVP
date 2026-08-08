import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../layouts/DashboardLayout';

export default function SavedJobs() {
  const { user } = useAuth();
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from('saved_jobs').select('job_id,jobs(id,title,location,work_mode,companies(name))').eq('candidate_id', user.id);
    setSaved(data || []); setLoading(false);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const unsave = async (jobId) => { await supabase.from('saved_jobs').delete().eq('job_id', jobId).eq('candidate_id', user.id); setSaved((prev) => prev.filter((s) => s.job_id !== jobId)); };

  return (
    <DashboardLayout role="candidate">
      <h1 className="mb-1 font-display text-2xl font-bold">Saved Jobs</h1>
      <p className="mb-6 text-white/50">Roles you've bookmarked for later.</p>
      {loading ? <div className="grid gap-4 sm:grid-cols-2">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24" />)}</div>
      : saved.length === 0 ? <div className="card py-16 text-center text-white/40"><Bookmark size={32} className="mx-auto mb-3 opacity-30" />No saved jobs yet. <Link to="/jobs" className="text-accent-400 hover:text-accent-300">Browse jobs →</Link></div>
      : <div className="grid gap-4 sm:grid-cols-2">
          {saved.map((s) => (
            <div key={s.job_id} className="card">
              <Link to={`/jobs/${s.jobs?.id}`} className="font-medium hover:text-accent-400">{s.jobs?.title}</Link>
              <div className="mt-1 text-xs text-white/40">{s.jobs?.companies?.name}</div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-white/50"><MapPin size={12} /> {s.jobs?.location}</div>
              <div className="mt-3 flex items-center justify-between">
                <span className="badge bg-white/5">{s.jobs?.work_mode}</span>
                <button onClick={() => unsave(s.job_id)} className="text-xs text-white/40 hover:text-red-400">Remove</button>
              </div>
            </div>
          ))}
        </div>}
    </DashboardLayout>
  );
}
