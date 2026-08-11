-- =====================================================================
-- JOBS TABLE — add department and openings columns
--
-- WHY THIS IS NEEDED:
-- The employer job creation form has always sent `department` and
-- `openings` fields. These columns exist in the fresh-install schema.sql
-- (used by brand-new projects), but were never added via an ALTER TABLE
-- for projects — like this one — that started from the original v1
-- schema and were upgraded incrementally. Your live `jobs` table is
-- missing them, which is exactly why job creation fails with
-- "Could not find the 'department' column of 'jobs' in the schema cache."
--
-- WHAT IT CHANGES:
-- Adds two nullable columns to the existing `jobs` table. Nothing else.
--
-- DOES IT AFFECT EXISTING DATA:
-- No. Existing job rows are untouched; both new columns will simply be
-- empty (null / default) for any jobs created before this runs.
--
-- IS IT SAFE TO RUN ON PRODUCTION:
-- Yes. ADD COLUMN IF NOT EXISTS is non-destructive and instant on a
-- table this size — no table lock beyond a brief metadata change.
-- =====================================================================

alter table public.jobs add column if not exists department text;
alter table public.jobs add column if not exists openings integer default 1;
