import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock3, FileText, GraduationCap, Briefcase, Award, UserRound } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../layouts/DashboardLayout';
import { calcCompletion, getMissingProfileItems } from '../../lib/profileCompletion';

const value = (v) => (v === null || v === undefined || v === '' ? '—' : String(v));

export default function AdminCandidateDetails() {
  const { id } = useParams();
  const [data, setData] = useState({ user: null, profile: null, skills: [], education: [], employment: [], applications: [], assessments: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      setError('');
      const [u, p, s, e, x, a, r] = await Promise.all([
        supabase.from('users').select('*').eq('id', id).single(),
        supabase.from('profiles').select('*').eq('id', id).single(),
        supabase.from('candidate_skills').select('proficiency,skill_category,skills(id,name,category)').eq('candidate_id', id),
        supabase.from('education_records').select('*').eq('candidate_id', id).order('passing_year', { ascending: false }),
        supabase.from('employment_records').select('*').eq('candidate_id', id).order('joining_date', { ascending: false }),
        supabase.from('applications').select('*,jobs(title,companies(name))').eq('candidate_id', id).order('applied_at', { ascending: false }),
        supabase.from('assessment_results').select('*').eq('candidate_id', id).order('created_at', { ascending: false }),
      ]);
      const firstError = u.error || p.error || s.error || e.error || x.error || a.error || r.error;
      if (firstError) setError(firstError.message);
      setData({
        user: u.data || null,
        profile: p.data || {},
        skills: s.data || [],
        education: e.data || [],
        employment: x.data || [],
        applications: a.data || [],
        assessments: r.data || [],
      });
      setLoading(false);
    })();
  }, [id]);

  const completion = useMemo(() => calcCompletion(data.profile, data.skills.length, data.education.length, data.employment.length), [data]);
  const missing = useMemo(() => getMissingProfileItems(data.profile, data.skills.length, data.education.length, data.employment.length), [data]);

  if (loading) return <DashboardLayout role="admin"><div className="skeleton h-96" /></DashboardLayout>;
  if (error) return <DashboardLayout role="admin"><div className="card border-red-500/30 text-red-300">Unable to load candidate: {error}</div></DashboardLayout>;
  if (!data.user) return <DashboardLayout role="admin"><div className="card">Candidate not found.</div></DashboardLayout>;

  return (
    <DashboardLayout role="admin">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/admin/users" className="mb-3 inline-flex items-center gap-1 text-xs text-white/50 hover:text-white"><ArrowLeft size={13} /> Back to users</Link>
          <h1 className="font-display text-2xl font-bold">{data.user.full_name || 'Candidate'}</h1>
          <p className="text-white/50">{data.user.email}</p>
        </div>
        <div className="badge bg-accent-500/15 text-accent-300">Candidate</div>
      </div>

      <div className="card mb-6">
        <div className="mb-2 flex items-center justify-between"><span className="font-medium">Profile completion</span><span className="text-lg font-bold text-accent-400">{completion}%</span></div>
        <div className="h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-400" style={{ width: `${completion}%` }} /></div>
        {missing.length ? <div className="mt-3 text-xs text-white/50"><span className="text-white/70">Pending:</span> {missing.join(', ')}</div> : <div className="mt-3 flex items-center gap-2 text-xs text-green-300"><CheckCircle2 size={14} /> All profile completion items are filled.</div>}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-4 flex items-center gap-2 font-semibold"><UserRound size={17} className="text-accent-400" /> Basic & profile details</h2>
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            {Object.entries({
              Email: data.user.email, Phone: data.user.phone, Location: data.profile.location,
              'Preferred location': data.profile.preferred_location, Headline: data.profile.headline,
              Availability: data.profile.availability, 'Candidate status': data.profile.candidate_status,
              'Notice period': data.profile.notice_period, 'Work mode': data.profile.work_mode_preference,
              'Expected salary min': data.profile.expected_salary_min, 'Expected salary max': data.profile.expected_salary_max,
              'Current salary': data.profile.current_salary, 'Current employer': data.profile.current_employer,
              Languages: (data.profile.languages || []).join(', '), LinkedIn: data.profile.linkedin_url,
              Portfolio: data.profile.portfolio_url, GitHub: data.profile.github_url,
            }).map(([k, v]) => <div key={k}><div className="text-xs text-white/40">{k}</div><div className="mt-0.5 break-words">{value(v)}</div></div>)}
          </div>
          <div className="mt-4"><div className="text-xs text-white/40">Bio</div><div className="mt-1 whitespace-pre-wrap text-sm text-white/80">{value(data.profile.bio)}</div></div>
        </section>

        <section className="card">
          <h2 className="mb-4 flex items-center gap-2 font-semibold"><FileText size={17} className="text-accent-400" /> Account & profile tracking</h2>
          <div className="space-y-3 text-sm">
            <div><span className="text-white/40">User ID:</span> <span className="break-all">{data.user.id}</span></div>
            <div><span className="text-white/40">Created:</span> {value(data.user.created_at ? new Date(data.user.created_at).toLocaleString() : null)}</div>
            <div><span className="text-white/40">Last profile update:</span> {value(data.profile.updated_at ? new Date(data.profile.updated_at).toLocaleString() : null)}</div>
            <div><span className="text-white/40">Outreach status:</span> {value(data.profile.outreach_status)}</div>
            <div><span className="text-white/40">Profile confirmed:</span> {value(data.profile.profile_confirmed_at ? new Date(data.profile.profile_confirmed_at).toLocaleString() : null)}</div>
            <div><span className="text-white/40">Resume:</span> {data.profile.resume_filename || data.profile.resume_url ? <span className="text-accent-300">{data.profile.resume_filename || data.profile.resume_url}</span> : '—'}</div>
          </div>
        </section>

        <section className="card">
          <h2 className="mb-4 flex items-center gap-2 font-semibold"><Award size={17} className="text-accent-400" /> Skills</h2>
          {data.skills.length ? <div className="flex flex-wrap gap-2">{data.skills.map((s) => <span key={s.skills?.id || `${s.skills?.name}-${s.skill_category}`} className="badge bg-accent-500/15 text-accent-300">{s.skills?.name || 'Unknown'} · {s.skill_category || 'primary'} · {s.proficiency || 'intermediate'}</span>)}</div> : <div className="text-sm text-white/40">No skills entered.</div>}
        </section>

        <section className="card">
          <h2 className="mb-4 flex items-center gap-2 font-semibold"><GraduationCap size={17} className="text-accent-400" /> Education ({data.education.length})</h2>
          {data.education.length ? <div className="space-y-3">{data.education.map((e) => <div key={e.id} className="rounded-xl bg-white/[0.03] p-3 text-sm"><div className="font-medium">{value(e.degree)} — {value(e.college)}</div><div className="text-xs text-white/40">{value(e.university)} · {value(e.specialization)} · {value(e.passing_year)} · {value(e.percentage)}</div><div className="mt-1 text-xs">Verification: {value(e.verification_status)}</div></div>)}</div> : <div className="text-sm text-white/40">No education records entered.</div>}
        </section>

        <section className="card">
          <h2 className="mb-4 flex items-center gap-2 font-semibold"><Briefcase size={17} className="text-accent-400" /> Employment ({data.employment.length})</h2>
          {data.employment.length ? <div className="space-y-3">{data.employment.map((e) => <div key={e.id} className="rounded-xl bg-white/[0.03] p-3 text-sm"><div className="font-medium">{value(e.designation)} — {value(e.company)}</div><div className="text-xs text-white/40">{value(e.industry)} · {value(e.joining_date)} → {e.is_current ? 'Present' : value(e.exit_date)}</div><div className="mt-1 text-xs text-white/60">{value(e.responsibilities)}</div><div className="mt-1 text-xs">Verification: {value(e.verification_status)}</div></div>)}</div> : <div className="text-sm text-white/40">No employment records entered.</div>}
        </section>

        <section className="card">
          <h2 className="mb-4 flex items-center gap-2 font-semibold"><FileText size={17} className="text-accent-400" /> Additional profile data</h2>
          <div className="space-y-2 text-sm">
            <div>Startup experience: {data.profile.startup_experience ? 'Yes' : 'No'}</div>
            <div>Enterprise experience: {data.profile.enterprise_experience ? 'Yes' : 'No'}</div>
            <div>Resume ATS URL: {value(data.profile.resume_ats_url)}</div>
            <div>Professional resume URL: {value(data.profile.resume_professional_url)}</div>
            <div>Resume generated: {value(data.profile.resume_generated_at ? new Date(data.profile.resume_generated_at).toLocaleString() : null)}</div>
          </div>
          {(data.profile.education?.length || data.profile.experience?.length) ? <pre className="mt-4 max-h-64 overflow-auto rounded-xl bg-black/20 p-3 text-xs text-white/60">{JSON.stringify({ education: data.profile.education || [], experience: data.profile.experience || [] }, null, 2)}</pre> : null}
        </section>

        <section className="card">
          <h2 className="mb-4 flex items-center gap-2 font-semibold"><Clock3 size={17} className="text-accent-400" /> Applications & assessments</h2>
          <div className="mb-4"><div className="text-xs text-white/40">Applications</div>{data.applications.length ? <div className="mt-2 space-y-2">{data.applications.map((a) => <div key={a.id} className="rounded-lg bg-white/[0.03] p-2 text-xs"><div>{a.jobs?.title || 'Job'}</div><div className="text-white/40">{a.jobs?.companies?.name || '—'} · {a.status || '—'}</div></div>)}</div> : <div className="mt-1 text-sm text-white/40">None</div>}</div>
          <div><div className="text-xs text-white/40">Completed assessments</div><div className="mt-1 text-sm">{data.assessments.filter((a) => a.status === 'completed').length} / {data.assessments.length}</div></div>
        </section>
      </div>
    </DashboardLayout>
  );
}
