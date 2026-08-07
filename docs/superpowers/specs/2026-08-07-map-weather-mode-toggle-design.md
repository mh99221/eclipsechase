# Map Weather Mode Toggle (Now / Eclipse Day) — Design

**Date:** 2026-08-07
**Status:** Approved (brainstorming) → implementation
**Author:** Martin (with Claude)

## Background

The `/map` weather layer (`showWeatherV0`, station cloud icons) always shows
each station's **nearest upcoming forecast slot** — effectively "right now,"
never a forecast specifically for the eclipse instant (2026-08-12T17:43 UTC).
There is no UI indication of this; the map just labels itself "Weather."

This mirrors a bug just fixed (same session, ad hoc — not spec'd) on the
spot-detail Weather tab's `PhaseNotice`/`ForecastReliable` components:
copy/behavior there claimed an "Aug-12 forecast" was available well before
the HARMONIE-AROME model's ~48-66h horizon could actually reach eclipse
day. The map has no such claim today, but a user asked directly "is this
current weather or the eclipse forecast?" — the honest answer is "always
current." This spec adds an explicit, user-controlled **Now / Eclipse Day**
toggle so both readings are available and clearly labeled, instead of only
ever exposing the "now" reading.

## Goal

Let a Pro user on `/map` switch the weather layer between:
- **Now** (existing behavior, unchanged) — nearest upcoming forecast slot
  per station.
- **Eclipse Day** — the forecast slot closest to the eclipse instant
  (2026-08-12T17:43 UTC) per station, when the ingested data actually
  reaches that far out. Before then, show an honest empty state instead of
  extrapolating or silently falling back to "now" data.

## Data layer

### `server/api/weather/cloud-cover.get.ts` — add `mode` query param

`mode=now` (default, unchanged) | `mode=eclipse` (new).

Both modes share the same base query shape (`weather_forecasts` filtered by
`forecast_time >= sixHoursAgo` for ingest-recency, same as today) and the
same staleness computation (`computeForecastStaleness`, unchanged — it's
about ingest-pipeline health, not which mode is selected). They differ only
in per-station row selection:

- **`now`**: first row per station with `valid_time >= now()`, ordered
  ascending (existing logic, untouched).
- **`eclipse`**: per station, the row with `valid_time` closest to
  `ECLIPSE_INSTANT` (`2026-08-12T17:43:00Z`, a new exported const mirroring
  `ECLIPSE_DATE` in `useForecastPhase.ts`), restricted to rows where
  `valid_time >= now()` **and** `abs(valid_time - ECLIPSE_INSTANT) <=
  ECLIPSE_TOLERANCE_MS` (new const, 3 hours — HARMONIE-AROME steps are
  3-hourly, so this always catches the nearest slot when the horizon
  reaches that far, and never picks a wildly-off slot otherwise). Stations
  with no row in that window get `cloud_cover: null` (renders via the
  existing "no data" marker/legend entry — no new visual state needed).

Response shape gains one field:

```ts
{
  cloud_cover: Array<{ station_id, cloud_cover, forecast_valid_at }>,
  stale: boolean,
  fetched_at: string | null,
  available: boolean,   // NEW — true iff at least one station has a row
                          // inside the eclipse tolerance window. Always
                          // true for mode=now (there's always a "next"
                          // slot once the pipeline is healthy).
}
```

`available` is derived from real ingested rows, not a hardcoded day-count —
if vedur's effective horizon ever changes, this self-corrects without a
code change (unlike the spot-detail fix's `daysUntil > 2` heuristic, which
was justified there by not having a clean data signal at the composable
level; here the endpoint already touches the raw rows, so we use the real
signal instead).

### `app/pages/map.vue` — two parallel fetches

```ts
const { data: cloudData, refresh: refreshCloud } =
  useFetch('/api/weather/cloud-cover', { lazy: true, server: false })
const { data: cloudDataEclipse, refresh: refreshCloudEclipse } =
  useFetch('/api/weather/cloud-cover', {
    query: { mode: 'eclipse' }, lazy: true, server: false,
    key: 'map-cloud-cover-eclipse',
  })
```

Both cheap Supabase reads (no upstream vedur.is calls either way — same as
today's single fetch). Both refresh on the existing 15-minute timer
alongside the current `refreshCloud()` call.

`weatherMode = ref<'now' | 'eclipse'>('now')` — plain ref, not persisted
(matches `showTraffic` / `showCameras`, which also reset each session).

The existing `stations` computed (map.vue:76-100) switches its source array:

```ts
const activeCloudData = computed(() =>
  weatherMode.value === 'eclipse' ? cloudDataEclipse.value : cloudData.value)
```
...then merges `activeCloudData.value?.cloud_cover` exactly as today's code
merges `cloudData.value?.cloud_cover`. `EclipseMap.vue` needs **no changes**
— it only ever consumes the final merged `stations` prop and re-renders
existing markers in place via its persistent marker cache.

## Empty state (`available === false`)

Applies only when `weatherMode === 'eclipse' && cloudDataEclipse.value &&
!cloudDataEclipse.value.available` (guard on the fetch having landed, so we
don't flash the empty state during initial load — use `pending` from the
eclipse `useFetch` to distinguish "still loading" from "loaded, unavailable").

New component `app/components/map/MapEclipseUnavailable.vue`: a centered
overlay card on the map area (weight/positioning similar to the existing
`ClientOnly #fallback` loading state — semi-opaque panel, not a toast),
shown above the map but below the chip stack / dock z-index. Copy (new
i18n key `map.eclipse_mode_unavailable`):

> "Eclipse-moment forecast becomes available in the 48 hours before
> totality — check back closer to Aug 12."

When shown, `stations` passed to `EclipseMap` is forced to `[]` (no marker
clutter under/around the card) — station markers for other modes (spot
pins, traffic, cameras) are unaffected since those come from separate
props/overlays. Switching back to `weatherMode = 'now'` immediately clears
the card (no dismiss button needed — it's a live reflection of state, not
a one-time notice).

## UI placement

### `MapChipStack.vue` — third chip row

New row, always rendered (same as the `viewer_profile` row — not gated
behind `showWeather` being on, for discoverability and consistency with
the existing two rows):

```html
<div class="row">
  <span class="row-label">{{ t('map.forecast_mode') }}:</span>
  <Pill :active="weatherMode === 'now'" size="sm" surface="glass"
        @click="emit('update:weatherMode', 'now')">{{ t('map.mode_now').toUpperCase() }}</Pill>
  <Pill :active="weatherMode === 'eclipse'" size="sm" surface="glass"
        @click="emit('update:weatherMode', 'eclipse')">{{ t('map.mode_eclipse').toUpperCase() }}</Pill>
</div>
```

New prop `weatherMode: 'now' | 'eclipse'`, new emit `update:weatherMode`.
Both existing `MapChipStack` instantiations in `map.vue` (mobile, and
desktop `variant="topright"`) pass/bind it exactly like `selectedProfile`.
No changes needed to the `rows` prop filtering (`'all' | 'profiles' |
'overlays'`) — both current call sites use `rows="all"`, so the new row
just always appears alongside the other two; no third `rows` variant
needed since nothing today relies on hiding just this row.

### `DockWeather.vue` / station popup — no changes

Already renders a `"Forecast for {time}"` line
(`dock.weather_forecast_for`) from `ctx.forecastValidAt`. In eclipse mode
this will naturally read "Forecast for 17:43" (or whatever the matched
slot's local time is) since `map.vue`'s `onWeatherSelect` already passes
through whichever station object `stations` currently contains — no branch
needed there either.

## i18n additions (`i18n/en.json` `map` block + Icelandic mirror)

```json
"forecast_mode": "Forecast",
"mode_now": "Now",
"mode_eclipse": "Eclipse Day",
"eclipse_mode_unavailable": "Eclipse-moment forecast becomes available in the 48 hours before totality — check back closer to Aug 12."
```
(Icelandic translations added to `i18n/is.json` alongside, matching the
existing bilingual pattern for this file.)

## Explicitly out of scope

- **Freshness pill wording** (`MapStatusStack` / `MapMobileStatusPill`,
  "Weather updated X min ago") stays mode-agnostic — it describes
  ingest-cron health, not which mode is active. Mode is legible from the
  chip row + popup "Forecast for" line.
- **No localStorage persistence** of the toggle — resets to `now` each
  session, consistent with `showTraffic` / `showCameras`.
- **No service-worker/offline precaching** of the `?mode=eclipse` request —
  matches today (only `hours=24` forecast-timeline and the default
  cloud-cover call are precached in `public/sw.js`).
- **No change to the spot-detail Weather tab** — that phase-aware system
  already exists and was just fixed separately; this spec only touches
  `/map`.

## Testing

- **Unit**: extend/add a test for `cloud-cover.get.ts`'s row-selection
  logic if it's extracted into a testable pure function (mirrors the
  existing `computeForecastStaleness` pattern in `server/utils/vedur.ts` —
  pull the "pick nearest row within tolerance" logic into a small pure
  helper there, e.g. `pickForecastRow(rows, targetTime, toleranceMs)`, so
  it's unit-testable without a Supabase mock).
- **Manual/browser verification**: toggle NOW ⇄ ECLIPSE DAY on `/map` in
  dev; confirm markers update, empty-state card appears/disappears
  correctly given today's real data (T-5, so `available` should currently
  be `false`), and the chip row renders correctly on both mobile and
  desktop breakpoints.
