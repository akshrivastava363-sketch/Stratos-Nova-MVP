import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../layouts/DashboardLayout';

const TABS = ['Testimonials', 'FAQs', 'Blogs', 'Contact Queries', 'Newsletter'];

export default function AdminCMS() {
  const [tab, setTab] = useState('Testimonials');
  return (
    <DashboardLayout role="admin">
      <h1 className="mb-1 font-display text-2xl font-bold">Content Management</h1>
      <p className="mb-6 text-white/50">Manage homepage content and inbound queries.</p>
      <div className="mb-6 flex flex-wrap gap-2">{TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`badge ${tab === t ? 'bg-accent-500 text-white' : 'bg-white/[0.05] text-white/50'}`}>{t}</button>)}</div>
      {tab === 'Testimonials' && <TestimonialsPanel />}
      {tab === 'FAQs' && <FaqsPanel />}
      {tab === 'Blogs' && <BlogsPanel />}
      {tab === 'Contact Queries' && <ContactPanel />}
      {tab === 'Newsletter' && <NewsletterPanel />}
    </DashboardLayout>
  );
}

function TestimonialsPanel() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: '', role: '', company: '', quote: '', rating: 5 });
  const load = async () => { const { data } = await supabase.from('testimonials').select('*').order('created_at', { ascending: false }); setItems(data || []); };
  useEffect(() => { load(); }, []);
  const add = async (e) => { e.preventDefault(); if (!form.name || !form.quote) return; await supabase.from('testimonials').insert({ ...form, is_featured: true }); setForm({ name: '', role: '', company: '', quote: '', rating: 5 }); load(); };
  const toggleFeature = async (id, val) => { await supabase.from('testimonials').update({ is_featured: !val }).eq('id', id); load(); };
  const remove = async (id) => { await supabase.from('testimonials').delete().eq('id', id); load(); };
  return (
    <div className="space-y-6">
      <form onSubmit={add} className="card grid gap-3 sm:grid-cols-2">
        <input className="input-field" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="input-field" placeholder="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
        <input className="input-field" placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        <input type="number" min="1" max="5" className="input-field" placeholder="Rating" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} />
        <textarea className="input-field sm:col-span-2" rows={2} placeholder="Quote" value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value })} />
        <button type="submit" className="btn-primary sm:col-span-2"><Plus size={16} /> Add Testimonial</button>
      </form>
      <div className="space-y-2">
        {items.map((t) => (
          <div key={t.id} className="card flex items-center justify-between">
            <div><div className="text-sm font-medium">{t.name} — {t.role}, {t.company}</div><div className="text-xs text-white/50">"{t.quote}"</div></div>
            <div className="flex items-center gap-2"><button onClick={() => toggleFeature(t.id, t.is_featured)} className="text-white/40 hover:text-white">{t.is_featured ? <Eye size={16} /> : <EyeOff size={16} />}</button><button onClick={() => remove(t.id)} className="text-white/40 hover:text-red-400"><Trash2 size={16} /></button></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FaqsPanel() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ question: '', answer: '' });
  const load = async () => { const { data } = await supabase.from('faqs').select('*').order('sort_order'); setItems(data || []); };
  useEffect(() => { load(); }, []);
  const add = async (e) => { e.preventDefault(); if (!form.question || !form.answer) return; await supabase.from('faqs').insert({ ...form, sort_order: items.length + 1 }); setForm({ question: '', answer: '' }); load(); };
  const remove = async (id) => { await supabase.from('faqs').delete().eq('id', id); load(); };
  return (
    <div className="space-y-6">
      <form onSubmit={add} className="card space-y-3">
        <input className="input-field" placeholder="Question" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
        <textarea className="input-field" rows={2} placeholder="Answer" value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} />
        <button type="submit" className="btn-primary"><Plus size={16} /> Add FAQ</button>
      </form>
      <div className="space-y-2">{items.map((f) => (<div key={f.id} className="card flex items-start justify-between"><div><div className="text-sm font-medium">{f.question}</div><div className="text-xs text-white/50">{f.answer}</div></div><button onClick={() => remove(f.id)} className="shrink-0 text-white/40 hover:text-red-400"><Trash2 size={16} /></button></div>))}</div>
    </div>
  );
}

