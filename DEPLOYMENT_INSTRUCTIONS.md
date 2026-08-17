# Stratos Nova — Deployment Instructions

This covers going from "I have the files" to "it's live and working," including every fix from the reviews so far.

---

## Which situation are you in?

**A. You've never run any Stratos Nova schema in Supabase before**
→ Go to **Section 1 (Fresh Install)**

**B. You already have the platform running and just want the latest fixes applied**
→ Go to **Section 2 (Existing Deployment)**

**C. You've hit SQL errors like "type already exists," "does not exist," or "unsafe use of new value... must be committed"**
→ Go to **Section 0 (Database Repair)** first, then come back to Section 2

---

## Section 0: Database Repair

If you've pasted migration files across multiple SQL Editor tabs, your database is likely in a partially-applied state — some tables/columns exist, some don't, and a couple of error messages (like the enum "commit" one) are the classic sign of that. This section fixes that regardless of exactly what ran before. It's idempotent — safe to run even if some pieces already succeeded, and safe to re-run in the future if you're ever unsure what state things are in.

**This must be done as two separate steps — not optional, it's the actual fix:**

1. Supabase → SQL Editor → **New query**
2. Paste the entire contents of `repair_step1_enums.sql` → click **Run** → confirm it shows **Success**
3. Open **another** new query tab (don't reuse the same one)
4. Paste the entire contents of `repair_step2_everything.sql` → click **Run** → confirm **Success**

**Why the split matters:** Postgres won't let you use a brand-new enum value (like the `recruiter` role) in the same transaction that adds it. Each "Run" click in the SQL Editor is its own transaction, so running these separately — and waiting for the first to actually succeed — is what makes this reliable. Combining them into one paste is exactly what caused the errors you saw.

Once both show Success, continue to **Section 2** below to make sure your code is current too.

---

## Section 1: Fresh Install

### 1.1 — Set up Supabase
1. Create a project at supabase.com
2. In your project, go to **SQL Editor → New query**
3. Open `supabase/schema.sql` from the zip, copy the entire contents, paste into the query editor, click **Run**
4. (Optional) Repeat with `supabase/seed.sql` for demo testimonials, FAQs, and assessment templates
5. Go to **Authentication → Providers** → enable **Google** if you want Google sign-in
6. Go to **Project Settings → API** → copy your **Project URL** and **anon public** key

### 1.2 — Configure the app
```bash
cd stratos-nova
cp .env.example .env
```
Fill in `.env`:
```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

### 1.3 — Run locally to test
```bash
npm install
npm run dev
```
Visit `http://localhost:5173`

### 1.4 — Deploy
Push to GitHub, then connect via Netlify or Cloudflare Pages:
- Build command: `npm run build`
- **Base directory: leave empty** (this trips people up — only the publish directory should be `dist`, not the base)
- Publish/output directory: `dist`
- Add the same two env vars in your host's environment variable settings

Skip to **Section 3** for first-time account setup.

---

## Section 2: Existing Deployment

If you already have Stratos Nova live and just need the latest fixes applied.

### 2.1 — Run the SQL patch
If you haven't already done **Section 0** above, do that first — it supersedes the standalone `bugfix_patch.sql` from earlier and covers everything in one pass.

If you're certain your database only needs the smaller, earlier round of fixes (candidate/recruiter names visible, notifications working, skills tables secured) and nothing from Section 0 applies to you, `bugfix_patch.sql` alone still works standalone.

### 2.2 — Replace your local code
1. Extract the new zip
2. Copy the `src` folder from the zip, paste it into your local project folder, **overwrite when prompted**

This brings in the code-level fixes that can't live in SQL:
- The applicant/ATS view had a broken database query that would have thrown an error instead of showing candidates
- The homepage lost its Contact form and Newsletter signup in an earlier rebuild — restored
- Job details page wasn't showing required skills — restored
- Candidate profile "confirm current" + the Candidate Updates outreach page (see Section 2.5)

### 2.3 — Push the code
1. Open **GitHub Desktop**
2. You should see the changed files listed (mainly under `src/`)
3. Commit message, e.g. "Fix ATS view, RLS gaps, add candidate outreach"
4. **Commit to main** → **Push origin**

### 2.4 — Wait for your host to rebuild
- **Netlify**: Deploys tab — a new build should start automatically within a minute of the push
- **Cloudflare Pages**: Workers & Pages → your project → Deployments tab — same behavior

Wait for it to show **Published** / **Success** before testing.

---

## Section 2.5: Candidate Updates + Outreach (this round's addition)

New this round, additive only (nothing removed): a "confirm my info is current" action on the candidate profile page, and a Candidate Updates page for admin/recruiter to track outreach.

If you ran **Section 0**, this is already included — no separate SQL needed. Otherwise:
1. Supabase → SQL Editor → New query
2. Open `supabase/migration_candidate_outreach.sql`, paste, **Run**

What to test:
- As candidate: Profile page → click "This is still current" → confirms and timestamps
- As admin or recruiter: new "Candidate Updates" sidebar link → see all candidates, filter by status or staleness, click a status button (e.g. "Request Update") → candidate's status changes
- Message a candidate from that page (reuses your existing Messages system) → have that candidate reply → refresh the Candidate Updates page → a "Replied" badge should appear

---

## Section 3: First-Time Testing Flow

Whether fresh or upgraded, test in this order — later steps depend on earlier ones:

1. **Register an employer** (`/register?role=employer`) → Company Profile → fill in and save (starts as "pending")
2. **Create your first admin account**: register any account normally, then in Supabase → **Table Editor → users**, find that row and manually change `role` to `admin`. This is the only manual step — after this, use Admin → Users' role dropdown to promote anyone else, including recruiters.
3. **As admin**: approve the employer from step 1 (Admin → Employers)
4. **As employer**: Subscription → pick a plan; Post a Job → publish one
5. **Register a candidate** (`/register`, default role) → fill out Profile, add an Education record and an Employment record, take an assessment, browse Jobs and apply
6. **As employer**: open the job's applicant list — confirm you can see the candidate's name → move them through pipeline stages → try activating Recruiter Assist
7. **As candidate**: check Notifications — confirm the status-change alert shows up
8. **On the public homepage**: try the Contact form and Newsletter signup — confirm both submit, then check Admin → Content (CMS) → Contact Queries / Newsletter tabs
9. **Candidate Updates flow**: as candidate, confirm your profile is current; as admin/recruiter, find that candidate in Candidate Updates, message them, change their status

If any step doesn't work as described, that's a real signal — tell me exactly which step and what you saw.

## Section 5: Consolidated MVP stability/audit patch
After the existing bugfix SQL/code has been applied, run:

`supabase/migration_mvp_stability_and_audit.sql`

This is additive and is designed to preserve existing data. It adds the Admin audit trail, database protections for candidate application/assessment actions, real assessment question/scoring infrastructure, subscription search usage tracking, candidate lifecycle maintenance, authorized private resume reads, and Admin role safety. The following requested items were intentionally not changed: certification entry, institution verification, offer management, candidate recommendations, and the company verification workflow.


## Final security patch included
The current package also includes:
- Candidate Search usage-variable fix.
- Employer company approval protection (employers cannot set/alter approval status or approved_at).
- Database-level blocking of employer job create/edit while company is not approved.
- Employer Job Form UI block for pending/rejected/suspended companies.
