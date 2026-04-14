-- =============================================================================
-- update-spots-v3.sql
-- Comprehensive viewing spots migration: delete, fix, insert, enrich
-- Run inside a transaction for atomicity.
-- =============================================================================

BEGIN;

-- =============================================================================
-- SECTION A: DELETE 8 spots that are outside the path of totality or redundant
-- =============================================================================

DELETE FROM viewing_spots WHERE slug IN (
  'dynjandi-arnarfjordur',
  'bildudalur-harbour',
  'flateyri-shore',
  'sudureyri-harbour',
  'thingeyri-shore',
  'borgarnes-foreshore',
  'reykholt-snorrastofa',
  'glymur-waterfall'
);

-- =============================================================================
-- SECTION B: FIX horizon_check JSONB on 3 existing spots
-- =============================================================================

UPDATE viewing_spots
SET horizon_check = '{
  "verdict": "risky",
  "clearance_degrees": 2.0,
  "max_horizon_angle": 22.2,
  "blocking_distance_m": 1500,
  "blocking_elevation_m": 620,
  "sun_altitude": 24.2,
  "sun_azimuth": 265,
  "checked_at": "2026-04-14T00:00:00Z",
  "notes": "Deep fjord with 700m+ mountains on three sides. Fjord opens NW, sun is WNW. Harbor area may work but inland positions are likely blocked."
}'::jsonb
WHERE slug = 'isafjordur-harbour';

UPDATE viewing_spots
SET horizon_check = '{
  "verdict": "risky",
  "clearance_degrees": 1.5,
  "max_horizon_angle": 22.7,
  "blocking_distance_m": 2800,
  "blocking_elevation_m": 480,
  "sun_altitude": 24.2,
  "sun_azimuth": 265,
  "checked_at": "2026-04-14T00:00:00Z",
  "notes": "Fjord opens SW which helps, but western mountains at 265° may partially clip view. Position on western shore for best clearance."
}'::jsonb
WHERE slug = 'patreksfjordur-beach';

UPDATE viewing_spots
SET horizon_check = '{
  "verdict": "marginal",
  "clearance_degrees": 4.0,
  "max_horizon_angle": 20.2,
  "blocking_distance_m": 1800,
  "blocking_elevation_m": 463,
  "sun_altitude": 24.2,
  "sun_azimuth": 265,
  "checked_at": "2026-04-14T00:00:00Z",
  "notes": "Kirkjufell (463m) is NW of viewpoint. At 265° azimuth, the mountain edge is close. Position on western side of parking area for best clearance."
}'::jsonb
WHERE slug = 'kirkjufell-viewpoint';

-- =============================================================================
-- SECTION C: FIX totality_duration_seconds on 10 spots
-- =============================================================================

UPDATE viewing_spots SET totality_duration_seconds = 133 WHERE slug = 'latrabjarg-cliffs';
UPDATE viewing_spots SET totality_duration_seconds = 127 WHERE slug = 'rif-harbour-snaefellsnes';
UPDATE viewing_spots SET totality_duration_seconds = 127 WHERE slug = 'hellissandur-village';
UPDATE viewing_spots SET totality_duration_seconds = 125 WHERE slug = 'olafsvik-harbour';
UPDATE viewing_spots SET totality_duration_seconds = 107 WHERE slug = 'reykjanesta-lighthouse';
UPDATE viewing_spots SET totality_duration_seconds = 103 WHERE slug = 'gardur-lighthouse';
UPDATE viewing_spots SET totality_duration_seconds = 101 WHERE slug = 'sandgerdi-shore';
UPDATE viewing_spots SET totality_duration_seconds = 98  WHERE slug = 'keflavik-asbru-viewpoint';
UPDATE viewing_spots SET totality_duration_seconds = 66  WHERE slug = 'grotta-lighthouse-reykjavik';
UPDATE viewing_spots SET totality_duration_seconds = 62  WHERE slug = 'akranes-lighthouse';

-- =============================================================================
-- SECTION D: INSERT 8 new spots (upsert pattern)
-- =============================================================================

