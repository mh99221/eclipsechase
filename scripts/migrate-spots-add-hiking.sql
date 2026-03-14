-- Migration: Add hiking trail columns to viewing_spots
ALTER TABLE viewing_spots ADD COLUMN IF NOT EXISTS spot_type TEXT DEFAULT 'drive-up';
ALTER TABLE viewing_spots ADD COLUMN IF NOT EXISTS trail_distance_km DOUBLE PRECISION;
ALTER TABLE viewing_spots ADD COLUMN IF NOT EXISTS trail_time_minutes INTEGER;
ALTER TABLE viewing_spots ADD COLUMN IF NOT EXISTS difficulty TEXT;
ALTER TABLE viewing_spots ADD COLUMN IF NOT EXISTS elevation_gain_m INTEGER;
ALTER TABLE viewing_spots ADD COLUMN IF NOT EXISTS trailhead_lat DOUBLE PRECISION;
ALTER TABLE viewing_spots ADD COLUMN IF NOT EXISTS trailhead_lng DOUBLE PRECISION;

-- Set existing spots as drive-up
UPDATE viewing_spots SET spot_type = 'drive-up' WHERE spot_type IS NULL;
