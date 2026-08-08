import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { Award, Clock, Play, CheckCircle2, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../layouts/DashboardLayout';

export default function CandidateAssessments() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [results, setResults] = useState([]);
  const [activeRun, setActiveRun] = useState(null); // { resultId, template, secondsLeft }
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);
  const flagsRef = useRef([]);

  const load = async () => {
    const [{ data: t }, { data: r }] = await Promise.all([
      supabase.from('assessment_templates').select('*').eq('is_active', true),
      supabase.from('assessment_results').select('*,assessment_templates(title,role_category)').eq('candidate_id', user.id).order('created_at', { ascending: false }),
    ]);
    setTemplates(t || []); setResults(r || []); setLoading(false);
  };

  useEffect(() => { if (user) load(); }, [user]);
  useEffect(() => () => clearInterval(timerRef.current), []);

  // Simple visibility-change proctoring flag: AI-assisted monitoring surfaces
  // flags only — it never decides pass/fail, per platform policy.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (activeRun && document.hidden) {
        flagsRef.current.push({ type: 'tab_switch', at: new Date().toISOString() });
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [activeRun]);

  const startAssessment = async (template) => {
    const { data, error } = await supabase.from('assessment_results').insert({
      candidate_id: user.id, template_id: template.id, status: 'in_progress', started_at: new Date().toISOString(),
    }).select('id').single();
    if (error) { toast.error(error.message); return; }
    flagsRef.current = [];
    setActiveRun({ resultId: data.id, template, secondsLeft: template.duration_minutes * 60 });
    timerRef.current = setInterval(() => {
      setActiveRun((prev) => {
        if (!prev) return prev;
        if (prev.secondsLeft <= 1) { clearInterval(timerRef.current); finishAssessment(prev); return null; }
        return { ...prev, secondsLeft: prev.secondsLeft - 1 };
      });
    }, 1000);
  };

  const finishAssessment = async (run) => {
    // Simulated scoring — a real implementation would grade actual question responses.
    const score = Math.round(50 + Math.random() * 50);
    await supabase.from('assessment_results').update({
      status: 'completed', score, completed_at: new Date().toISOString(), proctoring_flags: flagsRef.current,
    }).eq('id', run.resultId);
    toast.success(`Assessment submitted — score: ${score}`);
    load();
  };

  const submitNow = () => {
    clearInterval(timerRef.current);
    if (activeRun) finishAssessment(activeRun);
    setActiveRun(null);
  };

  if (activeRun) {
    const mins = Math.floor(activeRun.secondsLeft / 60);
    const secs = activeRun.secondsLeft % 60;
    return (
      <DashboardLayout role="candidate">
        <div className="card mx-auto max-w-2xl text-center">
          <h1 className="mb-1 font-display text-xl font-bold">{activeRun.template.title}</h1>
          <p className="mb-6 text-sm text-white/50">Stay on this tab — switching away is flagged for review.</p>
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border-4 border-accent-500 font-display text-2xl font-bold">
            {mins}:{secs.toString().padStart(2, '0')}
          </div>
          <p className="mb-6 text-sm text-white/40">{activeRun.template.question_count} questions · Passing score: {activeRun.template.passing_score}</p>
          <button onClick={submitNow} className="btn-primary">Submit Assessment</button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="candidate">
      <h1 className="mb-1 font-display text-2xl font-bold">Assessments</h1>
      <p className="mb-6 text-white/50">Role-based assessments to strengthen your profile. AI monitors only — it never decides your result.</p>

      <h2 className="mb-3 text-lg font-semibold">Available</h2>
      {loading ? <div className="skeleton mb-8 h-32" /> : (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <div key={t.id} className="card">
              <div className="mb-2 flex items-center gap-2"><Award size={16} className="text-accent-400" /><span className="text-xs uppercase text-white/40">{t.role_category}</span></div>
              <div className="font-medium">{t.title}</div>
              <p className="mt-1 text-xs text-white/50">{t.description}</p>
              <div className="mt-3 flex items-center gap-3 text-xs text-white/40"><Clock size={12} /> {t.duration_minutes} min · {t.question_count} questions</div>
              <button onClick={() => startAssessment(t)} className="btn-primary mt-4 w-full !py-2 text-sm"><Play size={14} /> Start</button>
            </div>
          ))}
          {templates.length === 0 && <p className="text-sm text-white/40">No assessments published yet.</p>}
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold">Your Results</h2>
      <div className="card">
        {results.length === 0 ? <p className="py-8 text-center text-sm text-white/40">No assessments completed yet.</p> : (
          <div className="divide-y divide-white/[0.06]">
            {results.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium">{r.assessment_templates?.title}</div>
                  <div className="text-xs text-white/40">{r.status === 'completed' ? `Completed ${new Date(r.completed_at).toLocaleDateString()}` : r.status}</div>
                </div>
                <div className="flex items-center gap-2">
                  {r.status === 'completed' && <span className="flex items-center gap-1 text-sm text-accent-400"><CheckCircle2 size={14} /> {r.score}</span>}
                  {r.proctoring_flags?.length > 0 && <span className="flex items-center gap-1 text-xs text-yellow-400"><Eye size={12} /> {r.proctoring_flags.length} flag(s)</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
