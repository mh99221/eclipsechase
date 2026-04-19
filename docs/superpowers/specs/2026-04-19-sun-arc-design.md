# Sun-Arc Map Overlay — Design Spec

**Date:** 2026-04-19
**Status:** Design — awaiting approval to move to implementation plan

## Problem

Eclipse viewers need to know *where in the sky the sun will be during totality* at a given location. The app already conveys this in three text forms:

- Spot detail page shows `sun_altitude` and a compass direction (e.g. "WSW") in the stats strip.
- `HorizonProfile` (spot detail page + dynamic horizon check) shows a side-view of the sun arc and terrain.
- `/api/horizon/check` returns `sun_azimuth` + `sun_altitude` as numbers.

What's missing is a *top-down* view on the map — a visualisation that ties the geographic location to the direction of the sun *as a bearing on the map*. This serves three user goals:

1. **Composition planning** — photographers / sightseers want to know which way to frame.
2. **Horizon-check verification** — confirmation that the terrain analysed is the terrain in the sun's direction.
3. **Orientation on arrival** — standing at the spot on eclipse day, quick "I'm facing the right way" confirmation.

## Non-goals

- Not replacing `HorizonProfile`. The side-view visualisation stays. The map arc complements it.
- Not showing the sun's full-day trajectory (sunrise → sunset). Scope is the 30-minute window around totality.
- Not showing arcs for every spot on `/map` simultaneously. At most one arc at a time on `/map`; always-visible only on the single-spot detail page.
- Not conveying altitude *spatially* on the map. Altitude is a vertical angle; a 2D top-down map can only honestly represent azimuth. Altitude is surfaced as a numeric label.

## Decisions

| Decision | Chosen | Alternatives considered |
|---|---|---|
| Primary purpose | All three (composition + verification + orientation) | Single-purpose — rejected: same visual serves all three |
| Scope | All three call sites: `/map` horizon-check point, `/map` selected spot, spot detail page | Subset — rejected: same `SunArc` unit works everywhere |
| Visual style | Trajectory arc with time ticks | Bearing-only ray, gradient ray + corona — rejected: arc carries more narrative |
| Time range | ±15 min around totality | ±30 min, full ~2h partial — rejected: ±15 min is the event, wider is decorative |
| Label language | UTC (matches app convention, Iceland is UTC year-round) | Local time — rejected: no ambiguity gain |
| Arc rendering | Mapbox line layer (geojson) | SVG overlay — rejected: unnecessary, line layer pans/zooms natively |
| Sun + ticks | HTML markers | Mapbox circle layer — rejected: HTML allows theme-aware CSS + corona glow |
| Arc radius | Fixed 120 px in screen space | Fixed geographic distance — rejected: looks tiny at low zoom |

## Architecture

A single new unit `SunArc` in `app/utils/sunArc.ts` is the entire feature. It takes a Mapbox map instance plus inputs and returns a `detach()` closure:

```ts
interface SunArcProps {
  lat: number
  lng: number
  sunAzimuth: number        // degrees, east-of-north
  sunAltitude: number       // degrees above horizon
  totalityStartIso: string  // ISO timestamp
  id: string                // unique suffix for source/layer ids, so multiple arcs on one map don't collide
}

function attachSunArc(map: mapboxgl.Map, props: SunArcProps): () => void
```

No Vue reactivity inside. Pure DOM + Mapbox. Vue components own *when* to attach/detach; `SunArc` owns *how* to render and clean up.

The caller-supplied `id` suffix disambiguates source/layer names so multiple arcs on a single map don't collide. Call sites pass:

| Call site | `id` value |
|---|---|
| `/map` focused spot | `spot-${spot.slug}` |
| `/map` horizon-check | `horizon-check` |
| Spot detail page | `spot-${spot.slug}` (only one ever) |

### Unit boundaries

- **What it does:** renders a sun-direction trajectory arc + sun disk + time tick labels for a single location.
- **How you use it:** call `attachSunArc(map, props)`; call the returned closure to remove.
- **What it depends on:** `mapbox-gl`, `app/utils/solar.ts`'s `computeSunTrajectory`, a monospace font stack (already loaded).