function BlogsPanel() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title: '', excerpt: '', content: '' });
  const load = async () => { const { data } = await supabase.from('blogs').select('*').order('created_at', { ascending: false }); setItems(data || []); };
  useEffect(() => { load(); }, []);
  const add = async (e) => { e.preventDefault(); if (!form.title || !form.content) return; const slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); const { error } = await supabase.from('blogs').insert({ ...form, slug, is_published: false }); if (error) { toast.error(error.message); return; } setForm({ title: '', excerpt: '', content: '' }); load(); };
  const togglePublish = async (id, val) => { await supabase.from('blogs').update({ is_published: !val, published_at: !val ? new Date().toISOString() : null }).eq('id', id); load(); };
  const remove = async (id) => { await supabase.from('blogs').delete().eq('id', id); load(); };
  return (
    <div className="space-y-6">
      <form onSubmit={add} className="card space-y-3">
        <input className="input-field" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className="input-field" placeholder="Excerpt" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
        <textarea className="input-field" rows={5} placeholder="Content" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
        <button type="submit" className="btn-primary"><Plus size={16} /> Create Draft</button>
      </form>
      <div className="space-y-2">
        {items.map((b) => (
          <div key={b.id} className="card flex items-center justify-between">
            <div><div className="text-sm font-medium">{b.title}</div><div className="text-xs text-white/50">{b.excerpt}</div></div>
            <div className="flex items-center gap-3">
              <span className={`badge ${b.is_published ? 'bg-green-500/15 text-green-300' : 'bg-white/10 text-white/50'}`}>{b.is_published ? 'Published' : 'Draft'}</span>
              <button onClick={() => togglePublish(b.id, b.is_published)} className="text-xs text-accent-400 hover:text-accent-300">{b.is_published ? 'Unpublish' : 'Publish'}</button>
              <button onClick={() => remove(b.id)} className="text-white/40 hover:text-red-400"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContactPanel() {
  const [items, setItems] = useState([]);
  const load = async () => { const { data } = await supabase.from('contact_queries').select('*').order('created_at', { ascending: false }); setItems(data || []); };
  useEffect(() => { load(); }, []);
  const resolve = async (id) => { await supabase.from('contact_queries').update({ is_resolved: true }).eq('id', id); load(); };
  return (
    <div className="space-y-2">
      {items.length === 0 ? <div className="card py-12 text-center text-white/40">No contact queries yet.</div> : items.map((c) => (
        <div key={c.id} className="card flex items-start justify-between">
          <div><div className="text-sm font-medium">{c.name} — {c.email}</div><div className="text-xs text-white/50">{c.subject}</div><div className="mt-1 text-xs text-white/40">{c.message}</div></div>
          {!c.is_resolved ? <button onClick={() => resolve(c.id)} className="btn-secondary shrink-0 !py-1.5 !px-3 text-xs">Mark resolved</button> : <span className="shrink-0 badge bg-green-500/15 text-green-300">Resolved</span>}
        </div>
      ))}
    </div>
  );
}

function NewsletterPanel() {
  const [items, setItems] = useState([]);
  useEffect(() => { supabase.from('newsletter').select('*').order('subscribed_at', { ascending: false }).then(({ data }) => setItems(data || [])); }, []);
  return (
    <div className="card !p-0">
      <table className="w-full text-sm"><thead><tr className="border-b border-white/[0.06] text-left text-xs text-white/40"><th className="px-4 py-3">Email</th><th className="px-4 py-3">Subscribed</th></tr></thead>
        <tbody className="divide-y divide-white/[0.06]">{items.map((n) => (<tr key={n.id}><td className="px-4 py-3">{n.email}</td><td className="px-4 py-3 text-white/40">{new Date(n.subscribed_at).toLocaleDateString()}</td></tr>))}</tbody>
      </table>
      {items.length === 0 && <p className="p-6 text-center text-sm text-white/40">No subscribers yet.</p>}
    </div>
  );
}
