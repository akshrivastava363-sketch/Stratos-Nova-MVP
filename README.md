# Stratos Nova — Platform 2.0

Talent marketplace + ATS + AI-assisted matching for startup hiring. React + Vite + Tailwind + Supabase.

## Choosing your schema file

- **Fresh Supabase project, never deployed Stratos Nova before** → run `supabase/schema.sql` (the complete schema, one file, everything included).
- **Already have the base MVP deployed** → run `supabase/migration_2.0.sql` instead. It only *adds* — no data loss, no dropped tables.

Do not run both on the same project.

## What's built

### Four portals, role-based
- **Candidate** — registration (email/password + Google), profile with work mode/notice period/languages, structured education & employment records with document upload and client-side gap/duplicate detection, skills by category (primary/secondary/tool/technology/domain), role-based assessments with a visibility-change proctoring flag (AI monitors, never decides pass/fail), auto-generated ATS and professional resume PDFs, job search & apply, saved jobs, application tracking with withdraw, candidate status (Open to Work / Serving Notice / Interviewing / Immediate Joiner / Not Looking) with an auto-inactivity function, messaging, notifications.
- **Employer** — company profile (admin-approval gated), subscription-aware job posting (limits enforced from live plan data, not hardcoded), full ATS pipeline including the new **On Hold** stage, structured interview scorecards, Recruiter Assist activation, talent repository search with the full 2.0 filter set (status, work mode, notice period, startup/enterprise experience, etc.), hiring funnel analytics, subscription plan picker.
- **Recruiter** *(new role)* — dashboard of assigned jobs, same ATS pipeline access as the employer on assigned jobs only (enforced via RLS, not just UI hiding), candidate search, messaging, notifications.
- **Admin** — platform dashboard, employer approval queue, user management with role changer (this is how you create recruiter/admin accounts — see below), job oversight, assessment template builder, subscription plan editor (limits are data you edit here, never hardcoded in app code), CMS (testimonials/FAQs/blog/contact/newsletter), platform analytics, and a new **Repository Health** dashboard (profile freshness, status distribution, verification coverage).

### How to create a recruiter or admin account
There's deliberately no public signup for these roles. Register normally as a candidate or employer, then in **Admin → Users**, change that account's role from the dropdown. This matches the spec's intent that recruiter/admin accounts are provisioned internally.

## What's real vs what's scaffolded (read this before assuming everything works end-to-end)

**Fully functional:**
- Everything listed above — every workflow described actually runs against the database, with RLS enforcing the access boundaries (not just hidden buttons).

**Deliberately scaffolded, not faked:**
- **AI candidate matching / ranking** — the search and filter system is real and fully functional; a true relevance-ranking algorithm (weighted scoring across skill match, assessment score, freshness, etc.) is a follow-up increment, not something I'd fake with a coin-flip "AI score."
- **Institution/employment verification** — the `verification_sources` table and `verification_status` fields exist and flow through the UI correctly, but no real verification provider is wired in. It's intentionally inert until you connect one — the spec explicitly said "do not hardcode AI verification."
- **Assessment scoring** — the assessment *flow* (timer, tab-switch proctoring flag, template management) is real; actual question banks and answer grading aren't built. The current version records a placeholder score on submission — this needs a real question engine before it's production-grade.
- **Candidate status auto-inactivity** — the SQL function exists and works if called, but isn't scheduled. Enable Supabase's `pg_cron` extension and run the one-line schedule command in the migration file's comments to make it automatic.
- **Mobile OTP registration** — not built. It requires a paid SMS provider (Twilio/MSG91) with API keys, which is an infrastructure decision, not a code gap.
- **Duplicate employment detection** — implemented as same-company + same-joining-date matching (client-side, on save). This is a reasonable heuristic, not a guarantee — flag it to users as "looks like a duplicate," which is what the UI does.

## 1. Set up Supabase

1. Create a project at supabase.com
2. SQL Editor → run `supabase/schema.sql` (fresh) or `supabase/migration_2.0.sql` (upgrading)
3. Optionally run `supabase/seed.sql` for demo testimonials/FAQs/assessment templates
4. Enable Google provider under Authentication → Providers if you want Google sign-in
5. Copy your Project URL and anon key from Project Settings → API

## 2. Configure and run

```bash
cp .env.example .env
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

## 3. Deploy

Push to GitHub, connect to Netlify or Cloudflare Pages:
- Build command: `npm run build`
- Publish/output directory: `dist`
- Add the same two env vars in your host's environment variable settings

`public/_redirects` is included for SPA routing on both Netlify and Cloudflare Pages.

## 4. First-time setup flow

1. Register an employer account → set up company profile (starts `pending`)
2. Register a second account, then in Supabase Table Editor set its `role` to `admin` directly (one-time bootstrap — after that, use the Admin → Users role dropdown for everyone else)
3. As admin: approve the employer, optionally promote a third test account to `recruiter`
4. As employer: pick a subscription plan, post a job
5. Register a candidate account → fill profile, add education/employment records, take an assessment, apply to the job
6. As employer: move the application through the ATS pipeline, try Recruiter Assist, add an interview scorecard
7. As admin: check Repository Health and Analytics to see the data flowing through
