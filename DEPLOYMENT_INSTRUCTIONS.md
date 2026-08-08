# Stratos Nova — Deployment Instructions

This covers going from "I have the files" to "it's live and working," including the bug fixes from the last two reviews.

---

## Which situation are you in?

**A. You've never run any Stratos Nova schema in Supabase before**
→ Go to **Section 1 (Fresh Install)**

**B. You already have the platform running and just want the bug fixes**
→ Go to **Section 2 (Existing Deployment — Just the Fixes)**

---

## Section 1: Fresh Install

### 1.1 — Set up Supabase
1. Create a project at supabase.com
2. In your project, go to **SQL Editor → New query**
3. Open `supabase/schema.sql` from the zip, copy the entire contents, paste into the query editor, click **Run**
4. (Optional) Repeat with `supabase/seed.sql` to get demo testimonials, FAQs, and assessment templates so the app isn't empty on first load
5. Go to **Authentication → Providers** → enable **Google** if you want Google sign-in
6. Go to **Project Settings → API** → copy your **Project URL** and **anon public** key

### 1.2 — Configure the app
```bash
cd stratos-nova
cp .env.example .env
```
Open `.env` and fill in:
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
- Publish/output directory: `dist`
- Add the same two env vars in your host's environment variable settings

Skip to **Section 3** for first-time account setup.

---

## Section 2: Existing Deployment — Just the Fixes

If you already have Stratos Nova live and just need this round's bug fixes applied.

### 2.1 — Run the SQL patch
1. Supabase → **SQL Editor → New query**
2. Open `bugfix_patch.sql`, copy the entire contents, paste, click **Run**
3. You should see "Success. No rows returned."

This fixes three database-level issues:
- Employers/recruiters couldn't read candidate or recruiter names (blocked the applicant list and Recruiter Assist picker)
- Notifications had no permission to be created (status-change alerts were silently failing)
- `skills`, `candidate_skills`, `job_skills` tables had no access control at all

**Note:** if you already ran a version of `migration_2.0.sql` from an earlier message in this conversation, running this patch on top is safe — it only adds new policies, nothing is dropped or duplicated destructively. If you get a "policy already exists" error on any single line, that just means that specific piece was already applied — skip that line and continue with the rest.

### 2.2 — Replace your local code
1. Extract the new zip
2. Copy the `src` folder from the zip, paste it into your local project folder, **overwrite when prompted**

This brings in three code-level fixes that can't live in SQL:
- The applicant/ATS view had a broken database query that would have thrown an error instead of showing candidates
- The homepage lost its Contact form and Newsletter signup in an earlier rebuild — restored
- Job details page wasn't showing required skills — restored

### 2.3 — Push the code
1. Open **GitHub Desktop**
2. You should see the changed files listed (mainly under `src/`)
3. Write a commit message, e.g. "Fix ATS view, RLS gaps, restore contact form"
4. **Commit to main** → **Push origin**

### 2.4 — Wait for your host to rebuild
- **Cloudflare Pages**: Workers & Pages → your project → Deployments tab — a new build should start automatically within a minute
- **Netlify**: Deploys tab — same behavior

Wait for it to show **Success** before testing.

---

## Section 2.5: This Round's Addition — Candidate Updates + Outreach

New this round, additive only (nothing removed): a "confirm my info is current" action on the candidate profile page, and a Candidate Updates page for admin/recruiter to track outreach.

1. Supabase → **SQL Editor → New query**
2. Open `supabase/migration_candidate_outreach.sql`, paste, **Run**
3. Copy the updated `src` folder from the zip over your local project, push via GitHub Desktop as usual

What to test:
- As candidate: Profile page → click "This is still current" → confirms and timestamps
- As admin or recruiter: new "Candidate Updates" sidebar link → see all candidates, filter by status or staleness, click a status button (e.g. "Request Update") → candidate's status changes
- Message a candidate from that page (reuses your existing Messages system) → have that candidate reply → refresh the Candidate Updates page → a "Replied" badge should appear



Whether fresh or upgraded, test in this order — later steps depend on earlier ones:

1. **Register an employer** (`/register?role=employer`) → go to Company Profile → fill it in and save (starts as "pending")
2. **Create your first admin account**: register any account normally, then in Supabase → **Table Editor → users** table, find that row and manually change `role` to `admin`. (This is the only manual step — after this, use the Admin → Users page's role dropdown to promote anyone else, including recruiters.)
3. **As admin**: log in, go to Admin → Employers, approve the company from step 1
4. **As employer**: go to Subscription, pick a plan; go to Post a Job, publish one
5. **Register a candidate** (`/register`, default role) → fill out Profile, add an Education record and an Employment record, take an assessment, then browse Jobs and apply
6. **As employer**: open the job's applicant list — confirm you can see the candidate's name (this is the bug that was fixed) → move them through pipeline stages → try activating Recruiter Assist
7. **As candidate**: check Notifications — confirm the status-change alert actually shows up (this is the other fixed bug)
8. **On the public homepage**: try the Contact form and Newsletter signup at the bottom — confirm both submit successfully, then check Admin → Content (CMS) → Contact Queries / Newsletter tabs to see them land there

If any step in this flow doesn't work as described, that's a real signal something's still off — let me know exactly which step and what you saw.
