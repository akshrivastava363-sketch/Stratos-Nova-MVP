import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../layouts/DashboardLayout';

const empty = { name: '', website: '', gst_number: '', company_size: '1-10', industry: '', about: '', hiring_contact_name: '', hiring_contact_email: '', hiring_contact_phone: '' };

export default function CompanyProfile() {
  const { user } = useAuth();
  const [form, setForm] = useState(empty);
  const [companyId, setCompanyId] = useState(null);
  const [approvalStatus, setApprovalStatus] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('companies').select('*').eq('owner_id', user.id).maybeSingle().then(({ data }) => {
      if (data) { setForm({ ...empty, ...data }); setCompanyId(data.id); setApprovalStatus(data.approval_status); setLogoUrl(data.logo_url); }
      setReady(true);
    });
  }, [user]);

  const handleChange = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const uploadLogo = async (file) => {
    const path = `${user.id}/logo-${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('company-logos').upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from('company-logos').getPublicUrl(path);
    setLogoUrl(data.publicUrl);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = { ...form, owner_id: user.id, logo_url: logoUrl };
    let error;
    if (companyId) { ({ error } = await supabase.from('companies').update(payload).eq('id', companyId)); }
    else { const res = await supabase.from('companies').insert(payload).select('id').single(); error = res.error; if (res.data) setCompanyId(res.data.id); }
    setLoading(false);
    if (error) toast.error(error.message); else toast.success('Company profile saved — pending admin approval if new.');
  };

  if (!ready) return <DashboardLayout role="employer"><div className="skeleton h-96" /></DashboardLayout>;

  return (
    <DashboardLayout role="employer">
      <h1 className="mb-1 font-display text-2xl font-bold">Company Profile</h1>
      <p className="mb-6 text-white/50">This is what candidates see when they view your jobs.</p>
      {approvalStatus && <div className={`mb-6 inline-flex badge ${approvalStatus === 'approved' ? 'bg-green-500/15 text-green-300' : approvalStatus === 'pending' ? 'bg-yellow-500/15 text-yellow-300' : 'bg-red-500/15 text-red-300'}`}>Status: {approvalStatus}</div>}
      <form onSubmit={handleSubmit} className="card max-w-2xl space-y-5">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white/5">{logoUrl && <img src={logoUrl} alt="logo" className="h-full w-full object-cover" />}</div>
          <label className="btn-secondary cursor-pointer !py-2 !px-4 text-sm"><Upload size={14} /> Upload logo<input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && uploadLogo(e.target.files[0])} /></label>
        </div>
        <div><label className="mb-1.5 block text-sm text-white/60">Company Name *</label><input required className="input-field" value={form.name} onChange={handleChange('name')} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="mb-1.5 block text-sm text-white/60">Website</label><input className="input-field" value={form.website} onChange={handleChange('website')} /></div>
          <div><label className="mb-1.5 block text-sm text-white/60">GST Number (optional)</label><input className="input-field" value={form.gst_number} onChange={handleChange('gst_number')} /></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="mb-1.5 block text-sm text-white/60">Company Size</label><select className="input-field" value={form.company_size} onChange={handleChange('company_size')}><option value="1-10">1–10</option><option value="11-50">11–50</option><option value="51-200">51–200</option><option value="201-500">201–500</option><option value="500+">500+</option></select></div>
          <div><label className="mb-1.5 block text-sm text-white/60">Industry</label><input className="input-field" value={form.industry} onChange={handleChange('industry')} /></div>
        </div>
        <div><label className="mb-1.5 block text-sm text-white/60">About</label><textarea rows={4} className="input-field" value={form.about} onChange={handleChange('about')} /></div>
        <div className="border-t border-white/[0.06] pt-5">
          <div className="mb-3 text-sm font-medium">Hiring Contact</div>
          <div className="grid gap-4 sm:grid-cols-2"><input className="input-field" placeholder="Contact name" value={form.hiring_contact_name} onChange={handleChange('hiring_contact_name')} /><input className="input-field" placeholder="Contact email" value={form.hiring_contact_email} onChange={handleChange('hiring_contact_email')} /></div>
          <input className="input-field mt-4" placeholder="Contact phone" value={form.hiring_contact_phone} onChange={handleChange('hiring_contact_phone')} />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Saving…' : 'Save Company Profile'}</button>
      </form>
    </DashboardLayout>
  );
}
