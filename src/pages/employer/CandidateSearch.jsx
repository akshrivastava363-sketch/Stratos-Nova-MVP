import { useEffect, useState, useCallback } from 'react';
import { MapPin, Briefcase } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../layouts/DashboardLayout';

export default function CandidateSearch() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ location: '', availability: '' });
  const [selected, setSelected] = useState(null);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('profiles')
      .select('id,headline,bio,location,expected_salary_min,expected_salary_max,availability,resume_url,users!inner(full_name,email)')
      .not('headline', 'is', null);

    if (filters.location) q = q.ilike('location', `%${filters.location}%`);
    if (filters.availability) q = q.eq('availability', filters.availability);
    if (query) q = q.ilike('headline', `%${query}%`);

    const { data } = await q.limit(30);
    setCandidates(data || []);
    setLoading(false);
  }, [query, filters]);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

  return (
    <DashboardLayout role="employer">
      <h1 className="mb-1 font-display text-2xl font-bold">Search Candidates</h1>
      <p className="mb-6 text-white/50">Browse pre-screened profiles that fit your open roles.</p>

      <div className="card mb-8">
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            className="input-field !py-2 text-sm" placeholder="Role or keyword (e.g. React Developer)"
            value={query} onChange={(e) => setQuery(e.target.value)}
          />
          <input
            className="input-field !py-2 text-sm" placeholder="Location"
            value={filters.location} onChange={(e) => setFilters({ ...filters, location: e.target.value })}
          />
          <select
            className="input-field !py-2 text-sm" value={filters.availability}
            onChange={(e) => setFilters({ ...filters, availability: e.target.value })}
          >
            <option value="">Any availability</option>
            <option value="immediate">Immediate</option>
            <option value="15_days">15 days</option>
            <option value="30_days">30 days</option>
            <option value="60_days">60 days</option>
          </select>
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
              <div className="font-medium">{c.users?.full_name}</div>
              <div className="text-sm text-white/50">{c.headline}</div>
              {c.location && <div className="mt-2 flex items-center gap-1.5 text-xs text-white/40"><MapPin size={12} /> {c.location}</div>}
              {c.availability && <div className="mt-1 text-xs text-white/40">Available: {c.availability.replace('_', ' ')}</div>}
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
              {selected.availability && <div>Availability: {selected.availability.replace('_', ' ')}</div>}
            </div>
            {selected.resume_url && (
              <a href={selected.resume_url} target="_blank" rel="noreferrer" className="btn-primary mt-4 w-full">
                <Briefcase size={16} /> View Resume
              </a>
            )}
            <button onClick={() => setSelected(null)} className="btn-secondary mt-2 w-full">Close</button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
