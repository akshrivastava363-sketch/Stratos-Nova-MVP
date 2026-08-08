-- =====================================================================
-- REPAIR — STEP 1 of 2
-- Run this ALONE. Do not paste Step 2 into the same query box.
-- Click Run, wait for "Success", THEN open a new query tab for Step 2.
--
-- Why the split matters: Postgres will not let you USE a brand-new enum
-- value in the same transaction that adds it — you saw this exact error
-- ("unsafe use of new value... must be committed before they can be
-- used"). Every "Run" click in the SQL Editor is its own transaction,
-- so running this alone guarantees the new values are committed before
-- Step 2 touches them.
--
-- Everything below is idempotent — safe to run even if some of these
-- types/values already exist on your database.
-- =====================================================================

-- New enum TYPES (only created if they don't already exist — CREATE TYPE
-- has no native IF NOT EXISTS in Postgres, so this uses a guard block)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'candidate_status') THEN
    CREATE TYPE candidate_status AS ENUM ('open_to_work','serving_notice','interviewing','immediate_joiner','not_looking','inactive');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
    CREATE TYPE verification_status AS ENUM ('unverified','pending','verified','failed');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_tier') THEN
    CREATE TYPE plan_tier AS ENUM ('free','starter','growth','scale','enterprise');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assessment_run_status') THEN
    CREATE TYPE assessment_run_status AS ENUM ('not_started','in_progress','completed','flagged');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recruiter_assignment_status') THEN
    CREATE TYPE recruiter_assignment_status AS ENUM ('active','completed','withdrawn');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'outreach_status') THEN
    CREATE TYPE outreach_status AS ENUM ('new','profile_update_required','profile_updated','verification_pending','verified','communication_pending','contacted','responded');
  END IF;
END $$;

-- New VALUES on existing enums — this is the part that was failing.
-- These already use IF NOT EXISTS, which is correct syntax; the failure
-- was purely about being combined with usage in the same script.
alter type user_role add value if not exists 'recruiter';
alter type application_status add value if not exists 'on_hold';
