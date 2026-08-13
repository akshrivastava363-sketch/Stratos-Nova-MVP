const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    const accessToken = authHeader?.replace(/^Bearer\s+/i, '');
    if (!accessToken) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase function environment is not configured');
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}` } });
    if (!authResponse.ok) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const caller = await authResponse.json();
    const roleResponse = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${caller.id}&select=role`, { headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}` } });
    const roleRows = roleResponse.ok ? await roleResponse.json() : [];
    if (!['admin', 'recruiter'].includes(roleRows?.[0]?.role)) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { email, name } = await req.json();
    if (!email) return new Response(JSON.stringify({ error: 'Recipient email is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const apiKey = Deno.env.get('RESEND_API_KEY');
    const from = Deno.env.get('RESEND_FROM_EMAIL') || 'Stratos Nova <onboarding@resend.dev>';
    const appUrl = Deno.env.get('APP_BASE_URL') || 'https://mvp.stratosnovahr.com';
    if (!apiKey) throw new Error('RESEND_API_KEY is not configured');

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:24px;color:#172033">
        <h2>Profile update requested</h2>
        <p>Hi ${String(name || 'Candidate').replace(/[<>]/g, '')},</p>
        <p>Stratos Nova has requested you to review and update your candidate profile.</p>
        <p>Please check your profile details and complete any missing information so your profile remains ready for matching and opportunities.</p>
        <p><a href="${appUrl}/candidate/profile" style="display:inline-block;padding:12px 18px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px">Review my profile</a></p>
        <p style="font-size:12px;color:#667085">If the button does not work, sign in to your Stratos Nova candidate account and open Profile.</p>
      </div>`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [email], subject: 'Action needed: Please review your Stratos Nova profile', html }),
    });

    const result = await response.json();
    if (!response.ok) return new Response(JSON.stringify({ error: result?.message || 'Email provider rejected the request' }), { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify({ ok: true, id: result?.id || null }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message || 'Unable to send email' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
