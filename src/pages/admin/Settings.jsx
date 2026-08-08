import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layouts/DashboardLayout';

export default function AdminSettings() {
  const { profile } = useAuth();
  return (
    <DashboardLayout role="admin">
      <h1 className="mb-1 font-display text-2xl font-bold">Settings</h1>
      <p className="mb-6 text-white/50">Admin account and platform configuration.</p>
      <div className="card max-w-lg space-y-4">
        <div><div className="text-xs text-white/40">Admin Email</div><div className="text-sm">{profile?.email}</div></div>
        <div><div className="text-xs text-white/40">Role</div><div className="text-sm capitalize">{profile?.role}</div></div>
      </div>
      <div className="card mt-6 max-w-lg">
        <h2 className="mb-2 text-sm font-semibold">Platform Notes</h2>
        <p className="text-sm text-white/50">Institution/employment verification providers, rate limiting, and CAPTCHA are configured at the infrastructure level (Supabase Edge Functions, Cloudflare), not through this UI. The `verification_sources` table is the registry where real providers get wired in.</p>
      </div>
    </DashboardLayout>
  );
}
