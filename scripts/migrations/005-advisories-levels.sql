-- Set per-advisory severity levels (bad / warn / info) on viewing_spots.warnings
--
-- Prerequisite: scripts/migrations/004-advisories-shape.sql must have run.
-- That migration converted warnings from string[] to {level,title,body}[]
-- with every entry initialised at level='info'. This migration walks each
-- spot's warnings array and lifts the level on entries whose title matches
-- the categorisation table below. Anything not listed stays at 'info'.
--
-- Severity rules:
--   bad  — physical danger or trip-ending blockers. Cliff exposure,
--          active volcanic zone, glacier mountaineering, weather risks
--          that could cause the user to miss totality entirely, tide-
--          locked access that could strand them.
--   warn — significant logistical issues. No services / no cell coverage,
--          very limited parking, long unpaved drives, exposed weather,
--          "extremely crowded", advance booking essential.
--   info — helpful but not alarming. Town has full services, less scenic
--          alternative, walk up the hill, proximity tips.
--
-- Idempotent: re-running produces the same result. Titles not in the
-- mapping table are left untouched (still 'info' from migration 004).
--
-- Safe rollout: the application code reads `level` and falls back to
-- 'info' if missing/unknown, so partial application doesn't break the UI.

BEGIN;

-- One row per (slug, advisory title) pair we want to elevate above 'info'.
-- Titles are matched verbatim against `warnings[i].title` in the JSONB.
WITH advisory_levels(slug, title, level) AS (
  VALUES
    -- ─── latrabjarg-cliffs ───
    -- Unfenced cliffs are the headline safety issue here. Everything
    -- else is logistics / exposure (warn). The remote drive + no services
    -- combine to make a wrong turn very expensive.
    ('latrabjarg-cliffs',
     'Cliff edges are unfenced and dangerously steep — stay well back', 'bad'),
    ('latrabjarg-cliffs',
     'Very remote: 2.5 hour drive from Patreksfjörður on unpaved gravel road', 'warn'),
    ('latrabjarg-cliffs',
     'No services, no cell coverage, no toilets — bring everything you need', 'warn'),
    ('latrabjarg-cliffs',
     'No shelter from wind or rain — dress in full windproof layers', 'warn'),
    ('latrabjarg-cliffs',
     'Very limited parking (~20 cars) — arrive early on eclipse day', 'warn'),

    -- ─── breidavik-beach ───
    -- Slightly more amenable than Látrabjarg (one hotel, less remote)
    -- but still dependent on advance lodging + no cell coverage.
    ('breidavik-beach',
     'Remote: 2 hour drive from Patreksfjörður on partly unpaved road', 'warn'),
    ('breidavik-beach',
     'Only service is Hotel Breiðavík — book accommodation well in advance', 'warn'),
    ('breidavik-beach',
     'No cell coverage — download offline maps before arrival', 'warn'),

    -- ─── snaefellsjokull-summit ───
    -- Mountaineering route. Multiple bad-level advisories: physical risk,
    -- altitude weather, and the real possibility of climbing into fog and
    -- missing the eclipse.
    ('snaefellsjokull-summit',
     '⚠️ ADVANCED MOUNTAINEERS ONLY: Requires guided glacier tour with crampons and ice axes', 'bad'),
    ('snaefellsjokull-summit',
     '5–8 hour round trip hike — must start very early to reach summit before eclipse (17:45 UTC)', 'bad'),
    ('snaefellsjokull-summit',
     'Cloud risk is HIGHER at 1,446m than at sea level — you may climb into fog and miss the eclipse entirely', 'bad'),
    ('snaefellsjokull-summit',
     'Weather extremely unpredictable at summit altitude — high wind, low temperatures, whiteout possible', 'bad'),
    ('snaefellsjokull-summit',
     'Guided glacier tours must be booked well in advance', 'warn'),

    -- ─── grotta-lighthouse-reykjavik ───
    -- Tide-locked causeway is bad — risk of being stranded or shut out
    -- entirely on the wrong tide. Crowds + parking are warn.
    ('grotta-lighthouse-reykjavik',
     'Causeway to the lighthouse island is ONLY accessible at low tide — check August 12 tide table', 'bad'),
    ('grotta-lighthouse-reykjavik',
     'Will be EXTREMELY crowded — potentially thousands of people from the entire Reykjavík metro area', 'warn'),
    ('grotta-lighthouse-reykjavik',
     'Parking fills very early — consider walking or biking from Seltjarnarnes', 'warn'),

    -- ─── reykjanesta-lighthouse ───
    -- Active volcanic zone is the marquee bad. Road closures could
    -- cancel the trip outright. Lava terrain + no services are info/warn.
    ('reykjanesta-lighthouse',
     '⚠️ ACTIVE VOLCANIC ZONE: Check eruption status at safetravel.is before visiting', 'bad'),
    ('reykjanesta-lighthouse',
     'Roads to the lighthouse may be closed due to volcanic activity in the Sundhnúkur crater row', 'bad'),
    ('reykjanesta-lighthouse',
     'No services at the lighthouse — bring supplies', 'warn'),

    -- ─── saxholl-crater ───
    -- Wind exposure at the crater rim is real but manageable.
    -- Slippery staircase + tight parking warrant warn.
    ('saxholl-crater',
     'Extremely wind-exposed at the crater rim — secure all equipment and cameras', 'warn'),
    ('saxholl-crater',
     'Very limited parking (~15 cars at crater base) — arrive early', 'warn'),
    ('saxholl-crater',
     'Metal staircase (~400 steps) can be slippery when wet', 'warn'),

    -- ─── djupalonssandur-beach ───
    -- National park crowds are the only warn-worthy item; the rest are
    -- "good to know but won't ruin your day".
    ('djupalonssandur-beach',
     'Inside Snæfellsjökull National Park — expect significant crowds on eclipse day', 'warn'),

    -- ─── arnarstapi-coastal-platform ───
    -- Unfenced cliffs along the coastal path → bad. Crowds + parking warn.
    ('arnarstapi-coastal-platform',
     'Cliff edges along the coastal path are unfenced — watch children and step carefully', 'bad'),
    ('arnarstapi-coastal-platform',
     'Popular tourist stop — expect significant crowds on eclipse day', 'warn'),
    ('arnarstapi-coastal-platform',
     'Parking is limited — consider arriving well before eclipse time', 'warn'),

    -- ─── budir-black-church ───
    -- Tight parking is the only warn-worthy item.
    ('budir-black-church',
     'Limited parking (~20 cars) — arrive early on eclipse day', 'warn'),

    -- ─── gardur-lighthouse ───
    -- Wind exposure + airport-driven crowds. Both warn.
    ('gardur-lighthouse',
     'Very wind-exposed coastal tip — secure equipment and dress in windproof layers', 'warn'),
    ('gardur-lighthouse',
     'Will be popular due to proximity to Keflavík Airport — expect crowds', 'warn'),
    ('gardur-lighthouse',
     'Best Reykjanes viewing spot — parking (~40 cars) may fill on eclipse day', 'warn'),

    -- ─── rif-harbour-snaefellsnes ───
    -- Tiny village; only the lodging crunch warrants warn.
    ('rif-harbour-snaefellsnes',
     'Very small village (~100 population) — extremely limited accommodation', 'warn'),

    -- ─── hellissandur-village ───
    -- Small village; both lodging items warrant warn.
    ('hellissandur-village',
     'Small village (~380 population) — limited food options and accommodation', 'warn'),
    ('hellissandur-village',
     'Book accommodation well in advance — beds will sell out for eclipse week', 'warn'),

    -- ─── olafsvik-harbour ───
    -- Crowd-arrival timing is the warn; town-services note stays info.
    ('olafsvik-harbour',
     'Harbor area will likely be the main gathering point — arrive early for best position', 'warn')

    -- All other advisories on the remaining spots (sandgerdi-shore,
    -- keflavik-asbru-viewpoint, stykkisholmur-harbour-hill,
    -- akranes-lighthouse) are pure info/scenic notes — left at the
    -- migration-004 default of 'info'.
)
UPDATE viewing_spots vs
SET warnings = sub.new_warnings
FROM (
  SELECT
    vs2.slug,
    jsonb_agg(
      CASE
        WHEN al.level IS NOT NULL
          THEN jsonb_set(arr.elem, '{level}', to_jsonb(al.level))
        ELSE arr.elem
      END
      ORDER BY arr.ord
    ) AS new_warnings
  FROM viewing_spots vs2
  CROSS JOIN LATERAL jsonb_array_elements(vs2.warnings) WITH ORDINALITY AS arr(elem, ord)
  LEFT JOIN advisory_levels al
    ON al.slug = vs2.slug AND al.title = arr.elem->>'title'
  WHERE jsonb_typeof(vs2.warnings) = 'array'
    AND jsonb_array_length(vs2.warnings) > 0
  GROUP BY vs2.slug
) sub
WHERE vs.slug = sub.slug;

