-- Migration 009 — seed advisories for Hvalsneskirkja
--
-- Hvalsneskirkja was added in PR #31 (2026-05-03) without any warnings
-- entries, which left the Overview tab without an advisories badge while
-- every other curated Reykjanes spot carries 2–4 advisories. Migration
-- 005 only elevates levels on existing rows; it doesn't author new copy.
-- This migration writes the missing warnings array directly so the spot
-- matches the editorial quality of gardur-lighthouse, reykjanesta-
-- lighthouse, etc.
--
-- Three `warn`-level advisories: open coastal wind exposure, small rural
-- parking + Keflavík-proximity crowds, and ongoing Reykjanes volcanic
-- activity affecting road access. No `bad` — the spot has no cliffs,
-- glacier, tide-locked access, or in-zone eruption risk that would
-- warrant it (the active Sundhnúkur row is ~12 km east).
--
-- Idempotent: replaces the entire warnings field. Re-running produces
-- the same result. The matching Icelandic translations are seeded
-- separately via scripts/seed-spot-translations-is.sql.

BEGIN;

UPDATE viewing_spots
SET warnings = '[
  {"level":"warn","title":"Very wind-exposed open coastal site — secure equipment and dress in windproof layers","body":""},
  {"level":"warn","title":"Small free parking at a rural church — arrive early on eclipse day, especially with Keflavík Airport crowds","body":""},
  {"level":"warn","title":"Reykjanes peninsula remains volcanically active — check road status at safetravel.is before driving","body":""}
]'::jsonb
WHERE slug = 'hvalsneskirkja';

COMMIT;
