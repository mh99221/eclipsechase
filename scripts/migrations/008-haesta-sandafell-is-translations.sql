-- Icelandic translations for the two new Westfjords spots
-- (haestahjallafoss-dynjandi and sandafell-thingeyri).
--
-- The main generator scripts/internal/generate-spot-translations-is.mjs
-- enforces complete coverage and currently errors out because 6 other
-- production spots (bildudalur-harbour, borgarnes-foreshore,
-- flateyri-shore, glymur-waterfall, reykholt-snorrastofa,
-- sudureyri-harbour) lack IS translations. That's a separate gap
-- introduced when those spots were restored to production without
-- restoring their IS entries; fixing it is out of scope for the
-- Hæstahjallafoss / Sandafell rollout.
--
-- This one-off migration applies only the two new translations.
-- After the 6 missing entries are eventually added to the generator,
-- a full regen will overwrite both rows below idempotently.
--
-- Warning bodies are copied verbatim from the English UPDATEs in
-- migrations 006 (Hæsta) and 007 (Sandafell); only the title is
-- translated. This matches the convention enforced by the generator's
-- buildWarnings() — title in target locale, body shared with EN.

INSERT INTO viewing_spot_translations (
  spot_slug, locale, name, description, parking_info, terrain_notes, warnings
)
VALUES
(
  'haestahjallafoss-dynjandi', 'is',
  'Hæstahjallafoss (Dynjandagönguleið)',
  'Einn af nafngreindu fossunum í fosshlíðinni við Dynjanda, hálfa leið upp klettavegginn í botni Arnarfjarðar. Stutt ganga frá bílastæðinu leiðir þig á litla syllu þar sem áin steypist fram hjá þér út í fjörðinn — beint í átt að sólinni á heilmyrkva. Fjörðurinn opnast til vest-norðvesturs út á opið haf og gefur skýran sjóndeildarhring þrátt fyrir suðurvegginn í kring. ~95 sekúndur af heilmyrkva.',
  'Merkt Dynjandabílastæði við enda vegslóðans af Vegi 60. Möl, ~50 bílar, frítt. Kamar, engin önnur þjónusta. Gönguleiðin byrjar sunnan á planinu.',
  'Þrepasett gönguleið liggur upp brekkuna meðfram fossunum, sneiðingar yfir grjót og steina. ~670 m, ~95 m hækkun, 20 mínútur aðra leið. Syllan við Hæstahjallafoss er grasi vaxin með lágum náttúrulegum klettavarnargarði — gott fótfesti en úti í vindi. Pláss fyrir einn til tvo ljósmyndara með þrífæti; hafðu félaga með ef þú myndar í myrkri eftir heilmyrkvann.',
  '[
    {"level":"warn","title":"Skýjaríkasta svæðið fyrir sólmyrkvann","body":"Aug 12 climatology shows 8 of last 10 years overcast at totality (avg 82% cloud). Consider Snæfellsnes or Reykjanes as a clearer-sky alternative if forecasts trend poor in the final 72 hours."},
    {"level":"info","title":"20-mínútna ganga frá bílastæðinu","body":"Marked trail climbing past the waterfall cascades, ~670 m one way with ~95 m elevation gain. Stepped sections and uneven rocks — walking shoes essential, not flip-flops. Allow extra time if carrying tripod / heavy camera."},
    {"level":"info","title":"Ekkert farsímasamband","body":"Arnarfjörður head has no mobile signal. Download offline tiles and the spot detail before leaving the main road. Closest reliable coverage is back along Route 60 toward the nearest village (~25–30 km)."}
  ]'::jsonb
),
(
  'sandafell-thingeyri', 'is',
  'Sandafell (Þingeyri)',
  'Fjallstindur í 367 m hæð á suðurströnd Dýrafjarðar, beint fyrir ofan sjávarþorpið Þingeyri. Uppgangan vinnur fyrir besta sjóndeildarhring síðunnar — yfir 22° af frí útsýni til vest-suðvesturs, með opið Atlantshaf sýnilegt út fyrir fjarðarmynnið og næsta hindrandi landslag meira en 8 km í burtu yfir hafið. 60 mínútna ganga — panóraman er málið. Hentar best þeim sem vilja heldur vinna sér inn hreinan sjóndeildarhring en gera málamiðlanir með stað við veginn.',
  'Bílastæði við gönguleiðina í suðausturhluta Þingeyrarþorps, út frá efri þorpsgötunni. Lítið malarsvæði, frítt. Þingeyri sjálft er með matvöruverslun og bensínstöð; nýttu þau áður en gangan hefst.',
  '2 km af gönguleið sem sneiðir upp grýtta hlíð frá þorpinu (117 m) að breiðri tindahásléttu (367 m). 60 mínútur upp fyrir göngumann í eðlilegu formi, styttra niður. Ekkert skjól á tindinum — gönguskór, vindheld skel, lögskipt klæðnaður og vatn eru nauðsynleg. Tindahásléttan er nógu breið og slétt fyrir nokkra þrífæti með góðu rými á milli.',
  '[
    {"level":"warn","title":"Tindurinn getur verið í þoku þótt fjörðurinn sé heiður","body":"At 367 m, Sandafell sits in the orographic cloud band that often forms on Westfjords summits even when the fjord below is sunny. Before committing to the hike, glass the summit from Þingeyri village or check the Vegagerðin webcam on Route 60 — if the top is shrouded, consider descending to the village shore or driving 50 minutes south to Hæstahjallafoss in Arnarfjörður instead."},
    {"level":"warn","title":"Alvöru ganga, ekki rölt","body":"2 km / ~60 minutes one way with 250 m vertical gain on rocky terrain. Hiking boots, layers, and a wind shell are essential — there is no shelter at the summit and conditions are noticeably cooler and windier than the village. Allow 90 minutes round trip plus eclipse viewing time; arrive at parking by 14:30 UTC at the latest."},
    {"level":"info","title":"Skýjaríkasta svæðið fyrir sólmyrkvann","body":"Aug 12 climatology shows 7 of last 10 years overcast at totality (avg 83% cloud). Better than other Westfjords spots in the dataset but still trails Reykjanes by ~2× clear-sky odds. Consider Snæfellsnes or Reykjanes as a backup if forecasts trend poor in the final 72 hours."},
    {"level":"info","title":"Ekkert farsímasamband","body":"Þingeyri village has signal but the trail and summit do not. Download offline tiles and the spot detail before leaving the village. Closest reliable coverage is the village itself."}
  ]'::jsonb
)
ON CONFLICT (spot_slug, locale) DO UPDATE SET
  name          = EXCLUDED.name,
  description   = EXCLUDED.description,
  parking_info  = EXCLUDED.parking_info,
  terrain_notes = EXCLUDED.terrain_notes,
  warnings      = EXCLUDED.warnings,
  updated_at    = NOW();
