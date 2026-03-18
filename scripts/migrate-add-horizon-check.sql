-- Add horizon_check JSONB column to viewing_spots

ALTER TABLE viewing_spots ADD COLUMN IF NOT EXISTS horizon_check JSONB;

COMMENT ON COLUMN viewing_spots.horizon_check IS 'Pre-computed horizon obstruction check data (verdict, clearance, sweep)';
