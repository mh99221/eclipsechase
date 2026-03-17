-- Seed viewing spot photos
-- Run AFTER migrate-add-photos.sql
-- All photos are Unsplash License (free for commercial use)

UPDATE viewing_spots SET photos = '[{"filename":"kirkjufell-viewpoint-hero.webp","alt":"Kirkjufell mountain with waterfall in Grundarfjordur, Snaefellsnes","credit":"Unsplash","license":"unsplash","is_hero":true,"horizon_view":false}]' WHERE slug = 'kirkjufell-viewpoint';

UPDATE viewing_spots SET photos = '[{"filename":"arnarstapi-coastal-platform-hero.webp","alt":"Arnarstapi coastal basalt cliffs and stone arch facing the Atlantic","credit":"Unsplash","license":"unsplash","is_hero":true,"horizon_view":true}]' WHERE slug = 'arnarstapi-coastal-platform';

UPDATE viewing_spots SET photos = '[{"filename":"budir-black-church-hero.webp","alt":"Budir black church on Snaefellsnes peninsula with mountains","credit":"Unsplash","license":"unsplash","is_hero":true,"horizon_view":false}]' WHERE slug = 'budir-black-church';

UPDATE viewing_spots SET photos = '[{"filename":"djupalonssandur-beach-hero.webp","alt":"Djupalonssandur black pebble beach on Snaefellsnes peninsula","credit":"Unsplash","license":"unsplash","is_hero":true,"horizon_view":true}]' WHERE slug = 'djupalonssandur-beach';

UPDATE viewing_spots SET photos = '[{"filename":"latrabjarg-cliffs-hero.webp","alt":"Latrabjarg sea cliffs in the Westfjords, westernmost point of Iceland","credit":"Unsplash","license":"unsplash","is_hero":true,"horizon_view":true}]' WHERE slug = 'latrabjarg-cliffs';

UPDATE viewing_spots SET photos = '[{"filename":"dynjandi-arnarfjordur-hero.webp","alt":"Dynjandi waterfall cascading down the mountainside in Arnarfjordur","credit":"Unsplash","license":"unsplash","is_hero":true,"horizon_view":false}]' WHERE slug = 'dynjandi-arnarfjordur';

UPDATE viewing_spots SET photos = '[{"filename":"grotta-lighthouse-reykjavik-hero.webp","alt":"Grotta lighthouse at sunset in Seltjarnarnes, Reykjavik","credit":"Unsplash","license":"unsplash","is_hero":true,"horizon_view":true}]' WHERE slug = 'grotta-lighthouse-reykjavik';

UPDATE viewing_spots SET photos = '[{"filename":"reykjanesta-lighthouse-hero.webp","alt":"Reykjanesviti lighthouse on the volcanic Reykjanes peninsula","credit":"Unsplash","license":"unsplash","is_hero":true,"horizon_view":true}]' WHERE slug = 'reykjanesta-lighthouse';

UPDATE viewing_spots SET photos = '[{"filename":"stykkisholmur-harbour-hill-hero.webp","alt":"Stykkisholmur town and harbor viewed from Sugandisey island","credit":"Unsplash","license":"unsplash","is_hero":true,"horizon_view":false}]' WHERE slug = 'stykkisholmur-harbour-hill';

UPDATE viewing_spots SET photos = '[{"filename":"borgarnes-foreshore-hero.webp","alt":"Borgarnes town on the shore of Borgarfjordur with mountains","credit":"Unsplash","license":"unsplash","is_hero":true,"horizon_view":false}]' WHERE slug = 'borgarnes-foreshore';

UPDATE viewing_spots SET photos = '[{"filename":"akranes-lighthouse-hero.webp","alt":"Old Akranes lighthouse on the coast","credit":"Unsplash / Carol Fung","license":"unsplash","is_hero":true,"horizon_view":true}]' WHERE slug = 'akranes-lighthouse';

UPDATE viewing_spots SET photos = '[{"filename":"gardur-lighthouse-hero.webp","alt":"Gardur lighthouse on the Reykjanes peninsula coast","credit":"Unsplash / Tomas Malik","license":"unsplash","is_hero":true,"horizon_view":true}]' WHERE slug = 'gardur-lighthouse';

UPDATE viewing_spots SET photos = '[{"filename":"sandgerdi-shore-hero.webp","alt":"Rocky coastline at Sandgerdi on the Reykjanes peninsula","credit":"Unsplash","license":"unsplash","is_hero":true,"horizon_view":true}]' WHERE slug = 'sandgerdi-shore';

UPDATE viewing_spots SET photos = '[{"filename":"keflavik-asbru-viewpoint-hero.webp","alt":"Rocky lava terrain near Keflavik on the Reykjanes peninsula","credit":"Unsplash","license":"unsplash","is_hero":true,"horizon_view":false}]' WHERE slug = 'keflavik-asbru-viewpoint';

