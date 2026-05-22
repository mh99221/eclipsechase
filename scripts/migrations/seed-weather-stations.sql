-- Seed weather stations for western Iceland (vedur.is)
-- 55 stations from forecast areas: Reykjavík, Faxaflói, Breiðafjörður, Westfjords
-- Keep in sync with server/utils/vedur.ts STATION_IDS
-- Coordinates sourced from vedur.is wslinfo.js station database
-- Run in Supabase SQL Editor

INSERT INTO weather_stations (id, name, lat, lng, region, source) VALUES
  -- Reykjavík area (11 stations)
  ('1',     'Reykjavík',              64.1289, -21.9082, 'reykjavik',     'vedur.is'),
  ('1471',  'Seltjarnarnes Suðurnes', 64.1545, -22.0325, 'reykjavik',     'vedur.is'),
  ('1477',  'Reykjavíkurflugvöllur',  64.1284, -21.9407, 'reykjavik',     'vedur.is'),
  ('1479',  'Korpa',                  64.1505, -21.7511, 'reykjavik',     'vedur.is'),
  ('1481',  'Hólmsheiði',             64.1085, -21.6864, 'reykjavik',     'vedur.is'),
  ('1482',  'Reykjavík Víðidalur',    64.1035, -21.7971, 'reykjavik',     'vedur.is'),
  ('1578',  'Skrauthólar',            64.2318, -21.8046, 'reykjavik',     'vedur.is'),
  ('1590',  'Skálafell',              64.2405, -21.4633, 'reykjavik',     'vedur.is'),
  ('1596',  'Þingvellir',             64.2807, -21.0875, 'reykjavik',     'vedur.is'),
  ('31579', 'Kjalarnes',              64.2106, -21.7667, 'reykjavik',     'vedur.is'),
  ('36504', 'Lyngdalsheiði',          64.2018, -20.8062, 'reykjavik',     'vedur.is'),

  -- Reykjanes peninsula (12 stations)
  ('990',   'Keflavíkurflugvöllur',   63.9802, -22.5953, 'reykjanes',     'vedur.is'),
  ('1361',  'Grindavík',              63.8438, -22.4170, 'reykjanes',     'vedur.is'),
  ('1453',  'Garðskagaviti',          64.0817, -22.6893, 'reykjanes',     'vedur.is'),
  ('1473',  'Straumsvík',             64.0438, -22.0404, 'reykjanes',     'vedur.is'),
  ('1474',  'Garðabær Urriðaholt',    64.0712, -21.9107, 'reykjanes',     'vedur.is'),
  ('1487',  'Bláfjallaskáli',         63.9831, -21.6497, 'reykjanes',     'vedur.is'),
  ('6300',  'Selfoss',                63.9355, -20.9707, 'reykjanes',     'vedur.is'),
  ('7001',  'Fagradals-Hagafell',     63.9207, -22.2496, 'reykjanes',     'vedur.is'),
  ('31109', 'Arnarnesvegur',          64.0888, -21.8366, 'reykjanes',     'vedur.is'),
  ('31380', 'Selvogur',               63.8456, -21.6959, 'reykjanes',     'vedur.is'),
  ('31392', 'Hellisheiði',            64.0188, -21.3424, 'reykjanes',     'vedur.is'),
  ('31488', 'Sandskeið',              64.0624, -21.5577, 'reykjanes',     'vedur.is'),

  -- Borgarfjörður (6 stations)
  ('1777',  'Hvanneyri',              64.5616, -21.7746, 'borgarfjordur', 'vedur.is'),
  ('1868',  'Fíflholt á Mýrum',       64.6943, -22.1473, 'borgarfjordur', 'vedur.is'),
  ('6802',  'Húsafell',               64.6990, -20.8690, 'borgarfjordur', 'vedur.is'),
  ('31572', 'Akrafjall',              64.3105, -21.9660, 'borgarfjordur', 'vedur.is'),
  ('31985', 'Brattabrekka',           64.8716, -21.5154, 'borgarfjordur', 'vedur.is'),
  ('32097', 'Holtavörðuheiði',        64.9899, -21.0576, 'borgarfjordur', 'vedur.is'),

  -- Snæfellsnes peninsula (7 stations)
  ('178',   'Stykkishólmur',          65.0740, -22.7339, 'snaefellsnes',  'vedur.is'),
  ('1919',  'Gufuskálar',             64.9041, -23.9316, 'snaefellsnes',  'vedur.is'),
  ('1924',  'Ólafsvík',               64.8957, -23.7162, 'snaefellsnes',  'vedur.is'),
  ('1936',  'Bláfeldur',              64.8393, -23.3017, 'snaefellsnes',  'vedur.is'),
  ('1938',  'Grundarfjörður',         64.9213, -23.2513, 'snaefellsnes',  'vedur.is'),
  ('31932', 'Búlandshöfði',           64.9366, -23.5033, 'snaefellsnes',  'vedur.is'),
  ('31948', 'Vatnaleið',              64.9095, -22.8649, 'snaefellsnes',  'vedur.is'),

  -- Westfjords (19 stations)
  ('293',   'Litla-Ávík',             66.0211, -21.4247, 'westfjords',    'vedur.is'),
  ('2175',  'Ásgarður',               65.2297, -21.7543, 'westfjords',    'vedur.is'),
  ('2266',  'Reykhólar',              65.4377, -22.2056, 'westfjords',    'vedur.is'),
  ('2304',  'Bjargtangar',            65.5029, -24.5312, 'westfjords',    'vedur.is'),
  ('2315',  'Lambavatn',              65.4924, -24.0925, 'westfjords',    'vedur.is'),
  ('2319',  'Patreksfjörður',         65.5951, -23.9748, 'westfjords',    'vedur.is'),
  ('2428',  'Bíldudalur',             65.6794, -23.6122, 'westfjords',    'vedur.is'),
  ('2481',  'Hólmavík',               65.6873, -21.6813, 'westfjords',    'vedur.is'),
  ('2530',  'Hólar í Dýrafirði',      65.8686, -23.5578, 'westfjords',    'vedur.is'),
  ('2631',  'Flateyri',               66.0498, -23.5100, 'westfjords',    'vedur.is'),
  ('2644',  'Ísafjörður Tungudalur',  66.0600, -23.1847, 'westfjords',    'vedur.is'),
  ('2655',  'Æðey',                   66.1006, -22.6594, 'westfjords',    'vedur.is'),
  ('2738',  'Bolungarvík',            66.1610, -23.2538, 'westfjords',    'vedur.is'),
  ('2862',  'Hornbjargsviti',         66.4107, -22.3789, 'westfjords',    'vedur.is'),
  ('2941',  'Straumnesviti',          66.4305, -23.1345, 'westfjords',    'vedur.is'),
  ('32250', 'Flatey á Breiðafirði',   65.3719, -22.9286, 'westfjords',    'vedur.is'),
  ('32336', 'Hrafnanes',              65.4918, -23.3172, 'westfjords',    'vedur.is'),
  ('32355', 'Klettsháls',             65.6550, -22.6088, 'westfjords',    'vedur.is'),
  ('32390', 'Ennisháls',              65.5724, -21.3290, 'westfjords',    'vedur.is')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  region = EXCLUDED.region;
