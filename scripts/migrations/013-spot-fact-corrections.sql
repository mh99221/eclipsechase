-- 013-spot-fact-corrections.sql
--
-- Spot-by-spot fact corrections after a full audit of viewing_spots
-- against the canonical grid.json, historical-weather.json, and external
-- geography. Two classes of fix:
--
--  1. Numeric drift. The 28 spots were seeded with totality_duration,
--     sun_altitude (24°) and sun_azimuth (250°) generic for the path.
--     Re-derived per spot via bilinear interpolation over grid.json
--     (which is computed by Skyfield in scripts/compute-eclipse-grid.py).
--     Sun altitude is actually 24.5–25.4° depending on location and
--     azimuth is 248.9–252.8° — for Reykjanes/Reykjavík ~252° not 250°.
--     Totality durations were within ±5 s for most spots but off by
--     10–20 s for ~7 spots; re-derived those too.
--
--  2. Text errors. Six descriptions contained outright wrong claims:
--     - djupalonssandur "Faces due west" (it faces south)
--     - hellissandur "old radio mast nearby is a local landmark" (the
--       Gufuskálar LORAN-C mast was demolished in 2019)
--     - hellnar "Gatklettur natural stone arch" (Gatklettur is at
--       Arnarstapi, not Hellnar)
--     - budir-black-church "sweeping views to the west across Faxaflói"
--       (Búðir is on the south coast, views are south across Faxaflói)
--     - sky-lagoon "western edge of the Reykjavík metropolitan area"
--       (Sky Lagoon is on the south side, in Kópavogur)
--     - hvalsneskirkja "30 minutes from Keflavík Airport" (~15–20 min)
--
--     Plus four unverified citations dropped: eclipse2026.is at
--     svodufoss, "already offering eclipse packages" at blue-lagoon,
--     "actively planning eclipse events" at perlan and sky-lagoon.
--
-- All updates land in EN base rows + IS translations together.

-- ────────────────────────────────────────────────────────────────────
-- Numeric: totality duration + sun position per spot
-- ────────────────────────────────────────────────────────────────────

