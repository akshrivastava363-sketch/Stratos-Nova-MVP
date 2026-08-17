import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Upload, Plus, Trash2, Download, CheckCircle2, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../layouts/DashboardLayout';
import { calcCompletion } from '../../lib/profileCompletion';
import { regenerateCandidateResumes } from '../../lib/resumeUtils';

export default function CandidateProfile() {
  const { user, refreshProfile } = useAuth();
  const [form, setForm] = useState(null);
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [skillCategory, setSkillCategory] = useState('primary');
  const [eduCount, setEduCount] = useState(0);
  const [expCount, setExpCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [languagesInput, setLanguagesInput] = useState('');

  const load = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    setForm(data || {});
    setLanguagesInput((data?.languages || []).join(', '));
    const { data: cs } = await supabase.from('candidate_skills').select('skills(id,name),skill_category').eq('candidate_id', user.id);
    setSkills((cs || []).map((x) => ({ ...x.skills, skill_category: x.skill_category })).filter((s) => s.id));
    const { count: ec } = await supabase.from('education_records').select('*', { count: 'exact', head: true }).eq('candidate_id', user.id);
    const { count: xc } = await supabase.from('employment_records').select('*', { count: 'exact', head: true }).eq('candidate_id', user.id);
    setEduCount(ec || 0); setExpCount(xc || 0);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const handleChange = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const uploadResume = async (file) => {
    const path = `${user.id}/resume-${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('resumes').upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    setForm((f) => ({ ...f, resume_url: path, resume_filename: file.name }));
    toast.success('Resume uploaded');
  };

  const addSkill = async () => {
    const name = skillInput.trim();
    if (!name) return;
    let { data: skill } = await supabase.from('skills').select('id,name').eq('name', name).maybeSingle();
    if (!skill) {
      const { data: newSkill } = await supabase.from('skills').insert({ name }).select('id,name').single();
      skill = newSkill;
    }
    if (skill && !skills.find((s) => s.id === skill.id)) {
      await supabase.from('candidate_skills').insert({ candidate_id: user.id, skill_id: skill.id, skill_category: skillCategory });
      const nextSkills = [...skills, { ...skill, skill_category: skillCategory }];
      setSkills(nextSkills);
      const nextCompletion = calcCompletion({ ...form }, nextSkills.length, eduCount, expCount);
      await supabase.from('profiles').update({ profile_completion: nextCompletion }).eq('id', user.id);
    }
    setSkillInput('');
  };

  const removeSkill = async (skillId) => {
    await supabase.from('candidate_skills').delete().eq('candidate_id', user.id).eq('skill_id', skillId);
    const nextSkills = skills.filter((s) => s.id !== skillId);
    setSkills(nextSkills);
    const nextCompletion = calcCompletion({ ...form }, nextSkills.length, eduCount, expCount);
    await supabase.from('profiles').update({ profile_completion: nextCompletion }).eq('id', user.id);
  };

  const refreshGeneratedResumes = async () => { try { await regenerateCandidateResumes(user.id); await load(); toast.success('ATS and professional resumes refreshed'); } catch (e) { toast.error(e.message || 'Could not regenerate resumes'); } };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const languages = languagesInput.split(',').map((l) => l.trim()).filter(Boolean);
    const completion = calcCompletion({ ...form, languages }, skills.length, eduCount, expCount);
    const { error } = await supabase.from('profiles').update({ ...form, languages, profile_completion: completion }).eq('id', user.id);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    try { await regenerateCandidateResumes(user.id); } catch (e) { console.error('Resume regeneration failed:', e); }
    toast.success('Profile saved and resumes refreshed');
    await load();
    refreshProfile();
  };

  const confirmCurrent = async () => {
    const now = new Date().toISOString();
    const nextOutreachStatus = form.outreach_status === 'profile_update_required' ? 'profile_updated' : form.outreach_status;
    const { error } = await supabase.from('profiles').update({
      profile_confirmed_at: now,
      outreach_status: nextOutreachStatus,
      outreach_status_updated_at: now,
    }).eq('id', user.id);
    if (error) { toast.error(error.message); return; }
    setForm((f) => ({ ...f, profile_confirmed_at: now, outreach_status: nextOutreachStatus }));
    toast.success('Thanks — marked as up to date.');
  };

  if (!form) return <DashboardLayout role="candidate"><div className="skeleton h-96" /></DashboardLayout>;

  const liveCompletion = calcCompletion({ ...form, languages: languagesInput.split(',').map((l) => l.trim()).filter(Boolean) }, skills.length, eduCount, expCount);

  return (
    <DashboardLayout role="candidate">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Your Profile</h1>
          <p className="text-white/50">Keep this updated — it's what employers see.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refreshGeneratedResumes} className="btn-secondary !py-2 !px-4 text-sm"><Download size={15} /> ATS Resume</button>
          <button onClick={refreshGeneratedResumes} className="btn-secondary !py-2 !px-4 text-sm"><Download size={15} /> Professional Resume</button>
        </div>
      </div>

      <div className="card mb-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">Profile completion</span>
          <span className="text-sm font-semibold text-accent-400">{liveCompletion}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-400" style={{ width: `${liveCompletion}%` }} /></div>
        <p className="mt-2 text-xs text-white/40">Complete the missing sections to keep your profile ready for matching.</p>
      </div>

      <div className="card mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-white/60">
          <Clock size={15} className="text-white/40" />
          {form.profile_confirmed_at
            ? `Confirmed current on ${new Date(form.profile_confirmed_at).toLocaleDateString()}`
            : 'You haven\'t confirmed your information is current yet.'}
        </div>
        <button onClick={confirmCurrent} className="btn-secondary !py-2 !px-4 text-sm shrink-0">
          <CheckCircle2 size={15} /> This is still current
        </button>
      </div>

      <form onSubmit={handleSubmit} className="card max-w-3xl space-y-6">
        <div>
          <label className="mb-1.5 block text-sm text-white/60">Headline</label>
          <input className="input-field" value={form.headline || ''} onChange={handleChange('headline')} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-white/60">Bio</label>
          <textarea rows={3} className="input-field" value={form.bio || ''} onChange={handleChange('bio')} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="mb-1.5 block text-sm text-white/60">Current Location</label><input className="input-field" value={form.location || ''} onChange={handleChange('location')} /></div>
          <div><label className="mb-1.5 block text-sm text-white/60">Preferred Location</label><input className="input-field" value={form.preferred_location || ''} onChange={handleChange('preferred_location')} /></div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm text-white/60">Expected Salary (₹/yr)</label>
            <div className="flex gap-2">
              <input type="number" className="input-field" placeholder="Min" value={form.expected_salary_min || ''} onChange={handleChange('expected_salary_min')} />
              <input type="number" className="input-field" placeholder="Max" value={form.expected_salary_max || ''} onChange={handleChange('expected_salary_max')} />
            </div>
          </div>
          <div><label className="mb-1.5 block text-sm text-white/60">Current Salary (₹/yr)</label><input type="number" className="input-field" value={form.current_salary || ''} onChange={handleChange('current_salary')} /></div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm text-white/60">Notice Period</label>
            <select className="input-field" value={form.notice_period || ''} onChange={handleChange('notice_period')}>
              <option value="">Select…</option>
              <option value="immediate">Immediate</option>
              <option value="15_days">15 days</option>
              <option value="30_days">30 days</option>
              <option value="60_days">60 days</option>
              <option value="90_days">90 days</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-white/60">Preferred Work Mode</label>
            <select className="input-field" value={form.work_mode_preference || ''} onChange={handleChange('work_mode_preference')}>
              <option value="">Select…</option>
              <option value="remote">Remote</option>
              <option value="onsite">On-site</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-white/60">Languages (comma-separated)</label>
          <input className="input-field" placeholder="English, Hindi" value={languagesInput} onChange={(e) => setLanguagesInput(e.target.value)} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <input className="input-field" placeholder="LinkedIn URL" value={form.linkedin_url || ''} onChange={handleChange('linkedin_url')} />
          <input className="input-field" placeholder="Portfolio URL" value={form.portfolio_url || ''} onChange={handleChange('portfolio_url')} />
          <input className="input-field" placeholder="GitHub URL" value={form.github_url || ''} onChange={handleChange('github_url')} />
        </div>

        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!form.startup_experience} onChange={(e) => setForm({ ...form, startup_experience: e.target.checked })} /> Startup experience</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!form.enterprise_experience} onChange={(e) => setForm({ ...form, enterprise_experience: e.target.checked })} /> Enterprise experience</label>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-white/60">Resume (PDF/DOCX)</label>
          <div className="flex items-center gap-3">
            <label className="btn-secondary cursor-pointer !py-2 !px-4 text-sm">
              <Upload size={14} /> {form.resume_url ? 'Replace resume' : 'Upload resume'}
              <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => e.target.files[0] && uploadResume(e.target.files[0])} />
            </label>
            {form.resume_filename && <span className="text-xs text-white/40">{form.resume_filename}</span>}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-white/60">Skills</label>
          <div className="mb-2 flex flex-wrap gap-2">
            {skills.map((s) => (
              <span key={s.id} className="flex items-center gap-1.5 rounded-full bg-accent-500/15 px-3 py-1 text-xs text-accent-300">
                {s.name} <span className="text-accent-300/50">({s.skill_category})</span>
                <button type="button" onClick={() => removeSkill(s.id)}><Trash2 size={11} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <select className="input-field !py-2 w-36 text-sm" value={skillCategory} onChange={(e) => setSkillCategory(e.target.value)}>
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
              <option value="tool">Tool</option>
              <option value="technology">Technology</option>
              <option value="domain">Domain</option>
            </select>
            <input className="input-field" placeholder="Add a skill and press Enter" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }} />
            <button type="button" onClick={addSkill} className="btn-secondary shrink-0 !px-4"><Plus size={16} /></button>
          </div>
        </div>

        <p className="text-xs text-white/40">Education and employment history now live on their own page for verification tracking — see "Education & Experience" in the sidebar.</p>

        <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Saving…' : 'Save Profile'}</button>
      </form>
    </DashboardLayout>
  );
}
