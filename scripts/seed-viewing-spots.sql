-- Seed curated viewing spots for the 2026 Iceland eclipse
-- Run in Supabase SQL Editor

INSERT INTO viewing_spots (id, name, slug, lat, lng, region, description, parking_info, terrain_notes, has_services, cell_coverage, totality_duration_seconds, sun_altitude, sun_azimuth) VALUES

-- Westfjords
('isafjordur', 'Ísafjörður Harbour Flat', 'isafjordur-harbour',
  66.0752, -23.1352, 'westfjords',
  'The harbour flat at Ísafjörður offers a wide open western horizon across the fjord mouth. As the largest town in the Westfjords, it combines accessibility with a near-central totality path position. The surrounding mountains frame the sky to the east but leave the crucial western quadrant fully open.',
  'Large public parking on the harbour flat (Pollurinn area). Free, paved surface.',
  'Flat reclaimed harbour land and paved quayside. No obstacles to the west.',
  true, 'good', 91, 24, 249),

('dynjandi', 'Dynjandi Viewpoint', 'dynjandi-arnarfjordur',
  65.7328, -23.1793, 'westfjords',
  'The parking area at the base of iconic Dynjandi waterfall sits at the head of Arnarfjörður, one of the widest fjords in the Westfjords. The fjord opens directly to the west, providing a clear low horizon toward the ocean. Close to the central line where duration approaches the maximum for Iceland.',
  'Dedicated gravel car park at end of Route 60 spur road, ~50 vehicles. Free.',
  'Flat gravel parking area and grassy meadow at fjord head. Waterfall backdrop.',
  false, 'limited', 138, 24, 249),

('thingeyri', 'Þingeyri Village Shore', 'thingeyri-shore',
  65.8726, -23.5020, 'westfjords',
  'Þingeyri sits on the south shore of Dýrafjörður, which runs almost perfectly east-west. The fjord acts as a natural viewing corridor pointing directly toward the open ocean — perfectly aligned with the sun''s position at totality. Near the central line for close to maximum duration.',
  'Open gravel and grass area along the shore road. Informal parking, no restrictions.',
  'Flat coastal strip with gravel shore. Fjord opens to the west with no obstructions.',
  true, 'good', 135, 24, 249),

('patreksfjordur', 'Patreksfjörður Beach', 'patreksfjordur-beach',
  65.5955, -23.9752, 'westfjords',
  'Patreksfjörður sits near the outer Westfjords with excellent road access via Route 62. The beach provides a flat sandy viewing area with the fjord mouth opening to the west-southwest. The town has petrol and basic services, making it a practical base for eclipse visitors.',
  'Street parking through town is free. Flat grassy area near the harbour for informal viewing.',
  'Sandy beach and flat harbour area. Western fjord view unobstructed.',
  true, 'good', 130, 24, 249),

-- Snæfellsnes
('rif', 'Rif Harbour', 'rif-harbour-snaefellsnes',
  64.9155, -23.8208, 'snaefellsnes',
  'The fishing village of Rif on the north shore of Snæfellsnes offers an open ocean view to the north-west from its harbour flat. Snæfellsjökull glacier looms to the south as a dramatic backdrop. Within the central totality path with open horizon for the low-angle eclipse sun.',
  'Flat gravel harbour area with ample informal parking. Free.',
  'Flat gravel harbour quay and open ground. Firm gravel and concrete.',
  true, 'good', 120, 24, 249),

('arnarstapi', 'Arnarstapi Coastal Platform', 'arnarstapi-coastal-platform',
  64.7663, -23.6340, 'snaefellsnes',
  'A dramatic coastal village at the foot of Snæfellsjökull. The flat lava shelf extending into the ocean provides a wide-open western horizon. The famous sea arch Gatklettur and black basalt stacks create a spectacular eclipse-watching environment.',
  'Designated gravel car park at the coastal walk start. Free, ~60-80 vehicles.',
  'Flat to gently undulating lava shelf. Some rocky ground near cliffs.',
  true, 'good', 110, 24, 249),

('stykkisholmur', 'Stykkishólmur Harbour Hill', 'stykkisholmur-harbour-hill',
  65.0776, -22.7242, 'snaefellsnes',
  'The largest town on Snæfellsnes, situated on Breiðafjörður bay. The rocky hill of Súgandisey island provides 360° views including a clear western horizon over the island-dotted bay. Excellent services including hotels, restaurants, and petrol.',
  'Town centre parking is free. Car park near harbour with walking access to Súgandisey.',
  'Rocky basalt hill (~20m) with stairs. Flat viewing platform at summit. Harbour below is fully paved.',
  true, 'good', 95, 24, 249),

-- Borgarfjörður
('borgarnes', 'Borgarnes Foreshore', 'borgarnes-foreshore',
  64.5383, -22.0000, 'borgarfjordur',
  'Borgarnes sits on a peninsula in Borgarfjörður, with the fjord opening west toward Snæfellsnes. Near the edge of the totality path so duration is brief (~40s), but the town has excellent services as a Ring Road 1 stopover. Consider driving north for longer totality.',
  'Multiple free car parks at the settlement museum and along the western shore road.',
  'Flat coastal grass and gravel beach on the western peninsula side. Accessible to all.',
  true, 'good', 40, 24, 249),

-- Reykjavík
('grotta', 'Grótta Lighthouse', 'grotta-lighthouse-reykjavik',
  64.16256484125579, -22.015211327803257, 'reykjavik',
  'A tidal islet at the westernmost point of Reykjavík''s Seltjarnarnes peninsula. Open ocean view to the west with no urban light pollution or buildings on the horizon. The best eclipse-watching location within the capital. Check tide tables — the islet may be inaccessible at high tide.',
  'Free car park at Grótta Nature Reserve entrance. ~30 spaces, 5-minute walk to lighthouse.',
  'Flat volcanic rock and gravel beach. Tidal crossing may be submerged — check tide tables for Aug 12.',
  false, 'good', 60, 24, 249),

-- Reykjanes
('reykjanesta', 'Reykjanestá Lighthouse', 'reykjanesta-lighthouse',
  63.8177, -22.7032, 'reykjanes',
  'The southwestern tip of Iceland with a 270° ocean horizon — nothing but open Atlantic to the west, south, and north-west. Maximises the unobstructed view for the low-angle eclipse sun. Among the longest totality durations in the Reykjanes region.',
  'Free gravel car park at the lighthouse turnoff from Route 425. ~30 vehicles.',
  'Rocky lava headland with flat areas near the lighthouse. Good footwear recommended.',
  false, 'limited', 99, 24, 249),

('keflavik', 'Keflavík Airport Area (Ásbrú)', 'keflavik-asbru-viewpoint',
  63.9872, -22.5564, 'reykjanes',
  'The flat lava plain surrounding Keflavík Airport is one of the most open, unobstructed stretches of land in Iceland. The Ásbrú area has flat open ground with a clear western ocean horizon. Arriving visitors can reach a viewing spot without any travel from the airport.',
  'Open flat areas throughout Ásbrú district. Free informal parking.',
  'Flat lava plain covered in moss and gravel. Entirely flat, open terrain.',
  true, 'good', 99, 24, 249)

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
  sun_altitude = EXCLUDED.sun_altitude,
  sun_azimuth = EXCLUDED.sun_azimuth;
