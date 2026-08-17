import { jsPDF } from 'jspdf';
import { supabase } from './supabase';

export async function getSignedResumeUrl(path, expiresIn = 600) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const { data, error } = await supabase.storage.from('resumes').createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data?.signedUrl || null;
}

function pdfBlob({ variant, name, profile, skills, education, employment }) {
  const doc = new jsPDF(); let y = 18;
  const add = (text,size=10,gap=6) => { if (!text) return; doc.setFontSize(size); const lines=doc.splitTextToSize(String(text),170); doc.text(lines,20,y); y += gap*lines.length; if (y>278){doc.addPage();y=18;} };
  add(name||'Candidate',18,10); add(profile?.headline,12,8); add([profile?.location,profile?.preferred_location].filter(Boolean).join(' · '),9,5);
  if (profile?.bio){add('SUMMARY',12,7);add(profile.bio);}
  if (skills.length){add('SKILLS',12,7);add(skills.map(s=>s.name).join(', '));}
  if (employment.length){add('EXPERIENCE',12,7);employment.forEach(e=>add(`${e.designation||'Role'} — ${e.company}\n${e.joining_date||'?'} to ${e.is_current?'Present':e.exit_date||'?'}\n${e.responsibilities||''}`,10,5));}
  if (education.length){add('EDUCATION',12,7);education.forEach(e=>add(`${e.degree||e.qualification||'Qualification'} — ${e.college||e.university||''} (${e.passing_year||'—'})`,10,5));}
  if (variant==='ats'){add('PROFILE DATA',12,7);add(`Expected salary: ${profile?.expected_salary_min||'—'} - ${profile?.expected_salary_max||'—'}\nNotice: ${profile?.notice_period||'—'}\nWork mode: ${profile?.work_mode_preference||'—'}\nAvailability: ${profile?.availability||'—'}`);}
  return doc.output('blob');
}

export async function regenerateCandidateResumes(userId) {
  const [{data:profile},{data:userRow},{data:skillRows},{data:education},{data:employment}] = await Promise.all([
    supabase.from('profiles').select('*').eq('id',userId).maybeSingle(),
    supabase.from('users').select('full_name,email,phone').eq('id',userId).maybeSingle(),
    supabase.from('candidate_skills').select('skills(id,name)').eq('candidate_id',userId),
    supabase.from('education_records').select('*').eq('candidate_id',userId).order('passing_year',{ascending:false}),
    supabase.from('employment_records').select('*').eq('candidate_id',userId).order('joining_date',{ascending:false}),
  ]);
  if(!profile) return null;
  const skills=(skillRows||[]).map(r=>r.skills).filter(Boolean); const urls={}; const stamp=Date.now();
  for(const variant of ['ats','professional']){
    const blob=pdfBlob({variant,name:userRow?.full_name,profile:{...profile,...userRow},skills,education:education||[],employment:employment||[]});
    const path=`${userId}/generated/${variant}-${stamp}.pdf`;
    const {error}=await supabase.storage.from('resumes').upload(path,blob,{upsert:true,contentType:'application/pdf'}); if(error) throw error;
    urls[variant==='ats'?'resume_ats_url':'resume_professional_url']=path;
  }
  const {error}=await supabase.from('profiles').update({...urls,resume_generated_at:new Date().toISOString()}).eq('id',userId); if(error) throw error;
  return urls;
}
