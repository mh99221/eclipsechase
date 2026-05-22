# Sandafell Mountain — new viewing spot (Dýrafjörður / Þingeyri)

**Date:** 2026-05-22
**Status:** Draft, awaiting review
**Author:** Martin
**Sibling spec:** [2026-05-22-haestahjallafoss-spot-design.md](2026-05-22-haestahjallafoss-spot-design.md) — the two new Westfjords spots ship independently but share the same `guide.md` link-list update.

## Goal

Add Sandafell — a 367 m mountain summit above the village of Þingeyri
on the south shore of Dýrafjörður — as a curated viewing spot in
production. This is the first Dýrafjörður-area spot on the map (the
prior `thingeyri-shore` seed was dropped from production in commit
`4bf2b64`) and the first true mountain summit in the Westfjords
selection.

## Why

* **Best horizon in the dataset.** From the summit, the WSW sun at
  totality (alt 24°, az 250°) sits 22.6° above any blocking terrain.
  Worst point in the ±45° sweep is 3.83° — effectively a panoramic,
  unobstructed eclipse view. No other spot on file comes close.
* **Independent microclimate.** Dýrafjörður is the next fjord south of
  Arnarfjörður (where the sibling Hæstahjallafoss sits) and behaves as
  a separate weather cell. Having both lets a Pro user with poor
  Arnarfjörður forecast morning-of pivot ~50 minutes south to Sandafell
  without leaving the region — exactly the "have 2–3 candidates in
  different microclimates" strategy the guide already advocates.
* **Statistically better odds (within Westfjords).** 2/10 clear years
  vs. 0–1 for every other Westfjords spot in the dataset. Small sample,
  but it's the best the region offers.
* **Above the sea-fog layer.** At 367 m, the summit is materially above
  the low marine-fog layer that often sits in fjord heads on August
  mornings. Even when the fjord is socked in, the summit can be in
  sun. (Conversely — orographic cloud can sit on the summit while the
  fjord is clear; covered in advisories.)
* **Profile fit.** A real summit hike with a real reward serves the
  Sky Chaser and Hiker profiles, neither of which currently has a
  flagship Westfjords option. Complements rather than competes with
  Hæstahjallafoss (Photographer / easy).

## Non-goals

* Re-introducing the dropped `thingeyri-shore` parking-side spot. The
  trailhead pin handles parking; a separate village spot would
  duplicate the geography without offering meaningfully better viewing.
* Building any new components or pages. Pure data addition that flows
  through existing spot detail / list / map components.
* Sourcing the photo as part of this change. See step 6 — photo is
  truly deferred for Sandafell (no leftover image exists in the repo,
  unlike Hæstahjallafoss).

## Eclipse-day facts (verified, 2026-05-22)

| Field | Parking (trailhead) | Summit |
|---|---|---|
| Coords | 65.86123054085608, -23.477419169626966 | 65.87239273496029, -23.50567126937135 |
| DEM elevation | 117.5 m | 353.7 m (true 367 m — summit under-reported by 13 m) |
| Horizon @ az 250° | 11.57° | **1.38°** |
| Worst in ±45° sweep | 22.25° @ az 295 (cliffs of Sandafell to NW) | 3.83° @ az 237 |
| Clearance | 12.43° | **22.62°** |
| Verdict | clear | clear |

* Sun at totality: alt **24°**, az **250°** (Skyfield-computed).
* Totality timing / duration / C1 / C4: enriched at request time via
  `nearestGridPoint()` against `public/eclipse-data/grid.json` — no
  manual entry on the seed row.