Three call sites:

| Call site | Lifecycle |
|---|---|
| `app/components/EclipseMap.vue` | Attach on spot-popup `open`; detach on popup `close`. Only one arc at a time. |
| `app/pages/map.vue` | Attach when `horizonCheckCoords` is set and the API response has `in_totality_path === true`; detach on close / on spot-popup open (spot popup takes precedence). |
| `app/components/SpotLocationMap.vue` | Attach on map `load`; detach on unmount. Permanent. |

## Data flow

### Inputs per call site

| Call site | `lat/lng` | `sun_azimuth` / `sun_altitude` | `totality_start` |
|---|---|---|---|
| Spot detail map | `spot.lat/lng` (prop) | `spot.sun_altitude/azimuth` (prop, from DB) | `spot.totality_start` (prop, from DB) |
| `/map` focused spot | same, from `props.spots[]` | same | same |
| `/map` horizon check | `horizonCheckCoords` | from POST `/api/horizon/check` response | **new field — needs API change** |

### API change: `/api/horizon/check`

Currently returns `in_totality_path`, `sun_altitude`, `sun_azimuth`, `verdict`, `clearance_degrees`, `sweep`, etc. Does *not* return `totality_start`.

Add `totality_start?: string` (ISO timestamp) to the response. Source: the nearest eclipse-grid point, already preloaded in `server/utils/horizon.ts` for the bucket index. Ask the grid for the nearest point, pull its `totality_start`.

Type update in `app/types/horizon.ts`:

```ts
export interface HorizonCheckResponse {
  // ... existing fields
  totality_start?: string  // ISO timestamp; absent when in_totality_path === false
}
```

### Trajectory computation

`SunArc` calls `computeSunTrajectory(lat, lng, totalityUtcHours - 0.25, totalityUtcHours + 0.25)` from `app/utils/solar.ts` — the same function `HorizonProfile` uses. Returns `SunTrajectoryPoint[]` at configurable resolution; use a 1-minute step to get ~31 points across the 30-min window.

`totalityUtcHours` is derived from the ISO `totality_start` timestamp:

```ts
const d = new Date(totalityStartIso)
const totalityUtcHours = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600
```

### Map-space conversion

The sun is effectively "at infinity" in the sky. On a 2D map we render it at a fixed visual distance so the arc reads consistently at every zoom level.

For each trajectory point `{ utcHours, altitude, azimuth }`:

1. Project the spot's `lat/lng` to screen pixels: `const origin = map.project([lng, lat])`.
2. Offset by `(sin(azRad) × 120, -cos(azRad) × 120)` — 120 px in the direction of `azimuth`, measured east-of-north (Mapbox screen Y increases downward, so north is `-cos`).
3. Unproject back to `lat/lng`: `map.unproject([originX + dx, originY + dy])`.

That yields the arc polyline's points in geographic coords. As `azimuth` changes smoothly across the trajectory, the polyline forms a gentle arc. In Iceland at totality the azimuth sweeps only ~3° across the 30-min window, so the arc reads as a slightly-curved line — not a dramatic sweep.

### Refresh trigger

`map.on('zoom', refreshArc)` — on zoom, re-project the spot's anchor at the new zoom, re-offset each trajectory point by 120 px along its azimuth, re-unproject. This updates **both** the geojson source (`source.setData(...)`) **and** every HTML marker's `lnglat` via `marker.setLngLat(...)` so the sun disk + ticks + callout all stay at the correct 120-px visual radius. No refresh needed on pan — once recomputed at the current zoom, the arc's lat/lng points move with the map naturally.

## Visual rendering

### Arc line (Mapbox line layer)

| Property | Value |
|---|---|
| `line-color` | `rgb(var(--accent-strong))` — theme-aware (amber in dark, burnished orange in light) |
| `line-width` | 1.2 |
| `line-dasharray` | `[2, 2]` |
| `line-opacity` | 0.55 |
| Layer order | Added below spot-marker layer if present |
| Source id | `sun-arc-{id}` |
| Layer id | `sun-arc-line-{id}` |

