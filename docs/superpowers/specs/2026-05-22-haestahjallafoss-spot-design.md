# Hæstahjallafoss — new viewing spot (Dynjandi trail)

**Date:** 2026-05-22
**Status:** Draft, awaiting review
**Author:** Martin

## Goal

Add Hæstahjallafoss — one of the named cascades on the Dynjandi waterfall
trail in Arnarfjörður — as a curated viewing spot in production. This is
the first Dynjandi-area spot on the map (a prior `dynjandi` parking-lot
seed was dropped from production in commit `4bf2b64`), and the first
spot with a real foreground waterfall composition.

## Why

* The Westfjords currently have only 4 curated spots (Látrabjarg,
  Breiðavík, Patreksfjörður, Ísafjörður) — all on the south or far west
  coasts. Arnarfjörður is a noticeable gap.
* Dynjandi is the single most-recognized landmark in the Westfjords and
  the Hæstahjallafoss ledge offers a unique composition for the
  Photographer profile: total eclipse over the open fjord with a 100 m
  waterfall in the foreground.
* The horizon at totality is clear (8° clearance at sun azimuth 250°).
* The 670 m / 20 min walk from the marked parking is short enough to be
  approachable for a Hiker profile without being a serious commitment.

## Non-goals

* Bringing back the old generic `dynjandi` parking spot. The
  Hæstahjallafoss ledge supersedes it — the parking is *the trailhead*,
  not a viewing destination on its own (its horizon is comparable but it
  has no scenic differentiation, no shelter, and is the start of the
  same walk).
* Building any new component or page. This is a pure data addition that
  flows through the existing spot detail / list / map components.
* Hand-correcting cloud climatology: ERA5 reanalysis is what we use for
  every other spot and consistency matters more than a debate over
  whether the Westfjords microclimate at fjord head is different from
  the 9 km grid average.

## Eclipse-day facts (verified, 2026-05-22)

| Field | Parking | Hæstahjallafoss |
|---|---|---|
| Coords | 65.7367007572071, -23.209297687333873 | 65.73334571021223, -23.201396166460484 |
| DEM elevation | 4 m (true ~5 m at fjord shore) | 79 m (true 99 m — cliff ledge under-reported by 30 m grid) |
| Horizon @ az 250° | 15.86° | 15.90° |
| Clearance | 8.14° | 8.10° |
| Verdict | clear | clear |

* Sun at totality: alt **24°**, az **250°** (Skyfield-computed; matches
  the constants in `recompute-spot-horizons.mjs`).
* Totality timing and duration: enriched at request time from
  `public/eclipse-data/grid.json` via the existing
  `nearestGridPoint()` flow in `server/api/spots/[slug].get.ts` — no
  manual entry needed on the seed row.
* C1 / C4: same — enriched from grid at request time.

The worst point in the ±45° sweep is on the south wall of Arnarfjörður
(az ~210–225°, ~20° horizon). That is well clear of the sun's azimuth at
totality, but it does mean the partial phase before C2 will be against
high terrain to the south-southwest. The advisory mentions this so
photographers planning ingress sequences aren't surprised.

## 10-year cloud climatology

ERA5 at 17:45 UTC on Aug 12, queried via Open-Meteo at the
Hæstahjallafoss point (the 9 km grid cell covers both parking and
ledge):

| Year | Cloud | Band |
|---|---|---|
| 2016 | 100% | overcast |
| 2017 | 6% | clear |
| 2018 | 42% | partly |
| 2019 | 100% | overcast |
| 2020 | 100% | overcast |
| 2021 | 100% | overcast |
| 2022 | 90% | overcast |
| 2023 | 82% | overcast |
| 2024 | 100% | overcast |
| 2025 | 97% | overcast |

**Summary: clear 1/10, partly 1/10, overcast 8/10, avg 82%.**

For context: this is the worst band in the existing dataset, comparable
to the other Westfjords spots (Látrabjarg 94%, Patreksfjörður 91%,
Ísafjörður 81%). Reykjanes averages 60–73%; Snæfellsnes 71–82%. The
advisory surfaces this honestly.

## Design — what changes

Six concrete pieces, ordered by dependency. The implementation plan will
sequence and dispatch them.

### 1. Seed row (SQL)

Append to `scripts/seed-viewing-spots-v2.sql`. New row:

