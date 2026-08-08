import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../layouts/DashboardLayout';

const categories = ['developer', 'hr', 'finance', 'marketing', 'sales', 'support', 'store'];

export default function AdminAssessments() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState({ role_category: 'developer', title: '', description: '', duration_minutes: 30, passing_score: 60, question_count: 20 });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from('assessment_templates').select('*').order('created_at', { ascending: false });
    setTemplates(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const addTemplate = async (e) => {
    e.preventDefault();
    if (!form.title) { toast.error('Title is required'); return; }
    const { error } = await supabase.from('assessment_templates').insert({ ...form, created_by: user.id });
    if (error) { toast.error(error.message); return; }
    setForm({ role_category: 'developer', title: '', description: '', duration_minutes: 30, passing_score: 60, question_count: 20 });
    toast.success('Assessment template created');
    load();
  };

  const toggleActive = async (id, val) => {
    await supabase.from('assessment_templates').update({ is_active: !val }).eq('id', id);
    load();
  };

  const remove = async (id) => { await supabase.from('assessment_templates').delete().eq('id', id); load(); };

  return (
    <DashboardLayout role="admin">
      <h1 className="mb-1 font-display text-2xl font-bold">Assessment Templates</h1>
      <p className="mb-6 text-white/50">Role-based assessments candidates can take to strengthen their profiles.</p>

      <form onSubmit={addTemplate} className="card mb-8 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <select className="input-field" value={form.role_category} onChange={(e) => setForm({ ...form, role_category: e.target.value })}>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className="input-field" placeholder="Title (e.g. Frontend Developer Assessment)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <textarea className="input-field" rows={2} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div className="grid gap-3 sm:grid-cols-3">
          <input type="number" className="input-field" placeholder="Duration (min)" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
          <input type="number" className="input-field" placeholder="Passing score" value={form.passing_score} onChange={(e) => setForm({ ...form, passing_score: Number(e.target.value) })} />
          <input type="number" className="input-field" placeholder="Question count" value={form.question_count} onChange={(e) => setForm({ ...form, question_count: Number(e.target.value) })} />
        </div>
        <button type="submit" className="btn-primary"><Plus size={16} /> Create Template</button>
      </form>

      {loading ? <div className="skeleton h-40" /> : (
        <div className="space-y-2">
          {templates.map((t) => (
            <div key={t.id} className="card flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{t.title} <span className="text-xs text-white/40">({t.role_category})</span></div>
                <div className="text-xs text-white/50">{t.duration_minutes} min · {t.question_count} questions · pass {t.passing_score}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(t.id, t.is_active)} className="text-white/40 hover:text-white">{t.is_active ? <Eye size={16} /> : <EyeOff size={16} />}</button>
                <button onClick={() => remove(t.id)} className="text-white/40 hover:text-red-400"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
          {templates.length === 0 && <p className="py-8 text-center text-sm text-white/40">No templates yet.</p>}
        </div>
      )}
    </DashboardLayout>
  );
}
