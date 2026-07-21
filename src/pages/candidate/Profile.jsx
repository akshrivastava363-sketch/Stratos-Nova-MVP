import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Upload, Plus, Trash2, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../layouts/DashboardLayout';

function calcCompletion(p, skillsCount) {
  const fields = [
    p.headline, p.bio, p.location, p.preferred_location, p.expected_salary_min,
    p.resume_url, p.linkedin_url, p.availability,
    p.education?.length > 0, p.experience?.length > 0, skillsCount > 0,
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
}

export default function CandidateProfile() {
  const { user, refreshProfile } = useAuth();
  const [form, setForm] = useState(null);
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setForm(data || {});
    const { data: cs } = await supabase.from('candidate_skills').select('skills(id,name)').eq('candidate_id', user.id);
    setSkills((cs || []).map((x) => x.skills).filter(Boolean));
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
      await supabase.from('candidate_skills').insert({ candidate_id: user.id, skill_id: skill.id });
      setSkills([...skills, skill]);
    }
    setSkillInput('');
  };

  const removeSkill = async (skillId) => {
    await supabase.from('candidate_skills').delete().eq('candidate_id', user.id).eq('skill_id', skillId);
    setSkills(skills.filter((s) => s.id !== skillId));
  };

  const addEducation = () => setForm((f) => ({ ...f, education: [...(f.education || []), { degree: '', institution: '', year: '' }] }));
  const updateEducation = (i, k, v) => setForm((f) => {
    const arr = [...(f.education || [])]; arr[i] = { ...arr[i], [k]: v }; return { ...f, education: arr };
  });
  const removeEducation = (i) => setForm((f) => ({ ...f, education: f.education.filter((_, idx) => idx !== i) }));

  const addExperience = () => setForm((f) => ({ ...f, experience: [...(f.experience || []), { title: '', company: '', start: '', end: '', description: '' }] }));
  const updateExperience = (i, k, v) => setForm((f) => {
    const arr = [...(f.experience || [])]; arr[i] = { ...arr[i], [k]: v }; return { ...f, experience: arr };
  });
  const removeExperience = (i) => setForm((f) => ({ ...f, experience: f.experience.filter((_, idx) => idx !== i) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const completion = calcCompletion(form, skills.length);
    const { error } = await supabase.from('profiles').update({ ...form, profile_completion: completion }).eq('id', user.id);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Profile saved');
    refreshProfile();
  };

  const downloadPdf = () => {
    const doc = new jsPDF();
    let y = 20;
    const line = (text, size = 11, gap = 7) => {
      doc.setFontSize(size);
      const split = doc.splitTextToSize(text, 170);
      doc.text(split, 20, y);
      y += gap * split.length;
    };
    line(user.user_metadata?.full_name || 'Candidate Profile', 18, 10);
    if (form.headline) line(form.headline, 12, 8);
    if (form.location) line(`Location: ${form.location}`, 10, 6);
    if (form.bio) { y += 2; line('Summary', 13, 8); line(form.bio); }
    if (skills.length > 0) { y += 2; line('Skills', 13, 8); line(skills.map((s) => s.name).join(', ')); }
    if ((form.experience || []).length > 0) {
      y += 2; line('Experience', 13, 8);
      form.experience.forEach((ex) => {
        line(`${ex.title || ''} — ${ex.company || ''} (${ex.start || ''} - ${ex.end || ''})`, 11, 6);
        if (ex.description) line(ex.description, 10, 6);
      });
    }
    if ((form.education || []).length > 0) {
      y += 2; line('Education', 13, 8);
      form.education.forEach((ed) => line(`${ed.degree || ''}, ${ed.institution || ''} (${ed.year || ''})`, 10, 6));
    }
    doc.save('profile.pdf');
  };

  if (!form) return <DashboardLayout role="candidate"><div className="skeleton h-96" /></DashboardLayout>;

  return (
    <DashboardLayout role="candidate">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Your Profile</h1>
          <p className="text-white/50">Keep this updated — it's what employers see.</p>
        </div>
        <button onClick={downloadPdf} className="btn-secondary !py-2 !px-4 text-sm shrink-0">
          <Download size={15} /> Download PDF
        </button>
      </div>

      <form onSubmit={handleSubmit} className="card max-w-3xl space-y-6">
        <div>
          <label className="mb-1.5 block text-sm text-white/60">Headline</label>
          <input className="input-field" placeholder="e.g. Full-Stack Developer, 3 yrs" value={form.headline || ''} onChange={handleChange('headline')} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-white/60">Bio</label>
          <textarea rows={3} className="input-field" value={form.bio || ''} onChange={handleChange('bio')} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm text-white/60">Current Location</label>
            <input className="input-field" value={form.location || ''} onChange={handleChange('location')} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-white/60">Preferred Location</label>
            <input className="input-field" value={form.preferred_location || ''} onChange={handleChange('preferred_location')} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm text-white/60">Expected Salary (₹/yr)</label>
            <div className="flex gap-2">
              <input type="number" className="input-field" placeholder="Min" value={form.expected_salary_min || ''} onChange={handleChange('expected_salary_min')} />
              <input type="number" className="input-field" placeholder="Max" value={form.expected_salary_max || ''} onChange={handleChange('expected_salary_max')} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-white/60">Availability</label>
            <select className="input-field" value={form.availability || ''} onChange={handleChange('availability')}>
              <option value="">Select…</option>
              <option value="immediate">Immediate</option>
              <option value="15_days">15 days notice</option>
              <option value="30_days">30 days notice</option>
              <option value="60_days">60 days notice</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <input className="input-field" placeholder="LinkedIn URL" value={form.linkedin_url || ''} onChange={handleChange('linkedin_url')} />
          <input className="input-field" placeholder="Portfolio URL" value={form.portfolio_url || ''} onChange={handleChange('portfolio_url')} />
          <input className="input-field" placeholder="GitHub URL" value={form.github_url || ''} onChange={handleChange('github_url')} />
        </div>

        {/* Resume */}
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

        {/* Skills */}
        <div>
          <label className="mb-1.5 block text-sm text-white/60">Skills</label>
          <div className="mb-2 flex flex-wrap gap-2">
            {skills.map((s) => (
              <span key={s.id} className="flex items-center gap-1.5 rounded-full bg-accent-500/15 px-3 py-1 text-xs text-accent-300">
                {s.name}
                <button type="button" onClick={() => removeSkill(s.id)}><Trash2 size={11} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="input-field" placeholder="Add a skill and press Enter" value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
            />
            <button type="button" onClick={addSkill} className="btn-secondary shrink-0 !px-4"><Plus size={16} /></button>
          </div>
        </div>

        {/* Education */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm text-white/60">Education</label>
            <button type="button" onClick={addEducation} className="text-xs text-accent-400 hover:text-accent-300">+ Add</button>
          </div>
          {(form.education || []).map((ed, i) => (
            <div key={i} className="mb-3 grid grid-cols-[1fr_1fr_80px_32px] gap-2">
              <input className="input-field !py-2" placeholder="Degree" value={ed.degree || ''} onChange={(e) => updateEducation(i, 'degree', e.target.value)} />
              <input className="input-field !py-2" placeholder="Institution" value={ed.institution || ''} onChange={(e) => updateEducation(i, 'institution', e.target.value)} />
              <input className="input-field !py-2" placeholder="Year" value={ed.year || ''} onChange={(e) => updateEducation(i, 'year', e.target.value)} />
              <button type="button" onClick={() => removeEducation(i)} className="text-white/40 hover:text-red-400"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>

        {/* Experience */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm text-white/60">Experience</label>
            <button type="button" onClick={addExperience} className="text-xs text-accent-400 hover:text-accent-300">+ Add</button>
          </div>
          {(form.experience || []).map((ex, i) => (
            <div key={i} className="mb-3 space-y-2 rounded-xl border border-white/10 p-3">
              <div className="grid grid-cols-2 gap-2">
                <input className="input-field !py-2" placeholder="Title" value={ex.title || ''} onChange={(e) => updateExperience(i, 'title', e.target.value)} />
                <input className="input-field !py-2" placeholder="Company" value={ex.company || ''} onChange={(e) => updateExperience(i, 'company', e.target.value)} />
              </div>
              <div className="grid grid-cols-[1fr_1fr_32px] gap-2">
                <input className="input-field !py-2" placeholder="Start (e.g. 2021)" value={ex.start || ''} onChange={(e) => updateExperience(i, 'start', e.target.value)} />
                <input className="input-field !py-2" placeholder="End (or Present)" value={ex.end || ''} onChange={(e) => updateExperience(i, 'end', e.target.value)} />
                <button type="button" onClick={() => removeExperience(i)} className="text-white/40 hover:text-red-400"><Trash2 size={15} /></button>
              </div>
              <textarea className="input-field !py-2" rows={2} placeholder="Description" value={ex.description || ''} onChange={(e) => updateExperience(i, 'description', e.target.value)} />
            </div>
          ))}
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Saving…' : 'Save Profile'}
        </button>
      </form>
    </DashboardLayout>
  );
}
