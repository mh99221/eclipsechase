# Weather Data Ingestion — Design Spec

## Goal

Automatically keep weather forecast data fresh by adding a staleness check to the cloud-cover API endpoint. When data is older than 15 minutes, fetch from vedur.is before responding.

## Context

The existing codebase already has:
- `server/utils/vedur.ts` — XML parsing for vedur.is, 15 station IDs
- `server/api/weather/forecast.get.ts` — Fetches forecasts from vedur.is, upserts to Supabase `weather_forecasts`
- `server/api/weather/cloud-cover.get.ts` — Returns latest cloud cover per station from Supabase
- `server/api/weather/stations.get.ts` — Returns station metadata

The map and recommend pages both consume `/api/weather/cloud-cover`. The map page also refreshes client-side every 15 minutes.

**Problem:** Data only gets pulled from vedur.is when someone manually hits `/api/weather/forecast`. There is no automated ingestion.

**Constraint:** Vercel Hobby tier does not support cron jobs at sub-daily intervals.

## Architecture

### Stale-check pattern

`/api/weather/cloud-cover.get.ts` becomes the single ingestion trigger:

1. Query Supabase for the latest `forecast_time` in `weather_forecasts`
2. If the data is less than 15 minutes old, return cached `cloud_cover` rows (fast path)
3. If the data is 15+ minutes old (or no data exists), call vedur.is forecasts API via `server/utils/vedur.ts`, upsert results to `weather_forecasts`, then return fresh `cloud_cover` rows

### Why only forecasts, not observations

The map and recommendation engine use `cloud_cover` exclusively from `weather_forecasts`. The vedur.is observations endpoint does not return cloud cover — it provides temp, wind, and precipitation. The `/api/weather/current` route remains available for station detail display but does not need the stale-check pattern.

## Data Flow

```
Browser (map.vue / recommend.vue)
  → GET /api/weather/cloud-cover
    → Query: SELECT MAX(forecast_time) FROM weather_forecasts
    → If < 15 min old → return cached cloud_cover rows
    → If >= 15 min old (or NULL):
        → fetchForecasts(STATION_IDS) via server/utils/vedur.ts
        → Upsert to Supabase weather_forecasts
        → Return fresh cloud_cover rows
```

### Concurrency

No locking. If two simultaneous requests both detect stale data, both fetch from vedur.is. The `UNIQUE(station_id, forecast_time, valid_time)` constraint with `ON CONFLICT DO UPDATE` handles this safely. Not worth adding complexity for a low-traffic site.

## Error Handling

| Scenario | Behavior |
|---|---|
| vedur.is down or timeout (>10s) | Return stale cached data with `stale: true` flag. Log error. |
| Supabase down | Return 500. |
| vedur.is returns partial data | Upsert what we got. Missing stations keep previous values. |
| No cached data and vedur.is down | Return empty `cloud_cover: []` with `stale: true`. |

No retry logic. The next visitor after 15 minutes triggers a fresh attempt automatically.

## Response Shape

```json
{
  "cloud_cover": [
    { "station_id": "1", "cloud_cover": 25 },
    { "station_id": "990", "cloud_cover": 72 }
  ],
  "stale": false,
  "fetched_at": "2026-03-15T14:30:00Z"
}
```

The `stale` field is `true` when the data is older than 15 minutes and a refresh attempt failed. `fetched_at` is the timestamp of the forecast data being returned.

## Files to Modify

- **`server/api/weather/cloud-cover.get.ts`** — Rewrite to add staleness check, conditional vedur.is fetch via existing `fetchForecasts()`, upsert logic (moved from forecast.get.ts), and error handling with fallback to cached data. The existing `get_latest_cloud_cover` RPC call and its fallback query are replaced by the new staleness-check flow which handles both freshness and data retrieval.
- **`server/utils/vedur.ts`** — Add a 10-second `AbortController` timeout to the `fetch()` calls in `fetchForecasts()` and `fetchObservations()`. The `fetchForecasts` function is already exported and reusable — no extraction needed.

### Note on existing RPC

The current `cloud-cover.get.ts` calls `supabase.rpc('get_latest_cloud_cover')` with a manual query fallback. This RPC may or may not exist in Supabase. The new implementation replaces both paths with a direct query that also checks staleness, so the RPC dependency is removed entirely.

## Files Unchanged

- `server/api/weather/forecast.get.ts` — Stays as a standalone manual-trigger route
- `server/api/weather/current.get.ts` — No stale-check needed
- `server/api/weather/stations.get.ts` — Static data, no change
- All client-side code (map.vue, recommend.vue, composables) — No changes needed, they already consume `/api/weather/cloud-cover`

## Staleness Threshold

15 minutes, matching:
- vedur.is data update frequency
- Existing client-side refresh interval in map.vue
- Defined as a named constant `STALE_THRESHOLD_MS = 15 * 60 * 1000`

## Testing

- Hit `/api/weather/cloud-cover` with empty DB → should fetch from vedur.is, return data
- Hit again within 15 min → should return cached (fast), no vedur.is call
- Wait 15 min (or manually set old timestamp) → should re-fetch
- Simulate vedur.is failure → should return stale cached data with `stale: true`