UPDATE viewing_spots SET totality_duration_seconds = 130, sun_altitude = 25.4, sun_azimuth = 248.9 WHERE slug = 'latrabjarg-cliffs';
UPDATE viewing_spots SET totality_duration_seconds = 126, sun_altitude = 25.3, sun_azimuth = 249.0 WHERE slug = 'breidavik-beach';
UPDATE viewing_spots SET totality_duration_seconds = 121, sun_altitude = 25.2, sun_azimuth = 250.3 WHERE slug = 'snaefellsjokull-summit';
UPDATE viewing_spots SET sun_altitude = 25.3 WHERE slug = 'ondverdarnes-svortuloft';
UPDATE viewing_spots SET totality_duration_seconds = 118, sun_altitude = 25.2, sun_azimuth = 249.4 WHERE slug = 'patreksfjordur-beach';
UPDATE viewing_spots SET totality_duration_seconds = 125, sun_altitude = 25.3, sun_azimuth = 250.2 WHERE slug = 'djupalonssandur-beach';
UPDATE viewing_spots SET sun_altitude = 25.3, sun_azimuth = 250.1 WHERE slug = 'saxholl-crater';
UPDATE viewing_spots SET totality_duration_seconds = 121, sun_altitude = 25.2, sun_azimuth = 250.1 WHERE slug = 'rif-harbour-snaefellsnes';
UPDATE viewing_spots SET totality_duration_seconds = 123, sun_altitude = 25.2, sun_azimuth = 250.1 WHERE slug = 'hellissandur-village';
UPDATE viewing_spots SET totality_duration_seconds = 116, sun_altitude = 25.1, sun_azimuth = 250.4 WHERE slug = 'svodufoss-waterfall';
UPDATE viewing_spots SET totality_duration_seconds = 118, sun_altitude = 25.2, sun_azimuth = 250.3 WHERE slug = 'olafsvik-harbour';
UPDATE viewing_spots SET totality_duration_seconds = 119, sun_altitude = 25.1, sun_azimuth = 250.5 WHERE slug = 'arnarstapi-coastal-platform';
UPDATE viewing_spots SET totality_duration_seconds = 121, sun_altitude = 25.2, sun_azimuth = 250.3 WHERE slug = 'londrangar-malarrif';
UPDATE viewing_spots SET sun_altitude = 25.0, sun_azimuth = 250.6 WHERE slug = 'kirkjufell-viewpoint';
UPDATE viewing_spots SET totality_duration_seconds = 119, sun_altitude = 25.1, sun_azimuth = 250.5 WHERE slug = 'hellnar-viewpoint';
UPDATE viewing_spots SET sun_altitude = 24.9, sun_azimuth = 252.3 WHERE slug = 'reykjanesta-lighthouse';
UPDATE viewing_spots SET totality_duration_seconds = 113, sun_altitude = 25.1, sun_azimuth = 250.7 WHERE slug = 'budir-black-church';
UPDATE viewing_spots SET totality_duration_seconds = 100, sun_altitude = 24.8, sun_azimuth = 252.0 WHERE slug = 'gardur-lighthouse';
UPDATE viewing_spots SET sun_altitude = 24.9, sun_azimuth = 252.0 WHERE slug = 'hvalsneskirkja';
UPDATE viewing_spots SET sun_altitude = 24.8, sun_azimuth = 252.3 WHERE slug = 'keflavik-asbru-viewpoint';
UPDATE viewing_spots SET sun_altitude = 24.7, sun_azimuth = 252.4 WHERE slug = 'blue-lagoon';
UPDATE viewing_spots SET totality_duration_seconds = 84, sun_altitude = 24.7, sun_azimuth = 251.1 WHERE slug = 'stykkisholmur-harbour-hill';
UPDATE viewing_spots SET sun_altitude = 24.8, sun_azimuth = 249.8 WHERE slug = 'isafjordur-harbour';
UPDATE viewing_spots SET totality_duration_seconds = 105, sun_altitude = 24.9, sun_azimuth = 251.0 WHERE slug = 'ytri-tunga-beach';
UPDATE viewing_spots SET totality_duration_seconds = 63, sun_altitude = 24.5, sun_azimuth = 252.7 WHERE slug = 'grotta-lighthouse-reykjavik';
UPDATE viewing_spots SET sun_altitude = 24.5, sun_azimuth = 252.5 WHERE slug = 'akranes-lighthouse';
UPDATE viewing_spots SET totality_duration_seconds = 56, sun_azimuth = 252.8 WHERE slug = 'perlan-reykjavik';
UPDATE viewing_spots SET totality_duration_seconds = 63, sun_azimuth = 252.7 WHERE slug = 'sky-lagoon';

-- ────────────────────────────────────────────────────────────────────
-- Text: corrected descriptions (EN base rows)
-- ────────────────────────────────────────────────────────────────────

UPDATE viewing_spots
SET description = 'Black lava pebble beach on the western tip of Snæfellsnes, inside Snæfellsjökull National Park. A short walk from parking through lava formations to the dramatic beach. The shoreline runs east–west and the beach opens south to the Atlantic — well aligned with the eclipse sun''s bearing in the west-southwest. Restrooms at parking.'
WHERE slug = 'djupalonssandur-beach';

UPDATE viewing_spots
SET description = 'The westernmost village on the Snæfellsnes peninsula, at the foot of Snæfellsjökull. Open views to the north and west from the village outskirts.'
WHERE slug = 'hellissandur-village';

UPDATE viewing_spots
SET description = 'A historic fishing village on the southern coast of the Snæfellsnes Peninsula, connected to Arnarstapi by a famous 2.5 km coastal walking path (the Gatklettur sea arch lies along the path closer to the Arnarstapi end). Hellnar features dramatic basalt sea caves and nesting seabird colonies. The Fjöruhúsið café, set in a converted fish house overlooking a small cove, is considered one of the most charming cafés in Iceland. The south-facing coast provides a clear horizon to the west-southwest for eclipse viewing.'
WHERE slug = 'hellnar-viewpoint';

UPDATE viewing_spots
SET description = 'The iconic black wooden church at Búðir sits on an open lava field on the south coast of Snæfellsnes, with sweeping views south and southwest across Faxaflói bay — directly along the eclipse sun''s bearing. The stark contrast of the black church against the darkened eclipse sky makes this a photographer''s dream spot. Hotel Búðir provides upscale services nearby.'
WHERE slug = 'budir-black-church';

