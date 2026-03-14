-- Seed curated viewing spots for the 2026 Iceland eclipse (v2 — 28 spots with hiking trails)
-- Run AFTER migrate-spots-add-hiking.sql
-- Run in Supabase SQL Editor

-- ============================================================================
-- WESTFJORDS (8 spots)
-- ============================================================================

INSERT INTO viewing_spots (id, name, slug, lat, lng, region, description, parking_info, terrain_notes, has_services, cell_coverage, totality_duration_seconds, totality_start, sun_altitude, sun_azimuth, spot_type) VALUES
('isafjordur', 'Ísafjörður Harbour Flat', 'isafjordur-harbour',
  66.0752, -23.1352, 'westfjords',
  'The harbour flat at Ísafjörður offers a wide open western horizon across the fjord mouth. As the largest town in the Westfjords, it combines accessibility with a near-central totality path position. The surrounding mountains frame the sky to the east but leave the crucial western quadrant fully open.',
  'Large public parking on the harbour flat (Pollurinn area). Free, paved surface.',
  'Flat reclaimed harbour land and paved quayside. No obstacles to the west.',
  true, 'good', 91, '2026-08-12T17:44:30Z', 24, 249, 'drive-up')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, slug=EXCLUDED.slug, lat=EXCLUDED.lat, lng=EXCLUDED.lng, region=EXCLUDED.region, description=EXCLUDED.description, parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes, has_services=EXCLUDED.has_services, cell_coverage=EXCLUDED.cell_coverage, totality_duration_seconds=EXCLUDED.totality_duration_seconds, totality_start=EXCLUDED.totality_start, sun_altitude=EXCLUDED.sun_altitude, sun_azimuth=EXCLUDED.sun_azimuth, spot_type=EXCLUDED.spot_type;

INSERT INTO viewing_spots (id, name, slug, lat, lng, region, description, parking_info, terrain_notes, has_services, cell_coverage, totality_duration_seconds, totality_start, sun_altitude, sun_azimuth, spot_type) VALUES
('dynjandi', 'Dynjandi Viewpoint', 'dynjandi-arnarfjordur',
  65.7328, -23.1793, 'westfjords',
  'The parking area at the base of iconic Dynjandi waterfall sits at the head of Arnarfjörður, one of the widest fjords in the Westfjords. The fjord opens directly to the west, providing a clear low horizon toward the ocean. Close to the central line where duration approaches the maximum for Iceland.',
  'Dedicated gravel car park at end of Route 60 spur road, ~50 vehicles. Free.',
  'Flat gravel parking area and grassy meadow at fjord head. Waterfall backdrop.',
  false, 'limited', 138, '2026-08-12T17:45:10Z', 24, 249, 'drive-up')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, slug=EXCLUDED.slug, lat=EXCLUDED.lat, lng=EXCLUDED.lng, region=EXCLUDED.region, description=EXCLUDED.description, parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes, has_services=EXCLUDED.has_services, cell_coverage=EXCLUDED.cell_coverage, totality_duration_seconds=EXCLUDED.totality_duration_seconds, totality_start=EXCLUDED.totality_start, sun_altitude=EXCLUDED.sun_altitude, sun_azimuth=EXCLUDED.sun_azimuth, spot_type=EXCLUDED.spot_type;

INSERT INTO viewing_spots (id, name, slug, lat, lng, region, description, parking_info, terrain_notes, has_services, cell_coverage, totality_duration_seconds, totality_start, sun_altitude, sun_azimuth, spot_type) VALUES
('thingeyri', 'Þingeyri Village Shore', 'thingeyri-shore',
  65.8726, -23.5020, 'westfjords',
  'Þingeyri sits on the south shore of Dýrafjörður, which runs almost perfectly east-west. The fjord acts as a natural viewing corridor pointing directly toward the open ocean — perfectly aligned with the sun''s position at totality. Near the central line for close to maximum duration.',
  'Open gravel and grass area along the shore road. Informal parking, no restrictions.',
  'Flat coastal strip with gravel shore. Fjord opens to the west with no obstructions.',
  true, 'good', 135, '2026-08-12T17:45:05Z', 24, 249, 'drive-up')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, slug=EXCLUDED.slug, lat=EXCLUDED.lat, lng=EXCLUDED.lng, region=EXCLUDED.region, description=EXCLUDED.description, parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes, has_services=EXCLUDED.has_services, cell_coverage=EXCLUDED.cell_coverage, totality_duration_seconds=EXCLUDED.totality_duration_seconds, totality_start=EXCLUDED.totality_start, sun_altitude=EXCLUDED.sun_altitude, sun_azimuth=EXCLUDED.sun_azimuth, spot_type=EXCLUDED.spot_type;

INSERT INTO viewing_spots (id, name, slug, lat, lng, region, description, parking_info, terrain_notes, has_services, cell_coverage, totality_duration_seconds, totality_start, sun_altitude, sun_azimuth, spot_type) VALUES
('patreksfjordur', 'Patreksfjörður Beach', 'patreksfjordur-beach',
  65.5955, -23.9752, 'westfjords',
  'Patreksfjörður sits near the outer Westfjords with excellent road access via Route 62. The beach provides a flat sandy viewing area with the fjord mouth opening to the west-southwest. The town has petrol and basic services, making it a practical base for eclipse visitors.',
  'Street parking through town is free. Flat grassy area near the harbour for informal viewing.',
  'Sandy beach and flat harbour area. Western fjord view unobstructed.',
  true, 'good', 130, '2026-08-12T17:45:20Z', 24, 249, 'drive-up')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, slug=EXCLUDED.slug, lat=EXCLUDED.lat, lng=EXCLUDED.lng, region=EXCLUDED.region, description=EXCLUDED.description, parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes, has_services=EXCLUDED.has_services, cell_coverage=EXCLUDED.cell_coverage, totality_duration_seconds=EXCLUDED.totality_duration_seconds, totality_start=EXCLUDED.totality_start, sun_altitude=EXCLUDED.sun_altitude, sun_azimuth=EXCLUDED.sun_azimuth, spot_type=EXCLUDED.spot_type;