-- D.1 Öndverðarnes / Svörtuloft Lighthouse
INSERT INTO viewing_spots (
  id, name, slug, lat, lng, region, description, parking_info, terrain_notes,
  has_services, cell_coverage, totality_duration_seconds, totality_start,
  sun_altitude, sun_azimuth, spot_type
) VALUES (
  'ondverdarnes-svortuloft',
  'Öndverðarnes / Svörtuloft Lighthouse',
  'ondverdarnes-svortuloft',
  64.878, -24.041,
  'snaefellsnes',
  'The westernmost point of the Snæfellsnes Peninsula — a dramatic clifftop plateau where the black basalt Svörtuloft sea cliffs plunge into the Atlantic. The small orange Skálasnagaviti lighthouse stands at the edge of the world with nothing between it and Greenland. Offers near-maximum totality for Snæfellsnes with a completely unobstructed ocean horizon in every seaward direction. Often described by visitors as "the end of the world" — an extraordinarily atmospheric place to witness the eclipse.',
  'End of a bumpy gravel road (15 min from Hellissandur). Small parking area for approximately 10 cars. No overflow. Arrive early on eclipse day.',
  'Flat clifftop plateau. Open Atlantic to W/NW/SW. Dramatic black sea cliffs. Extremely wind-exposed — this is one of the windiest places in Iceland.',
  false,
  'none',
  130,
  '2026-08-12T17:45:40Z',
  24.1,
  265,
  'drive-up'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  region = EXCLUDED.region,
  description = EXCLUDED.description,
  parking_info = EXCLUDED.parking_info,
  terrain_notes = EXCLUDED.terrain_notes,
  has_services = EXCLUDED.has_services,
  cell_coverage = EXCLUDED.cell_coverage,
  totality_duration_seconds = EXCLUDED.totality_duration_seconds,
  totality_start = EXCLUDED.totality_start,
  sun_altitude = EXCLUDED.sun_altitude,
  sun_azimuth = EXCLUDED.sun_azimuth,
  spot_type = EXCLUDED.spot_type;

-- D.2 Lóndrangar Cliffs / Malarrif
INSERT INTO viewing_spots (
  id, name, slug, lat, lng, region, description, parking_info, terrain_notes,
  has_services, cell_coverage, totality_duration_seconds, totality_start,
  sun_altitude, sun_azimuth, spot_type
) VALUES (
  'londrangar-malarrif',
  'Lóndrangar Cliffs / Malarrif',
  'londrangar-malarrif',
  64.734, -23.776,
  'snaefellsnes',
  'Two dramatic basalt sea pillars — the taller rising 75 meters and the shorter 61 meters — standing like sentinels off the southwest coast of the Snæfellsnes Peninsula. These volcanic plugs are the remains of an ancient crater eroded by the Atlantic over millennia. The nearby Malarrif visitor center and lighthouse complete the scene. The south-west facing coastline provides an excellent open horizon toward the eclipse sun. An eclipse with the Lóndrangar silhouette would produce one of the most iconic photographs of the event.',
  'Lóndrangar viewpoint parking (~20 cars) and separate Malarrif visitor center parking (~20 cars). Both are short walks from the cliffs.',
  'Coastal cliff path. SW-facing, open Atlantic. Low lava field terrain inland. Walking paths are well-maintained.',
  true,
  'limited',
  110,
  '2026-08-12T17:46:05Z',
  24.1,
  265,
  'drive-up'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  region = EXCLUDED.region,
  description = EXCLUDED.description,
  parking_info = EXCLUDED.parking_info,
  terrain_notes = EXCLUDED.terrain_notes,
  has_services = EXCLUDED.has_services,
  cell_coverage = EXCLUDED.cell_coverage,
  totality_duration_seconds = EXCLUDED.totality_duration_seconds,
  totality_start = EXCLUDED.totality_start,
  sun_altitude = EXCLUDED.sun_altitude,
  sun_azimuth = EXCLUDED.sun_azimuth,
  spot_type = EXCLUDED.spot_type;

-- D.3 Hellnar Coastal Viewpoint
INSERT INTO viewing_spots (
  id, name, slug, lat, lng, region, description, parking_info, terrain_notes,
  has_services, cell_coverage, totality_duration_seconds, totality_start,
  sun_altitude, sun_azimuth, spot_type
) VALUES (
  'hellnar-viewpoint',
  'Hellnar Coastal Viewpoint',
  'hellnar-viewpoint',
  64.757, -23.648,
  'snaefellsnes',
  'A historic fishing village on the southern coast of the Snæfellsnes Peninsula, connected to Arnarstapi by a famous 2.5km coastal walking path. Hellnar features dramatic rock formations including the Gatklettur natural stone arch, basalt sea caves, and nesting seabird colonies. The Fjöruhúsið café, set in a converted fish house overlooking a small cove, is considered one of the most charming cafés in Iceland. The south-facing coast provides a clear western horizon for eclipse viewing.',
  'Small parking lot at the end of the road in Hellnar. Approximately 15 cars. Additional parking at Arnarstapi (2.5km walk along the coastal path).',
  'Coastal village at sea level. South-facing shore with views SW/W over the Atlantic. Walking paths through lava fields to sea caves and arch.',
  true,
  'limited',
  108,
  '2026-08-12T17:46:10Z',
  24.2,
  265,
  'drive-up'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  region = EXCLUDED.region,
  description = EXCLUDED.description,
  parking_info = EXCLUDED.parking_info,
  terrain_notes = EXCLUDED.terrain_notes,
  has_services = EXCLUDED.has_services,
  cell_coverage = EXCLUDED.cell_coverage,
  totality_duration_seconds = EXCLUDED.totality_duration_seconds,
  totality_start = EXCLUDED.totality_start,
  sun_altitude = EXCLUDED.sun_altitude,
  sun_azimuth = EXCLUDED.sun_azimuth,
  spot_type = EXCLUDED.spot_type;

-- D.4 Svöðufoss Waterfall
INSERT INTO viewing_spots (
  id, name, slug, lat, lng, region, description, parking_info, terrain_notes,
  has_services, cell_coverage, totality_duration_seconds, totality_start,
  sun_altitude, sun_azimuth, spot_type
) VALUES (
  'svodufoss-waterfall',
  'Svöðufoss Waterfall',
  'svodufoss-waterfall',
  64.876, -23.556,
  'snaefellsnes',
  'A photogenic 10-meter waterfall cascading over a stunning columnar basalt cliff on the northern side of the Snæfellsnes Peninsula. Specifically recommended by eclipse2026.is as an ideal foreground for eclipse photography. Located between Ólafsvík and Grundarfjörður with over 2 minutes of totality. The waterfall faces south, while the eclipse sun is to the west — meaning the basalt columns and cascade can serve as dramatic foreground without obstructing the sun itself.',
  'Small pull-off area along the road. Approximately 10 cars. Easy to miss — look for a small sign.',
  'Short walk from the road to the waterfall viewpoint. Flat to gently sloping terrain. The viewing area has open views to the west across farmland and toward the coast.',
  false,
  'limited',
  126,
  '2026-08-12T17:45:55Z',
  24.2,
  265,
  'drive-up'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  region = EXCLUDED.region,
  description = EXCLUDED.description,
  parking_info = EXCLUDED.parking_info,
  terrain_notes = EXCLUDED.terrain_notes,
  has_services = EXCLUDED.has_services,
  cell_coverage = EXCLUDED.cell_coverage,
  totality_duration_seconds = EXCLUDED.totality_duration_seconds,
  totality_start = EXCLUDED.totality_start,
  sun_altitude = EXCLUDED.sun_altitude,
  sun_azimuth = EXCLUDED.sun_azimuth,
  spot_type = EXCLUDED.spot_type;

-- D.5 Ytri Tunga Beach
INSERT INTO viewing_spots (
  id, name, slug, lat, lng, region, description, parking_info, terrain_notes,
  has_services, cell_coverage, totality_duration_seconds, totality_start,
  sun_altitude, sun_azimuth, spot_type
) VALUES (
  'ytri-tunga-beach',
  'Ytri Tunga Beach',
  'ytri-tunga-beach',
  64.801, -23.243,
  'snaefellsnes',
  'One of the best places in Iceland to see harbor seals up close — they regularly haul out on the rocks just offshore, especially in summer. Unlike most Icelandic beaches, Ytri Tunga has golden sand rather than black. Located on the southern coast of the Snæfellsnes Peninsula with a clear view west over Faxaflói bay. An eclipse with seals on the beach in the foreground would be a unique wildlife-meets-astronomy moment.',
  'Small parking lot at the beach access point. Approximately 15 cars. Short walk to the beach.',
  'Flat golden sand beach on the south coast. Open view W/SW over Faxaflói bay. Low terrain, no obstructions.',
  false,
  'good',
  85,
  '2026-08-12T17:46:30Z',
  24.3,
  265,
  'drive-up'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  region = EXCLUDED.region,
  description = EXCLUDED.description,
  parking_info = EXCLUDED.parking_info,
  terrain_notes = EXCLUDED.terrain_notes,
  has_services = EXCLUDED.has_services,
  cell_coverage = EXCLUDED.cell_coverage,
  totality_duration_seconds = EXCLUDED.totality_duration_seconds,
  totality_start = EXCLUDED.totality_start,
  sun_altitude = EXCLUDED.sun_altitude,
  sun_azimuth = EXCLUDED.sun_azimuth,
  spot_type = EXCLUDED.spot_type;

-- D.6 Blue Lagoon
INSERT INTO viewing_spots (
  id, name, slug, lat, lng, region, description, parking_info, terrain_notes,
  has_services, cell_coverage, totality_duration_seconds, totality_start,
  sun_altitude, sun_azimuth, spot_type
) VALUES (
  'blue-lagoon',
  'Blue Lagoon',
  'blue-lagoon',
  63.880, -22.449,
  'reykjanes',
  'Iceland''s most famous tourist attraction — a geothermal spa set in a black lava field on the Reykjanes Peninsula. For the first time in its history, the Blue Lagoon falls directly in the path of totality. The spa is already offering special eclipse event packages. Watching the sky darken during totality while soaking in the milky-blue 38°C water with geothermal steam rising around you would be an utterly unique eclipse experience. The flat volcanic terrain provides a clear horizon in all directions.',
  'Large professional parking facilities with capacity for hundreds of cars. Well-organized arrival/departure system.',
  'Flat volcanic lava field at approximately 30m elevation. No significant terrain nearby. Open sky in all directions.',
  true,
  'good',
  96,
  '2026-08-12T17:49:05Z',
  24.5,
  265,
  'drive-up'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  region = EXCLUDED.region,
  description = EXCLUDED.description,
  parking_info = EXCLUDED.parking_info,
  terrain_notes = EXCLUDED.terrain_notes,
  has_services = EXCLUDED.has_services,
  cell_coverage = EXCLUDED.cell_coverage,
  totality_duration_seconds = EXCLUDED.totality_duration_seconds,
  totality_start = EXCLUDED.totality_start,
  sun_altitude = EXCLUDED.sun_altitude,
  sun_azimuth = EXCLUDED.sun_azimuth,
  spot_type = EXCLUDED.spot_type;

-- D.7 Perlan Observation Deck
INSERT INTO viewing_spots (
  id, name, slug, lat, lng, region, description, parking_info, terrain_notes,
  has_services, cell_coverage, totality_duration_seconds, totality_start,
  sun_altitude, sun_azimuth, spot_type
) VALUES (
  'perlan-reykjavik',
  'Perlan Observation Deck',
  'perlan-reykjavik',
  64.129, -21.918,
  'reykjavik',
  'Reykjavík''s iconic glass-domed landmark, perched on Öskjuhlíð hill above the city. The 360° observation deck offers unobstructed panoramic views — west over Faxaflói bay toward the setting sun, north to Esja mountain, and across the entire city. Perlan is actively planning eclipse events and the elevated position (approximately 25m above the surrounding terrain) ensures clear sightlines even in an urban setting. The Wonders of Iceland museum inside Perlan adds educational value to the eclipse visit. For visitors staying in Reykjavík who don''t want to drive, this is the premium in-city eclipse viewing spot.',
  'Öskjuhlíð hill parking area with capacity for approximately 100 cars. Also accessible by city bus and walking/cycling paths through the Öskjuhlíð forest.',
  'Elevated hilltop position (~60m ASL). Glass observation deck with 360° views. Completely unobstructed western horizon over the ocean. Urban setting but elevated above rooftops.',
  true,
  'good',
  60,
  '2026-08-12T17:48:12Z',
  24.5,
  265,
  'drive-up'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  region = EXCLUDED.region,
  description = EXCLUDED.description,
  parking_info = EXCLUDED.parking_info,
  terrain_notes = EXCLUDED.terrain_notes,
  has_services = EXCLUDED.has_services,
  cell_coverage = EXCLUDED.cell_coverage,
  totality_duration_seconds = EXCLUDED.totality_duration_seconds,
  totality_start = EXCLUDED.totality_start,
  sun_altitude = EXCLUDED.sun_altitude,
  sun_azimuth = EXCLUDED.sun_azimuth,
  spot_type = EXCLUDED.spot_type;

-- D.8 Sky Lagoon
INSERT INTO viewing_spots (
  id, name, slug, lat, lng, region, description, parking_info, terrain_notes,
  has_services, cell_coverage, totality_duration_seconds, totality_start,
  sun_altitude, sun_azimuth, spot_type
) VALUES (
  'sky-lagoon',
  'Sky Lagoon',
  'sky-lagoon',
  64.113, -21.996,
  'reykjavik',
  'A modern geothermal infinity pool on the western edge of the Reykjavík metropolitan area, specifically designed with an ocean-facing infinity edge overlooking Faxaflói bay to the west. The design literally frames the western horizon — the exact direction of the eclipse sun during totality. Visit Reykjavík''s official eclipse guide specifically mentions Sky Lagoon as planning special eclipse viewing events. Watching the sky darken and the corona appear while soaking in a geothermal pool with the Atlantic stretching to the horizon would be a uniquely Icelandic eclipse experience.',
  'Professional parking facility at Sky Lagoon. Sufficient capacity. Also accessible by public bus from downtown Reykjavík.',
  'Oceanfront facility at sea level. Infinity pool edge faces directly west over Faxaflói bay. Completely unobstructed western horizon.',
  true,
  'good',
  58,
  '2026-08-12T17:48:15Z',
  24.5,
  265,
  'drive-up'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  region = EXCLUDED.region,
  description = EXCLUDED.description,
  parking_info = EXCLUDED.parking_info,
  terrain_notes = EXCLUDED.terrain_notes,
  has_services = EXCLUDED.has_services,
  cell_coverage = EXCLUDED.cell_coverage,
  totality_duration_seconds = EXCLUDED.totality_duration_seconds,
  totality_start = EXCLUDED.totality_start,
  sun_altitude = EXCLUDED.sun_altitude,
  sun_azimuth = EXCLUDED.sun_azimuth,
  spot_type = EXCLUDED.spot_type;

-- =============================================================================
-- SECTION E: SET warnings, nearby_poi, and horizon_check on new + fixed spots
-- =============================================================================

-- ---------------------------------------------------------------------------
-- E.1 Warnings and nearby_poi for 3 FIXED spots (horizon_check already set
--     in Section B)
-- ---------------------------------------------------------------------------

UPDATE viewing_spots
SET warnings = '[
  "⚠️ HORIZON RISK: Deep fjord with steep mountains — sun may be partially blocked from some positions",
  "Best position: harbor pier or waterfront facing NW toward the fjord mouth",
  "Avoid inland positions — mountains will block the view from the town center",
  "Consider driving to Bolungarvík (15 min) for a more open coastal position"
]'::jsonb
WHERE slug = 'isafjordur-harbour';

UPDATE viewing_spots
SET warnings = '[
  "⚠️ HORIZON RISK: Mountains may partially obstruct the sun from some positions in town",
  "Position yourself on the western shore of the fjord for best viewing angle",
  "If the sun is blocked from your position, drive to Breiðavík (1h west) or Látrabjarg (2.5h west)"
]'::jsonb
WHERE slug = 'patreksfjordur-beach';

UPDATE viewing_spots
SET warnings = '[
  "⚠️ HORIZON NOTE: Kirkjufell mountain is close to the sun direction — position on the western side of the viewpoint area",
  "An eclipse photo with Kirkjufell silhouette would be iconic, but requires careful positioning"
]'::jsonb
WHERE slug = 'kirkjufell-viewpoint';

-- ---------------------------------------------------------------------------
-- E.2 Warnings, nearby_poi, and horizon_check for 8 NEW spots
-- ---------------------------------------------------------------------------

-- Öndverðarnes / Svörtuloft Lighthouse
UPDATE viewing_spots
SET
  warnings = '[
    "Extremely wind-exposed — secure all equipment and dress in windproof layers",
    "Gravel road access (15 min from Hellissandur) — drive slowly",
    "Very limited parking (~10 cars) — arrive early",
    "No services, no cell coverage, no shelter — bring everything you need",
    "Cliff edges are unfenced and dangerously steep"
  ]'::jsonb,
  nearby_poi = '[
    "Svörtuloft \"Black Ceilings\" sea cliffs",
    "Skálasnagaviti lighthouse",
    "Brunnurinn Fálki ancient well (2 min boardwalk)",
    "Skarðsvík golden sand beach (5 min drive)",
    "Hellissandur village (15 min drive)"
  ]'::jsonb,
  horizon_check = '{
    "verdict": "clear",
    "clearance_degrees": 23.5,
    "max_horizon_angle": 0.6,
    "blocking_distance_m": null,
    "blocking_elevation_m": null,
    "sun_altitude": 24.1,
    "sun_azimuth": 265,
    "checked_at": "2026-04-14T00:00:00Z",
    "notes": "Westernmost point of Snæfellsnes. Open ocean W/NW/SW. Perfect horizon."
  }'::jsonb
WHERE slug = 'ondverdarnes-svortuloft';

-- Lóndrangar Cliffs / Malarrif
UPDATE viewing_spots
SET
  warnings = '[
    "Popular tourist attraction — expect crowds on eclipse day",
    "Cliff edges can be slippery and dangerous — stay on marked paths"
  ]'::jsonb,
  nearby_poi = '[
    "Lóndrangar basalt sea pillars (75m and 61m)",
    "Malarrif visitor center (exhibits, gift shop, bathrooms)",
    "Malarrif lighthouse",
    "Snæfellsjökull National Park",
    "Djúpalónssandur beach (10 min drive)"
  ]'::jsonb,
  horizon_check = '{
    "verdict": "clear",
    "clearance_degrees": 22.0,
    "max_horizon_angle": 2.1,
    "blocking_distance_m": null,
    "blocking_elevation_m": null,
    "sun_altitude": 24.1,
    "sun_azimuth": 265,
    "checked_at": "2026-04-14T00:00:00Z",
    "notes": "SW-facing coastal cliffs. Open Atlantic. Lóndrangar pillars are to the south and do not obstruct the WNW sun."
  }'::jsonb
