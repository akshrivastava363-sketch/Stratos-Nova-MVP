import { useEffect, useState, useCallback } from 'react';
import { MapPin, Briefcase, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../layouts/DashboardLayout';

const statusLabel = {
  open_to_work: 'Open to Work', serving_notice: 'Serving Notice', interviewing: 'Interviewing',
  immediate_joiner: 'Immediate Joiner', not_looking: 'Not Looking', inactive: 'Inactive',
};

export default function CandidateSearch({ role = 'employer' }) {
  const { profile } = useAuth();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({
    location: '', availability: '', candidate_status: '', work_mode: '',
    startup_only: false, enterprise_only: false, notice_period: '',
  });
  const [selected, setSelected] = useState(null);
  const [jobSkillsForMatch, setJobSkillsForMatch] = useState([]);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('profiles')
      .select('id,headline,bio,location,expected_salary_min,expected_salary_max,availability,resume_url,candidate_status,notice_period,work_mode_preference,startup_experience,enterprise_experience,updated_at,users!inner(full_name,email)')
      .not('headline', 'is', null)
      .not('candidate_status', 'eq', 'inactive');

    if (filters.location) q = q.ilike('location', `%${filters.location}%`);
    if (filters.availability) q = q.eq('availability', filters.availability);
    if (filters.candidate_status) q = q.eq('candidate_status', filters.candidate_status);
    if (filters.work_mode) q = q.eq('work_mode_preference', filters.work_mode);
    if (filters.notice_period) q = q.eq('notice_period', filters.notice_period);
    if (filters.startup_only) q = q.eq('startup_experience', true);
    if (filters.enterprise_only) q = q.eq('enterprise_experience', true);
    if (query) q = q.ilike('headline', `%${query}%`);

    const { data } = await q.order('updated_at', { ascending: false }).limit(30);
    setCandidates(data || []);
    setLoading(false);
  }, [query, filters]);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

  return (
    <DashboardLayout role={role}>
      <h1 className="mb-1 font-display text-2xl font-bold">Talent Repository</h1>
      <p className="mb-6 text-white/50">Search the living, continuously updated candidate pool.</p>

      <div className="card mb-8 space-y-3">
        <input className="input-field !py-2 text-sm" placeholder="Role or keyword (e.g. React Developer)" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="grid gap-3 sm:grid-cols-3">
          <input className="input-field !py-2 text-sm" placeholder="Location" value={filters.location} onChange={(e) => setFilters({ ...filters, location: e.target.value })} />
          <select className="input-field !py-2 text-sm" value={filters.candidate_status} onChange={(e) => setFilters({ ...filters, candidate_status: e.target.value })}>
            <option value="">Any status</option>
            {Object.entries(statusLabel).filter(([k]) => k !== 'inactive').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className="input-field !py-2 text-sm" value={filters.availability} onChange={(e) => setFilters({ ...filters, availability: e.target.value })}>
            <option value="">Any availability</option>
            <option value="immediate">Immediate</option><option value="15_days">15 days</option><option value="30_days">30 days</option><option value="60_days">60 days</option>
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <select className="input-field !py-2 text-sm" value={filters.work_mode} onChange={(e) => setFilters({ ...filters, work_mode: e.target.value })}>
            <option value="">Any work mode</option><option value="remote">Remote</option><option value="onsite">On-site</option><option value="hybrid">Hybrid</option>
          </select>
          <select className="input-field !py-2 text-sm" value={filters.notice_period} onChange={(e) => setFilters({ ...filters, notice_period: e.target.value })}>
            <option value="">Any notice period</option><option value="immediate">Immediate</option><option value="15_days">15 days</option><option value="30_days">30 days</option><option value="60_days">60 days</option><option value="90_days">90 days</option>
          </select>
          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={filters.startup_only} onChange={(e) => setFilters({ ...filters, startup_only: e.target.checked })} /> Startup exp.</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={filters.enterprise_only} onChange={(e) => setFilters({ ...filters, enterprise_only: e.target.checked })} /> Enterprise exp.</label>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[...Array(6)].map((_, i) => <div key={i} className="skeleton h-36" />)}</div>
      ) : candidates.length === 0 ? (
        <div className="card py-16 text-center text-white/40">No candidates match your filters yet.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {candidates.map((c) => (
            <button key={c.id} onClick={() => setSelected(c)} className="card text-left">
              <div className="mb-1 flex items-center justify-between">
                <div className="font-medium">{c.users?.full_name}</div>
                <span className="badge bg-white/5 text-white/50">{statusLabel[c.candidate_status] || c.candidate_status}</span>
              </div>
              <div className="text-sm text-white/50">{c.headline}</div>
              {c.location && <div className="mt-2 flex items-center gap-1.5 text-xs text-white/40"><MapPin size={12} /> {c.location}</div>}
              <div className="mt-1 flex gap-1.5 text-xs text-white/30">
                {c.startup_experience && <span className="badge bg-white/5">Startup exp.</span>}
                {c.enterprise_experience && <span className="badge bg-white/5">Enterprise exp.</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6" onClick={() => setSelected(null)}>
          <div className="card max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">{selected.users?.full_name}</h2>
            <p className="text-sm text-white/50">{selected.headline}</p>
            {selected.bio && <p className="mt-3 text-sm text-white/60">{selected.bio}</p>}
            <div className="mt-4 space-y-1 text-xs text-white/50">
              {selected.location && <div className="flex items-center gap-1.5"><MapPin size={12} /> {selected.location}</div>}
              {selected.expected_salary_min && <div>Expects ₹{selected.expected_salary_min / 100000}-{selected.expected_salary_max / 100000} LPA</div>}
              {selected.notice_period && <div>Notice period: {selected.notice_period.replace('_', ' ')}</div>}
              <div>Status: {statusLabel[selected.candidate_status] || selected.candidate_status}</div>
            </div>
            {selected.resume_url && <a href={selected.resume_url} target="_blank" rel="noreferrer" className="btn-primary mt-4 w-full"><Briefcase size={16} /> View Resume</a>}
            <button onClick={() => setSelected(null)} className="btn-secondary mt-2 w-full">Close</button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
