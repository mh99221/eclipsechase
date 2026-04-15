-- =============================================================================
-- update-spots-v4.sql
-- =============================================================================
-- Comprehensive migration script to fix bugs identified in the spots data audit.
--
-- Sections:
--   A) Fix totality_duration_seconds on 4 more spots (BUG 5)
--   B) Fix clearance_degrees/max_horizon_angle on Látrabjarg + clamp others (BUG 3)
--   C) Update sun_azimuth from ~249 to 265 globally (BUG 4)
--   D) Add warnings arrays to 17 spots (BUG 2)
-- =============================================================================

BEGIN;

-- =============================================================================
-- SECTION A: Fix totality_duration_seconds on 4 more spots (BUG 5)
-- =============================================================================

UPDATE viewing_spots SET totality_duration_seconds = 128 WHERE slug = 'saxholl-crater';
UPDATE viewing_spots SET totality_duration_seconds = 130 WHERE slug = 'snaefellsjokull-summit';
UPDATE viewing_spots SET totality_duration_seconds = 130 WHERE slug = 'djupalonssandur-beach';
UPDATE viewing_spots SET totality_duration_seconds = 110 WHERE slug = 'kirkjufell-viewpoint';


-- =============================================================================
-- SECTION B: Fix clearance_degrees / max_horizon_angle (BUG 3)
-- =============================================================================
-- The Látrabjarg clifftop looks DOWN at the ocean (~440m above sea level), so
-- horizon_angle should be near 0 (not negative). Clearance should be ~24°
-- (the full sun altitude at totality).

UPDATE viewing_spots
SET horizon_check = jsonb_set(
  jsonb_set(
    horizon_check,
    '{max_horizon_angle}', '0.6'::jsonb
  ),
  '{clearance_degrees}', '23.4'::jsonb
)
WHERE slug = 'latrabjarg-cliffs';

-- Clamp any OTHER spots where clearance_degrees > 24.5 so they don't exceed
-- the sun altitude (24°). Also ensures max_horizon_angle is not negative.
UPDATE viewing_spots
SET horizon_check = jsonb_set(
  jsonb_set(
    horizon_check,
    '{clearance_degrees}', to_jsonb(LEAST(24.0, (horizon_check->>'clearance_degrees')::float))
  ),
  '{max_horizon_angle}', to_jsonb(GREATEST(0.0, (horizon_check->>'max_horizon_angle')::float))
)
WHERE (horizon_check->>'clearance_degrees')::float > 24.5;


-- =============================================================================
-- SECTION C: Update sun_azimuth from 249 to 265 globally (BUG 4)
-- =============================================================================
-- Skyfield-computed azimuth is ~265° WSW, not 249°. Earlier data was incorrect.

-- Update top-level sun_azimuth column
UPDATE viewing_spots SET sun_azimuth = 265 WHERE sun_azimuth < 260;

-- Update sun_azimuth inside horizon_check JSONB
UPDATE viewing_spots
SET horizon_check = jsonb_set(
  horizon_check,
  '{sun_azimuth}', '265'::jsonb
)
WHERE horizon_check IS NOT NULL
  AND (horizon_check->>'sun_azimuth')::float < 260;


-- =============================================================================
-- SECTION D: Add warnings to 17 spots (BUG 2)
-- =============================================================================

-- latrabjarg-cliffs
UPDATE viewing_spots SET warnings = '[
  "Very remote: 2.5 hour drive from Patreksfjörður on unpaved gravel road",
  "No services, no cell coverage, no toilets — bring everything you need",
  "No shelter from wind or rain — dress in full windproof layers",
  "Cliff edges are unfenced and dangerously steep — stay well back",
  "Very limited parking (~20 cars) — arrive early on eclipse day"
]'::jsonb
WHERE slug = 'latrabjarg-cliffs';

-- breidavik-beach
UPDATE viewing_spots SET warnings = '[
  "Remote: 2 hour drive from Patreksfjörður on partly unpaved road",
  "Only service is Hotel Breiðavík — book accommodation well in advance",
  "No cell coverage — download offline maps before arrival",
  "Exposed to Atlantic winds — dress warmly"
]'::jsonb
WHERE slug = 'breidavik-beach';

-- snaefellsjokull-summit
UPDATE viewing_spots SET warnings = '[
  "⚠️ ADVANCED MOUNTAINEERS ONLY: Requires guided glacier tour with crampons and ice axes",
  "5–8 hour round trip hike — must start very early to reach summit before eclipse (17:45 UTC)",
  "Cloud risk is HIGHER at 1,446m than at sea level — you may climb into fog and miss the eclipse entirely",
  "Weather extremely unpredictable at summit altitude — high wind, low temperatures, whiteout possible",
  "Guided glacier tours must be booked well in advance"
]'::jsonb
WHERE slug = 'snaefellsjokull-summit';

