import { useEffect, useState } from 'react';
import { ArrowLeft, Briefcase, Building2, CalendarDays, Globe2, Mail, Phone, UserRound } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { supabase } from '../../lib/supabase';

const value = (v) => (v === null || v === undefined || v === '' ? '—' : String(v));

const dateValue = (v) => (v ? new Date(v).toLocaleString() : '—');

export default function AdminEmployerDetails() {
  const { id } = useParams();
  const [data, setData] = useState({ company: null, owner: null, jobs: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError('No employer ID in URL.');
      return;
    }

    const companyId = String(id).trim();

    (async () => {
      setLoading(true);
      setError('');
      try {
        const companyResult = await supabase
          .from('companies')
          .select('*')
          .eq('id', companyId)
          .maybeSingle();

        if (companyResult.error) throw companyResult.error;
        if (!companyResult.data) {
          setData({ company: null, owner: null, jobs: [] });
          return;
        }

        const company = companyResult.data;

        const [ownerResult, jobsResult] = await Promise.all([
          company.owner_id
            ? supabase.from('users').select('*').eq('id', company.owner_id).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          supabase
            .from('jobs')
            .select('*')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false }),
        ]);

        if (ownerResult.error) throw ownerResult.error;
        if (jobsResult.error) throw jobsResult.error;

        setData({
          company,
          owner: ownerResult.data || null,
          jobs: Array.isArray(jobsResult.data) ? jobsResult.data : [],
        });
      } catch (err) {
        setError(err?.message || 'Failed to load employer data.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return <DashboardLayout role="admin"><div className="skeleton h-96" /></DashboardLayout>;
  }

  if (error) {
    return <DashboardLayout role="admin"><div className="card border-red-500/30 text-red-300">Unable to load employer: {error}</div></DashboardLayout>;
  }

  if (!data.company) {
    return <DashboardLayout role="admin"><div className="card">Employer not found.</div></DashboardLayout>;
  }

  const company = data.company;

  return (
    <DashboardLayout role="admin">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/admin/employers" className="mb-3 inline-flex items-center gap-1 text-xs text-white/50 hover:text-white">
            <ArrowLeft size={13} /> Back to employers
          </Link>
          <h1 className="font-display text-2xl font-bold">{value(company.name)}</h1>
          <p className="text-white/50">{value(data.owner?.email || company.hiring_contact_email)}</p>
        </div>
        <span className={`badge ${company.approval_status === 'approved' ? 'bg-green-500/15 text-green-300' : company.approval_status === 'rejected' || company.approval_status === 'suspended' ? 'bg-red-500/15 text-red-300' : 'bg-yellow-500/15 text-yellow-300'}`}>
          {value(company.approval_status)}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-4 flex items-center gap-2 font-semibold"><Building2 size={17} className="text-accent-400" /> Company details</h2>
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div><div className="text-xs text-white/40">Company name</div><div>{value(company.name)}</div></div>
            <div><div className="text-xs text-white/40">Industry</div><div>{value(company.industry)}</div></div>
            <div><div className="text-xs text-white/40">Company size</div><div>{value(company.company_size)}</div></div>
            <div><div className="text-xs text-white/40">GST number</div><div>{value(company.gst_number)}</div></div>
            <div><div className="text-xs text-white/40">Website</div><div className="break-words">{value(company.website)}</div></div>
            <div><div className="text-xs text-white/40">Approval status</div><div>{value(company.approval_status)}</div></div>
          </div>
          <div className="mt-4"><div className="text-xs text-white/40">About</div><div className="mt-1 whitespace-pre-wrap text-sm text-white/80">{value(company.about)}</div></div>
        </section>

        <section className="card">
          <h2 className="mb-4 flex items-center gap-2 font-semibold"><UserRound size={17} className="text-accent-400" /> Employer contact</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2"><UserRound size={15} className="mt-0.5 text-white/40" /><span>{value(company.hiring_contact_name || data.owner?.full_name)}</span></div>
            <div className="flex items-start gap-2"><Mail size={15} className="mt-0.5 text-white/40" /><span className="break-all">{value(company.hiring_contact_email || data.owner?.email)}</span></div>
            <div className="flex items-start gap-2"><Phone size={15} className="mt-0.5 text-white/40" /><span>{value(company.hiring_contact_phone || data.owner?.phone)}</span></div>
            <div className="flex items-start gap-2"><Globe2 size={15} className="mt-0.5 text-white/40" /><span className="break-all">{value(company.website)}</span></div>
            <div><span className="text-white/40">Owner ID:</span> <span className="break-all">{value(company.owner_id)}</span></div>
            <div><span className="text-white/40">Created:</span> {dateValue(company.created_at)}</div>
            <div><span className="text-white/40">Approved:</span> {dateValue(company.approved_at)}</div>
          </div>
        </section>

        <section className="card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-semibold"><Briefcase size={17} className="text-accent-400" /> Jobs posted by this employer ({data.jobs.length})</h2>
          </div>

          {data.jobs.length === 0 ? (
            <div className="py-8 text-center text-sm text-white/40">No jobs have been posted by this employer.</div>
          ) : (
            <div className="space-y-3">
              {data.jobs.map((job) => (
                <div key={job.id} className="rounded-xl bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{value(job.title)}</div>
                      <div className="mt-1 text-xs text-white/40">
                        {value(job.department)} · {value(job.location)} · {value(job.employment_type)} · {value(job.work_mode)}
                      </div>
                    </div>
                    <span className="badge bg-white/[0.06] text-white/60">{value(job.status)}</span>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                    <div><div className="text-white/40">Openings</div><div>{value(job.openings)}</div></div>
                    <div><div className="text-white/40">Experience</div><div>{job.experience_min ?? '—'} – {job.experience_max ?? '—'} years</div></div>
                    <div><div className="text-white/40">Salary</div><div>{job.salary_min ?? '—'} – {job.salary_max ?? '—'} {value(job.salary_currency)}</div></div>
                    <div><div className="text-white/40">Posted</div><div className="flex items-center gap-1"><CalendarDays size={12} /> {dateValue(job.created_at)}</div></div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2 text-sm">
                    <div><div className="text-xs text-white/40">Description</div><div className="mt-1 whitespace-pre-wrap text-white/75">{value(job.description)}</div></div>
                    <div><div className="text-xs text-white/40">Requirements</div><div className="mt-1 whitespace-pre-wrap text-white/75">{value(job.requirements)}</div></div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2 text-sm">
                    <div><div className="text-xs text-white/40">Responsibilities</div><div className="mt-1 whitespace-pre-wrap text-white/75">{value(job.responsibilities)}</div></div>
                    <div><div className="text-xs text-white/40">Industry</div><div className="mt-1">{value(job.industry)}</div></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