Hike profile: **~2 km one way, ~60 minutes, ~250 m vertical gain**
(parking 117 m DEM → summit 367 m). Marked trail from the village edge.
`difficulty: moderate` (vs. Hæstahjallafoss's `easy`).

The parking's worst-sweep angle at az 295° (22°) is the cliffs of
Sandafell itself rising to the NW — irrelevant for the sun's WSW
position at totality, but visually confirms the climb is what unlocks
the view.

## 10-year cloud climatology

ERA5 at 17:45 UTC on Aug 12, queried via Open-Meteo at the summit:

| Year | Cloud | Band |
|---|---|---|
| 2016 | 100% | overcast |
| **2017** | **27%** | **clear** |
| 2018 | 66% | partly |
| 2019 | 100% | overcast |
| 2020 | 100% | overcast |
| **2021** | **39%** | **clear** |
| 2022 | 100% | overcast |
| 2023 | 97% | overcast |
| 2024 | 100% | overcast |
| 2025 | 100% | overcast |

**Summary: clear 2/10, partly 1/10, overcast 7/10, avg 83%.**

Regional context for the advisory copy:

* Sandafell summit: 2/10 clear, avg 83%
* Hæstahjallafoss (Arnarfjörður): 1/10 clear, avg 82%
* Other Westfjords spots: 0–1/10 clear, avg 79–94%
* Snæfellsnes spots: 1–2/10 clear, avg 71–82%
* Reykjanes spots: 3–4/10 clear, avg 59–73%

Sandafell is statistically the best Westfjords option in the dataset,
but the region as a whole still trails Reykjanes by ~2× clear-sky odds.

## Design — what changes

Seven concrete pieces, ordered by dependency.

### 1. Seed row (SQL)

Append to `scripts/seed-viewing-spots-v2.sql`. New row:

* `id` / `slug`: `sandafell` / `sandafell-thingeyri`
* `name`: `Sandafell Summit (Þingeyri)`
* `lat`, `lng`: 65.87239273496029, -23.50567126937135 (the **summit** —
  that's the curated viewing destination)
* `region`: `westfjords`
* `description`: see copy section
* `parking_info`, `terrain_notes`: see copy section
* `has_services`: false
* `cell_coverage`: `none`
* `totality_duration_seconds`, `totality_start`, `sun_altitude`,
  `sun_azimuth`: read from nearest grid point in
  `public/eclipse-data/grid.json` at seed time (same approach as the
  existing rows).
* `spot_type`: `hike`
* `difficulty`: `moderate`
* `elevation_gain_m`: 250
* `trail_distance_km`: 2.0
* `trail_time_minutes`: 60
* `trailhead_lat`, `trailhead_lng`: 65.86123054085608, -23.477419169626966

Include the `ON CONFLICT (id) DO UPDATE` block matching the pattern in
the file so the seed is re-runnable.

Production application: run the new `INSERT … ON CONFLICT` block in the
Supabase SQL editor (same flow as every other recent spot addition).

### 2. Horizon-check override + recompute

In `scripts/recompute-spot-horizons.mjs`, extend the
`KNOWN_ELEVATION` dict to include Sandafell. Final state (assuming
Hæstahjallafoss spec lands first or in the same SQL session):

```js
const KNOWN_ELEVATION = {
  'snaefellsjokull-summit': 1446,
  'haestahjallafoss-dynjandi': 99,
  'sandafell-thingeyri': 367,
}
```

The dict key must match the live API's `spot.slug` string. The override
is needed because the 30 m DEM under-reports the summit by ~13 m;
without it the horizon verdict would still be clear (the clearance is
huge), but the on-page "observer elevation" stat would read 354 m
instead of the correct 367 m.

Then `node scripts/recompute-spot-horizons.mjs` after the seed lands,
and apply the resulting `scripts/output/seed-horizon-checks.sql` in
Supabase. Expected output for the new spot: `clear`, ~22.6° clearance,
observer elev 368.7 m. If anything else, stop and investigate before
shipping.

### 3. Trailhead pin on the map

No code change — existing pattern. Populating `trailhead_lat,lng` in
step 1 is sufficient. The trailhead is at the village edge of Þingeyri,
~1.3 km north-east of the summit (mostly horizontal distance — the
summit is north-west of the village).

### 4. Advisories (warnings JSONB)

Four entries, in `{level, title, body}` shape per the post-migration
schema. Severity ordering: warn first.

* `warn` — "Summit can be in cloud while the fjord is clear" / Body:
  "At 367 m, Sandafell sits in the orographic cloud band that often
  forms on Westfjords summits even when the fjord below is sunny.
  Before committing to the hike, glass the summit from Þingeyri village
  or check the Vegagerðin webcam on Route 60 — if the top is shrouded,
  consider descending to the village shore or driving 50 minutes south
  to Hæstahjallafoss in Arnarfjörður instead."
* `warn` — "Real hike, not a stroll" / Body:
  "2 km / ~60 minutes one way with 250 m vertical gain on rocky
  terrain. Hiking boots, layers, and a wind shell are essential —
  there is no shelter at the summit and conditions are noticeably
  cooler and windier than the village. Allow 90 minutes round trip
  plus eclipse viewing time; arrive at parking by 14:30 UTC at the
  latest."
* `info` — "Cloudiest region for the eclipse" / Body:
  "Aug 12 climatology shows 7 of last 10 years overcast at totality
  (avg 83% cloud). Better than other Westfjords spots in the dataset
  but still trails Reykjanes by ~2× clear-sky odds. Consider
  Snæfellsnes or Reykjanes as a backup if forecasts trend poor in the
  final 72 hours."
* `info` — "No cell coverage" / Body:
  "Þingeyri village has signal but the trail and summit do not.
  Download offline tiles and the spot detail before leaving the
  village. Closest reliable coverage is the village itself."

### 5. Cloud climatology rerun

After steps 1–2 ship to production, re-run
`node scripts/fetch-historical-weather.mjs --api=https://eclipsechase.is`
locally. This regenerates `public/eclipse-data/historical-weather.json`
to include `sandafell-thingeyri`. Commit the JSON diff (single new
entry; existing entries unchanged barring API drift). The numbers above
are the expected values.

### 6. Hero photo (deferred)

Unlike Hæstahjallafoss, **no leftover photo exists** for Sandafell — no
`sandafell-*` or `thingeyri-*` files in `public/images/spots/`. (There
is a `flateyri-shore-hero` from another dropped spot, but Flateyri is a
different village 25 km away.)

Out of scope for this change set, tracked as explicit follow-up:

* Source a free-licensed photo — Wikimedia Commons has a few Sandafell
  summit shots looking out over Dýrafjörður; verify licence (CC-BY-SA
  4.0 acceptable, attribute properly). Or my own if I get up there
  before launch.
* Run through `scripts/process-spot-photos.mjs` to produce the
  `sandafell-thingeyri-hero.webp` + `-thumb.webp` pair.
* Add the `spot_photos` JSONB UPDATE via the established pattern.

The spot ships with the placeholder rendered by the detail page until
this is resolved. Worth tracking as a P1 follow-up — Sandafell without
imagery loses some of the "earned panorama" pitch.

### 7. Guide page link

Update `content/guide.md` line 39 — the Westfjords "Top spots" link
list — to include Sandafell. After this change:

```markdown
Top spots: [Látrabjarg Cliffs](/spots/latrabjarg-cliffs) · [Breiðavík Beach](/spots/breidavik-beach) · [Patreksfjörður Beach](/spots/patreksfjordur-beach) · [Ísafjörður Harbour](/spots/isafjordur-harbour) · [Sandafell Summit](/spots/sandafell-thingeyri)
```

If the Hæstahjallafoss spec has already shipped, the line will already
include its link; just append Sandafell at the end. The two specs are
order-independent — whichever lands second simply appends.

Optional intro tweak (line 37, the regional paragraph): consider
softening "Weather can be variable" to a more specific framing that
acknowledges the two new options offer microclimate diversification.
**Out of scope for this change** — keep the diff to the link list only
and revisit the prose in a separate copy pass once both spots are
live and have a few weeks of forecast experience.

## Copy (English, draft)

**Description**

> A 367 m mountain summit on the south shore of Dýrafjörður, directly
> above the fishing village of Þingeyri. The climb earns you the
> single best horizon on the entire site — over 22° of clearance to the
> west-southwest, with the open Atlantic visible past the fjord mouth
> and the next blocking terrain more than 8 km away across the water.
> A 60-minute hike, but the panorama is the whole point. Best suited
> to viewers who'd rather earn a clean horizon than compromise on a
> roadside spot.

**Parking info**

> Trailhead parking at the south-east edge of Þingeyri village, off
> the upper village road. Small gravel area, free. Þingeyri itself
> has a grocery and petrol; use them before starting the climb.

**Terrain notes**

> 2 km of trail switching back across rocky slopes from the village
> (117 m) to the broad summit plateau (367 m). 60 minutes up
> for a normally-fit walker, less coming down. No shelter at the
> summit — hiking boots, windproof shell, layers, and water are
> essentials. The summit plateau is broad and flat enough for several
> tripods spread out without crowding.

## Risks and mitigations

* **Orographic cloud on the summit.** First advisory addresses this
  directly with a concrete pre-commit check (glass the summit from the
  village; webcam fallback; Hæstahjallafoss as 50-minute pivot).
* **Hike difficulty under-estimated.** Second advisory is unusually
  explicit about kit and timing because mountain hikes in the
  Westfjords on a busy eclipse afternoon are not the place to
  improvise. `difficulty: moderate` (not `easy`) keeps Family /
  First-Timer profiles from being routed here by the recommendation
  engine.
* **No photo at launch.** Acknowledged explicitly in step 6.
  Placeholder is acceptable for ship but tracked as P1 follow-up. The
  copy carries the spot's appeal in the absence of imagery.
* **DEM under-reporting summit elevation.** Addressed via
  `KNOWN_ELEVATION` override in step 2.
* **Cell coverage gap.** Fourth advisory + the standard "download
  offline" guidance covers it.

## Acceptance

The change is done when:

* `GET /api/spots` returns 29 spots (or 30 if Hæstahjallafoss has
  already shipped), with the new `sandafell-thingeyri` row in the
  Westfjords list.
* `GET /api/spots/sandafell-thingeyri` returns the full DetailTabs
  payload including a `horizon_check` with verdict `clear` and
  clearance ≥ 22° (observer elev 368.7 m).
* `public/eclipse-data/historical-weather.json` includes
  `sandafell-thingeyri` with the 10-year breakdown above.
* Four advisories render in the hero badge with `warn` as the topmost
  level.
* Trailhead pin appears on `/spots/sandafell-thingeyri`'s
  `SpotLocationMap` and on `/spots/index` filter map.
* Icelandic translation renders when locale is switched to `is`.
* `content/guide.md` Westfjords link list includes a
  `[Sandafell Summit](/spots/sandafell-thingeyri)` entry.
* Photo placeholder is acceptable for ship; real photo tracked as P1
  follow-up.
