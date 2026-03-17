-- Migration: Replace photo_url TEXT with photos JSONB on viewing_spots
-- Run against Supabase SQL editor

ALTER TABLE viewing_spots DROP COLUMN IF EXISTS photo_url;
ALTER TABLE viewing_spots ADD COLUMN photos JSONB DEFAULT '[]';
