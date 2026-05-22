-- Seed four advisories for sandafell-thingeyri:
--   warn — summit can be in cloud while the fjord is clear
--   warn — real hike, kit + timing essentials
--   info — cloudiest region for the eclipse
--   info — no cell coverage above the village
-- Severity ordering matters: the two warns come first so
-- useAdvisories().topLevel resolves to warn. The IS translation
-- generator's warnings_titles array must list these four titles in
-- the same order.

UPDATE viewing_spots
SET warnings = '[
  {"level":"warn","title":"Summit can be in cloud while the fjord is clear","body":"At 367 m, Sandafell sits in the orographic cloud band that often forms on Westfjords summits even when the fjord below is sunny. Before committing to the hike, glass the summit from Þingeyri village or check the Vegagerðin webcam on Route 60 — if the top is shrouded, consider descending to the village shore or driving 50 minutes south to Hæstahjallafoss in Arnarfjörður instead."},
  {"level":"warn","title":"Real hike, not a stroll","body":"2 km / ~60 minutes one way with 250 m vertical gain on rocky terrain. Hiking boots, layers, and a wind shell are essential — there is no shelter at the summit and conditions are noticeably cooler and windier than the village. Allow 90 minutes round trip plus eclipse viewing time; arrive at parking by 14:30 UTC at the latest."},
  {"level":"info","title":"Cloudiest region for the eclipse","body":"Aug 12 climatology shows 7 of last 10 years overcast at totality (avg 83% cloud). Better than other Westfjords spots in the dataset but still trails Reykjanes by ~2× clear-sky odds. Consider Snæfellsnes or Reykjanes as a backup if forecasts trend poor in the final 72 hours."},
  {"level":"info","title":"No cell coverage","body":"Þingeyri village has signal but the trail and summit do not. Download offline tiles and the spot detail before leaving the village. Closest reliable coverage is the village itself."}
]'::jsonb
WHERE slug = 'sandafell-thingeyri';
