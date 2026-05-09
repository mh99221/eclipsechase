-- Migration 008 — translation table for curated viewing spots.
--
-- The English seed in scripts/seed-viewing-spots-v2.sql lives directly
-- on viewing_spots. This migration introduces a sidecar table for
-- non-default locales: each row is keyed by (spot_id, locale) and
-- carries any text fields the operator has translated. The server-side
-- spots API overlays a translation row onto the base row when one
-- exists, so missing translations gracefully fall back to English.
--
-- Translatable fields (NULL = fall back to viewing_spots.<field>):
--   name             — short label (e.g. "Akranesviti")
--   description      — long-form paragraph rendered on the About card
--   parking_info     — single-sentence parking blurb
--   terrain_notes    — single-sentence terrain blurb
--   warnings         — full JSONB array (replaces base when present)
--
-- The actual seed for Icelandic lives in
-- scripts/seed-spot-translations-is.sql. Run THIS migration first,
-- then the seed.

CREATE TABLE IF NOT EXISTS viewing_spot_translations (
  spot_id        TEXT NOT NULL REFERENCES viewing_spots(id) ON DELETE CASCADE,
  locale         TEXT NOT NULL,
  name           TEXT,
  description    TEXT,
  parking_info   TEXT,
  terrain_notes  TEXT,
  warnings       JSONB,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (spot_id, locale)
);

-- The spots API filters by (spot_id, locale); a btree index on locale
-- alone helps when we later list all translated spots for a locale
-- (e.g. for /api/spots in IS).
CREATE INDEX IF NOT EXISTS viewing_spot_translations_locale_idx
  ON viewing_spot_translations(locale);

-- Same RLS posture as viewing_spots: anonymous reads allowed (the data
-- is public eclipse content), only the service-role key can write.
ALTER TABLE viewing_spot_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "viewing_spot_translations_public_read" ON viewing_spot_translations;
CREATE POLICY "viewing_spot_translations_public_read"
  ON viewing_spot_translations
  FOR SELECT
  USING (true);
