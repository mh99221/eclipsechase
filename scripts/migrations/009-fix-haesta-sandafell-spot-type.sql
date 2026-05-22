-- Fix spot_type values for the two new Westfjords spots.
--
-- Both rows shipped with `spot_type = 'hike'`, which is NOT in the
-- canonical 4-value enum the UI uses (drive-up, short-walk,
-- moderate-hike, serious-hike — see app/components/spot-detail/
-- LogisticsRows.vue and app/composables/useRecommendation.ts). The
-- raw value rendered as literal "hike" on the spot detail page, AND
-- the recommendation engine fell back to the default accessibility
-- score of 1.0 (same as drive-up) — wrong for both spots which
-- require walking/hiking and should de-rank for Family / First-Timer
-- profiles.
--
-- Hæstahjallafoss (670m / 20min / +95m / easy) → short-walk (0.8 score)
-- Sandafell        (2km / 60min / +250m / moderate) → moderate-hike (0.5)

UPDATE viewing_spots SET spot_type = 'short-walk'    WHERE slug = 'haestahjallafoss-dynjandi';
UPDATE viewing_spots SET spot_type = 'moderate-hike' WHERE slug = 'sandafell-thingeyri';