UPDATE viewing_spots SET photos = '[{"filename":"saxholl-crater-hero.webp","alt":"Saxholl crater with stairway in Snaefellsjokull National Park","credit":"Unsplash","license":"unsplash","is_hero":true,"horizon_view":true}]' WHERE slug = 'saxholl-crater';

UPDATE viewing_spots SET photos = '[{"filename":"snaefellsjokull-summit-hero.webp","alt":"Snow-capped Snaefellsjokull glacier summit","credit":"Unsplash / Martin Brechtl","license":"unsplash","is_hero":true,"horizon_view":true}]' WHERE slug = 'snaefellsjokull-summit';

UPDATE viewing_spots SET photos = '[{"filename":"hellissandur-village-hero.webp","alt":"Ingjaldsholl church in Hellissandur with Snaefellsjokull glacier","credit":"Unsplash","license":"unsplash","is_hero":true,"horizon_view":false}]' WHERE slug = 'hellissandur-village';

UPDATE viewing_spots SET photos = '[{"filename":"olafsvik-harbour-hero.webp","alt":"Snow-covered road and mountain near Olafsvik, Snaefellsnes","credit":"Unsplash / Bailey Zindel","license":"unsplash","is_hero":true,"horizon_view":false}]' WHERE slug = 'olafsvik-harbour';

UPDATE viewing_spots SET photos = '[{"filename":"rif-harbour-snaefellsnes-hero.webp","alt":"White lighthouse near the ocean at Rif, Snaefellsnes peninsula","credit":"Unsplash / Jack Anstey","license":"unsplash","is_hero":true,"horizon_view":true}]' WHERE slug = 'rif-harbour-snaefellsnes';

UPDATE viewing_spots SET photos = '[{"filename":"glymur-waterfall-hero.webp","alt":"Glymur waterfall cascading between canyon walls in Borgarfjordur","credit":"Unsplash / Alexander Milo","license":"unsplash","is_hero":true,"horizon_view":false}]' WHERE slug = 'glymur-waterfall';

UPDATE viewing_spots SET photos = '[{"filename":"isafjordur-harbour-hero.webp","alt":"Isafjordur harbor surrounded by mountains in the Westfjords","credit":"Unsplash","license":"unsplash","is_hero":true,"horizon_view":false}]' WHERE slug = 'isafjordur-harbour';

UPDATE viewing_spots SET photos = '[{"filename":"flateyri-shore-hero.webp","alt":"Colorful houses on green grass in Flateyri, Westfjords","credit":"Unsplash / Einar H. Reynis","license":"unsplash","is_hero":true,"horizon_view":false}]' WHERE slug = 'flateyri-shore';

UPDATE viewing_spots SET photos = '[{"filename":"sudureyri-harbour-hero.webp","alt":"Green fields near the fjord at Sudureyri in the Westfjords","credit":"Unsplash / Einar H. Reynis","license":"unsplash","is_hero":true,"horizon_view":false}]' WHERE slug = 'sudureyri-harbour';

UPDATE viewing_spots SET photos = '[{"filename":"thingeyri-shore-hero.webp","alt":"White house near mountain and fjord at Thingeyri, Westfjords","credit":"Unsplash / Cassie Boca","license":"unsplash","is_hero":true,"horizon_view":false}]' WHERE slug = 'thingeyri-shore';

UPDATE viewing_spots SET photos = '[{"filename":"bildudalur-harbour-hero.webp","alt":"Boat on the fjord at Bildudalur in the Westfjords","credit":"Unsplash / Michael Blum","license":"unsplash","is_hero":true,"horizon_view":false}]' WHERE slug = 'bildudalur-harbour';

UPDATE viewing_spots SET photos = '[{"filename":"patreksfjordur-beach-hero.webp","alt":"Houses near the fjord at Patreksfjordur, Westfjords","credit":"Unsplash","license":"unsplash","is_hero":true,"horizon_view":false}]' WHERE slug = 'patreksfjordur-beach';

UPDATE viewing_spots SET photos = '[{"filename":"breidavik-beach-hero.webp","alt":"Dramatic mountains and coastal sand dunes at Breidavik beach","credit":"Unsplash","license":"unsplash","is_hero":true,"horizon_view":true}]' WHERE slug = 'breidavik-beach';

UPDATE viewing_spots SET photos = '[{"filename":"reykholt-snorrastofa-hero.webp","alt":"Mountains and river valley near Reykholt in Borgarfjordur","credit":"Unsplash / Alin Rusu","license":"unsplash","is_hero":true,"horizon_view":false}]' WHERE slug = 'reykholt-snorrastofa';