INSERT INTO viewing_spots (id, name, slug, lat, lng, region, description, parking_info, terrain_notes, has_services, cell_coverage, totality_duration_seconds, totality_start, sun_altitude, sun_azimuth, spot_type) VALUES
('flateyri', 'Flateyri Shore', 'flateyri-shore',
  66.0500, -23.5167, 'westfjords',
  'Small village in Önundarfjörður with a flat sandy spit extending into the fjord. The fjord opens to the west, giving an unobstructed view toward the eclipsed sun. Close to Ísafjörður (20 min drive) for backup services.',
  'Informal parking along the village road and near the shore. Free.',
  'Flat sandy spit and gravel beach. Open fjord view to the west.',
  true, 'good', 90, '2026-08-12T17:44:35Z', 24, 249, 'drive-up')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, slug=EXCLUDED.slug, lat=EXCLUDED.lat, lng=EXCLUDED.lng, region=EXCLUDED.region, description=EXCLUDED.description, parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes, has_services=EXCLUDED.has_services, cell_coverage=EXCLUDED.cell_coverage, totality_duration_seconds=EXCLUDED.totality_duration_seconds, totality_start=EXCLUDED.totality_start, sun_altitude=EXCLUDED.sun_altitude, sun_azimuth=EXCLUDED.sun_azimuth, spot_type=EXCLUDED.spot_type;

INSERT INTO viewing_spots (id, name, slug, lat, lng, region, description, parking_info, terrain_notes, has_services, cell_coverage, totality_duration_seconds, totality_start, sun_altitude, sun_azimuth, spot_type) VALUES
('sudureyri', 'Suðureyri Harbour', 'sudureyri-harbour',
  66.1311, -23.5272, 'westfjords',
  'A quiet fishing village on Súgandafjörður. The harbour offers a flat, open viewing area with the fjord mouth opening to the west. Population ~300 with basic services.',
  'Small harbour parking area. Free.',
  'Flat harbour quay and gravel shore.',
  true, 'limited', 88, '2026-08-12T17:44:30Z', 24, 249, 'drive-up')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, slug=EXCLUDED.slug, lat=EXCLUDED.lat, lng=EXCLUDED.lng, region=EXCLUDED.region, description=EXCLUDED.description, parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes, has_services=EXCLUDED.has_services, cell_coverage=EXCLUDED.cell_coverage, totality_duration_seconds=EXCLUDED.totality_duration_seconds, totality_start=EXCLUDED.totality_start, sun_altitude=EXCLUDED.sun_altitude, sun_azimuth=EXCLUDED.sun_azimuth, spot_type=EXCLUDED.spot_type;

INSERT INTO viewing_spots (id, name, slug, lat, lng, region, description, parking_info, terrain_notes, has_services, cell_coverage, totality_duration_seconds, totality_start, sun_altitude, sun_azimuth, spot_type) VALUES
('bildudalur', 'Bíldudalur Harbour', 'bildudalur-harbour',
  65.6859, -23.5989, 'westfjords',
  'Village on the coast of Arnarfjörður, one of the widest fjords in the Westfjords. Near the eclipse centerline with excellent totality duration. The fjord opens to the west. Home to the Icelandic Sea Monster Museum.',
  'Street parking near the harbour. Free.',
  'Flat harbour area and coastal road with open fjord views.',
  true, 'good', 133, '2026-08-12T17:45:15Z', 24, 249, 'drive-up')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, slug=EXCLUDED.slug, lat=EXCLUDED.lat, lng=EXCLUDED.lng, region=EXCLUDED.region, description=EXCLUDED.description, parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes, has_services=EXCLUDED.has_services, cell_coverage=EXCLUDED.cell_coverage, totality_duration_seconds=EXCLUDED.totality_duration_seconds, totality_start=EXCLUDED.totality_start, sun_altitude=EXCLUDED.sun_altitude, sun_azimuth=EXCLUDED.sun_azimuth, spot_type=EXCLUDED.spot_type;

INSERT INTO viewing_spots (id, name, slug, lat, lng, region, description, parking_info, terrain_notes, has_services, cell_coverage, totality_duration_seconds, totality_start, sun_altitude, sun_azimuth, spot_type) VALUES
('breidavik', 'Breiðavík Beach', 'breidavik-beach',
  65.5493, -24.3696, 'westfjords',
  'A stunning golden sand beach near Látrabjarg, facing west toward the open Atlantic. One of the closest mainland points to the eclipse centerline. Completely unobstructed western horizon. No services — bring everything you need.',
  'Small gravel car park at the beach. Free.',
  'Golden sand beach, flat and open. Exposed to Atlantic winds.',
  false, 'none', 130, '2026-08-12T17:45:25Z', 24, 249, 'drive-up')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, slug=EXCLUDED.slug, lat=EXCLUDED.lat, lng=EXCLUDED.lng, region=EXCLUDED.region, description=EXCLUDED.description, parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes, has_services=EXCLUDED.has_services, cell_coverage=EXCLUDED.cell_coverage, totality_duration_seconds=EXCLUDED.totality_duration_seconds, totality_start=EXCLUDED.totality_start, sun_altitude=EXCLUDED.sun_altitude, sun_azimuth=EXCLUDED.sun_azimuth, spot_type=EXCLUDED.spot_type;