WHERE slug = 'londrangar-malarrif';

-- Hellnar Coastal Viewpoint
UPDATE viewing_spots
SET
  warnings = '[
    "Smaller and quieter than Arnarstapi — but also less parking",
    "Fjöruhúsið café has limited capacity — may close early on eclipse day"
  ]'::jsonb,
  nearby_poi = '[
    "Gatklettur natural stone arch",
    "Fjöruhúsið café (one of Iceland''s most beloved cafés)",
    "Bárður Snæfellsás statue (half-man, half-troll guardian of Snæfellsnes)",
    "Coastal walking path to Arnarstapi (2.5km, ~1h)",
    "Sea caves and nesting seabird colonies",
    "Arnarstapi village (2.5km walk or 5 min drive)"
  ]'::jsonb,
  horizon_check = '{
    "verdict": "clear",
    "clearance_degrees": 20.5,
    "max_horizon_angle": 3.7,
    "blocking_distance_m": null,
    "blocking_elevation_m": null,
    "sun_altitude": 24.2,
    "sun_azimuth": 265,
    "checked_at": "2026-04-14T00:00:00Z",
    "notes": "South-facing coast. Open view SW/W over Atlantic. Some low inland terrain to NW but well below sun altitude."
  }'::jsonb
WHERE slug = 'hellnar-viewpoint';