UPDATE viewing_spots
SET description = 'A modern geothermal infinity pool on the southern edge of the Reykjavík metropolitan area (Kársnes peninsula, Kópavogur), specifically designed with an ocean-facing infinity edge overlooking Faxaflói bay to the southwest. The design literally frames the eclipse sun''s bearing — the exact direction it sits at totality. Watching the sky darken and the corona appear while soaking in a geothermal pool with the Atlantic stretching to the horizon would be a uniquely Icelandic eclipse experience.'
WHERE slug = 'sky-lagoon';

UPDATE viewing_spots
SET description = 'A historic 1887 stone church on the open south coast of the Reykjanes peninsula, set in dramatic dunes and lava flats with completely unobstructed views to the south and west. The poet Hallgrímur Pétursson served as pastor here in the 1640s — his daughter Steinunn''s tombstone stands inside. The exposed coastal setting offers a clean western ocean horizon — exactly the direction of the eclipse sun at totality. About 5 km south of Sandgerði and 15–20 minutes from Keflavík Airport.'
WHERE slug = 'hvalsneskirkja';

-- Unverified citations dropped — keep the factual description without
-- the editorial endorsements we can't source.

UPDATE viewing_spots
SET description = 'A photogenic 10-meter waterfall cascading over a stunning columnar basalt cliff on the northern side of the Snæfellsnes Peninsula. Located between Ólafsvík and Grundarfjörður with around two minutes of totality. The waterfall faces south, while the eclipse sun is to the west — meaning the basalt columns and cascade can serve as dramatic foreground without obstructing the sun itself.'
WHERE slug = 'svodufoss-waterfall';

UPDATE viewing_spots
SET description = 'Iceland''s most famous tourist attraction — a geothermal spa set in a black lava field on the Reykjanes Peninsula. For the first time in its operating history, the Blue Lagoon falls directly in the path of totality. Watching the sky darken during totality while soaking in the milky-blue 38°C water with geothermal steam rising around you would be an utterly unique eclipse experience. The flat volcanic terrain provides a clear horizon in all directions. Check the Blue Lagoon website for eclipse-day operations and any special packages closer to the date.'
WHERE slug = 'blue-lagoon';

UPDATE viewing_spots
SET description = 'Reykjavík''s iconic glass-domed landmark, perched on Öskjuhlíð hill above the city. The 360° observation deck offers unobstructed panoramic views — west over Faxaflói bay toward the eclipse sun, north to Esja mountain, and across the entire city. The elevated position (approximately 25 m above the surrounding terrain) ensures clear sightlines even in an urban setting. The Wonders of Iceland museum inside Perlan adds educational value to the eclipse visit. For visitors staying in Reykjavík who don''t want to drive, this is the premium in-city eclipse viewing spot.'
WHERE slug = 'perlan-reykjavik';

-- ────────────────────────────────────────────────────────────────────
-- Text: corrected descriptions (IS translations)
-- ────────────────────────────────────────────────────────────────────

UPDATE viewing_spot_translations
SET description = 'Svört hraunmöl með völuströnd á vesturoddi Snæfellsness, innan Þjóðgarðsins Snæfellsjökuls. Stutt ganga frá bílastæði í gegnum hraunmyndanir niður á dramatíska ströndina. Strandlínan liggur austur–vestur og fjaran opnast til suðurs út í Atlantshafið — vel staðsett miðað við stefnu sólarinnar í vest-suðvestri við sólmyrkva. Salerni við bílastæði.'
WHERE spot_slug = 'djupalonssandur-beach' AND locale = 'is';

UPDATE viewing_spot_translations
SET description = 'Vestasta þorpið á Snæfellsnesi, við rætur Snæfellsjökuls. Opið útsýni til norðurs og vesturs frá útjaðri þorpsins.'
WHERE spot_slug = 'hellissandur-village' AND locale = 'is';

UPDATE viewing_spot_translations
SET description = 'Sögulegt útgerðarþorp á suðurströnd Snæfellsness, tengt Arnarstapa með frægum 2,5 km strandgöngustíg (Gatklettur, þekkti steinbogi, er meðfram stígnum nær Arnarstapamegin). Hellnar hefur dramatískar hraunhellumyndanir og fuglavarp í björgum. Kaffihúsið Fjöruhúsið, í endurnýjuðu fiskhúsi við litla vík, þykir eitt sjarmerandi kaffihúsa Íslands. Suðurstrandlínan veitir hreina sjónlínu í vest-suðvestur fyrir sólmyrkvaeftirlit.'
WHERE spot_slug = 'hellnar-viewpoint' AND locale = 'is';

