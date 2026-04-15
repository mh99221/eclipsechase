-- =============================================================================
-- update-spots-v5.sql
-- =============================================================================
-- Bug fixes from spots-bug-report-v3.md
--
-- Sections:
--   A) Fix Kirkjufell GPS coordinates (BUG 3)
--   B) Fix Snæfellsjökull observer elevation in horizon_check (BUG 5)
--   C) Fix Djúpalónssandur description text (remove "249° azimuth") (BUG 7)
--   D) Fix Stykkishólmur warning text duration inconsistency (BUG 10)
-- =============================================================================

BEGIN;

-- =============================================================================
-- SECTION A: Fix Kirkjufell GPS coordinates (BUG 3)
-- =============================================================================
-- Site shows 64.9403°N (in Grundarfjörður town, ~1.4km too far north).
-- Correct Kirkjufellsfoss parking GPS: 64.9273°N, 23.3070°W.
-- The parking lot IS the trailhead, so update both.

UPDATE viewing_spots
SET
  lat = 64.9273,
  lng = -23.3070,
  trailhead_lat = 64.9273,
  trailhead_lng = -23.3070
WHERE slug = 'kirkjufell-viewpoint';


-- =============================================================================
-- SECTION B: Fix Snæfellsjökull observer elevation (BUG 5)
-- =============================================================================
-- The PeakFinder link uses observer_elevation_m from horizon_check JSONB.
-- Currently shows ele=1274 (probably glacier edge), summit is 1446m.
-- Fix the elevation so the PeakFinder link is correct. The clearance
-- value still reflects the original DEM check; re-running DEM at 1446m
-- would produce clear/24° but is out of scope.

UPDATE viewing_spots
SET horizon_check = jsonb_set(
  horizon_check,
  '{observer_elevation_m}', '1446'::jsonb
)
WHERE slug = 'snaefellsjokull-summit'
  AND horizon_check IS NOT NULL;


-- =============================================================================
-- SECTION C: Fix Djúpalónssandur description text (BUG 7)
-- =============================================================================
-- Description text mentions "249° azimuth" but horizon profile correctly
-- shows 265°. Remove the obsolete azimuth reference.

UPDATE viewing_spots
SET description = REPLACE(
  description,
  'Faces due west — perfect alignment for the eclipsed sun at 249° azimuth.',
  'Faces due west — perfect alignment for the eclipsed sun.'
)
WHERE slug = 'djupalonssandur-beach';


-- =============================================================================
-- SECTION D: Fix Stykkishólmur warning text (BUG 10)
-- =============================================================================
-- Warning text says "~1m 28s" but header shows 1m 35s.
-- Remove the inconsistent duration claim from the warning.

UPDATE viewing_spots
SET warnings = '[
  "Best-serviced town on Snæfellsnes — hotels, restaurants, grocery, Baldur ferry terminal",
  "Shorter totality than western Snæfellsnes spots — trade-off is excellent logistics",
  "Walk up to Súgandisey island/hill for the best elevated panoramic viewpoint"
]'::jsonb
WHERE slug = 'stykkisholmur-harbour-hill';


COMMIT;

-- =============================================================================
-- Verification queries (run after COMMIT)
-- =============================================================================
-- SELECT slug, lat, lng, trailhead_lat, trailhead_lng FROM viewing_spots WHERE slug = 'kirkjufell-viewpoint';
-- SELECT slug, horizon_check->>'observer_elevation_m' FROM viewing_spots WHERE slug = 'snaefellsjokull-summit';
-- SELECT slug, description FROM viewing_spots WHERE slug = 'djupalonssandur-beach';
-- SELECT slug, warnings FROM viewing_spots WHERE slug = 'stykkisholmur-harbour-hill';