-- Svöðufoss Waterfall
UPDATE viewing_spots
SET
  warnings = '[
    "Very limited parking — arrive early or walk from Ólafsvík",
    "No services at the waterfall",
    "The waterfall itself is small (10m) — the draw is the columnar basalt cliff behind it"
  ]'::jsonb,
  nearby_poi = '[
    "Columnar basalt cliff (dramatic backdrop)",
    "Ólafsvík harbour (10 min drive west)",
    "Grundarfjörður / Kirkjufell (15 min drive east)",
    "Snæfellsjökull glacier visible to the west"
  ]'::jsonb,
  horizon_check = '{
    "verdict": "clear",
    "clearance_degrees": 18.0,
    "max_horizon_angle": 6.2,
    "blocking_distance_m": null,
    "blocking_elevation_m": null,
    "sun_altitude": 24.2,
    "sun_azimuth": 265,
    "checked_at": "2026-04-14T00:00:00Z",
    "notes": "Waterfall faces south. Sun is to the west. Mountain behind the falls (south) does not block the western sun. Open farmland to the west."
  }'::jsonb
WHERE slug = 'svodufoss-waterfall';

-- Ytri Tunga Beach
UPDATE viewing_spots
SET
  warnings = '[
    "Shorter totality (~1m 25s) compared to northern Snæfellsnes spots",
    "Keep distance from seals — do not approach or disturb them (Icelandic law)",
    "No services at the beach"
  ]'::jsonb,
  nearby_poi = '[
    "Harbor seal colony (best viewed June–August)",
    "Golden sand beach (unusual for Iceland)",
    "Lýsuhóll mineral spring (nearby farm)",
    "Búðir Black Church (15 min drive west)",
    "Stykkishólmur (20 min drive north)"
  ]'::jsonb,
  horizon_check = '{
    "verdict": "clear",
    "clearance_degrees": 22.0,
    "max_horizon_angle": 2.3,
    "blocking_distance_m": null,
    "blocking_elevation_m": null,
    "sun_altitude": 24.3,
    "sun_azimuth": 265,
    "checked_at": "2026-04-14T00:00:00Z",
    "notes": "South-facing beach. Open W/SW over Faxaflói. No obstructions."
  }'::jsonb
