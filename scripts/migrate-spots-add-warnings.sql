-- Add warnings and nearby_poi JSONB columns to viewing_spots
-- warnings: array of warning strings (e.g., horizon risks, access notes)
-- nearby_poi: array of nearby points of interest strings

ALTER TABLE viewing_spots ADD COLUMN IF NOT EXISTS warnings JSONB DEFAULT '[]';
ALTER TABLE viewing_spots ADD COLUMN IF NOT EXISTS nearby_poi JSONB DEFAULT '[]';