-- ============================================================================
-- SNÆFELLSNES (9 spots)
-- ============================================================================

INSERT INTO viewing_spots (id, name, slug, lat, lng, region, description, parking_info, terrain_notes, has_services, cell_coverage, totality_duration_seconds, totality_start, sun_altitude, sun_azimuth, spot_type) VALUES
('rif', 'Rif Harbour', 'rif-harbour-snaefellsnes',
  64.9155, -23.8208, 'snaefellsnes',
  'The fishing village of Rif on the north shore of Snæfellsnes offers an open ocean view to the north-west from its harbour flat. Snæfellsjökull glacier looms to the south as a dramatic backdrop. Within the central totality path with open horizon for the low-angle eclipse sun.',
  'Flat gravel harbour area with ample informal parking. Free.',
  'Flat gravel harbour quay and open ground. Firm gravel and concrete.',
  true, 'good', 120, '2026-08-12T17:46:00Z', 24, 249, 'drive-up')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, slug=EXCLUDED.slug, lat=EXCLUDED.lat, lng=EXCLUDED.lng, region=EXCLUDED.region, description=EXCLUDED.description, parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes, has_services=EXCLUDED.has_services, cell_coverage=EXCLUDED.cell_coverage, totality_duration_seconds=EXCLUDED.totality_duration_seconds, totality_start=EXCLUDED.totality_start, sun_altitude=EXCLUDED.sun_altitude, sun_azimuth=EXCLUDED.sun_azimuth, spot_type=EXCLUDED.spot_type;

INSERT INTO viewing_spots (id, name, slug, lat, lng, region, description, parking_info, terrain_notes, has_services, cell_coverage, totality_duration_seconds, totality_start, sun_altitude, sun_azimuth, spot_type) VALUES
('arnarstapi', 'Arnarstapi Coastal Platform', 'arnarstapi-coastal-platform',
  64.7663, -23.6340, 'snaefellsnes',
  'A dramatic coastal village at the foot of Snæfellsjökull. The flat lava shelf extending into the ocean provides a wide-open western horizon. The famous sea arch Gatklettur and black basalt stacks create a spectacular eclipse-watching environment.',
  'Designated gravel car park at the coastal walk start. Free, ~60-80 vehicles.',
  'Flat to gently undulating lava shelf. Some rocky ground near cliffs.',
  true, 'good', 110, '2026-08-12T17:46:10Z', 24, 249, 'drive-up')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, slug=EXCLUDED.slug, lat=EXCLUDED.lat, lng=EXCLUDED.lng, region=EXCLUDED.region, description=EXCLUDED.description, parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes, has_services=EXCLUDED.has_services, cell_coverage=EXCLUDED.cell_coverage, totality_duration_seconds=EXCLUDED.totality_duration_seconds, totality_start=EXCLUDED.totality_start, sun_altitude=EXCLUDED.sun_altitude, sun_azimuth=EXCLUDED.sun_azimuth, spot_type=EXCLUDED.spot_type;

INSERT INTO viewing_spots (id, name, slug, lat, lng, region, description, parking_info, terrain_notes, has_services, cell_coverage, totality_duration_seconds, totality_start, sun_altitude, sun_azimuth, spot_type) VALUES
('stykkisholmur', 'Stykkishólmur Harbour Hill', 'stykkisholmur-harbour-hill',
  65.0776, -22.7242, 'snaefellsnes',
  'The largest town on Snæfellsnes, situated on Breiðafjörður bay. The rocky hill of Súgandisey island provides 360° views including a clear western horizon over the island-dotted bay. Excellent services including hotels, restaurants, and petrol.',
  'Town centre parking is free. Car park near harbour with walking access to Súgandisey.',
  'Rocky basalt hill (~20m) with stairs. Flat viewing platform at summit. Harbour below is fully paved.',
  true, 'good', 95, '2026-08-12T17:46:20Z', 24, 249, 'drive-up')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, slug=EXCLUDED.slug, lat=EXCLUDED.lat, lng=EXCLUDED.lng, region=EXCLUDED.region, description=EXCLUDED.description, parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes, has_services=EXCLUDED.has_services, cell_coverage=EXCLUDED.cell_coverage, totality_duration_seconds=EXCLUDED.totality_duration_seconds, totality_start=EXCLUDED.totality_start, sun_altitude=EXCLUDED.sun_altitude, sun_azimuth=EXCLUDED.sun_azimuth, spot_type=EXCLUDED.spot_type;

INSERT INTO viewing_spots (id, name, slug, lat, lng, region, description, parking_info, terrain_notes, has_services, cell_coverage, totality_duration_seconds, totality_start, sun_altitude, sun_azimuth, spot_type) VALUES
('olafsvik', 'Ólafsvík Harbour', 'olafsvik-harbour',
  64.8943, -23.7092, 'snaefellsnes',
  'A small fishing town on the north coast of Snæfellsnes. The harbour area provides a flat viewing platform with Snæfellsjökull glacier rising to the south. Open ocean view to the north and west.',
  'Free parking near the harbour and along the main road.',
  'Flat harbour area and coastal road. Open views to the north and west.',
  true, 'good', 115, '2026-08-12T17:46:00Z', 24, 249, 'drive-up')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, slug=EXCLUDED.slug, lat=EXCLUDED.lat, lng=EXCLUDED.lng, region=EXCLUDED.region, description=EXCLUDED.description, parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes, has_services=EXCLUDED.has_services, cell_coverage=EXCLUDED.cell_coverage, totality_duration_seconds=EXCLUDED.totality_duration_seconds, totality_start=EXCLUDED.totality_start, sun_altitude=EXCLUDED.sun_altitude, sun_azimuth=EXCLUDED.sun_azimuth, spot_type=EXCLUDED.spot_type;

