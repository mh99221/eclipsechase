-- Sunset data minimisation — run once, manually, in the Supabase SQL editor.
-- See docs/superpowers/specs/2026-08-13-eclipsechase-sunset-and-b2b-pivot-design.md §3.8
--
-- Run each statement individually and check the row counts. This is
-- irreversible — take a manual backup from the Supabase dashboard first.
--
-- IMPORTANT: run this BEFORE the Task 9 step that pauses the Supabase
-- project. A paused project cannot be written to.

-- ============================================================================
-- 1. Restore codes — unconditional delete
-- ============================================================================
-- Short-lived OTPs (15-min TTL per scripts/schema.sql), all long expired.
-- Purchase restore is retired along with the rest of Pro, so there is no
-- remaining lawful basis to hold any of these rows regardless of expiry.

DELETE FROM restore_codes;

-- Verify: should be 0.
SELECT count(*) FROM restore_codes;


-- ============================================================================
-- 2. Pro purchases — a genuine tension, read before running
-- ============================================================================
-- app/pages/privacy.vue §1.6 promises: "Pro purchase records: retained for
-- 10 years (Slovak accounting law requirement)." That is a retention FLOOR
-- for the purchase record — it is not, by itself, a promise to keep the
-- plaintext email address for 10 years. Whether Slovak accounting law
-- requires the buyer's email specifically on our internal record (as
-- opposed to on Stripe's own invoice, which is the authoritative
-- accounting document per spec §3.8) is a legal question this script
-- cannot resolve. If Elite Consulting's invoicing depends on this table
-- holding a real address, do NOT run the UPDATE below — skip to §3.
--
-- The redaction keeps: id, email_hash (still supports "did I buy this?"
-- support lookups), stripe_session_id, purchased_at, is_active, and every
-- other column. Only the plaintext `email` column is minimised. The
-- `idx_pro_purchases_email` index becomes useless after this (every row
-- collapses to the same value) but is left in place — dropping it is a
-- separate, non-urgent cleanup.

UPDATE pro_purchases
SET email = 'redacted@sunset.local'
WHERE email <> 'redacted@sunset.local';

-- Verify: total should equal redacted, and every row should still have a hash.
SELECT count(*) AS total,
       count(*) FILTER (WHERE email = 'redacted@sunset.local') AS redacted,
       count(*) FILTER (WHERE email_hash IS NOT NULL) AS hashed
FROM pro_purchases;


-- ============================================================================
-- 3. Email signups — decide, then uncomment ONE option
-- ============================================================================
-- privacy.vue §1.6 promises retention "until user unsubscribes or requests
-- deletion" — that is a ceiling on how long we may hold the data on request,
-- not a floor requiring us to keep it. Under GDPR Art. 5(1)(e) (storage
-- limitation), data must not be kept longer than necessary for the purpose
-- it was collected for.
--
-- The design spec (D4) decided no farewell email will be sent, which means
-- this list now has NO remaining active purpose — email_signups exists
-- solely to enable future contact, and there will be none. On a strict
-- reading of storage limitation, that makes deletion the correct default,
-- not merely an option.
--
-- Retaining it is defensible ONLY if privacy.vue is amended first to
-- disclose a new purpose (e.g. "may be used to announce future eclipse
-- projects") — it currently discloses no such purpose, so retaining the
-- list as-is without that amendment is the weaker position of the two.

-- Option A (recommended — matches current privacy.vue and D4 exactly):
-- DELETE FROM email_signups;

-- Option B — retain for a possible 2027 announcement. Do NOT run this
-- without first updating privacy.vue §1.6 to disclose the new purpose;
-- otherwise the retention is undisclosed processing.
-- (no statement — this path requires a privacy.vue change first, out of
-- scope for this script)

-- Verify after choosing Option A:
-- SELECT count(*) FROM email_signups;
