-- Fix sun_altitude + sun_azimuth on the two newest Westfjords spots.
--
-- haestahjallafoss-dynjandi and sandafell-thingeyri were added after
-- migration 013 was authored, so they were never picked up by the
-- correction pass and still carry the 24° / 249° placeholders from
-- their initial INSERTs.
--
-- Values from bilinear interpolation against the 4 surrounding grid
-- points in public/eclipse-data/grid.json (Skyfield-computed, 5s time
-- resolution). Corners and computation in
-- scripts/internal/parse-spots-audit.mjs output.
--
-- haestahjallafoss-dynjandi (65.7333, -23.2014):
--   corners (65.60-65.75, -23.30 to -23.15) → alt 24.83° / az 250.04°
-- sandafell-thingeyri (65.8724, -23.5057):
--   corners (65.75-65.90, -23.60 to -23.45) → alt 24.94° / az 249.59°
--
-- Durations (95s, 100s) are left unchanged — they're within the grid's
-- 5s sampling tolerance of the bilinear estimates (97s, 105s).

UPDATE viewing_spots SET sun_altitude = 24.8, sun_azimuth = 250.0 WHERE slug = 'haestahjallafoss-dynjandi';
UPDATE viewing_spots SET sun_altitude = 24.9, sun_azimuth = 249.6 WHERE slug = 'sandafell-thingeyri';
