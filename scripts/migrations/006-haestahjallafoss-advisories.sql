-- Seed three advisories for haestahjallafoss-dynjandi:
--   warn — Westfjords cloud climatology
--   info — 20-min hike from parking
--   info — no cell coverage at fjord head
-- Severity ordering matters: warn first so useAdvisories().topLevel
-- resolves to it. The IS translation generator's warnings_titles array
-- must list these three titles in the same order.

UPDATE viewing_spots
SET warnings = '[
  {"level":"warn","title":"Cloudiest region for the eclipse","body":"Aug 12 climatology shows 8 of last 10 years overcast at totality (avg 82% cloud). Consider Snæfellsnes or Reykjanes as a clearer-sky alternative if forecasts trend poor in the final 72 hours."},
  {"level":"info","title":"20-minute walk from the parking","body":"Marked trail climbing past the waterfall cascades, ~670 m one way with ~95 m elevation gain. Stepped sections and uneven rocks — walking shoes essential, not flip-flops. Allow extra time if carrying tripod / heavy camera."},
  {"level":"info","title":"No cell coverage","body":"Arnarfjörður head has no mobile signal. Download offline tiles and the spot detail before leaving the main road. Closest reliable coverage is back along Route 60 toward the nearest village (~25–30 km)."}
]'::jsonb
WHERE slug = 'haestahjallafoss-dynjandi';
