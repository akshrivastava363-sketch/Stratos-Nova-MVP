# Profile-update email setup

The app already creates the candidate's in-app notification. The added Edge Function sends the same request by email through Resend.

1. In Supabase Dashboard → Edge Functions → create/deploy `send-profile-update-email` using `supabase/functions/send-profile-update-email/index.ts`.
2. In Edge Functions → Secrets, keep `RESEND_API_KEY` and add:
   - `RESEND_FROM_EMAIL` = a sender verified in your Resend account, for example `Stratos Nova <stratoshrsolutions@gmail.com>` if that address is verified there.
   - `APP_BASE_URL` = `https://mvp.stratosnovahr.com`
3. Deploy the function.
4. No frontend environment variable or EmailJS setup is required.

When an admin/recruiter clicks **Request Update**, the candidate receives:
- the existing in-app notification;
- the dashboard **Profile update required** banner;
- the email with a direct link to the candidate profile.

If the email provider fails, the in-app notification still works and the dashboard banner remains the fallback.
