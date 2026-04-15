-- Move Saxhóll Crater spot coordinates from parking lot (base) to crater rim (top).
-- The viewing spot should represent the actual viewing position (crater top),
-- while the trailhead points to the parking lot at the base.

BEGIN;

UPDATE viewing_spots
SET
  lat = 64.85161463283652,
  lng = -23.927598708136397,
  trailhead_lat = 64.8509,
  trailhead_lng = -23.9246
WHERE slug = 'saxholl-crater';

COMMIT;