* `id` / `slug`: `haestahjallafoss` / `haestahjallafoss-dynjandi`
* `name`: `Hæstahjallafoss (Dynjandi Trail)`
* `lat`, `lng`: 65.73334571021223, -23.201396166460484
* `region`: `westfjords`
* `description`: see copy section below
* `parking_info`, `terrain_notes`: see copy section
* `has_services`: false
* `cell_coverage`: `none`
* `totality_duration_seconds`, `totality_start`, `sun_altitude`,
  `sun_azimuth`: read from nearest grid point in
  `public/eclipse-data/grid.json` at seed time (same approach as the
  existing rows — these columns exist for back-compat with the unified
  spots page even though the detail API re-enriches them).
* `spot_type`: `hike`
* `difficulty`: `easy` (15–25 min walk, established stepped trail)
* `elevation_gain_m`: 95
* `trail_distance_km`: 0.67
* `trail_time_minutes`: 20
* `trailhead_lat`, `trailhead_lng`: 65.7367007572071, -23.209297687333873

Include the `ON CONFLICT (id) DO UPDATE` block matching the pattern in
the file so the seed is re-runnable.

Production application: run the new `INSERT … ON CONFLICT` block in the
Supabase SQL editor (consistent with how other recent spot additions
have shipped — there is no automatic seed-on-deploy pipeline).

### 2. Horizon-check override + recompute

In `scripts/recompute-spot-horizons.mjs`, add to the `KNOWN_ELEVATION`
constant:

```js
const KNOWN_ELEVATION = {
  'snaefellsjokull-summit': 1446,
  'haestahjallafoss-dynjandi': 99,
}
```

