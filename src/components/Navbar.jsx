import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const links = [
  { label: 'Find Jobs', href: '/jobs' },
  { label: 'For Employers', href: '/employers' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Blog', href: '/blog' },
];

const dashboardByRole = {
  employer: '/employer/dashboard',
  admin: '/admin/dashboard',
  recruiter: '/recruiter/dashboard',
  candidate: '/candidate/dashboard',
};

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const dashboardPath = dashboardByRole[role] || '/candidate/dashboard';

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-nova-950/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600" />
          <span className="font-display text-lg font-bold tracking-tight">Stratos Nova</span>
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a key={l.label} href={l.href} className="text-sm text-white/70 transition hover:text-white">{l.label}</a>
          ))}
        </div>
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <button onClick={() => navigate(dashboardPath)} className="btn-secondary !py-2 !px-4 text-sm">Dashboard</button>
              <button onClick={signOut} className="text-sm text-white/60 hover:text-white">Sign out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm text-white/70 hover:text-white">Sign in</Link>
              <Link to="/register" className="btn-primary !py-2 !px-4 text-sm">Get Started <ArrowRight size={16} /></Link>
            </>
          )}
        </div>
        <button className="md:hidden" onClick={() => setOpen(!open)}>{open ? <X size={22} /> : <Menu size={22} />}</button>
      </nav>
      {open && (
        <div className="border-t border-white/[0.06] px-6 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            {links.map((l) => <a key={l.label} href={l.href} className="text-sm text-white/70">{l.label}</a>)}
            <div className="mt-2 flex gap-3">
              {user ? (
                <button onClick={() => navigate(dashboardPath)} className="btn-primary flex-1 !py-2 text-sm">Dashboard</button>
              ) : (
                <>
                  <Link to="/login" className="btn-secondary flex-1 !py-2 text-sm">Sign in</Link>
                  <Link to="/register" className="btn-primary flex-1 !py-2 text-sm">Get Started</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