WHERE slug = 'ytri-tunga-beach';

-- Blue Lagoon
UPDATE viewing_spots
SET
  warnings = '[
    "TICKETS REQUIRED — the Blue Lagoon requires pre-booked admission",
    "Special eclipse event tickets are selling fast — book immediately",
    "Eclipse viewing may be limited by spa infrastructure (buildings, steam) depending on your pool position",
    "Expensive (premium pricing for eclipse event)"
  ]'::jsonb,
  nearby_poi = '[
    "Blue Lagoon geothermal spa (main attraction)",
    "Svartsengi geothermal power plant",
    "Reykjanes volcanic lava fields",
    "Grindavík town (15 min drive — note: check volcanic activity status)",
    "Keflavík Airport (20 min drive)"
  ]'::jsonb,
  horizon_check = '{
    "verdict": "clear",
    "clearance_degrees": 23.5,
    "max_horizon_angle": 1.0,
    "blocking_distance_m": null,
    "blocking_elevation_m": null,
    "sun_altitude": 24.5,
    "sun_azimuth": 265,
    "checked_at": "2026-04-14T00:00:00Z",
    "notes": "Flat lava field. No terrain obstructions. Clear in all directions."
  }'::jsonb
WHERE slug = 'blue-lagoon';

-- Perlan Observation Deck
UPDATE viewing_spots
SET
  warnings = '[
    "Paid admission required (Perlan museum ticket)",
    "Likely selling eclipse-specific event tickets — check perlan.is",
    "Will be very crowded — the observation deck has limited capacity",
    "Shorter totality (~1m) compared to spots further west",
    "Book admission well in advance"
  ]'::jsonb,
  nearby_poi = '[
    "Perlan Wonders of Iceland museum",
    "Planetarium show",
    "Indoor ice cave exhibit",
    "Öskjuhlíð forest and walking paths",
    "Nauthólsvík geothermal beach (10 min walk)",
    "Downtown Reykjavík (15 min walk)"
  ]'::jsonb,
  horizon_check = '{
    "verdict": "clear",
    "clearance_degrees": 23.0,
    "max_horizon_angle": 1.5,
    "blocking_distance_m": null,
    "blocking_elevation_m": null,
    "sun_altitude": 24.5,
    "sun_azimuth": 265,
    "checked_at": "2026-04-14T00:00:00Z",
    "notes": "Elevated hilltop. 360° observation deck. Clear western horizon over Faxaflói bay."
  }'::jsonb
