-- Seed weather stations for western Iceland (vedur.is)
-- Run in Supabase SQL Editor

INSERT INTO weather_stations (id, name, lat, lng, region, source) VALUES
  -- Reykjavík area
  ('1',    'Reykjavík',              64.1330, -21.9000, 'reykjavik',     'vedur.is'),
  ('1477', 'Reykjavíkurflugvöllur',  64.1287, -21.9376, 'reykjavik',     'vedur.is'),

  -- Reykjanes peninsula
  ('990',  'Keflavíkurflugvöllur',   63.9847, -22.6056, 'reykjanes',     'vedur.is'),
  ('1453', 'Garðskagaviti',          64.0819, -22.6901, 'reykjanes',     'vedur.is'),

  -- Borgarfjörður
  ('1777', 'Hvanneyri',             64.5640, -21.7590, 'borgarfjordur', 'vedur.is'),

  -- Snæfellsnes peninsula
  ('178',  'Stykkishólmur',         65.0729, -22.7357, 'snaefellsnes',  'vedur.is'),
  ('1938', 'Grundarfjörður',        64.9243, -23.2631, 'snaefellsnes',  'vedur.is'),
  ('1924', 'Ólafsvík',              64.8943, -23.7092, 'snaefellsnes',  'vedur.is'),
  ('1919', 'Gufuskálar',            64.9032, -23.9301, 'snaefellsnes',  'vedur.is'),

  -- Westfjords
  ('2266', 'Reykhólar',             65.4486, -22.2015, 'westfjords',    'vedur.is'),
  ('2319', 'Patreksfjörður',        65.5833, -23.9667, 'westfjords',    'vedur.is'),
  ('2428', 'Bíldudalur',            65.6859, -23.5989, 'westfjords',    'vedur.is'),
  ('2631', 'Flateyri',              66.0500, -23.5167, 'westfjords',    'vedur.is'),
  ('2644', 'Ísafjörður',            66.0748, -23.1350, 'westfjords',    'vedur.is'),
  ('2738', 'Bolungarvík',           66.1518, -23.2617, 'westfjords',    'vedur.is')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  region = EXCLUDED.region;
