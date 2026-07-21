import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPin, Briefcase, IndianRupee, Clock, Bookmark, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '../../components/Navbar';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function JobDetails() {
  const { id } = useParams();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [skills, setSkills] = useState([]);
  const [applied, setApplied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [coverNote, setCoverNote] = useState('');
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('jobs')
        .select('*,companies(name,logo_url,about,website)')
        .eq('id', id).single();
      setJob(data);
      // increment view count silently
      if (data) supabase.from('jobs').update({ views_count: (data.views_count || 0) + 1 }).eq('id', id).then(() => {});

      const { data: js } = await supabase.from('job_skills').select('skills(name)').eq('job_id', id);
      setSkills((js || []).map((x) => x.skills?.name).filter(Boolean));

      if (user) {
        const { data: app } = await supabase.from('applications').select('id').eq('job_id', id).eq('candidate_id', user.id).maybeSingle();
        setApplied(Boolean(app));
        const { data: sv } = await supabase.from('saved_jobs').select('*').eq('job_id', id).eq('candidate_id', user.id).maybeSingle();
        setSaved(Boolean(sv));
      }
    })();
  }, [id, user]);

  const toggleSave = async () => {
    if (!user) return navigate('/login');
    if (saved) {
      await supabase.from('saved_jobs').delete().eq('job_id', id).eq('candidate_id', user.id);
      setSaved(false);
    } else {
      await supabase.from('saved_jobs').insert({ job_id: id, candidate_id: user.id });
      setSaved(true);
      toast.success('Saved');
    }
  };

  const handleApply = async () => {
    if (!user) return navigate('/login');
    if (role !== 'candidate') { toast.error('Only candidate accounts can apply'); return; }
    setApplying(true);
    const { data: profile } = await supabase.from('profiles').select('resume_url').eq('id', user.id).single();
    const { error } = await supabase.from('applications').insert({
      job_id: id, candidate_id: user.id, cover_note: coverNote, resume_url: profile?.resume_url || null,
    });
    setApplying(false);
    if (error) { toast.error(error.message); return; }
    setApplied(true);
    setShowApplyForm(false);
    toast.success('Application submitted!');
  };

  if (!job) {
    return (
      <div className="min-h-screen bg-nova-950">
        <Navbar />
        <div className="mx-auto max-w-3xl px-6 py-10"><div className="skeleton h-96" /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nova-950">
      <Navbar />
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Link to="/jobs" className="text-sm text-white/40 hover:text-white">← Back to jobs</Link>

        <div className="card mt-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white/10">
                {job.companies?.logo_url && <img src={job.companies.logo_url} className="h-full w-full object-cover" />}
              </div>
              <div>
                <h1 className="font-display text-xl font-bold">{job.title}</h1>
                <div className="text-sm text-white/50">{job.companies?.name}</div>
              </div>
            </div>
            <button onClick={toggleSave} className={`shrink-0 rounded-lg p-2 ${saved ? 'text-gold-400' : 'text-white/40 hover:text-white'}`}>
              <Bookmark size={20} fill={saved ? 'currentColor' : 'none'} />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/60">
            <span className="flex items-center gap-1.5"><MapPin size={14} /> {job.location}</span>
            <span className="flex items-center gap-1.5"><Briefcase size={14} /> {job.employment_type?.replace('_', ' ')} · {job.work_mode}</span>
            {job.salary_min && <span className="flex items-center gap-1.5"><IndianRupee size={14} /> {job.salary_min / 100000}-{job.salary_max / 100000} LPA</span>}
            <span className="flex items-center gap-1.5"><Clock size={14} /> {job.experience_min}-{job.experience_max || '+'} yrs exp</span>
          </div>

          {skills.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {skills.map((s) => <span key={s} className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/60">{s}</span>)}
            </div>
          )}

          <div className="mt-6 border-t border-white/[0.06] pt-6">
            {applied ? (
              <div className="flex items-center gap-2 rounded-xl bg-green-500/10 px-4 py-3 text-sm text-green-300">
                <CheckCircle2 size={18} /> You've applied to this job.
              </div>
            ) : showApplyForm ? (
              <div className="space-y-3">
                <textarea
                  className="input-field" rows={3} placeholder="Add a short note to the employer (optional)"
                  value={coverNote} onChange={(e) => setCoverNote(e.target.value)}
                />
                <div className="flex gap-3">
                  <button onClick={() => setShowApplyForm(false)} className="btn-secondary">Cancel</button>
                  <button onClick={handleApply} disabled={applying} className="btn-primary flex-1">
                    {applying ? 'Submitting…' : 'Submit Application'}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => (user ? setShowApplyForm(true) : navigate('/login'))} className="btn-primary w-full">
                Apply Now
              </button>
            )}
          </div>
        </div>

        <div className="card mt-4">
          <h2 className="mb-2 text-lg font-semibold">About the Role</h2>
          <p className="whitespace-pre-line text-sm text-white/60">{job.description}</p>
          {job.responsibilities && (
            <>
              <h3 className="mb-2 mt-5 text-sm font-semibold text-white/80">Responsibilities</h3>
              <p className="whitespace-pre-line text-sm text-white/60">{job.responsibilities}</p>
            </>
          )}
          {job.requirements && (
            <>
              <h3 className="mb-2 mt-5 text-sm font-semibold text-white/80">Requirements</h3>
              <p className="whitespace-pre-line text-sm text-white/60">{job.requirements}</p>
            </>
          )}
        </div>

        {job.companies?.about && (
          <div className="card mt-4">
            <h2 className="mb-2 text-lg font-semibold">About {job.companies.name}</h2>
            <p className="text-sm text-white/60">{job.companies.about}</p>
          </div>
        )}
      </div>
    </div>
  );
}
