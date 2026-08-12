import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../layouts/DashboardLayout';
import { LOCATIONS, INDUSTRIES, DEPARTMENTS, EXPERIENCE_RANGES, matchExperienceRange } from '../../lib/jobOptions';
import { getEffectivePlan } from '../../lib/entitlement';

const empty = {
  title: '', description: '', responsibilities: '', requirements: '', location: '',
  employment_type: 'full_time', work_mode: 'onsite', experience_min: 0, experience_max: '',
  salary_min: '', salary_max: '', industry: '', status: 'active', expires_at: '', department: '', openings: 1,
};

export default function JobForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [plan, setPlan] = useState(null);
  const [activeJobCount, setActiveJobCount] = useState(0);
  const [form, setForm] = useState(empty);
  const [skillsInput, setSkillsInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  // "Other (specify)" fallback state for the three dropdowns
  const [locationOther, setLocationOther] = useState(false);
  const [industryOther, setIndustryOther] = useState(false);
  const [departmentOther, setDepartmentOther] = useState(false);
  const [experienceLabel, setExperienceLabel] = useState(EXPERIENCE_RANGES[0].label);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: c } = await supabase.from('companies').select('*').eq('owner_id', user.id).maybeSingle();
      setCompany(c);
      if (c) {
        const effectivePlan = await getEffectivePlan({ userEmail: user.email, companyId: c.id });
        setPlan(effectivePlan);
        const { count } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('company_id', c.id).eq('status', 'active');
        setActiveJobCount(count || 0);
      }
      if (isEdit) {
        const { data: job } = await supabase.from('jobs').select('*').eq('id', id).single();
        if (job) {
          setForm({ ...empty, ...job, expires_at: job.expires_at?.slice(0, 10) || '' });
          if (job.location && !LOCATIONS.includes(job.location)) setLocationOther(true);
          if (job.industry && !INDUSTRIES.includes(job.industry)) setIndustryOther(true);
          if (job.department && !DEPARTMENTS.includes(job.department)) setDepartmentOther(true);
          setExperienceLabel(matchExperienceRange(job.experience_min, job.experience_max));
        }
        const { data: js } = await supabase.from('job_skills').select('skills(name)').eq('job_id', id);
        setSkillsInput((js || []).map((x) => x.skills?.name).filter(Boolean).join(', '));
      }
      setReady(true);
    })();
  }, [user, id, isEdit]);

  const handleChange = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleExperienceChange = (e) => {
    const label = e.target.value;
    setExperienceLabel(label);
    const range = EXPERIENCE_RANGES.find((r) => r.label === label);
    setForm({ ...form, experience_min: range.min, experience_max: range.max ?? '' });
  };

  const upsertSkills = async (jobId) => {
    const names = skillsInput.split(',').map((s) => s.trim()).filter(Boolean);
    if (names.length === 0) return;
    await supabase.from('job_skills').delete().eq('job_id', jobId);
    for (const name of names) {
      let { data: skill } = await supabase.from('skills').select('id').eq('name', name).maybeSingle();
      if (!skill) { const { data: newSkill } = await supabase.from('skills').insert({ name }).select('id').single(); skill = newSkill; }
      if (skill) await supabase.from('job_skills').insert({ job_id: jobId, skill_id: skill.id });
    }
  };

  const handleSubmit = async (e, statusOverride) => {
    e.preventDefault();
    if (!company) { toast.error('Set up your company profile first.'); return; }
    const limit = plan?.active_job_limit;
    if (!isEdit && limit != null && activeJobCount >= limit) {
      toast.error(`Your ${plan?.name || 'current'} plan allows ${limit} active job(s). Upgrade to post more.`);
      return;
    }
    setLoading(true);
    const payload = {
      ...form, status: statusOverride || form.status, company_id: company.id, posted_by: user.id,
      experience_max: form.experience_max === '' ? null : form.experience_max,
      salary_min: form.salary_min || null, salary_max: form.salary_max || null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      openings: form.openings || 1,
    };
    delete payload.id; delete payload.created_at; delete payload.updated_at; delete payload.views_count;
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
    toast.success(isEdit ? 'Job updated' : statusOverride === 'draft' ? 'Draft saved' : 'Job published');
    navigate('/employer/jobs');
  };

  if (!ready) return <DashboardLayout role="employer"><div className="skeleton h-96" /></DashboardLayout>;

  return (
    <DashboardLayout role="employer">
      <h1 className="mb-1 font-display text-2xl font-bold">{isEdit ? 'Edit Job' : 'Post a New Job'}</h1>
      {plan && plan.active_job_limit != null && (
        <p className="mb-6 text-sm text-white/50">{activeJobCount} / {plan.active_job_limit} active jobs used on your {plan.name} plan.</p>
      )}
      <form onSubmit={(e) => handleSubmit(e)} className="card max-w-3xl space-y-5">
        <div><label className="mb-1.5 block text-sm text-white/60">Job Title *</label><input required className="input-field" value={form.title} onChange={handleChange('title')} /></div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm text-white/60">Department</label>
            <select className="input-field" value={departmentOther ? '__other__' : form.department} onChange={(e) => {
              if (e.target.value === '__other__') { setDepartmentOther(true); setForm({ ...form, department: '' }); }
              else { setDepartmentOther(false); setForm({ ...form, department: e.target.value }); }
            }}>
              <option value="">Select department…</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              <option value="__other__">Other (specify)</option>
            </select>
            {departmentOther && <input className="input-field mt-2" placeholder="Enter department" value={form.department} onChange={handleChange('department')} />}
          </div>
          <div><label className="mb-1.5 block text-sm text-white/60">Number of Openings</label><input type="number" min="1" className="input-field" value={form.openings} onChange={handleChange('openings')} /></div>
        </div>

        <div><label className="mb-1.5 block text-sm text-white/60">Description *</label><textarea required rows={4} className="input-field" value={form.description} onChange={handleChange('description')} /></div>
        <div><label className="mb-1.5 block text-sm text-white/60">Requirements</label><textarea rows={3} className="input-field" value={form.requirements} onChange={handleChange('requirements')} /></div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm text-white/60">Location *</label>
            <select required={!locationOther} className="input-field" value={locationOther ? '__other__' : form.location} onChange={(e) => {
              if (e.target.value === '__other__') { setLocationOther(true); setForm({ ...form, location: '' }); }
              else { setLocationOther(false); setForm({ ...form, location: e.target.value }); }
            }}>
              <option value="">Select location…</option>
              {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              <option value="__other__">Other (specify)</option>
            </select>
            {locationOther && <input required className="input-field mt-2" placeholder="Enter location" value={form.location} onChange={handleChange('location')} />}
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-white/60">Industry</label>
            <select className="input-field" value={industryOther ? '__other__' : form.industry} onChange={(e) => {
              if (e.target.value === '__other__') { setIndustryOther(true); setForm({ ...form, industry: '' }); }
              else { setIndustryOther(false); setForm({ ...form, industry: e.target.value }); }
            }}>
              <option value="">Select industry…</option>
              {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
            {industryOther && <input className="input-field mt-2" placeholder="Enter industry" value={form.industry} onChange={handleChange('industry')} />}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="mb-1.5 block text-sm text-white/60">Employment Type</label>
            <select className="input-field" value={form.employment_type} onChange={handleChange('employment_type')}>
              <option value="full_time">Full-time</option><option value="part_time">Part-time</option><option value="contract">Contract</option><option value="internship">Internship</option>
            </select>
          </div>
          <div><label className="mb-1.5 block text-sm text-white/60">Work Mode</label>
            <select className="input-field" value={form.work_mode} onChange={handleChange('work_mode')}>
              <option value="onsite">On-site</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm text-white/60">Experience Required</label>
            <select className="input-field" value={experienceLabel} onChange={handleExperienceChange}>
              {EXPERIENCE_RANGES.map((r) => <option key={r.label} value={r.label}>{r.label}</option>)}
            </select>
          </div>
          <div><label className="mb-1.5 block text-sm text-white/60">Salary (₹/year)</label><div className="flex gap-2"><input type="number" min="0" className="input-field" placeholder="Min" value={form.salary_min} onChange={handleChange('salary_min')} /><input type="number" min="0" className="input-field" placeholder="Max" value={form.salary_max} onChange={handleChange('salary_max')} /></div></div>
        </div>

        <div><label className="mb-1.5 block text-sm text-white/60">Required Skills (comma-separated)</label><input className="input-field" value={skillsInput} onChange={(e) => setSkillsInput(e.target.value)} placeholder="React, Node.js" /></div>
        <div><label className="mb-1.5 block text-sm text-white/60">Application Deadline</label><input type="date" className="input-field" value={form.expires_at} onChange={handleChange('expires_at')} /></div>
        <div className="flex gap-3 pt-2">
          <button type="button" disabled={loading} onClick={(e) => handleSubmit(e, 'draft')} className="btn-secondary">Save as Draft</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Saving…' : isEdit ? 'Update Job' : 'Publish Job'}</button>
        </div>
      </form>
    </DashboardLayout>
  );
}
