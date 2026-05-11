-- EclipseChase.is — Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Weather stations in western Iceland
CREATE TABLE weather_stations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  region TEXT,
  source TEXT DEFAULT 'vedur.is'
);

-- Weather forecasts per station (ingested from vedur.is).
--   forecast_time = vedur's `atime` (when they issued the batch).
--   fetched_at    = when our cron last upserted (used for staleness).
CREATE TABLE weather_forecasts (
  id BIGSERIAL PRIMARY KEY,
  station_id TEXT REFERENCES weather_stations(id),
  forecast_time TIMESTAMPTZ NOT NULL,
  valid_time TIMESTAMPTZ NOT NULL,
  cloud_cover INTEGER,
  precipitation_prob DOUBLE PRECISION,
  source_model TEXT DEFAULT 'vedur',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(station_id, forecast_time, valid_time)
);
CREATE INDEX weather_forecasts_fetched_at_idx ON weather_forecasts (fetched_at DESC);

-- Pre-computed eclipse geometry for ~500 points across western Iceland
CREATE TABLE eclipse_grid (
  id SERIAL PRIMARY KEY,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  totality_start TIMESTAMPTZ,
  totality_end TIMESTAMPTZ,
  duration_seconds DOUBLE PRECISION,
  sun_altitude DOUBLE PRECISION,
  sun_azimuth DOUBLE PRECISION
);

-- Curated viewing spots with human-written descriptions
CREATE TABLE viewing_spots (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  region TEXT NOT NULL,
  description TEXT,
  parking_info TEXT,
  terrain_notes TEXT,
  has_services BOOLEAN DEFAULT FALSE,
  cell_coverage TEXT,
  totality_duration_seconds DOUBLE PRECISION,
  totality_start TIMESTAMPTZ,
  sun_altitude DOUBLE PRECISION,
  sun_azimuth DOUBLE PRECISION,
  photo_url TEXT
);

-- Email signups from landing page
CREATE TABLE email_signups (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'landing_page',
  locale TEXT DEFAULT 'en'
);

-- Pro tier purchases
--   activation_token — NULL until the Stripe webhook signs a JWT. The
--                      idempotent webhook flow short-circuits on retry
--                      if this column is already non-NULL.
--   activation_count — counter beats a timestamp. The atomic activate
--                      flow uses `UPDATE … WHERE activation_count < 1`
--                      so exactly one request can hand out the token.
--   token_version — bumped on every restore. Server-side verify rejects
--                   JWTs whose `tv` claim is below this, so a leaked
--                   historical token stops working once the legitimate
--                   owner re-restores. Updates are conditional on the
--                   observed version (optimistic concurrency) so two
--                   parallel restores can't both mint at the same tv.
CREATE TABLE pro_purchases (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  email_hash TEXT NOT NULL,
  stripe_session_id TEXT UNIQUE NOT NULL,
  activation_token TEXT,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  activated BOOLEAN DEFAULT FALSE,
  activated_at TIMESTAMPTZ,
  activation_count INTEGER NOT NULL DEFAULT 0,
  token_version INTEGER NOT NULL DEFAULT 1,
  restored_count INTEGER DEFAULT 0,
  last_restored_at TIMESTAMPTZ
);

CREATE INDEX idx_pro_purchases_email ON pro_purchases(email);
CREATE INDEX idx_pro_purchases_email_hash ON pro_purchases(email_hash);
CREATE INDEX idx_pro_purchases_stripe_session ON pro_purchases(stripe_session_id);

-- Restore codes (short-lived)
--   attempts — per-code wrong-guess counter. Hits MAX_ATTEMPTS_PER_CODE
--              and the code is burned. Stops a brute-force campaign from
--              sitting on one code for unlimited guesses.
CREATE TABLE restore_codes (
  id BIGSERIAL PRIMARY KEY,
  email_hash TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  attempts INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_restore_codes_lookup ON restore_codes(email_hash, code);
CREATE INDEX idx_restore_codes_email_created ON restore_codes(email_hash, created_at DESC);

-- Pre-checkout Pro-lookup attempts. DB-backed rate limiter for
-- /api/pro/lookup so concurrent lambdas share one counter (the prior
-- in-memory limiter was per-lambda and trivially defeated by Vercel's
-- autoscaling, enabling enumeration of which emails have Pro).
CREATE TABLE pro_lookup_attempts (
  id BIGSERIAL PRIMARY KEY,
  email_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pro_lookup_attempts_email_created
  ON pro_lookup_attempts (email_hash, created_at DESC);

ALTER TABLE pro_lookup_attempts ENABLE ROW LEVEL SECURITY;

-- Enable Row Level Security on public-facing tables
ALTER TABLE email_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE pro_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE restore_codes ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts to email_signups (for the signup form)
CREATE POLICY "Allow anonymous insert" ON email_signups
  FOR INSERT WITH CHECK (true);

-- No public read access to email_signups
CREATE POLICY "No public read" ON email_signups
  FOR SELECT USING (false);
