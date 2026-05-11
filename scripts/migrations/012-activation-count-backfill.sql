-- Migration: backfill activation_count for pre-011 purchases.
--
-- Round 4 finding: migration 011 added `activation_count INT DEFAULT 0`
-- but didn't backfill rows that were already activated under the old
-- time-grace flow (where activation state lived in `activated`/
-- `activated_at`). The new /api/stripe/activate handler only checks
-- `activation_count`, so any pre-011 purchase whose session_id leaked
-- could be re-activated once — handing the leaker the original JWT.
--
-- Apply BEFORE deploying the round-4 code. If 011 hasn't run yet this
-- is a no-op (the column doesn't exist yet); run 011 first.

UPDATE pro_purchases
   SET activation_count = 1
 WHERE activated = TRUE
   AND activation_count = 0;
