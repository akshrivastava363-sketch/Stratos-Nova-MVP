import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../layouts/DashboardLayout';

export default function RecruiterAssignedJobs() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from('recruiter_assignments').select('*,jobs(id,title,location,status,companies(name))').eq('recruiter_id', user.id).order('assigned_at', { ascending: false })
      .then(({ data }) => { setAssignments(data || []); setLoading(false); });
  }, [user]);

  return (
    <DashboardLayout role="recruiter">
      <h1 className="mb-1 font-display text-2xl font-bold">Assigned Jobs</h1>
      <p className="mb-6 text-white/50">Manage the ATS pipeline for jobs assigned to you — same tools employers use.</p>
      {loading ? <div className="skeleton h-64" /> : assignments.length === 0 ? (
        <div className="card py-16 text-center text-white/40">No jobs assigned yet.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assignments.map((a) => (
            <Link to={`/recruiter/jobs/${a.jobs?.id}/applicants`} key={a.id} className="card block">
              <div className="font-medium">{a.jobs?.title}</div>
              <div className="text-xs text-white/40">{a.jobs?.companies?.name} · {a.jobs?.location}</div>
              <span className={`badge mt-3 inline-block ${a.jobs?.status === 'active' ? 'bg-green-500/15 text-green-300' : 'bg-white/10'}`}>{a.jobs?.status}</span>
            </Link>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