INSERT INTO viewing_spots (id, name, slug, lat, lng, region, description, parking_info, terrain_notes, has_services, cell_coverage, totality_duration_seconds, totality_start, sun_altitude, sun_azimuth, spot_type) VALUES
('hellissandur', 'Hellissandur Village', 'hellissandur-village',
  64.9176, -23.8856, 'snaefellsnes',
  'The westernmost village on the Snæfellsnes peninsula, at the foot of Snæfellsjökull. Open views to the north and west from the village outskirts. The old radio mast nearby is a local landmark.',
  'Free parking in the village centre and near the old radio mast.',
  'Flat ground with open views. Sheltered from south winds by Snæfellsjökull.',
  true, 'good', 118, '2026-08-12T17:45:55Z', 24, 249, 'drive-up')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, slug=EXCLUDED.slug, lat=EXCLUDED.lat, lng=EXCLUDED.lng, region=EXCLUDED.region, description=EXCLUDED.description, parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes, has_services=EXCLUDED.has_services, cell_coverage=EXCLUDED.cell_coverage, totality_duration_seconds=EXCLUDED.totality_duration_seconds, totality_start=EXCLUDED.totality_start, sun_altitude=EXCLUDED.sun_altitude, sun_azimuth=EXCLUDED.sun_azimuth, spot_type=EXCLUDED.spot_type;

INSERT INTO viewing_spots (id, name, slug, lat, lng, region, description, parking_info, terrain_notes, has_services, cell_coverage, totality_duration_seconds, totality_start, sun_altitude, sun_azimuth, spot_type) VALUES
('budir', 'Búðir Black Church', 'budir-black-church',
  64.8217, -23.3840, 'snaefellsnes',
  'The iconic black wooden church at Búðir sits on an open lava field with sweeping views to the west across Faxaflói bay. The stark contrast of the black church against the darkened eclipse sky makes this a photographer''s dream spot. Hotel Búðir provides upscale services nearby.',
  'Parking at Hotel Búðir and near the church. Free.',
  'Open lava field with mossy ground. Flat terrain around the church.',
  true, 'limited', 105, '2026-08-12T17:46:15Z', 24, 249, 'drive-up')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, slug=EXCLUDED.slug, lat=EXCLUDED.lat, lng=EXCLUDED.lng, region=EXCLUDED.region, description=EXCLUDED.description, parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes, has_services=EXCLUDED.has_services, cell_coverage=EXCLUDED.cell_coverage, totality_duration_seconds=EXCLUDED.totality_duration_seconds, totality_start=EXCLUDED.totality_start, sun_altitude=EXCLUDED.sun_altitude, sun_azimuth=EXCLUDED.sun_azimuth, spot_type=EXCLUDED.spot_type;

-- Snæfellsnes hiking spots

INSERT INTO viewing_spots (id, name, slug, lat, lng, region, description, parking_info, terrain_notes, has_services, cell_coverage, totality_duration_seconds, totality_start, sun_altitude, sun_azimuth, spot_type, trail_distance_km, trail_time_minutes, difficulty, elevation_gain_m, trailhead_lat, trailhead_lng) VALUES
('kirkjufell', 'Kirkjufell Viewpoint', 'kirkjufell-viewpoint',
  64.9403, -23.3073, 'snaefellsnes',
  'Iceland''s most photographed mountain makes a spectacular eclipse backdrop. A 5-minute walk from the parking area to the classic viewpoint with Kirkjufellsfoss waterfall in the foreground and the iconic arrowhead peak behind. Totality silhouetting Kirkjufell will be unforgettable.',
  'Large parking lot at Kirkjufellsfoss. Free, paved.',
  'Well-maintained gravel path from parking to viewpoint. Mostly flat.',
  true, 'good', 100, '2026-08-12T17:46:20Z', 24, 249,
  'short-walk', 0.3, 5, 'easy', 10, 64.9394, -23.3110)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, slug=EXCLUDED.slug, lat=EXCLUDED.lat, lng=EXCLUDED.lng, region=EXCLUDED.region, description=EXCLUDED.description, parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes, has_services=EXCLUDED.has_services, cell_coverage=EXCLUDED.cell_coverage, totality_duration_seconds=EXCLUDED.totality_duration_seconds, totality_start=EXCLUDED.totality_start, sun_altitude=EXCLUDED.sun_altitude, sun_azimuth=EXCLUDED.sun_azimuth, spot_type=EXCLUDED.spot_type, trail_distance_km=EXCLUDED.trail_distance_km, trail_time_minutes=EXCLUDED.trail_time_minutes, difficulty=EXCLUDED.difficulty, elevation_gain_m=EXCLUDED.elevation_gain_m, trailhead_lat=EXCLUDED.trailhead_lat, trailhead_lng=EXCLUDED.trailhead_lng;

