-- EclipseChase.is — Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Weather stations in western Iceland
CREATE TABLE weather_stations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  region TEXT,
  source TEXT DEFAULT 'vedur.is'
);

-- Real-time weather observations (ingested every 15 min from vedur.is)
CREATE TABLE weather_observations (
  id BIGSERIAL PRIMARY KEY,
  station_id TEXT REFERENCES weather_stations(id),
  timestamp TIMESTAMPTZ NOT NULL,
  cloud_cover INTEGER,
  temp DOUBLE PRECISION,
  wind_speed DOUBLE PRECISION,
  wind_dir TEXT,
  visibility DOUBLE PRECISION,
  precipitation DOUBLE PRECISION,
  UNIQUE(station_id, timestamp)
);

-- Weather forecasts per station (ingested from vedur.is)
CREATE TABLE weather_forecasts (
  id BIGSERIAL PRIMARY KEY,
  station_id TEXT REFERENCES weather_stations(id),
  forecast_time TIMESTAMPTZ NOT NULL,
  valid_time TIMESTAMPTZ NOT NULL,
  cloud_cover INTEGER,
  precipitation_prob DOUBLE PRECISION,
  source_model TEXT DEFAULT 'vedur',
  UNIQUE(station_id, forecast_time, valid_time)
);

-- Pre-computed eclipse geometry for ~500 points across western Iceland
CREATE TABLE eclipse_grid (
  id SERIAL PRIMARY KEY,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  totality_start TIMESTAMPTZ,
  totality_end TIMESTAMPTZ,
  duration_seconds DOUBLE PRECISION,
  sun_altitude DOUBLE PRECISION,
  sun_azimuth DOUBLE PRECISION
);

-- Curated viewing spots with human-written descriptions
CREATE TABLE viewing_spots (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  region TEXT NOT NULL,
  description TEXT,
  parking_info TEXT,
  terrain_notes TEXT,
  has_services BOOLEAN DEFAULT FALSE,
  cell_coverage TEXT,
  totality_duration_seconds DOUBLE PRECISION,
  totality_start TIMESTAMPTZ,
  sun_altitude DOUBLE PRECISION,
  sun_azimuth DOUBLE PRECISION,
  photo_url TEXT
);

-- Email signups from landing page
CREATE TABLE email_signups (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'landing_page',
  locale TEXT DEFAULT 'en'
);

-- Pro tier purchases
CREATE TABLE pro_users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  stripe_session_id TEXT,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Enable Row Level Security on public-facing tables
ALTER TABLE email_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE pro_users ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts to email_signups (for the signup form)
CREATE POLICY "Allow anonymous insert" ON email_signups
  FOR INSERT WITH CHECK (true);

-- No public read access to email_signups
CREATE POLICY "No public read" ON email_signups
  FOR SELECT USING (false);
