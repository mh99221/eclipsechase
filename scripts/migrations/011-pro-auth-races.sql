-- Migration: Round 3 Pro auth hardening — race conditions + enumeration
--
-- Vuln 1 (token_version race in restore): no schema change. The fix is a
-- conditional UPDATE in verify.post.ts using optimistic-concurrency
-- (`WHERE token_version = $observed`). Documented here so the migration
-- audit trail matches the security work.
--
-- Vuln 2 (webhook re-mints token on Stripe retry): allow
-- `activation_token` to be NULL so the webhook can do
-- `INSERT … ON CONFLICT DO NOTHING` then `SELECT` to detect a retry
-- and skip the re-sign.
--
-- Vuln 4 (in-memory rate limit on /api/pro/lookup): add a DB-backed
-- table so concurrent lambdas share a single rate-limit counter.
--
-- Vuln 6 (timestamp-based activation grace can be defeated by clock
-- skew): replace the grace check with an `activation_count` counter
-- that goes through a conditional UPDATE — strictly atomic.

ALTER TABLE pro_purchases ALTER COLUMN activation_token DROP NOT NULL;

ALTER TABLE pro_purchases
  ADD COLUMN IF NOT EXISTS activation_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS pro_lookup_attempts (
  id BIGSERIAL PRIMARY KEY,
  email_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pro_lookup_attempts_email_created
  ON pro_lookup_attempts (email_hash, created_at DESC);

ALTER TABLE pro_lookup_attempts ENABLE ROW LEVEL SECURITY;
