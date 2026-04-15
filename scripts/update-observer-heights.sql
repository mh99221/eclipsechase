-- Set observer_height_above_ground for spots where the observer is above
-- the natural DEM ground elevation (structures, observation decks, summits).
--
-- The recompute-spot-horizons.mjs script reads these values and adds them
-- to the DEM elevation when computing horizon checks.

BEGIN;

-- Observation deck: ~25m above Öskjuhlíð hill ground level
UPDATE viewing_spots SET observer_height_above_ground = 25
WHERE slug = 'perlan-reykjavik';

-- Lighthouses: observer climbs ~10m up the tower
UPDATE viewing_spots SET observer_height_above_ground = 10
WHERE slug IN (
  'gardur-lighthouse',
  'reykjanesta-lighthouse',
  'grotta-lighthouse-reykjavik',
  'akranes-lighthouse'
);

-- Snæfellsjökull summit: 1446m is the peak elevation; DEM cell may report lower.
-- The recompute script handles this via a per-slug override (known_elevation).
-- No observer_height_above_ground adjustment needed here.

COMMIT;
