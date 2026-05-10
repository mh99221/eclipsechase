-- Migration: Pro auth hardening (security findings 1, 2, 4)
--
-- 1. One-time activation: track activation timestamp so /api/stripe/activate
--    refuses replays after a short network-retry window.
-- 2. Token versioning: include a `tv` claim in JWTs; server-side verify
--    rejects tokens whose version is below the row's current version.
--    Incremented on every restore so a stolen historical JWT stops working
--    once the legitimate owner re-restores.
-- 4. OTP hardening: per-code attempt counter so a 6-digit guess campaign
--    can't sit in a single code for unlimited guesses.

ALTER TABLE pro_purchases
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE restore_codes
  ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;

-- Lets request.post.ts count recent codes per email cheaply (DB-backed
-- rate limit, replacing the per-lambda in-memory counter).
CREATE INDEX IF NOT EXISTS idx_restore_codes_email_created
  ON restore_codes (email_hash, created_at DESC);
