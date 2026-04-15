-- Add observer_height_above_ground column to viewing_spots
-- Used for structures (lighthouses, observation decks) and summits where
-- the observer is above the DEM ground elevation.
-- Default 0 means observer is at DEM ground level + 1.7m eye height.

ALTER TABLE viewing_spots
  ADD COLUMN IF NOT EXISTS observer_height_above_ground DOUBLE PRECISION DEFAULT 0;
