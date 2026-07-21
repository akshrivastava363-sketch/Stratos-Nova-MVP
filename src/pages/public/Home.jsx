import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Users, Building2, CheckCircle2, Zap, Shield, Target,
  Star, Sparkles,
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import { supabase } from '../../lib/supabase';

const stats = [
  { label: 'Startups Hiring', value: '250+' },
  { label: 'Pre-screened Candidates', value: '12K+' },
  { label: 'Avg. Time to Hire', value: '9 days' },
  { label: 'Placement Success', value: '94%' },
];

const process = [
  { step: '01', title: 'Post a Role', desc: 'Define what you need in minutes with our guided job builder.' },
  { step: '02', title: 'Get Matched', desc: 'We surface pre-screened candidates who actually fit the role.' },
  { step: '03', title: 'Interview Fast', desc: 'Built-in scheduling and pipeline tracking, no spreadsheets.' },
  { step: '04', title: 'Hire & Onboard', desc: 'Send offers and track joining, all in one dashboard.' },
];

const whyUs = [
  { icon: Target, title: 'Pre-screened, not just listed', desc: 'Every candidate profile is verified before it reaches your pipeline.' },
  { icon: Zap, title: 'Built for startup speed', desc: 'No bloated enterprise workflows. Post, review, hire — fast.' },
  { icon: Shield, title: 'Secure by default', desc: 'Role-based access, encrypted storage, and full audit trails.' },
];

function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('contact_queries').insert(form);
    setLoading(false);
    if (!error) { setSent(true); setForm({ name: '', email: '', phone: '', subject: '', message: '' }); }
  };

  if (sent) return <p className="text-center text-accent-400">Thanks — we'll get back to you shortly.</p>;

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <input required className="input-field" placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input required type="email" className="input-field" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      <input className="input-field" placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      <input className="input-field" placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
      <textarea required rows={4} className="input-field" placeholder="Message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
      <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Sending…' : 'Send Message'}</button>
    </form>
  );
}

