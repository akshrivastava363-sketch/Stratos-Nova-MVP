import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import Navbar from '../../components/Navbar';

const points = [
  'Post a role in under 5 minutes',
  'AI-assisted candidate matching from a living talent repository',
  'Full ATS pipeline with scorecards and structured feedback',
  'Recruiter Assist when you need extra hands',
  'Modular subscription plans that scale with you',
];

export default function ForEmployers() {
  return (
    <div className="min-h-screen bg-nova-950">
      <Navbar />
      <div className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h1 className="font-display text-4xl font-bold sm:text-5xl">Hiring built for startups</h1>
        <p className="mx-auto mt-4 max-w-xl text-white/60">A talent marketplace, ATS, and AI matching in one place — not a resume inbox.</p>
        <Link to="/register?role=employer" className="btn-primary mx-auto mt-8 w-fit">Start Hiring <ArrowRight size={18} /></Link>
        <div className="card mx-auto mt-16 max-w-md text-left">
          <ul className="space-y-3">
            {points.map((p) => <li key={p} className="flex items-start gap-2 text-sm text-white/70"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-accent-400" /> {p}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}
