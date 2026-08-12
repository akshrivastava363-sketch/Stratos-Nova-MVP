import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../layouts/DashboardLayout';

export default function Notifications({ role }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
    setItems(data || []); setLoading(false);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const markAllRead = async () => { await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false); setItems((prev) => prev.map((n) => ({ ...n, is_read: true }))); };
  const markRead = async (id) => { await supabase.from('notifications').update({ is_read: true }).eq('id', id); setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))); };
  const openNotification = async (notification) => {
    await markRead(notification.id);
    if (notification.link) navigate(notification.link);
  };

  return (
    <DashboardLayout role={role}>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Notifications</h1>
        {items.some((n) => !n.is_read) && <button onClick={markAllRead} className="flex items-center gap-1.5 text-sm text-accent-400 hover:text-accent-300"><CheckCheck size={15} /> Mark all read</button>}
      </div>
      {loading ? <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-16" />)}</div>
      : items.length === 0 ? <div className="card py-16 text-center text-white/40"><Bell size={32} className="mx-auto mb-3 opacity-30" /> No notifications yet.</div>
      : <div className="space-y-2">
          {items.map((n) => (
            <button key={n.id} onClick={() => openNotification(n)} className={`card block w-full text-left ${!n.is_read ? 'border-accent-500/30 bg-accent-500/[0.04]' : ''}`}>
              <div className="flex items-center justify-between"><span className="text-sm font-medium">{n.title}</span>{!n.is_read && <span className="h-2 w-2 rounded-full bg-accent-400" />}</div>
              {n.body && <p className="mt-1 text-xs text-white/50">{n.body}</p>}
            </button>
          ))}
        </div>}
    </DashboardLayout>
  );
}