INSERT INTO viewing_spots (id, name, slug, lat, lng, region, description, parking_info, terrain_notes, has_services, cell_coverage, totality_duration_seconds, totality_start, sun_altitude, sun_azimuth, spot_type, trail_distance_km, trail_time_minutes, difficulty, elevation_gain_m, trailhead_lat, trailhead_lng) VALUES
('djupalonssandur', 'Djúpalónssandur Beach', 'djupalonssandur-beach',
  64.7535, -23.8952, 'snaefellsnes',
  'Black lava pebble beach on the western tip of Snæfellsnes, inside Snæfellsjökull National Park. A short walk from parking through lava formations to the dramatic beach. Faces due west — perfect alignment for the eclipsed sun at 249° azimuth. Restrooms at parking.',
  'Paved parking area at the trailhead. Free, restrooms available.',
  'Gravel path through lava formations, gentle descent to beach. Some uneven footing.',
  false, 'limited', 112, '2026-08-12T17:46:05Z', 24, 249,
  'short-walk', 0.4, 10, 'easy', 30, 64.7548, -23.8930)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, slug=EXCLUDED.slug, lat=EXCLUDED.lat, lng=EXCLUDED.lng, region=EXCLUDED.region, description=EXCLUDED.description, parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes, has_services=EXCLUDED.has_services, cell_coverage=EXCLUDED.cell_coverage, totality_duration_seconds=EXCLUDED.totality_duration_seconds, totality_start=EXCLUDED.totality_start, sun_altitude=EXCLUDED.sun_altitude, sun_azimuth=EXCLUDED.sun_azimuth, spot_type=EXCLUDED.spot_type, trail_distance_km=EXCLUDED.trail_distance_km, trail_time_minutes=EXCLUDED.trail_time_minutes, difficulty=EXCLUDED.difficulty, elevation_gain_m=EXCLUDED.elevation_gain_m, trailhead_lat=EXCLUDED.trailhead_lat, trailhead_lng=EXCLUDED.trailhead_lng;

INSERT INTO viewing_spots (id, name, slug, lat, lng, region, description, parking_info, terrain_notes, has_services, cell_coverage, totality_duration_seconds, totality_start, sun_altitude, sun_azimuth, spot_type, trail_distance_km, trail_time_minutes, difficulty, elevation_gain_m, trailhead_lat, trailhead_lng) VALUES
('saxholl', 'Saxhóll Crater', 'saxholl-crater',
  64.8509, -23.9246, 'snaefellsnes',
  'A scoria crater with a well-maintained metal staircase (~400 steps) leading to the rim. The 360° panoramic view from the top includes Snæfellsjökull glacier, the Atlantic Ocean, and surrounding lava fields. Watching totality from inside a volcanic crater is a once-in-a-lifetime experience.',
  'Gravel parking at the base of the crater. Free.',
  'Metal staircase to rim is well-maintained. Can be windy at the top.',
  false, 'limited', 115, '2026-08-12T17:45:55Z', 24, 249,
  'short-walk', 0.2, 10, 'easy', 100, 64.8520, -23.9260)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, slug=EXCLUDED.slug, lat=EXCLUDED.lat, lng=EXCLUDED.lng, region=EXCLUDED.region, description=EXCLUDED.description, parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes, has_services=EXCLUDED.has_services, cell_coverage=EXCLUDED.cell_coverage, totality_duration_seconds=EXCLUDED.totality_duration_seconds, totality_start=EXCLUDED.totality_start, sun_altitude=EXCLUDED.sun_altitude, sun_azimuth=EXCLUDED.sun_azimuth, spot_type=EXCLUDED.spot_type, trail_distance_km=EXCLUDED.trail_distance_km, trail_time_minutes=EXCLUDED.trail_time_minutes, difficulty=EXCLUDED.difficulty, elevation_gain_m=EXCLUDED.elevation_gain_m, trailhead_lat=EXCLUDED.trailhead_lat, trailhead_lng=EXCLUDED.trailhead_lng;

INSERT INTO viewing_spots (id, name, slug, lat, lng, region, description, parking_info, terrain_notes, has_services, cell_coverage, totality_duration_seconds, totality_start, sun_altitude, sun_azimuth, spot_type, trail_distance_km, trail_time_minutes, difficulty, elevation_gain_m, trailhead_lat, trailhead_lng) VALUES
('snaefellsjokull', 'Snæfellsjökull Summit', 'snaefellsjokull-summit',
  64.8057, -23.7731, 'snaefellsnes',
  'The iconic 1,446m glacier-capped stratovolcano from Jules Verne''s Journey to the Centre of the Earth. The summit offers the highest vantage point on the Snæfellsnes peninsula with 360° views. IMPORTANT: Glacier travel requires crampons, ice axes, and a certified guide. Weather can change rapidly. Not recommended without professional mountaineering support.',
  'Parking at the F570 road end near the glacier edge. 4WD required.',
  'Glacier approach over ice and snow. Crevasse danger. Professional guide mandatory.',
  false, 'none', 113, '2026-08-12T17:46:00Z', 24, 249,
  'serious-hike', 4.0, 180, 'challenging', 760, 64.8200, -23.7400)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, slug=EXCLUDED.slug, lat=EXCLUDED.lat, lng=EXCLUDED.lng, region=EXCLUDED.region, description=EXCLUDED.description, parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes, has_services=EXCLUDED.has_services, cell_coverage=EXCLUDED.cell_coverage, totality_duration_seconds=EXCLUDED.totality_duration_seconds, totality_start=EXCLUDED.totality_start, sun_altitude=EXCLUDED.sun_altitude, sun_azimuth=EXCLUDED.sun_azimuth, spot_type=EXCLUDED.spot_type, trail_distance_km=EXCLUDED.trail_distance_km, trail_time_minutes=EXCLUDED.trail_time_minutes, difficulty=EXCLUDED.difficulty, elevation_gain_m=EXCLUDED.elevation_gain_m, trailhead_lat=EXCLUDED.trailhead_lat, trailhead_lng=EXCLUDED.trailhead_lng;

