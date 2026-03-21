-- Migration: Replace pro_users with pro_purchases + restore_codes
-- Part of: Purchase-based Pro unlock (JWT, no Supabase Auth)

-- Drop old table
DROP TABLE IF EXISTS pro_users;

-- Purchase records
CREATE TABLE pro_purchases (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  email_hash TEXT NOT NULL,
  stripe_session_id TEXT UNIQUE NOT NULL,
  activation_token TEXT NOT NULL,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  activated BOOLEAN DEFAULT FALSE,
  restored_count INTEGER DEFAULT 0,
  last_restored_at TIMESTAMPTZ
);

CREATE INDEX idx_pro_purchases_email ON pro_purchases(email);
CREATE INDEX idx_pro_purchases_email_hash ON pro_purchases(email_hash);
CREATE INDEX idx_pro_purchases_stripe_session ON pro_purchases(stripe_session_id);

-- Restore codes (short-lived)
CREATE TABLE restore_codes (
  id BIGSERIAL PRIMARY KEY,
  email_hash TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_restore_codes_lookup ON restore_codes(email_hash, code);

-- RLS policies
ALTER TABLE pro_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE restore_codes ENABLE ROW LEVEL SECURITY;
-- No public read access — server-only via service role key
