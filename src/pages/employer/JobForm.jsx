import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../layouts/DashboardLayout';

const empty = {
  title: '', description: '', responsibilities: '', requirements: '',
  location: '', employment_type: 'full_time', work_mode: 'onsite',
  experience_min: 0, experience_max: '', salary_min: '', salary_max: '',
  industry: '', status: 'active', expires_at: '',
};

export default function JobForm() {
  const { id } = useParams(); // present when editing
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [form, setForm] = useState(empty);
  const [skillsInput, setSkillsInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: c } = await supabase.from('companies').select('*').eq('owner_id', user.id).maybeSingle();
      setCompany(c);
      if (isEdit) {
        const { data: job } = await supabase.from('jobs').select('*').eq('id', id).single();
        if (job) setForm({ ...empty, ...job, expires_at: job.expires_at?.slice(0, 10) || '' });
        const { data: js } = await supabase.from('job_skills').select('skills(name)').eq('job_id', id);
        setSkillsInput((js || []).map((x) => x.skills?.name).filter(Boolean).join(', '));
      }
      setReady(true);
    })();
  }, [user, id, isEdit]);

  const handleChange = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const upsertSkills = async (jobId) => {
    const names = skillsInput.split(',').map((s) => s.trim()).filter(Boolean);
    if (names.length === 0) return;
    await supabase.from('job_skills').delete().eq('job_id', jobId);
    for (const name of names) {
      let { data: skill } = await supabase.from('skills').select('id').eq('name', name).maybeSingle();
      if (!skill) {
        const { data: newSkill } = await supabase.from('skills').insert({ name }).select('id').single();
        skill = newSkill;
      }
      if (skill) await supabase.from('job_skills').insert({ job_id: jobId, skill_id: skill.id });
    }
  };

  const handleSubmit = async (e, statusOverride) => {
    e.preventDefault();
    if (!company) {
      toast.error('Set up your company profile first.');
      return;
    }
    setLoading(true);
    const payload = {
      ...form,
      status: statusOverride || form.status,
      company_id: company.id,
      posted_by: user.id,
      experience_max: form.experience_max || null,
      salary_min: form.salary_min || null,
      salary_max: form.salary_max || null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    };
    delete payload.id;
    delete payload.created_at;
    delete payload.updated_at;
    delete payload.views_count;

    let jobId = id;
    if (isEdit) {
      const { error } = await supabase.from('jobs').update(payload).eq('id', id);
      if (error) { toast.error(error.message); setLoading(false); return; }
    } else {
      const { data, error } = await supabase.from('jobs').insert(payload).select('id').single();
      if (error) { toast.error(error.message); setLoading(false); return; }
      jobId = data.id;
    }
    await upsertSkills(jobId);
    setLoading(false);
    toast.success(isEdit ? 'Job updated' : 'Job posted');
    navigate('/employer/jobs');
  };

  if (!ready) {
    return <DashboardLayout role="employer"><div className="skeleton h-96" /></DashboardLayout>;
  }

  return (
    <DashboardLayout role="employer">
      <h1 className="mb-1 font-display text-2xl font-bold">{isEdit ? 'Edit Job' : 'Post a New Job'}</h1>
      <p className="mb-8 text-white/50">Fields marked required help candidates find you faster.</p>

      <form onSubmit={(e) => handleSubmit(e)} className="card max-w-3xl space-y-5">
        <div>
          <label className="mb-1.5 block text-sm text-white/60">Job Title *</label>
          <input required className="input-field" value={form.title} onChange={handleChange('title')} placeholder="e.g. Senior Frontend Engineer" />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-white/60">Description *</label>
          <textarea required rows={4} className="input-field" value={form.description} onChange={handleChange('description')} placeholder="What is this role about?" />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-white/60">Responsibilities</label>
          <textarea rows={3} className="input-field" value={form.responsibilities} onChange={handleChange('responsibilities')} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-white/60">Requirements</label>
          <textarea rows={3} className="input-field" value={form.requirements} onChange={handleChange('requirements')} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm text-white/60">Location *</label>
            <input required className="input-field" value={form.location} onChange={handleChange('location')} placeholder="e.g. Delhi, India" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-white/60">Industry</label>
            <input className="input-field" value={form.industry} onChange={handleChange('industry')} placeholder="e.g. SaaS, Fintech" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm text-white/60">Employment Type</label>
            <select className="input-field" value={form.employment_type} onChange={handleChange('employment_type')}>
              <option value="full_time">Full-time</option>
              <option value="part_time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-white/60">Work Mode</label>
            <select className="input-field" value={form.work_mode} onChange={handleChange('work_mode')}>
              <option value="onsite">On-site</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm text-white/60">Experience (years)</label>
            <div className="flex gap-2">
              <input type="number" min="0" className="input-field" placeholder="Min" value={form.experience_min} onChange={handleChange('experience_min')} />
              <input type="number" min="0" className="input-field" placeholder="Max" value={form.experience_max} onChange={handleChange('experience_max')} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-white/60">Salary (₹ / year)</label>
            <div className="flex gap-2">
              <input type="number" min="0" className="input-field" placeholder="Min" value={form.salary_min} onChange={handleChange('salary_min')} />
              <input type="number" min="0" className="input-field" placeholder="Max" value={form.salary_max} onChange={handleChange('salary_max')} />
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-white/60">Required Skills (comma-separated)</label>
          <input className="input-field" value={skillsInput} onChange={(e) => setSkillsInput(e.target.value)} placeholder="React, Node.js, PostgreSQL" />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-white/60">Application Deadline</label>
          <input type="date" className="input-field" value={form.expires_at} onChange={handleChange('expires_at')} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" disabled={loading} onClick={(e) => handleSubmit(e, 'draft')} className="btn-secondary">
            Save as Draft
          </button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? 'Saving…' : isEdit ? 'Update Job' : 'Publish Job'}
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
}
