# Stratos Nova HR Solutions — Complete Platform

Startup-focused hiring platform. Candidate, Employer, and Admin roles. React + Vite + Tailwind + Supabase.

## What's built

**Public**
- Homepage: hero, stats, why-us, process, live jobs feed, testimonials, pricing, FAQ, contact form, newsletter
- Job search with keyword + location + type + work-mode filters, pagination
- Job details page with apply flow, save/bookmark
- For Employers landing page
- Blog list + blog detail (published posts)

**Candidate**
- Registration (email/password + Google OAuth scaffold), role-based signup
- Dashboard: profile completion %, application stats, recent applications
- Full profile editor: headline, bio, education, experience, skills, resume upload, salary expectations, availability, social links
- Download profile as PDF
- Job applications list with status tracking + withdraw
- Saved jobs
- Messaging with employers
- Notifications

**Employer**
- Company profile setup (logo upload, GST, size, industry, hiring contact) — gated by admin approval
- Post / edit / pause / close jobs, with skill tagging
- Applicant pipeline per job: 8-stage workflow (applied → under review → shortlisted → interview scheduled → interview completed → selected → offer released → joined) + reject/withdraw states
- One-click interview scheduling from an applicant card
- Candidate search with location/availability/keyword filters
- Hiring analytics: funnel chart, top requested skills
- Messaging with candidates

**Admin**
- Platform dashboard: total users, candidates, employers, jobs, applications
- Employer approval queue (approve/reject/suspend)
- User management (search, filter by role, suspend/reactivate)
- Job oversight (force-close)
- CMS: testimonials, FAQs, blog posts (draft/publish), contact query inbox, newsletter subscriber list
- Platform-wide analytics: monthly signup growth, most-applied jobs, top skills in demand

**Database & Security**
- 16-table Postgres schema with foreign keys (`supabase/schema.sql`)
- Row Level Security on every table — candidates/employers/admins each scoped to their own data
- Auto-provisioning trigger creates `users` + `profiles` rows on signup
- Storage buckets: `resumes` (private, owner + employer-of-application only), `avatars` (public), `company-logos` (public), each with RLS policies

## Not included (needs backend/infra work beyond a frontend build)

- CAPTCHA and rate limiting — these live at the edge/infra layer (e.g. Cloudflare Turnstile + Supabase Edge Function rate limits), not in React code
- Transactional email templates (interview reminders, job expiry emails) — needs a Supabase Edge Function + email provider (Resend/SendGrid) wired to a cron trigger
- Full audit log *viewer* UI (the `activity_logs` table and RLS exist; nothing writes to it yet — you'd add logging calls at each mutation point)
- AI resume screening / candidate matching / video interviews / payroll / HRMS — the "Future Ready" modules, intentionally out of MVP scope per the original spec

## 1. Set up Supabase

1. Create a project at supabase.com
2. **SQL Editor** → run `supabase/schema.sql` (tables, RLS, triggers, storage buckets)
3. (Optional) run `supabase/seed.sql` for demo testimonials/FAQs
4. **Authentication → Providers** → enable Google if you want Google Sign-In
5. **Project Settings → API** → copy your Project URL and anon public key

## 2. Configure the app

```bash
cp .env.example .env
```
Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## 3. Run locally

```bash
npm install
npm run dev
```

## 4. Deploy to Netlify

1. Push to GitHub
2. Netlify → Add new site → Import from Git
3. Build command: `npm run build` · Publish directory: `dist`
4. Add the two env vars under Site settings → Environment variables
5. Deploy — the included `public/_redirects` handles SPA routing so refreshes on `/jobs/:id` etc. don't 404

## Testing the flows

1. Register as an **employer** → set up company profile → note it starts as `pending`
2. Register a second account as **admin** — do this by manually setting `role = 'admin'` on that user's row in the `users` table via Supabase Table Editor (there's intentionally no public admin signup)
3. As admin, approve the employer
4. As employer, post a job
5. Register a **candidate** account, browse jobs, apply
6. As employer, move the application through the pipeline stages and schedule an interview
7. As candidate, check notifications and application status updates in real time