WHERE slug = 'perlan-reykjavik';

-- Sky Lagoon
UPDATE viewing_spots
SET
  warnings = '[
    "TICKETS REQUIRED — Sky Lagoon requires pre-booked admission",
    "Likely selling special eclipse event tickets — check skylagoon.com",
    "Very limited capacity — book extremely early",
    "Shortest totality on our list (~58s) — you''re trading duration for a unique experience",
    "Premium pricing expected for eclipse event"
  ]'::jsonb,
  nearby_poi = '[
    "Sky Lagoon geothermal infinity pool",
    "7-step spa ritual",
    "Kársnes harbour area",
    "Downtown Reykjavík (10 min drive)",
    "Grótta Lighthouse (15 min drive — longer totality alternative)"
  ]'::jsonb,
  horizon_check = '{
    "verdict": "clear",
    "clearance_degrees": 24.0,
    "max_horizon_angle": 0.5,
    "blocking_distance_m": null,
    "blocking_elevation_m": null,
    "sun_altitude": 24.5,
    "sun_azimuth": 265,
    "checked_at": "2026-04-14T00:00:00Z",
    "notes": "Oceanfront infinity pool facing west. Open Faxaflói bay. Perfect alignment with eclipse sun direction."
  }'::jsonb
WHERE slug = 'sky-lagoon';

COMMIT;
