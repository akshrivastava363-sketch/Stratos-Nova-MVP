import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Search, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Link } from 'react-router-dom';

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let q = supabase.from('users').select('*').order('created_at', { ascending: false }).limit(100);
    if (roleFilter) q = q.eq('role', roleFilter);
    if (query) q = q.or(`email.ilike.%${query}%,full_name.ilike.%${query}%,phone.ilike.%${query}%`);
    const { data, error } = await q;
    if (error) { toast.error(error.message); setUsers([]); setLoading(false); return; }
    const rows = data || [];
    const candidateIds = rows.filter((u) => u.role === 'candidate').map((u) => u.id);
    let profiles = [];
    if (candidateIds.length) {
      const { data: profileRows } = await supabase.from('profiles').select('id,profile_completion').in('id', candidateIds);
      profiles = profileRows || [];
    }
    const completionById = Object.fromEntries(profiles.map((p) => [p.id, p.profile_completion ?? 0]));
    setUsers(rows.map((u) => ({ ...u, profile_completion: completionById[u.id] ?? null })));
    setLoading(false);
  };
  useEffect(() => { load(); }, [query, roleFilter]);

  const toggleActive = async (id, isActive) => {
    const { error } = await supabase.from('users').update({ is_active: !isActive }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, is_active: !isActive } : u)));
    toast.success(!isActive ? 'User reactivated' : 'User suspended');
  };

  const changeRole = async (id, role) => {
    if (id === currentUser?.id) { toast.error('You cannot change your own role.'); return; }
    const { error } = await supabase.from('users').update({ role }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
    toast.success('Role updated');
  };

  return (
    <DashboardLayout role="admin">
      <h1 className="mb-1 font-display text-2xl font-bold">Manage Users</h1>
      <p className="mb-6 text-white/50">Every candidate, employer, recruiter, and admin.</p>
      <div className="card mb-6 flex flex-wrap gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2"><Search size={15} className="text-white/40" /><input className="w-full bg-transparent text-sm outline-none" placeholder="Search by name, email or phone" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        <select className="input-field !py-2 w-40 text-sm" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All roles</option><option value="candidate">Candidate</option><option value="employer">Employer</option><option value="recruiter">Recruiter</option><option value="admin">Admin</option>
        </select>
      </div>
      <div className="card !p-0">
        {loading ? <div className="p-6"><div className="skeleton h-40" /></div> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/[0.06] text-left text-xs text-white/40"><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Profile</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th></tr></thead>
            <tbody className="divide-y divide-white/[0.06]">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">{u.full_name || '—'}</td>
                  <td className="px-4 py-3 text-white/60">{u.email}</td>
                  <td className="px-4 py-3">
                    <select className="input-field !py-1 !px-2 text-xs" value={u.role} onChange={(e) => changeRole(u.id, e.target.value)}>
                      <option value="candidate">candidate</option><option value="employer">employer</option><option value="recruiter">recruiter</option><option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">{u.role === 'candidate' ? <div className="flex items-center gap-2"><span className="text-xs text-accent-300">{u.profile_completion ?? 0}%</span><Link to={`/admin/candidates/${u.id}`} className="inline-flex items-center gap-1 text-xs text-accent-400 hover:text-accent-300"><Eye size={13} /> View</Link></div> : <span className="text-xs text-white/30">—</span>}</td>
                  <td className="px-4 py-3"><span className={`badge ${u.is_active ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'}`}>{u.is_active ? 'Active' : 'Suspended'}</span></td>
                  <td className="px-4 py-3"><button onClick={() => toggleActive(u.id, u.is_active)} className="text-xs text-accent-400 hover:text-accent-300">{u.is_active ? 'Suspend' : 'Reactivate'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardLayout>
  );
}