-- grotta-lighthouse-reykjavik
UPDATE viewing_spots SET warnings = '[
  "Will be EXTREMELY crowded — potentially thousands of people from the entire Reykjavík metro area",
  "Causeway to the lighthouse island is ONLY accessible at low tide — check August 12 tide table",
  "Parking fills very early — consider walking or biking from Seltjarnarnes",
  "Shorter totality (~1m 6s) compared to spots further west — consider driving to Reykjanes for ~1m 40s"
]'::jsonb
WHERE slug = 'grotta-lighthouse-reykjavik';

-- reykjanesta-lighthouse
UPDATE viewing_spots SET warnings = '[
  "⚠️ ACTIVE VOLCANIC ZONE: Check eruption status at safetravel.is before visiting",
  "Roads to the lighthouse may be closed due to volcanic activity in the Sundhnúkur crater row",
  "No services at the lighthouse — bring supplies",
  "Rocky lava terrain — wear sturdy footwear"
]'::jsonb
WHERE slug = 'reykjanesta-lighthouse';

-- saxholl-crater
UPDATE viewing_spots SET warnings = '[
  "Extremely wind-exposed at the crater rim — secure all equipment and cameras",
  "Very limited parking (~15 cars at crater base) — arrive early",
  "Metal staircase (~400 steps) can be slippery when wet",
  "No shelter or services at the crater"
]'::jsonb
WHERE slug = 'saxholl-crater';

-- djupalonssandur-beach
UPDATE viewing_spots SET warnings = '[
  "Inside Snæfellsjökull National Park — expect significant crowds on eclipse day",
  "No services at the beach — toilets at parking lot only",
  "Short but rocky walk down from parking to beach — wear sturdy footwear",
  "Beach surface is black pebbles, not sand — bring a chair or blanket"
]'::jsonb
WHERE slug = 'djupalonssandur-beach';

-- arnarstapi-coastal-platform
UPDATE viewing_spots SET warnings = '[
  "Popular tourist stop — expect significant crowds on eclipse day",
  "Cliff edges along the coastal path are unfenced — watch children and step carefully",
  "Parking is limited — consider arriving well before eclipse time"
]'::jsonb
WHERE slug = 'arnarstapi-coastal-platform';

-- budir-black-church
UPDATE viewing_spots SET warnings = '[
  "Hotel Búðir parking is prioritized for hotel guests — park along the road if lot is full",
  "Búðakirkja is an active church — be respectful if any services are held",
  "Limited parking (~20 cars) — arrive early on eclipse day"
]'::jsonb
WHERE slug = 'budir-black-church';

-- gardur-lighthouse
UPDATE viewing_spots SET warnings = '[
  "Very wind-exposed coastal tip — secure equipment and dress in windproof layers",
  "Will be popular due to proximity to Keflavík Airport — expect crowds",
  "Best Reykjanes viewing spot — parking (~40 cars) may fill on eclipse day"
]'::jsonb
WHERE slug = 'gardur-lighthouse';

-- sandgerdi-shore
UPDATE viewing_spots SET warnings = '[
  "Less scenic than nearby Garður lighthouse — but likely less crowded"
]'::jsonb
WHERE slug = 'sandgerdi-shore';

-- keflavik-asbru-viewpoint
UPDATE viewing_spots SET warnings = '[
  "Functional rather than scenic — former military base area",
  "Choose an open area away from Ásbrú campus buildings for unobstructed western view",
  "Most convenient spot for travelers arriving or departing from KEF airport"
]'::jsonb
WHERE slug = 'keflavik-asbru-viewpoint';

-- rif-harbour-snaefellsnes
UPDATE viewing_spots SET warnings = '[
  "Very small village (~100 population) — extremely limited accommodation",
  "The Freezer Hostel may host eclipse events — check in advance"
]'::jsonb
WHERE slug = 'rif-harbour-snaefellsnes';

-- hellissandur-village
UPDATE viewing_spots SET warnings = '[
  "Small village (~380 population) — limited food options and accommodation",
  "Book accommodation well in advance — beds will sell out for eclipse week"
]'::jsonb
WHERE slug = 'hellissandur-village';

-- olafsvik-harbour
UPDATE viewing_spots SET warnings = '[
  "Best-serviced town on northern Snæfellsnes — grocery store (Samkaup), restaurants, fuel",
  "Harbor area will likely be the main gathering point — arrive early for best position"
]'::jsonb
WHERE slug = 'olafsvik-harbour';

-- stykkisholmur-harbour-hill
UPDATE viewing_spots SET warnings = '[
  "Best-serviced town on Snæfellsnes — hotels, restaurants, grocery, Baldur ferry terminal",
  "Shorter totality (~1m 28s) than western Snæfellsnes spots — trade-off is excellent logistics",
  "Walk up to Súgandisey island/hill for the best elevated panoramic viewpoint"
]'::jsonb
WHERE slug = 'stykkisholmur-harbour-hill';

-- akranes-lighthouse
UPDATE viewing_spots SET warnings = '[
  "Only ~1 minute of totality — but very accessible (45 min from Reykjavík via Hvalfjörður tunnel)",
  "Town has full services — restaurants, grocery store, swimming pool"
]'::jsonb
WHERE slug = 'akranes-lighthouse';

COMMIT;