export default function Home() {
  const [testimonials, setTestimonials] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [openFaq, setOpenFaq] = useState(null);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    supabase.from('testimonials').select('*').eq('is_featured', true).limit(6)
      .then(({ data }) => setTestimonials(data || []));
    supabase.from('faqs').select('*').order('sort_order').limit(8)
      .then(({ data }) => setFaqs(data || []));
    supabase.from('jobs').select('id,title,location,employment_type,work_mode,salary_min,salary_max,company_id,companies(name,logo_url)')
      .eq('status', 'active').order('created_at', { ascending: false }).limit(6)
      .then(({ data }) => setJobs(data || []));
  }, []);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return;
    const { error } = await supabase.from('newsletter').insert({ email });
    if (!error) setSubscribed(true);
  };

  return (
    <div className="min-h-screen bg-nova-950">
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden px-6 pt-20 pb-24">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[600px] -translate-x-1/2 rounded-full bg-accent-500/20 blur-[120px]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs text-white/70 animate-fade-up">
            <Sparkles size={14} className="text-gold-400" /> Startup hiring, reimagined
          </div>
          <h1 className="animate-fade-up font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl" style={{ animationDelay: '0.1s' }}>
            Hire your next great teammate,{' '}
            <span className="bg-gradient-to-r from-accent-400 to-gold-400 bg-clip-text text-transparent">
              not a resume pile
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl animate-fade-up text-lg text-white/60" style={{ animationDelay: '0.2s' }}>
            Stratos Nova connects early-stage startups with pre-screened, ready-to-interview candidates —
            without the noise of a generic job board.
          </p>
          <div className="mt-8 flex animate-fade-up flex-col justify-center gap-4 sm:flex-row" style={{ animationDelay: '0.3s' }}>
            <Link to="/register?role=employer" className="btn-primary">
              I'm Hiring <ArrowRight size={18} />
            </Link>
            <Link to="/register?role=candidate" className="btn-secondary">
              I'm Job Hunting
            </Link>
          </div>
        </div>
      </section>

      {/* STATS */}
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

      {/* WHY STRATOS NOVA */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Why Stratos Nova</h2>
            <p className="mt-3 text-white/50">Not another job board. A hiring engine built for startups.</p>
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

      {/* PROCESS */}
      <section className="border-y border-white/[0.06] bg-white/[0.02] px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Our Process</h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-4">
            {process.map((p) => (
              <div key={p.step} className="relative">
                <div className="font-display text-4xl font-bold text-white/10">{p.step}</div>
                <h3 className="mt-2 text-lg font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm text-white/50">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LATEST JOBS */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex items-center justify-between">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Latest Jobs</h2>
            <Link to="/jobs" className="text-sm text-accent-400 hover:text-accent-300">View all →</Link>
          </div>
          {jobs.length === 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-40" />)}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {jobs.map((j) => (
                <Link to={`/jobs/${j.id}`} key={j.id} className="card block">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-white/10" />
                    <div>
                      <div className="font-medium">{j.title}</div>
                      <div className="text-xs text-white/40">{j.companies?.name}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-white/50">
                    <span className="rounded-full bg-white/5 px-2 py-1">{j.location}</span>
                    <span className="rounded-full bg-white/5 px-2 py-1">{j.work_mode}</span>
                    <span className="rounded-full bg-white/5 px-2 py-1">{j.employment_type?.replace('_', ' ')}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* TESTIMONIALS */}
      {testimonials.length > 0 && (
        <section className="border-y border-white/[0.06] bg-white/[0.02] px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-14 text-center font-display text-3xl font-bold sm:text-4xl">What People Say</h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {testimonials.map((t) => (
                <div key={t.id} className="card">
                  <div className="mb-3 flex gap-0.5">
                    {[...Array(t.rating || 5)].map((_, i) => <Star key={i} size={14} className="fill-gold-400 text-gold-400" />)}
                  </div>
                  <p className="text-sm text-white/70">"{t.quote}"</p>
                  <div className="mt-4 text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-white/40">{t.role} · {t.company}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* PRICING */}
      <section id="pricing" className="px-6 py-24">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Simple Pricing</h2>
          <p className="mt-3 text-white/50">No hidden fees. Cancel anytime.</p>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              { name: 'Starter', price: '₹0', desc: 'For early exploration', features: ['1 active job post', 'Basic candidate search', 'Email support'] },
              { name: 'Growth', price: '₹4,999/mo', desc: 'For active hiring teams', features: ['10 active job posts', 'Advanced filters', 'Pipeline analytics', 'Priority support'], highlight: true },
              { name: 'Scale', price: 'Custom', desc: 'For high-volume hiring', features: ['Unlimited jobs', 'Dedicated account manager', 'API access', 'Custom integrations'] },
            ].map((p) => (
              <div key={p.name} className={`card text-left ${p.highlight ? 'border-accent-500/50 ring-1 ring-accent-500/30' : ''}`}>
                <div className="text-sm text-white/50">{p.name}</div>
                <div className="mt-2 font-display text-3xl font-bold">{p.price}</div>
                <div className="mt-1 text-xs text-white/40">{p.desc}</div>
                <ul className="mt-6 space-y-2 text-sm text-white/70">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2"><CheckCircle2 size={14} className="text-accent-400" /> {f}</li>
                  ))}
                </ul>
                <button className={p.highlight ? 'btn-primary mt-6 w-full' : 'btn-secondary mt-6 w-full'}>Choose Plan</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      {faqs.length > 0 && (
        <section className="border-y border-white/[0.06] bg-white/[0.02] px-6 py-24">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-10 text-center font-display text-3xl font-bold sm:text-4xl">FAQs</h2>
            <div className="space-y-3">
              {faqs.map((f, i) => (
                <div key={f.id} className="card cursor-pointer" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <div className="flex items-center justify-between font-medium">{f.question}</div>
                  {openFaq === i && <p className="mt-3 text-sm text-white/50">{f.answer}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CONTACT */}
      <section id="contact" className="border-y border-white/[0.06] bg-white/[0.02] px-6 py-24">
        <div className="mx-auto max-w-xl">
          <h2 className="mb-8 text-center font-display text-3xl font-bold sm:text-4xl">Get in Touch</h2>
          <ContactForm />
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Stay in the loop</h2>
          <p className="mt-3 text-white/50">Hiring tips and product updates, no spam.</p>
          {subscribed ? (
            <p className="mt-6 text-accent-400">You're subscribed — welcome aboard.</p>
          ) : (
            <form onSubmit={handleSubscribe} className="mx-auto mt-6 flex max-w-md gap-3">
              <input
                type="email" required placeholder="you@company.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="input-field"
              />
              <button type="submit" className="btn-primary shrink-0">Subscribe</button>
            </form>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06] px-6 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600" />
            <span className="font-display font-bold">Stratos Nova</span>
          </div>
          <div className="flex gap-6 text-sm text-white/50">
            <Link to="/jobs">Jobs</Link>
            <Link to="/employers">Employers</Link>
            <Link to="/blog">Blog</Link>
            <a href="#contact">Contact</a>
          </div>
          <div className="text-xs text-white/30">© {new Date().getFullYear()} Stratos Nova HR Solutions</div>
        </div>
      </footer>
    </div>
  );
}
