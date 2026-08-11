import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Target, Zap, Shield, CheckCircle2, Star, Sparkles, MessageCircle, Mail, AlertTriangle } from 'lucide-react';
import Navbar from '../../components/Navbar';
import { supabase } from '../../lib/supabase';
import { WHATSAPP_NUMBER, CONTACT_EMAIL } from '../../lib/contactConfig';

const stats = [
  { label: 'Startups Hiring', value: '250+' },
  { label: 'Verified Candidates', value: '12K+' },
  { label: 'Avg. Time to Hire', value: '9 days' },
  { label: 'Placement Success', value: '94%' },
];

const whyUs = [
  { icon: Target, title: 'Living Talent Repository', desc: 'A continuously updated, searchable candidate pool — not a stale resume dump.' },
  { icon: Zap, title: 'AI-Assisted Matching', desc: 'Candidates ranked by skills, assessments, and fit — AI assists, humans decide.' },
  { icon: Shield, title: 'Built-in Verification', desc: 'Education and employment verification workflows, modular and extensible.' },
];

function ContactOptions() {
  const configured = WHATSAPP_NUMBER && CONTACT_EMAIL;

  if (!configured) {
    return (
      <div className="card flex items-start gap-3 border-yellow-500/30 bg-yellow-500/[0.06]">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-yellow-400" />
        <p className="text-sm text-white/60">
          Contact details aren't configured yet — add your WhatsApp number and email in <code className="text-yellow-300">src/lib/contactConfig.js</code> to activate these buttons.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <a
        href={`https://wa.me/${WHATSAPP_NUMBER}`}
        target="_blank" rel="noreferrer"
        className="card flex flex-col items-center gap-3 text-center transition hover:border-green-500/40"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15">
          <MessageCircle size={26} className="text-green-400" />
        </div>
        <div className="font-medium">Chat on WhatsApp</div>
        <p className="text-xs text-white/40">Get a response fast — message us directly.</p>
      </a>
      <a
        href={`mailto:${CONTACT_EMAIL}`}
        className="card flex flex-col items-center gap-3 text-center transition hover:border-accent-500/40"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-500/15">
          <Mail size={26} className="text-accent-400" />
        </div>
        <div className="font-medium">Send us an Email</div>
        <p className="text-xs text-white/40">{CONTACT_EMAIL}</p>
      </a>
    </div>
  );
}

function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return;
    const { error } = await supabase.from('newsletter').insert({ email });
    if (!error) setSubscribed(true);
  };

  if (subscribed) return <p className="mt-6 text-accent-400">You're subscribed — welcome aboard.</p>;

  return (
    <form onSubmit={handleSubscribe} className="mx-auto mt-6 flex max-w-md gap-3">
      <input type="email" required placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" />
      <button type="submit" className="btn-primary shrink-0">Subscribe</button>
    </form>
  );
}

export default function Home() {
  const [testimonials, setTestimonials] = useState([]);
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    supabase.from('testimonials').select('*').eq('is_featured', true).limit(6).then(({ data }) => setTestimonials(data || []));
    supabase.from('jobs').select('id,title,location,employment_type,work_mode,companies(name)')
      .eq('status', 'active').order('created_at', { ascending: false }).limit(6)
      .then(({ data }) => setJobs(data || []));
  }, []);

  return (
    <div className="min-h-screen bg-nova-950">
      <Navbar />
      <section className="relative overflow-hidden px-6 pt-20 pb-24">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[600px] -translate-x-1/2 rounded-full bg-accent-500/20 blur-[120px]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs text-white/70 animate-fade-up">
            <Sparkles size={14} className="text-gold-400" /> Talent marketplace + ATS + AI matching
          </div>
          <h1 className="animate-fade-up font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl" style={{ animationDelay: '0.1s' }}>
            Hire your next great teammate,{' '}
            <span className="bg-gradient-to-r from-accent-400 to-gold-400 bg-clip-text text-transparent">not a resume pile</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl animate-fade-up text-lg text-white/60" style={{ animationDelay: '0.2s' }}>
            A recruitment platform that combines a talent marketplace, ATS, and AI-assisted matching — built for startups, not enterprise HR teams.
          </p>
          <div className="mt-8 flex animate-fade-up flex-col justify-center gap-4 sm:flex-row" style={{ animationDelay: '0.3s' }}>
            <Link to="/register?role=employer" className="btn-primary">I'm Hiring <ArrowRight size={18} /></Link>
            <Link to="/register?role=candidate" className="btn-secondary">I'm Job Hunting</Link>
          </div>
        </div>
      </section>

      <section className="border-y border-white/[0.06] bg-white/[0.02] px-6 py-12">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-display text-3xl font-bold text-white">{s.value}</div>
              <div className="mt-1 text-sm text-white/50">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Why Stratos Nova</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {whyUs.map((w) => (
              <div key={w.title} className="card">
                <w.icon className="mb-4 text-accent-400" size={28} />
                <h3 className="mb-2 text-lg font-semibold">{w.title}</h3>
                <p className="text-sm text-white/50">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex items-center justify-between">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Latest Jobs</h2>
            <Link to="/jobs" className="text-sm text-accent-400 hover:text-accent-300">View all →</Link>
          </div>
          {jobs.length === 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-40" />)}</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {jobs.map((j) => (
                <Link to={`/jobs/${j.id}`} key={j.id} className="card block">
                  <div className="font-medium">{j.title}</div>
                  <div className="text-xs text-white/40">{j.companies?.name}</div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/50">
                    <span className="badge bg-white/5">{j.location}</span>
                    <span className="badge bg-white/5">{j.work_mode}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {testimonials.length > 0 && (
        <section className="border-y border-white/[0.06] bg-white/[0.02] px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-14 text-center font-display text-3xl font-bold sm:text-4xl">What People Say</h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {testimonials.map((t) => (
                <div key={t.id} className="card">
                  <div className="mb-3 flex gap-0.5">{[...Array(t.rating || 5)].map((_, i) => <Star key={i} size={14} className="fill-gold-400 text-gold-400" />)}</div>
                  <p className="text-sm text-white/70">"{t.quote}"</p>
                  <div className="mt-4 text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-white/40">{t.role} · {t.company}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="contact" className="border-y border-white/[0.06] bg-white/[0.02] px-6 py-24">
        <div className="mx-auto max-w-xl">
          <h2 className="mb-8 text-center font-display text-3xl font-bold sm:text-4xl">Get in Touch</h2>
          <ContactOptions />
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Stay in the loop</h2>
          <p className="mt-3 text-white/50">Hiring tips and product updates, no spam.</p>
          <NewsletterForm />
        </div>
      </section>

      <footer className="border-t border-white/[0.06] px-6 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600" />
            <span className="font-display font-bold">Stratos Nova</span>
          </div>
          <div className="flex gap-6 text-sm text-white/50">
            <Link to="/jobs">Jobs</Link>
            <Link to="/employers">Employers</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/blog">Blog</Link>
          </div>
          <div className="text-xs text-white/30">© {new Date().getFullYear()} Stratos Nova</div>
        </div>
      </footer>
    </div>
  );
}
