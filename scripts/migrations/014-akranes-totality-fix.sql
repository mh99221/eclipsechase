-- Fix Akranes Lighthouse totality duration + start time.
--
-- Migration 013 corrected the sun_altitude (24 → 24.5) and sun_azimuth
-- (249 → 252.5) for akranes-lighthouse, but the totality_duration_seconds
-- (42) and totality_start (17:47:10) were never touched and are still the
-- original placeholders from the v3 seed.
--
-- Re-verified with Skyfield at the spot's exact coords (64.3218, -22.0749)
-- using scripts/internal/verify-akranes.py:
--   C2 (totality start): 2026-08-12T17:47:54Z
--   C3 (totality end):   2026-08-12T17:49:00Z
--   Duration:            66.1 s
--   Sun altitude:        24.54°
--   Sun azimuth:         252.45°
--
-- The 24-second under-count + 44-second early start were visible on the
-- /spots/akranes-lighthouse Sky and Plan tabs.

UPDATE viewing_spots
SET totality_duration_seconds = 66,
    totality_start = '2026-08-12T17:47:54Z'
WHERE slug = 'akranes-lighthouse';
