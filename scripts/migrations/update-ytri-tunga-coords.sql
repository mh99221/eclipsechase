-- Move Ytri Tunga's main lat/lng onto the beach access point and store the
-- parking-lot location in trailhead_lat/lng so SpotLocationMap renders the
-- curated "P" marker.
--
-- Run in Supabase SQL Editor.

UPDATE viewing_spots
SET
  lat = 64.8027829789199,
  lng = -23.08032285167988,
  trailhead_lat = 64.80394901472313,
  trailhead_lng = -23.080440379410796
WHERE slug = 'ytri-tunga-beach';