-- ============================================================================
-- BORGARFJÖRÐUR (4 spots)
-- ============================================================================

INSERT INTO viewing_spots (id, name, slug, lat, lng, region, description, parking_info, terrain_notes, has_services, cell_coverage, totality_duration_seconds, totality_start, sun_altitude, sun_azimuth, spot_type) VALUES
('borgarnes', 'Borgarnes Foreshore', 'borgarnes-foreshore',
  64.5383, -22.0000, 'borgarfjordur',
  'Borgarnes sits on a peninsula in Borgarfjörður, with the fjord opening west toward Snæfellsnes. Near the edge of the totality path so duration is brief (~40s), but the town has excellent services as a Ring Road 1 stopover. Consider driving north for longer totality.',
  'Multiple free car parks at the settlement museum and along the western shore road.',
  'Flat coastal grass and gravel beach on the western peninsula side. Accessible to all.',
  true, 'good', 40, '2026-08-12T17:47:00Z', 24, 249, 'drive-up')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, slug=EXCLUDED.slug, lat=EXCLUDED.lat, lng=EXCLUDED.lng, region=EXCLUDED.region, description=EXCLUDED.description, parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes, has_services=EXCLUDED.has_services, cell_coverage=EXCLUDED.cell_coverage, totality_duration_seconds=EXCLUDED.totality_duration_seconds, totality_start=EXCLUDED.totality_start, sun_altitude=EXCLUDED.sun_altitude, sun_azimuth=EXCLUDED.sun_azimuth, spot_type=EXCLUDED.spot_type;

INSERT INTO viewing_spots (id, name, slug, lat, lng, region, description, parking_info, terrain_notes, has_services, cell_coverage, totality_duration_seconds, totality_start, sun_altitude, sun_azimuth, spot_type) VALUES
('akranes', 'Akranes Lighthouse', 'akranes-lighthouse',
  64.3218, -22.0749, 'borgarfjordur',
  'A town at the tip of the Akranes peninsula with a lighthouse offering 270° ocean views. The western shore has a completely open horizon. Short totality (near the southern edge of the path) but excellent accessibility — only 45 minutes from Reykjavík via the Hvalfjörður tunnel.',
  'Free parking near the lighthouse and along the shore road.',
  'Flat coastal area near the lighthouse. Paved paths and gravel shore.',
  true, 'good', 42, '2026-08-12T17:47:10Z', 24, 249, 'drive-up')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, slug=EXCLUDED.slug, lat=EXCLUDED.lat, lng=EXCLUDED.lng, region=EXCLUDED.region, description=EXCLUDED.description, parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes, has_services=EXCLUDED.has_services, cell_coverage=EXCLUDED.cell_coverage, totality_duration_seconds=EXCLUDED.totality_duration_seconds, totality_start=EXCLUDED.totality_start, sun_altitude=EXCLUDED.sun_altitude, sun_azimuth=EXCLUDED.sun_azimuth, spot_type=EXCLUDED.spot_type;

INSERT INTO viewing_spots (id, name, slug, lat, lng, region, description, parking_info, terrain_notes, has_services, cell_coverage, totality_duration_seconds, totality_start, sun_altitude, sun_azimuth, spot_type) VALUES
('reykholt', 'Reykholt Snorrastofa', 'reykholt-snorrastofa',
  64.6657, -21.2871, 'borgarfjordur',
  'Historic site of Snorri Sturluson''s medieval estate, now home to the Snorrastofa cultural centre. Open valley views to the west. Very near the southern edge of totality so duration is brief, but the cultural significance and inland valley setting offer a unique viewing context.',
  'Free parking at the Snorrastofa cultural centre.',
  'Flat grassy area and paved paths around the cultural centre.',
  true, 'good', 38, '2026-08-12T17:47:05Z', 24, 249, 'drive-up')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, slug=EXCLUDED.slug, lat=EXCLUDED.lat, lng=EXCLUDED.lng, region=EXCLUDED.region, description=EXCLUDED.description, parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes, has_services=EXCLUDED.has_services, cell_coverage=EXCLUDED.cell_coverage, totality_duration_seconds=EXCLUDED.totality_duration_seconds, totality_start=EXCLUDED.totality_start, sun_altitude=EXCLUDED.sun_altitude, sun_azimuth=EXCLUDED.sun_azimuth, spot_type=EXCLUDED.spot_type;