UPDATE viewing_spot_translations
SET description = 'Hin táknræna svarta timburkirkja á Búðum stendur á opinni hraunbreiðu á suðurströnd Snæfellsness, með víðu útsýni til suðurs og suðvesturs yfir Faxaflóa — beint í stefnu eclipse-sólarinnar. Andstæða svörtu kirkjunnar við myrkan sólmyrkvahimininn gerir þennan stað að einum mest myndræna sólmyrkvasjónarhornanna á Íslandi. Hótel Búðir veitir hágæðaþjónustu nálægt.'
WHERE spot_slug = 'budir-black-church' AND locale = 'is';

UPDATE viewing_spot_translations
SET description = 'Nútíma jarðhita-óendanleikalaug á suðurjaðri höfuðborgarsvæðisins (Kársnes, Kópavogur), sérstaklega hönnuð með óendanleikabrún sem horfir yfir Faxaflóa til suðvesturs. Hönnunin rammar bókstaflega inn stefnu sólarinnar — nákvæmlega þá átt sem hún er í við sólmyrkva. Að horfa á himininn dökkna og sjá kórónuna á meðan þú liggur í jarðhitalaug með Atlantshafið út við sjóndeildarhring væri einstök íslensk sólmyrkvaupplifun.'
WHERE spot_slug = 'sky-lagoon' AND locale = 'is';

UPDATE viewing_spot_translations
SET description = 'Söguleg steinkirkja frá 1887 á opinni suðurströnd Reykjanesskagans, í dramatískum sandöldum og hraunbreiðum með algjörlega óhindruðu útsýni til suðurs og vesturs. Skáldið Hallgrímur Pétursson þjónaði hér sem prestur á 1640-áratugnum — legsteinn dóttur hans Steinunnar er innandyra. Útsetta strandlandslagið býður upp á hreina vestlæga hafsjóndeildarhring — nákvæmlega stefna sólarinnar við sólmyrkva. Um 5 km sunnan við Sandgerði og 15–20 mínútur frá Keflavíkurflugvelli.'
WHERE spot_slug = 'hvalsneskirkja' AND locale = 'is';

UPDATE viewing_spot_translations
SET description = 'Myndrænn 10 metra foss sem fellur yfir stórbrotna stuðlabergsbjargi á norðurhlið Snæfellsness. Staðsettur milli Ólafsvíkur og Grundarfjarðar með um tveggja mínútna heilmyrkva. Fossinn snýr í suður, en sólmyrkvasólin er í vestri — sem þýðir að stuðlabergið og fossfallið geta þjónað sem dramatískur forgrunnur án þess að hindra sólina sjálfa.'
WHERE spot_slug = 'svodufoss-waterfall' AND locale = 'is';

UPDATE viewing_spot_translations
SET description = 'Frægasta ferðamannaaðdráttarafl Íslands — jarðhitabaðstaður í svartri hraunbreiðu á Reykjanesskaga. Í fyrsta sinn frá opnun fellur Bláa lónið beint á leið heilmyrkvans. Að horfa á himininn dökkna í heilmyrkva á meðan þú liggur í mjólkurbláu 38°C vatninu með jarðhitagufu sem rís í kringum þig væri einstök sólmyrkvaupplifun. Flata eldfjallalandslagið veitir hreina sjónlínu í allar áttir. Skoðaðu vefsíðu Bláa lónsins varðandi opnunartíma á sólmyrkvadegi og hugsanlega sérpakka nær því.'
WHERE spot_slug = 'blue-lagoon' AND locale = 'is';

UPDATE viewing_spot_translations
SET description = 'Perlan, kennileiti Reykjavíkur með glerkúpli, situr á Öskjuhlíð yfir borginni. 360° útsýnispallurinn býður upp á óhindrað víðsýni — vestur yfir Faxaflóa í átt að sólmyrkvasólinni, norður að Esju og yfir alla borgina. Hæðin (um 25 m yfir umhverfinu) tryggir hreinar sjónlínur jafnvel í borgarumhverfi. Sýning Wonders of Iceland inni í Perlunni bætir fræðslugildi við sólmyrkvaheimsóknina. Fyrir gesti sem dvelja í Reykjavík og vilja ekki keyra er þetta besta sólmyrkvaeftirlitsstaðurinn í borginni.'
WHERE spot_slug = 'perlan-reykjavik' AND locale = 'is';
