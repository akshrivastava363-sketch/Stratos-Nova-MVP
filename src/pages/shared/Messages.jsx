import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../layouts/DashboardLayout';

export default function Messages({ role }) {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const presetTo = params.get('to');
  const [threads, setThreads] = useState([]);
  const [activeUserId, setActiveUserId] = useState(presetTo || null);
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const bottomRef = useRef(null);

  const loadThreads = async () => {
    const { data } = await supabase.from('messages').select('sender_id,recipient_id,body,created_at').or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`).order('created_at', { ascending: false });
    const seen = new Set(); const list = [];
    (data || []).forEach((m) => {
      const other = m.sender_id === user.id ? m.recipient_id : m.sender_id;
      if (!seen.has(other)) { seen.add(other); list.push({ userId: other, lastMessage: m.body, at: m.created_at }); }
    });
    setThreads(list);
    if (!activeUserId && list.length > 0) setActiveUserId(list[0].userId);
  };

  const loadMessages = async (otherId) => {
    const { data } = await supabase.from('messages').select('*').or(`and(sender_id.eq.${user.id},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${user.id})`).order('created_at', { ascending: true });
    setMessages(data || []);
    await supabase.from('messages').update({ is_read: true }).eq('recipient_id', user.id).eq('sender_id', otherId);
  };

  useEffect(() => { if (user) loadThreads(); }, [user]);
  useEffect(() => { if (activeUserId) loadMessages(activeUserId); }, [activeUserId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!body.trim() || !activeUserId) return;
    const { error } = await supabase.from('messages').insert({ sender_id: user.id, recipient_id: activeUserId, body });
    if (!error) { setBody(''); loadMessages(activeUserId); loadThreads(); }
  };

  return (
    <DashboardLayout role={role}>
      <h1 className="mb-6 font-display text-2xl font-bold">Messages</h1>
      <div className="card grid h-[65vh] grid-cols-[220px_1fr] gap-0 overflow-hidden !p-0">
        <div className="overflow-y-auto border-r border-white/[0.06] p-3">
          {threads.length === 0 && !presetTo ? <p className="p-3 text-xs text-white/40">No conversations yet.</p> : (
            <>
              {presetTo && !threads.find((t) => t.userId === presetTo) && (
                <button onClick={() => setActiveUserId(presetTo)} className={`mb-1 w-full rounded-lg px-3 py-2.5 text-left text-sm ${activeUserId === presetTo ? 'bg-accent-500/15 text-accent-300' : 'hover:bg-white/[0.05]'}`}>New conversation</button>
              )}
              {threads.map((t) => (
                <button key={t.userId} onClick={() => setActiveUserId(t.userId)} className={`mb-1 w-full rounded-lg px-3 py-2.5 text-left text-sm ${activeUserId === t.userId ? 'bg-accent-500/15 text-accent-300' : 'hover:bg-white/[0.05]'}`}>
                  <div className="truncate">{t.lastMessage}</div><div className="text-[10px] text-white/30">{new Date(t.at).toLocaleDateString()}</div>
                </button>
              ))}
            </>
          )}
        </div>
        <div className="flex flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {!activeUserId ? <p className="text-center text-sm text-white/30">Select a conversation</p>
            : messages.length === 0 ? <p className="text-center text-sm text-white/30">Say hello 👋</p>
            : messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${m.sender_id === user.id ? 'bg-accent-500 text-white' : 'bg-white/[0.06] text-white/80'}`}>{m.body}</div>
                </div>
              ))}
            <div ref={bottomRef} />
          </div>
          {activeUserId && (
            <form onSubmit={send} className="flex gap-2 border-t border-white/[0.06] p-3">
              <input className="input-field !py-2" placeholder="Type a message…" value={body} onChange={(e) => setBody(e.target.value)} />
              <button type="submit" className="btn-primary !px-4"><Send size={16} /></button>
            </form>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
