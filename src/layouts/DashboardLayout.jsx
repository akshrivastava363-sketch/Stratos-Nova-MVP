import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Briefcase, Bookmark, User, MessageSquare, Bell,
  Users, PlusCircle, BarChart3, Building2, Settings, ShieldCheck, FileText,
  GraduationCap, Award, CreditCard, UserCog, Sparkles, RefreshCw, Menu, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navByRole = {
  candidate: [
    { label: 'Dashboard', href: '/candidate/dashboard', icon: LayoutDashboard },
    { label: 'Find Jobs', href: '/jobs', icon: Briefcase },
    { label: 'Saved Jobs', href: '/candidate/saved', icon: Bookmark },
    { label: 'Applications', href: '/candidate/applications', icon: FileText },
    { label: 'Education & Experience', href: '/candidate/history', icon: GraduationCap },
    { label: 'Assessments', href: '/candidate/assessments', icon: Award },
    { label: 'Messages', href: '/candidate/messages', icon: MessageSquare },
    { label: 'Notifications', href: '/candidate/notifications', icon: Bell },
    { label: 'Profile', href: '/candidate/profile', icon: User },
  ],
  employer: [
    { label: 'Dashboard', href: '/employer/dashboard', icon: LayoutDashboard },
    { label: 'Post a Job', href: '/employer/jobs/new', icon: PlusCircle },
    { label: 'Manage Jobs', href: '/employer/jobs', icon: Briefcase },
    { label: 'Candidates', href: '/employer/candidates', icon: Users },
    { label: 'Analytics', href: '/employer/analytics', icon: BarChart3 },
    { label: 'Subscription', href: '/employer/subscription', icon: CreditCard },
    { label: 'Company Profile', href: '/employer/company', icon: Building2 },
    { label: 'Messages', href: '/employer/messages', icon: MessageSquare },
  ],
  recruiter: [
    { label: 'Dashboard', href: '/recruiter/dashboard', icon: LayoutDashboard },
    { label: 'Assigned Jobs', href: '/recruiter/jobs', icon: Briefcase },
    { label: 'Candidates', href: '/recruiter/candidates', icon: Users },
    { label: 'Candidate Updates', href: '/recruiter/outreach', icon: RefreshCw },
    { label: 'Messages', href: '/recruiter/messages', icon: MessageSquare },
    { label: 'Notifications', href: '/recruiter/notifications', icon: Bell },
  ],
  admin: [
    { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Users', href: '/admin/users', icon: Users },
    { label: 'Candidate Updates', href: '/admin/outreach', icon: RefreshCw },
    { label: 'Employers', href: '/admin/employers', icon: ShieldCheck },
    { label: 'Recruiters', href: '/admin/recruiters', icon: UserCog },
    { label: 'Jobs', href: '/admin/jobs', icon: Briefcase },
    { label: 'Assessments', href: '/admin/assessments', icon: Award },
    { label: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
    { label: 'Content (CMS)', href: '/admin/cms', icon: FileText },
    { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { label: 'Repository Health', href: '/admin/repository', icon: Sparkles },
    { label: 'Settings', href: '/admin/settings', icon: Settings },
    { label: 'Activity Log', href: '/admin/activity', icon: FileText },
  ],
};

function NavLinks({ items, location, onNavigate }) {
  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const active = location.pathname === item.href;
        return (
          <Link key={item.href} to={item.href} onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
              active ? 'bg-accent-500/15 text-accent-300' : 'text-white/60 hover:bg-white/[0.05] hover:text-white'
            }`}>
            <item.icon size={17} /> {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function DashboardLayout({ children, role }) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const items = navByRole[role] || [];
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-nova-950">
      {/* Mobile top bar — the sidebar below is desktop-only, so sign out and
          navigation would otherwise be completely inaccessible on small screens. */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3 lg:hidden">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600" />
          <span className="font-display font-bold">Stratos Nova</span>
        </Link>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="rounded-lg p-2 text-white/70 hover:bg-white/[0.06]" aria-label="Toggle menu">
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {mobileOpen && (
        <div className="border-b border-white/[0.06] px-4 py-4 lg:hidden">
          <NavLinks items={items} location={location} onNavigate={() => setMobileOpen(false)} />
          <div className="mt-4 border-t border-white/[0.06] pt-4">
            <div className="px-3 text-xs text-white/40">{profile?.email}</div>
            <button onClick={handleSignOut} className="mt-2 w-full rounded-xl px-3 py-2.5 text-left text-sm text-white/60 hover:bg-white/[0.05]">Sign out</button>
          </div>
        </div>
      )}

      <div className="flex">
        <aside className="hidden w-64 shrink-0 border-r border-white/[0.06] p-4 lg:block">
          <Link to="/" className="mb-8 flex items-center gap-2 px-2 pt-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600" />
            <span className="font-display font-bold">Stratos Nova</span>
          </Link>
          <NavLinks items={items} location={location} />
          <div className="mt-8 border-t border-white/[0.06] pt-4">
            <div className="px-3 text-xs text-white/40">{profile?.email}</div>
            <button onClick={handleSignOut} className="mt-2 w-full rounded-xl px-3 py-2.5 text-left text-sm text-white/60 hover:bg-white/[0.05]">Sign out</button>
          </div>
        </aside>
        <main className="flex-1 p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