INSERT INTO viewing_spots (id, name, slug, lat, lng, region, description, parking_info, terrain_notes, has_services, cell_coverage, totality_duration_seconds, totality_start, sun_altitude, sun_azimuth, spot_type, trail_distance_km, trail_time_minutes, difficulty, elevation_gain_m, trailhead_lat, trailhead_lng) VALUES
('glymur', 'Glymur Waterfall', 'glymur-waterfall',
  64.3917, -21.2506, 'borgarfjordur',
  'Iceland''s second-tallest waterfall (198m) at the head of Hvalfjörður. The hike involves river crossings and steep sections. The upper viewpoint offers a dramatic westward-facing vista down the fjord. Near the totality edge — very short duration, but an extraordinary setting for those who want a unique eclipse-hiking combo. Best June–September when log crossing is in place.',
  'Parking at the trailhead at the end of the Botnsdalur road. Free.',
  'Steep mountain trail with river crossings. Ropes and log bridges in places. Sturdy boots required.',
  false, 'limited', 35, '2026-08-12T17:47:15Z', 24, 249,
  'moderate-hike', 3.5, 90, 'moderate', 425, 64.3854, -21.2945)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, slug=EXCLUDED.slug, lat=EXCLUDED.lat, lng=EXCLUDED.lng, region=EXCLUDED.region, description=EXCLUDED.description, parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes, has_services=EXCLUDED.has_services, cell_coverage=EXCLUDED.cell_coverage, totality_duration_seconds=EXCLUDED.totality_duration_seconds, totality_start=EXCLUDED.totality_start, sun_altitude=EXCLUDED.sun_altitude, sun_azimuth=EXCLUDED.sun_azimuth, spot_type=EXCLUDED.spot_type, trail_distance_km=EXCLUDED.trail_distance_km, trail_time_minutes=EXCLUDED.trail_time_minutes, difficulty=EXCLUDED.difficulty, elevation_gain_m=EXCLUDED.elevation_gain_m, trailhead_lat=EXCLUDED.trailhead_lat, trailhead_lng=EXCLUDED.trailhead_lng;

-- ============================================================================
-- REYKJAVÍK (1 spot)
-- ============================================================================

INSERT INTO viewing_spots (id, name, slug, lat, lng, region, description, parking_info, terrain_notes, has_services, cell_coverage, totality_duration_seconds, totality_start, sun_altitude, sun_azimuth, spot_type) VALUES
('grotta', 'Grótta Lighthouse', 'grotta-lighthouse-reykjavik',
  64.1614, -22.0264, 'reykjavik',
  'A tidal islet at the westernmost point of Reykjavík''s Seltjarnarnes peninsula. Open ocean view to the west with no urban light pollution or buildings on the horizon. The best eclipse-watching location within the capital. Check tide tables — the islet may be inaccessible at high tide.',
  'Free car park at Grótta Nature Reserve entrance. ~30 spaces, 5-minute walk to lighthouse.',
  'Flat volcanic rock and gravel beach. Tidal crossing may be submerged — check tide tables for Aug 12.',
  false, 'good', 60, '2026-08-12T17:47:30Z', 24, 249, 'drive-up')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, slug=EXCLUDED.slug, lat=EXCLUDED.lat, lng=EXCLUDED.lng, region=EXCLUDED.region, description=EXCLUDED.description, parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes, has_services=EXCLUDED.has_services, cell_coverage=EXCLUDED.cell_coverage, totality_duration_seconds=EXCLUDED.totality_duration_seconds, totality_start=EXCLUDED.totality_start, sun_altitude=EXCLUDED.sun_altitude, sun_azimuth=EXCLUDED.sun_azimuth, spot_type=EXCLUDED.spot_type;

-- ============================================================================
-- REYKJANES (4 spots)
-- ============================================================================

INSERT INTO viewing_spots (id, name, slug, lat, lng, region, description, parking_info, terrain_notes, has_services, cell_coverage, totality_duration_seconds, totality_start, sun_altitude, sun_azimuth, spot_type) VALUES
('reykjanesta', 'Reykjanestá Lighthouse', 'reykjanesta-lighthouse',
  63.8177, -22.7032, 'reykjanes',
  'The southwestern tip of Iceland with a 270° ocean horizon — nothing but open Atlantic to the west, south, and north-west. Maximises the unobstructed view for the low-angle eclipse sun. Among the longest totality durations in the Reykjanes region.',
  'Free gravel car park at the lighthouse turnoff from Route 425. ~30 vehicles.',
  'Rocky lava headland with flat areas near the lighthouse. Good footwear recommended.',
  false, 'limited', 99, '2026-08-12T17:47:40Z', 24, 249, 'drive-up')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, slug=EXCLUDED.slug, lat=EXCLUDED.lat, lng=EXCLUDED.lng, region=EXCLUDED.region, description=EXCLUDED.description, parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes, has_services=EXCLUDED.has_services, cell_coverage=EXCLUDED.cell_coverage, totality_duration_seconds=EXCLUDED.totality_duration_seconds, totality_start=EXCLUDED.totality_start, sun_altitude=EXCLUDED.sun_altitude, sun_azimuth=EXCLUDED.sun_azimuth, spot_type=EXCLUDED.spot_type;

INSERT INTO viewing_spots (id, name, slug, lat, lng, region, description, parking_info, terrain_notes, has_services, cell_coverage, totality_duration_seconds, totality_start, sun_altitude, sun_azimuth, spot_type) VALUES
('keflavik', 'Keflavík Airport Area (Ásbrú)', 'keflavik-asbru-viewpoint',
  63.9872, -22.5564, 'reykjanes',
  'The flat lava plain surrounding Keflavík Airport is one of the most open, unobstructed stretches of land in Iceland. The Ásbrú area has flat open ground with a clear western ocean horizon. Arriving visitors can reach a viewing spot without any travel from the airport.',
  'Open flat areas throughout Ásbrú district. Free informal parking.',
  'Flat lava plain covered in moss and gravel. Entirely flat, open terrain.',
  true, 'good', 99, '2026-08-12T17:47:35Z', 24, 249, 'drive-up')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, slug=EXCLUDED.slug, lat=EXCLUDED.lat, lng=EXCLUDED.lng, region=EXCLUDED.region, description=EXCLUDED.description, parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes, has_services=EXCLUDED.has_services, cell_coverage=EXCLUDED.cell_coverage, totality_duration_seconds=EXCLUDED.totality_duration_seconds, totality_start=EXCLUDED.totality_start, sun_altitude=EXCLUDED.sun_altitude, sun_azimuth=EXCLUDED.sun_azimuth, spot_type=EXCLUDED.spot_type;

