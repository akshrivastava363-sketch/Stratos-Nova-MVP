import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Upload, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../layouts/DashboardLayout';
import { calcCompletion } from '../../lib/profileCompletion';

const verificationBadge = {
  unverified: 'bg-white/10 text-white/50',
  pending: 'bg-yellow-500/15 text-yellow-300',
  verified: 'bg-green-500/15 text-green-300',
  failed: 'bg-red-500/15 text-red-300',
};

const emptyEdu = { qualification: '', degree: '', college: '', university: '', specialization: '', passing_year: '', percentage: '' };
const emptyJob = { company: '', designation: '', joining_date: '', exit_date: '', is_current: false, responsibilities: '', industry: '' };

export default function EducationEmployment() {
  const { user } = useAuth();
  const [education, setEducation] = useState([]);
  const [employment, setEmployment] = useState([]);
  const [eduForm, setEduForm] = useState(emptyEdu);
  const [jobForm, setJobForm] = useState(emptyJob);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [{ data: edu }, { data: emp }] = await Promise.all([
      supabase.from('education_records').select('*').eq('candidate_id', user.id).order('passing_year', { ascending: false }),
      supabase.from('employment_records').select('*').eq('candidate_id', user.id).order('joining_date', { ascending: false }),
    ]);
    setEducation(edu || []); setEmployment(emp || []); setLoading(false);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const syncCompletion = async (eduCount, expCount) => {
    const [{ data: profile }, { count: skillsCount }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('candidate_skills').select('*', { count: 'exact', head: true }).eq('candidate_id', user.id),
    ]);
    if (profile) {
      const completion = calcCompletion(profile, skillsCount || 0, eduCount, expCount);
      await supabase.from('profiles').update({ profile_completion: completion }).eq('id', user.id);
    }
  };

  const addEducation = async (e) => {
    e.preventDefault();
    if (!eduForm.degree || !eduForm.college) { toast.error('Degree and college are required'); return; }
    const { error } = await supabase.from('education_records').insert({ ...eduForm, candidate_id: user.id, passing_year: eduForm.passing_year || null, percentage: eduForm.percentage || null });
    if (error) { toast.error(error.message); return; }
    setEduForm(emptyEdu);
    toast.success('Education record added');
    const nextEduCount = education.length + 1;
    await syncCompletion(nextEduCount, employment.length);
    load();
  };

  const removeEducation = async (id) => { await supabase.from('education_records').delete().eq('id', id); await syncCompletion(Math.max(0, education.length - 1), employment.length); load(); };

  // Duplicate detection: same company + overlapping dates
  const duplicateWarning = (candidate) => {
    return employment.some((e) =>
      e.company.trim().toLowerCase() === candidate.company.trim().toLowerCase() &&
      e.joining_date === candidate.joining_date
    );
  };

  const addEmployment = async (e) => {
    e.preventDefault();
    if (!jobForm.company) { toast.error('Company name is required'); return; }
    if (duplicateWarning(jobForm)) {
      toast.error('This looks like a duplicate of an existing employment record (same company and joining date).');
      return;
    }
    const { error } = await supabase.from('employment_records').insert({
      ...jobForm, candidate_id: user.id,
      joining_date: jobForm.joining_date || null,
      exit_date: jobForm.is_current ? null : (jobForm.exit_date || null),
    });
    if (error) { toast.error(error.message); return; }
    setJobForm(emptyJob);
    toast.success('Employment record added');
    const nextExpCount = employment.length + 1;
    await syncCompletion(education.length, nextExpCount);
    load();
  };

  const removeEmployment = async (id) => { await supabase.from('employment_records').delete().eq('id', id); await syncCompletion(education.length, Math.max(0, employment.length - 1)); load(); };

  const uploadDoc = async (recordId, table, file) => {
    const path = `${user.id}/${table}-${recordId}-${Date.now()}.${file.name.split('.').pop()}`;
    const bucket = table === 'education_records' ? 'resumes' : 'resumes'; // reuse private bucket
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const col = table === 'education_records' ? 'document_url' : 'experience_letter_url';
    await supabase.from(table).update({ [col]: path }).eq('id', recordId);
    toast.success('Document uploaded');
    load();
  };

  // Gap detection: sort employment by joining_date, flag gaps > 90 days between exit and next joining
  const gaps = [];
  const sorted = [...employment].filter((e) => e.joining_date).sort((a, b) => new Date(a.joining_date) - new Date(b.joining_date));
  for (let i = 0; i < sorted.length - 1; i++) {
    const exitDate = sorted[i].exit_date ? new Date(sorted[i].exit_date) : null;
    const nextJoin = new Date(sorted[i + 1].joining_date);
    if (exitDate) {
      const gapDays = Math.round((nextJoin - exitDate) / (1000 * 60 * 60 * 24));
      if (gapDays > 90) gaps.push({ from: sorted[i].company, to: sorted[i + 1].company, days: gapDays });
    }
  }

  return (
    <DashboardLayout role="candidate">
      <h1 className="mb-1 font-display text-2xl font-bold">Education & Experience</h1>
      <p className="mb-6 text-white/50">Structured records enable verification and better job matching.</p>

      {gaps.length > 0 && (
        <div className="card mb-6 border-yellow-500/30 bg-yellow-500/[0.06]">
          <div className="flex items-center gap-2 text-yellow-300"><AlertTriangle size={16} /> <span className="font-medium text-sm">Employment gaps detected</span></div>
          <ul className="mt-2 space-y-1 text-xs text-white/60">
            {gaps.map((g, i) => <li key={i}>{g.days} days between {g.from} and {g.to}</li>)}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Education */}
        <div>
          <h2 className="mb-3 text-lg font-semibold">Education</h2>
          <form onSubmit={addEducation} className="card mb-4 space-y-3">
            <select className="input-field !py-2 text-sm" value={eduForm.qualification} onChange={(e) => setEduForm({ ...eduForm, qualification: e.target.value })}>
              <option value="">Qualification…</option>
              <option>High School</option><option>Diploma</option><option>Bachelor's</option><option>Master's</option><option>Doctorate</option>
            </select>
            <input className="input-field !py-2 text-sm" placeholder="Degree (e.g. B.Tech)" value={eduForm.degree} onChange={(e) => setEduForm({ ...eduForm, degree: e.target.value })} />
            <input className="input-field !py-2 text-sm" placeholder="College" value={eduForm.college} onChange={(e) => setEduForm({ ...eduForm, college: e.target.value })} />
            <input className="input-field !py-2 text-sm" placeholder="University" value={eduForm.university} onChange={(e) => setEduForm({ ...eduForm, university: e.target.value })} />
            <input className="input-field !py-2 text-sm" placeholder="Specialization" value={eduForm.specialization} onChange={(e) => setEduForm({ ...eduForm, specialization: e.target.value })} />
            <div className="flex gap-2">
              <input type="number" className="input-field !py-2 text-sm" placeholder="Passing year" value={eduForm.passing_year} onChange={(e) => setEduForm({ ...eduForm, passing_year: e.target.value })} />
              <input type="number" step="0.01" className="input-field !py-2 text-sm" placeholder="Percentage/CGPA" value={eduForm.percentage} onChange={(e) => setEduForm({ ...eduForm, percentage: e.target.value })} />
            </div>
            <button type="submit" className="btn-primary w-full !py-2 text-sm"><Plus size={14} /> Add Education</button>
          </form>
          <div className="space-y-3">
            {education.map((ed) => (
              <div key={ed.id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-medium">{ed.degree} — {ed.college}</div>
                    <div className="text-xs text-white/40">{ed.university} · {ed.passing_year} · {ed.percentage}%</div>
                  </div>
                  <button onClick={() => removeEducation(ed.id)} className="text-white/40 hover:text-red-400"><Trash2 size={14} /></button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`badge ${verificationBadge[ed.verification_status]}`}>{ed.verification_status}</span>
                  <label className="cursor-pointer text-xs text-accent-400 hover:text-accent-300">
                    <Upload size={11} className="mr-1 inline" /> {ed.document_url ? 'Replace document' : 'Upload document'}
                    <input type="file" className="hidden" onChange={(e) => e.target.files[0] && uploadDoc(ed.id, 'education_records', e.target.files[0])} />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Employment */}
        <div>
          <h2 className="mb-3 text-lg font-semibold">Employment</h2>
          <form onSubmit={addEmployment} className="card mb-4 space-y-3">
            <input className="input-field !py-2 text-sm" placeholder="Company" value={jobForm.company} onChange={(e) => setJobForm({ ...jobForm, company: e.target.value })} />
            <input className="input-field !py-2 text-sm" placeholder="Designation" value={jobForm.designation} onChange={(e) => setJobForm({ ...jobForm, designation: e.target.value })} />
            <input className="input-field !py-2 text-sm" placeholder="Industry" value={jobForm.industry} onChange={(e) => setJobForm({ ...jobForm, industry: e.target.value })} />
            <div className="flex gap-2">
              <input type="date" className="input-field !py-2 text-sm" value={jobForm.joining_date} onChange={(e) => setJobForm({ ...jobForm, joining_date: e.target.value })} />
              <input type="date" disabled={jobForm.is_current} className="input-field !py-2 text-sm disabled:opacity-40" value={jobForm.exit_date} onChange={(e) => setJobForm({ ...jobForm, exit_date: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-xs text-white/60"><input type="checkbox" checked={jobForm.is_current} onChange={(e) => setJobForm({ ...jobForm, is_current: e.target.checked })} /> I currently work here</label>
            <textarea rows={2} className="input-field !py-2 text-sm" placeholder="Responsibilities" value={jobForm.responsibilities} onChange={(e) => setJobForm({ ...jobForm, responsibilities: e.target.value })} />
            <button type="submit" className="btn-primary w-full !py-2 text-sm"><Plus size={14} /> Add Employment</button>
          </form>
          <div className="space-y-3">
            {employment.map((em) => (
              <div key={em.id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-medium">{em.designation} — {em.company}</div>
                    <div className="text-xs text-white/40">
                      {em.joining_date} → {em.is_current ? 'Present' : em.exit_date || '—'}
                    </div>
                  </div>
                  <button onClick={() => removeEmployment(em.id)} className="text-white/40 hover:text-red-400"><Trash2 size={14} /></button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`badge ${verificationBadge[em.verification_status]}`}>{em.verification_status}</span>
                  <label className="cursor-pointer text-xs text-accent-400 hover:text-accent-300">
                    <Upload size={11} className="mr-1 inline" /> {em.experience_letter_url ? 'Replace letter' : 'Upload experience letter'}
                    <input type="file" className="hidden" onChange={(e) => e.target.files[0] && uploadDoc(em.id, 'employment_records', e.target.files[0])} />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