COMMIT;

-- =============================================================================
-- Verification (run after COMMIT)
-- =============================================================================

-- 1. Sanity — should return 0 rows. Every entry must have all three keys
--    and a level in (bad, warn, info).
--
-- SELECT vs.slug, w
-- FROM viewing_spots vs, jsonb_array_elements(vs.warnings) w
-- WHERE NOT (w ? 'level' AND w ? 'title' AND w ? 'body')
--    OR w->>'level' NOT IN ('bad', 'warn', 'info');

-- 2. Spot-check the "bad" entries — should list exactly the items
--    elevated by this script.
--
-- SELECT vs.slug, w->>'title' AS title
-- FROM viewing_spots vs, jsonb_array_elements(vs.warnings) w
-- WHERE w->>'level' = 'bad'
-- ORDER BY vs.slug;

-- 3. Per-spot histogram — quick way to see which spots got how many
--    bad/warn/info advisories.
--
-- SELECT
--   vs.slug,
--   COUNT(*) FILTER (WHERE w->>'level' = 'bad')  AS bad_n,
--   COUNT(*) FILTER (WHERE w->>'level' = 'warn') AS warn_n,
--   COUNT(*) FILTER (WHERE w->>'level' = 'info') AS info_n
-- FROM viewing_spots vs, jsonb_array_elements(vs.warnings) w
-- GROUP BY vs.slug
-- HAVING COUNT(*) > 0
-- ORDER BY bad_n DESC, warn_n DESC, vs.slug;