### Sun disk (HTML marker)

- 16 px solid amber disk (`#f59e0b`)
- 24 px soft corona ring around it, `opacity 0.3`
- Anchored to the trajectory's totality point (the midpoint of the 31-point array)
- No click handler — purely informational

### Tick markers (HTML markers at 5-min intervals)

- 3-px dots at trajectory points for 17:30, 17:35, 17:40, 17:45, 17:50, 17:55, 18:00 (7 ticks)
- Endpoints (17:30 and 18:00): time label adjacent to the dot in IBM Plex Mono 8 px, colour `rgb(var(--ink-3))`
- Intermediate ticks: dot only — keeps visual weight low
- Totality tick (17:45) is *replaced* by the sun disk (don't render both)

### Totality callout (HTML marker above sun disk)

- IBM Plex Mono 11 px
- Colour `rgb(var(--accent-strong))`
- Content: `"17:45 UTC · 24°"` — totality time + sun altitude
- Anchored 22 px above the sun disk

## Activation lifecycle

### `/map` — horizon-check point

- **Trigger:** `horizonCheckCoords` is set AND the horizon-check API response has `in_totality_path === true` AND `sun_altitude/azimuth/totality_start` are present.
- **Detach:** when `horizonCheckCoords` is set to `null` (panel close), OR when a spot popup opens.
- If `in_totality_path === false`: skip arc. The panel already handles the "outside path" messaging.

### `/map` — focused spot

- **Trigger:** a spot's Mapbox popup opens. Listen to `popup.on('open')`.
- **Only one arc at a time** on `/map`. If a spot popup opens while horizon-check arc is showing, swap: detach horizon arc, attach spot arc.
- **Detach:** `popup.on('close')` OR a different spot's popup opens OR horizon check re-activates.

### Spot detail page

- **Trigger:** `map.on('load')` once both map and spot data are ready.
- **Detach:** component unmount.
- No user interaction toggles it.

## Edge cases

| Case | Handling |
|---|---|
| Spot outside totality path (curated data shouldn't produce this) | Skip arc; `console.warn` once |
| `totality_start` missing in DB / API | Skip arc; existing non-arc UI is unaffected |
| Horizon-check point just outside path | Panel messaging covers it; no arc |
| Theme swap (light ↔ dark) mid-session | `map.setStyle` tears down layers → re-attach inside the existing `style.load` handler that already re-adds spot markers |
| Zoom change | Arc recomputed via `map.on('zoom')` to keep 120-px visual radius |
| Map pan | No action needed; arc points are in geographic coords and pan with map |
| Multiple arcs on `/map` (horizon + spot) | Swap — detach previous before attaching next |
| Sun altitude below 0 at arc endpoints | Shouldn't happen for ±15 min around 24° totality; `computeSunTrajectory` clamps anyway |

### Cleanup discipline

Every `attachSunArc(...)` returns a `detach()` closure that:

1. Removes `sun-arc-line-{id}` layer from map.
2. Removes `sun-arc-{id}` source.
3. Removes the sun-disk HTML marker.
4. Removes all tick HTML markers.
5. Unregisters the `zoom` event handler.

Callers must store the closure and call it. Same pattern as the `useMapOverlay` composable's `detach` lifecycle.

## File-level implementation

### New files

| File | Purpose | ~Lines |
|---|---|---|
| `app/utils/sunArc.ts` | `attachSunArc(map, props) → detach()` — source + layer + markers lifecycle + zoom refresh | ~150 |
| `tests/unit/utils/sunArc.test.ts` | Mock `mapboxgl` Map/Marker; verify attach adds layer, detach removes layer + markers + handler, zoom triggers recompute | ~80 |

### Modified files

| File | Change |
|---|---|
| `server/api/horizon/check.post.ts` | Return `totality_start` from nearest eclipse-grid point |
| `app/types/horizon.ts` | Add `totality_start?: string` to `HorizonCheckResponse` |
| `app/components/EclipseMap.vue` | Import + wire `attachSunArc` into spot-popup `open`/`close` handlers; track current detach closure; also re-attach inside the existing `colorMode` theme-swap handler |
| `app/pages/map.vue` | When `horizonCheckCoords` is set and API response has `in_totality_path`, attach `SunArc` via `eclipseMapRef.value.map`. Detach on close / on spot popup open. Coordinate with `EclipseMap.vue` so only one arc shows at a time (expose an arc-ownership API on `EclipseMap`). |
| `app/components/DynamicHorizonCheck.vue` | Already fetches `/api/horizon/check` internally. Add an `@result` emit so the parent (`map.vue`) receives the API response and can pull `sun_altitude/sun_azimuth/totality_start` for `SunArc`. No visual change. |
| `app/components/SpotLocationMap.vue` | Import + attach on `load`, detach on unmount |
| `tests/mocks/mapbox-gl.ts` | Extend with `project`/`unproject` returning deterministic coords so `sunArc` unit test can run |
| `CLAUDE.md` | Add `sunArc.ts` to utils list |

### No changes to

- `app/utils/solar.ts` — reuse `computeSunTrajectory` as-is.
- `app/components/HorizonProfile.vue` — side-view unchanged.
- Supabase schema — no new columns (DB already has `sun_azimuth/altitude/totality_start`).

### Test strategy

- **Unit:** extend `tests/mocks/mapbox-gl.ts` with `project/unproject` returning deterministic pixel/lng pairs; unit-test `attachSunArc` for:
  - Adds a geojson source and line layer with expected id.
  - Creates 1 sun-disk marker + 6 tick markers + 1 callout marker (the 17:45 totality tick is replaced by the sun disk, so tick markers at 17:30/17:35/17:40/17:50/17:55/18:00).
  - `detach()` removes source, layer, all markers, zoom handler.
  - `zoom` event triggers a source re-data update AND repositions every HTML marker.
- **Integration:** none — the visual output requires real Mapbox tiles. Manual browser verification at implementation time, documented in the implementation plan's verification steps.
- **No E2E:** same reason.

## Risks + open questions

### Risk: arc visual weight competes with eclipse-path tint

`/map` has an amber-tinted path of totality polygon. The arc is also amber. Both could read as a single mass of amber clutter. Mitigation: arc uses dashed line at 0.55 opacity — distinct from the solid path fill. If this reads poorly in practice, we can pull the arc color towards `--ice` (`#7dd3fc`) instead of amber.

### Risk: fixed 120-px radius feels awkward at some zooms

At zoom 5 (country view), 120 px covers a wide geographic area — the arc spans large physical distance. At zoom 12 (street-level), it's tiny. If the zoom-aware feel is wrong, alternative is to adapt radius to zoom (e.g. `radius = 80 + zoom * 8`). Defer tuning to after first implementation.

### Risk: spot popup + arc coordination complexity

`/map` must track "who owns the arc right now" between horizon-check and the currently-open spot popup. Adds a small state machine to `EclipseMap.vue`. Mitigation: expose an `attachArc`/`detachArc` method on `EclipseMap`'s component ref; both call sites go through that single entry point.

### Open: will altitude ever be non-24° enough to matter in the label?

Across Iceland the totality altitude is 23.6°–25.7°. All labels will read 24° or 25°. Fine — small variation is still informative for spot-to-spot comparison.

## Definition of done

- `SunArc` unit exists with tests passing.
- Arc visible on spot detail page (manual browser verification).
- Arc visible on `/map` horizon-check (manual).
- Arc visible on `/map` when a spot popup is open (manual).
- Theme swap (light ↔ dark) preserves the arc.
- Zoom maintains ~120 px visual radius.
- No spot-marker visibility regressions.
- `/api/horizon/check` returns `totality_start` in response.
- CLAUDE.md reflects the new utility.
- Commit on `main`.