INSERT INTO viewing_spots (id, name, slug, lat, lng, region, description, parking_info, terrain_notes, has_services, cell_coverage, totality_duration_seconds, totality_start, sun_altitude, sun_azimuth, spot_type) VALUES
('sandgerdi', 'Sandgerði Shore', 'sandgerdi-shore',
  64.0388, -22.7068, 'reykjanes',
  'A fishing village on the northern coast of the Reykjanes peninsula with a flat shoreline and unobstructed western ocean horizon. The Nature Centre features marine biology exhibits. Easy 30-minute drive from Keflavík Airport — ideal for visitors arriving on eclipse day.',
  'Free parking near the shore and Nature Centre.',
  'Flat shoreline with gravel and grass. Open views to the west and north.',
  true, 'good', 97, '2026-08-12T17:47:35Z', 24, 249, 'drive-up')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, slug=EXCLUDED.slug, lat=EXCLUDED.lat, lng=EXCLUDED.lng, region=EXCLUDED.region, description=EXCLUDED.description, parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes, has_services=EXCLUDED.has_services, cell_coverage=EXCLUDED.cell_coverage, totality_duration_seconds=EXCLUDED.totality_duration_seconds, totality_start=EXCLUDED.totality_start, sun_altitude=EXCLUDED.sun_altitude, sun_azimuth=EXCLUDED.sun_azimuth, spot_type=EXCLUDED.spot_type;

INSERT INTO viewing_spots (id, name, slug, lat, lng, region, description, parking_info, terrain_notes, has_services, cell_coverage, totality_duration_seconds, totality_start, sun_altitude, sun_azimuth, spot_type) VALUES
('gardur', 'Garður Lighthouse (Garðskagi)', 'gardur-lighthouse',
  64.0830, -22.6938, 'reykjanes',
  'At the northernmost tip of the Reykjanes peninsula, the Garðskagi lighthouses offer a 270° ocean panorama. Two lighthouses (old from 1897 and new) stand on a flat headland with completely open horizons to the north, west, and south. One of the best Reykjanes spots for unobstructed eclipse viewing. Only 20 minutes from Keflavík Airport.',
  'Free parking near both lighthouses. Paved lot.',
  'Flat coastal headland with paved paths between lighthouses. Open and exposed to wind.',
  true, 'good', 98, '2026-08-12T17:47:35Z', 24, 249, 'drive-up')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, slug=EXCLUDED.slug, lat=EXCLUDED.lat, lng=EXCLUDED.lng, region=EXCLUDED.region, description=EXCLUDED.description, parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes, has_services=EXCLUDED.has_services, cell_coverage=EXCLUDED.cell_coverage, totality_duration_seconds=EXCLUDED.totality_duration_seconds, totality_start=EXCLUDED.totality_start, sun_altitude=EXCLUDED.sun_altitude, sun_azimuth=EXCLUDED.sun_azimuth, spot_type=EXCLUDED.spot_type;

-- ============================================================================
-- WESTFJORDS HIKING (1 spot)
-- ============================================================================

INSERT INTO viewing_spots (id, name, slug, lat, lng, region, description, parking_info, terrain_notes, has_services, cell_coverage, totality_duration_seconds, totality_start, sun_altitude, sun_azimuth, spot_type, trail_distance_km, trail_time_minutes, difficulty, elevation_gain_m, trailhead_lat, trailhead_lng) VALUES
('latrabjarg', 'Látrabjarg Cliffs', 'latrabjarg-cliffs',
  65.5009, -24.5300, 'westfjords',
  'Europe''s largest bird cliff, 14 km long and up to 440m high, at the westernmost point of Iceland. The cliff-top viewpoint faces directly west over the open Atlantic with zero horizon obstruction. In mid-August, late-season puffins may still be present. The remoteness means zero light pollution if clouds clear. 2+ hour drive from Patreksfjörður on gravel roads.',
  'Small gravel parking area at the cliff viewpoint. Free.',
  'Cliff-top grassy terrain. Stay well back from unfenced cliff edges. Can be very windy.',
  false, 'none', 132, '2026-08-12T17:45:20Z', 24, 249,
  'short-walk', 0.3, 5, 'easy', 20, 65.4970, -24.5250)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, slug=EXCLUDED.slug, lat=EXCLUDED.lat, lng=EXCLUDED.lng, region=EXCLUDED.region, description=EXCLUDED.description, parking_info=EXCLUDED.parking_info, terrain_notes=EXCLUDED.terrain_notes, has_services=EXCLUDED.has_services, cell_coverage=EXCLUDED.cell_coverage, totality_duration_seconds=EXCLUDED.totality_duration_seconds, totality_start=EXCLUDED.totality_start, sun_altitude=EXCLUDED.sun_altitude, sun_azimuth=EXCLUDED.sun_azimuth, spot_type=EXCLUDED.spot_type, trail_distance_km=EXCLUDED.trail_distance_km, trail_time_minutes=EXCLUDED.trail_time_minutes, difficulty=EXCLUDED.difficulty, elevation_gain_m=EXCLUDED.elevation_gain_m, trailhead_lat=EXCLUDED.trailhead_lat, trailhead_lng=EXCLUDED.trailhead_lng;
