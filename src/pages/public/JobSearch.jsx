import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Briefcase } from 'lucide-react';
import Navbar from '../../components/Navbar';
import { supabase } from '../../lib/supabase';

const PAGE_SIZE = 9;

export default function JobSearch() {
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ location: '', employment_type: '', work_mode: '' });

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('jobs')
      .select('id,title,location,employment_type,work_mode,salary_min,salary_max,experience_min,created_at,companies(name,logo_url)', { count: 'exact' })
      .eq('status', 'active');

    if (query) q = q.ilike('title', `%${query}%`);
    if (filters.location) q = q.ilike('location', `%${filters.location}%`);
    if (filters.employment_type) q = q.eq('employment_type', filters.employment_type);
    if (filters.work_mode) q = q.eq('work_mode', filters.work_mode);

    q = q.order('created_at', { ascending: false }).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    const { data, count } = await q;
    setJobs(data || []);
    setTotal(count || 0);
    setLoading(false);
  }, [query, filters, page]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-nova-950">
      <Navbar />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="mb-1 font-display text-3xl font-bold">Find Your Next Role</h1>
        <p className="mb-6 text-white/50">{total} open position{total !== 1 ? 's' : ''} at startups hiring right now</p>

        {/* Search + filters */}
        <div className="card mb-8">
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-white/[0.04] px-4 py-3">
            <Search size={18} className="text-white/40" />
            <input
              className="w-full bg-transparent text-sm outline-none placeholder:text-white/30"
              placeholder="Job title or keyword"
              value={query} onChange={(e) => { setPage(0); setQuery(e.target.value); }}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              className="input-field !py-2 text-sm" placeholder="Location"
              value={filters.location} onChange={(e) => { setPage(0); setFilters({ ...filters, location: e.target.value }); }}
            />
            <select
              className="input-field !py-2 text-sm" value={filters.employment_type}
              onChange={(e) => { setPage(0); setFilters({ ...filters, employment_type: e.target.value }); }}
            >
              <option value="">Any employment type</option>
              <option value="full_time">Full-time</option>
              <option value="part_time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
            </select>
            <select
              className="input-field !py-2 text-sm" value={filters.work_mode}
              onChange={(e) => { setPage(0); setFilters({ ...filters, work_mode: e.target.value }); }}
            >
              <option value="">Any work mode</option>
              <option value="remote">Remote</option>
              <option value="onsite">On-site</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-40" />)}
          </div>
        ) : jobs.length === 0 ? (
          <div className="card py-16 text-center text-white/40">
            <Briefcase size={32} className="mx-auto mb-3 opacity-30" />
            No jobs match your filters. Try broadening your search.
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {jobs.map((j) => (
                <Link to={`/jobs/${j.id}`} key={j.id} className="card block">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white/10">
                      {j.companies?.logo_url && <img src={j.companies.logo_url} className="h-full w-full object-cover" />}
                    </div>
                    <div>
                      <div className="font-medium leading-tight">{j.title}</div>
                      <div className="text-xs text-white/40">{j.companies?.name}</div>
                    </div>
                  </div>
                  <div className="mb-2 flex items-center gap-1.5 text-xs text-white/50">
                    <MapPin size={12} /> {j.location}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-white/50">
                    <span className="rounded-full bg-white/5 px-2 py-1">{j.work_mode}</span>
                    <span className="rounded-full bg-white/5 px-2 py-1">{j.employment_type?.replace('_', ' ')}</span>
                    {j.salary_min && <span className="rounded-full bg-white/5 px-2 py-1">₹{j.salary_min / 100000}-{j.salary_max / 100000}L</span>}
                  </div>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i} onClick={() => setPage(i)}
                    className={`h-9 w-9 rounded-lg text-sm ${page === i ? 'bg-accent-500 text-white' : 'bg-white/[0.05] text-white/50 hover:bg-white/10'}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