(Use the slug exactly as it appears on the new row — the dict key must
match the live API's `spot.slug` string the script iterates over.)

Then run `node scripts/recompute-spot-horizons.mjs` after the seed is
applied. It will produce `scripts/output/seed-horizon-checks.sql` with
an UPDATE for the new spot's `horizon_check` JSONB. Run that in Supabase
SQL editor.

Expected output for the new spot: `clear`, ~8.1° clearance, observer
elev 100.7 m. If the recompute reports anything other than `clear`,
stop and investigate before shipping the row — the user-facing copy
assumes a clear verdict.

### 3. Trailhead pin on the map

The existing spot list / map already renders `trailhead_lat,lng` as a
secondary marker when `spot_type=hike` and trailhead coords are present
(per the existing pattern on e.g. `latrabjarg-cliffs`). No code change
needed — populating the columns in step 1 is sufficient.

### 4. Advisories (warnings JSONB)

Three entries, in the post-migration `{level, title, body}` shape (per
`004-advisories-shape.sql` / `005-advisories-levels.sql`). Author-time
JSON, applied via an UPDATE statement in the same SQL session as the
seed row (or via a small ad-hoc migration file under
`scripts/migrations/`):

* `warn` — "Cloudiest region for the eclipse" / Body: "Aug 12 climatology shows 8 of last 10 years overcast at totality (avg 82% cloud). Consider Snæfellsnes or Reykjanes as a clearer-sky alternative if forecasts trend poor in the final 72 hours."
* `info` — "20-minute walk from the parking" / Body: "Marked trail climbing past the waterfall cascades, ~670 m one way with ~95 m elevation gain. Stepped sections and uneven rocks — walking shoes essential, not flip-flops. Allow extra time if carrying tripod / heavy camera."
* `info` — "No cell coverage" / Body: "Arnarfjörður head has no mobile signal. Download offline tiles and the spot detail before leaving the main road. Closest reliable coverage is back along Route 60 toward the nearest village (~25–30 km)."

Severity ordering: warn first (consumed by `useAdvisories().topLevel`).

### 5. Cloud climatology rerun

After steps 1–2 ship to production, re-run
`node scripts/fetch-historical-weather.mjs` from local with
`--api=https://eclipsechase.is`. This regenerates
`public/eclipse-data/historical-weather.json` to include
`haestahjallafoss-dynjandi`. Commit the JSON diff (single new entry,
existing entries unchanged barring API drift). The numbers above are
the expected values.

### 6. Hero photo (already present)

The full + thumb WebP pair already exists in `public/images/spots/` as
`dynjandi-arnarfjordur-hero.webp` and `dynjandi-arnarfjordur-hero-thumb.webp`
— left over from the dropped `dynjandi-arnarfjordur` seed. The image is
of Fjallfoss (the main 100 m waterfall), which is the recognizable
landmark on the same trail; it reads as a hero for the
Hæstahjallafoss spot.

Three small clean-ups in this change set:

* Rename both files to match the new slug:
  `haestahjallafoss-dynjandi-hero.webp` and
  `haestahjallafoss-dynjandi-hero-thumb.webp`. Use `git mv` so blame
  history follows.
* Update `scripts/seed-spot-photos.sql`: replace the stale UPDATE
  targeting `slug = 'dynjandi-arnarfjordur'` with a fresh one targeting
  `slug = 'haestahjallafoss-dynjandi'`, updated `filename` and a
  rewritten `alt` ("Fjallfoss, the main waterfall in the Dynjandi
  cascade, with autumn vegetation in the foreground"). Keep
  `credit: Unsplash`, `license: unsplash`, `is_hero: true`,
  `horizon_view: false` as on the existing row.
* Apply the SQL in the same Supabase session as steps 1, 2, and 4 so
  the spot ships with its photo on the first deploy.

### 7. i18n

Per `seed-spot-translations-is.sql`, add an Icelandic translation row
for the new spot:

* `is_name`: `Hæstahjallafoss (Dynjandagönguleið)`
* `is_description`, `is_parking_info`, `is_terrain_notes`,
  `is_warnings`: translate the English copy (warnings translated as
  full objects, preserving level keys).

For the English-base content under `i18n/en.json` and the v0 keys: no
new keys needed — the spot detail page reads spot copy from the API,
not from the i18n bundle.

## Copy (English, draft)

**Description**

> One of the named cascades on the Dynjandi waterfall trail, halfway up
> the cliff at the head of Arnarfjörður. A short walk from the parking
> brings you to a small ledge where the river drops past you toward the
> fjord — directly into the sun's position at totality. The fjord opens
> west-northwest to open ocean, giving a clear horizon despite the
> surrounding south wall. Close to the eclipse centerline for near-max
> Iceland totality.

**Parking info**

> Marked Dynjandi parking at the end of the Route 60 spur road. Gravel,
> ~50 spaces, free. Pit toilet, no other services. The trail begins at
> the south end of the lot.

**Terrain notes**

> Stepped trail climbs the slope past the waterfall cascades,
> switchbacks over rocks and boulders. ~670 m, ~95 m vertical, 20
> minutes one way.
> The ledge at Hæstahjallafoss is grassy with a low natural rock guard
> — comfortable footing but exposed to wind. Tripod-friendly footprint
> for one or two photographers; bring a buddy if shooting in the dark
> after totality.

## Risks and mitigations

* **Cloud climatology is grim.** Surfaced as a `warn` advisory linking
  to the regional alternatives (Snæfellsnes / Reykjanes). The
  recommendation engine's Photographer-profile scoring already weights
  totality duration high and cloud cover medium; this spot's high
  duration (~132 s near centerline) keeps it competitive for the right
  user.
* **DEM under-reports cliff elevation.** Addressed by the
  `KNOWN_ELEVATION` override in step 2. Without it, the horizon check
  would report clearance ~7.4° instead of 8.1° — still clear, but the
  on-page "observer elevation" stat would read 80 m instead of the
  correct 100 m.
* **Hiker safety at no-signal site.** Addressed by the second advisory
  (cell coverage) — same pattern as existing hike spots.
* **Photo is of Fjallfoss, not Hæstahjallafoss.** The existing image
  shows the main 100 m drop, not the upper-trail ledge itself.
  Acceptable for launch — it's the recognizable landmark on the same
  trail and visitors will see it from the parking — but worth swapping
  in a true Hæstahjallafoss frame later if one becomes available.
  Captured by the `alt` text rewrite in step 6.

## Acceptance

The change is done when:

* `GET /api/spots` returns 29 spots (currently 28), with the new
  `haestahjallafoss-dynjandi` row in the Westfjords list.
* `GET /api/spots/haestahjallafoss-dynjandi` returns the full DetailTabs
  payload including a `horizon_check` with verdict `clear` and
  clearance ≥ 8°.
* `public/eclipse-data/historical-weather.json` includes
  `haestahjallafoss-dynjandi` with the 10-year breakdown above.
* Three advisories render in the hero badge with `warn` as the topmost
  level.
* Trailhead pin appears on `/spots/haestahjallafoss-dynjandi`'s
  `SpotLocationMap` and on `/spots/index` filter map (existing pattern).
* Icelandic translation renders when locale is switched to `is`.
* Hero photo loads from the renamed
  `haestahjallafoss-dynjandi-hero.webp` (and thumb), with the rewritten
  Fjallfoss-accurate alt text.
