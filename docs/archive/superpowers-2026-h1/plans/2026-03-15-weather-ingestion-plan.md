# Weather Data Ingestion Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-refresh weather forecast data from vedur.is when the cloud-cover endpoint detects stale data (>15 min old).

**Architecture:** The `/api/weather/cloud-cover` endpoint gains a staleness check — it queries `MAX(forecast_time)` from Supabase, and if older than 15 minutes, fetches from vedur.is and upserts before returning. On fetch failure, it falls back to stale cached data with a `stale: true` flag.

**Tech Stack:** Nuxt 4 server routes, Supabase (PostgreSQL), vedur.is XML API, xml2js

**Spec:** `docs/superpowers/specs/2026-03-15-weather-ingestion-design.md`

---

## Chunk 1: Implementation

### Task 1: Add fetch timeout to vedur.ts

**Files:**
- Modify: `server/utils/vedur.ts`

- [ ] **Step 1: Add AbortController timeout to fetchObservations**

In `server/utils/vedur.ts`, replace the bare `fetch(url)` call in `fetchObservations` (line 41) with a 10-second timeout:

```typescript
export async function fetchObservations(stationIds: string[] = STATION_IDS): Promise<VedurObservation[]> {
  const ids = stationIds.join(';')
  const url = `${VEDUR_BASE}/?op_w=xml&type=obs&lang=en&view=xml&ids=${ids}&params=F;D;T;R`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`vedur.is observations request failed: ${response.status}`)
    }
    const xml = await response.text()
    // ... rest of parsing unchanged
  } finally {
    clearTimeout(timeout)
  }
```

- [ ] **Step 2: Add AbortController timeout to fetchForecasts**

Same pattern for `fetchForecasts` (line 76):

```typescript
export async function fetchForecasts(stationIds: string[] = STATION_IDS): Promise<VedurForecast[]> {
  const ids = stationIds.join(';')
  const url = `${VEDUR_BASE}/?op_w=xml&type=forec&lang=en&view=xml&ids=${ids}&params=N;T;R`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`vedur.is forecast request failed: ${response.status}`)
    }
    const xml = await response.text()
    // ... rest of parsing unchanged
  } finally {
    clearTimeout(timeout)
  }
```

- [ ] **Step 3: Verify the dev server starts**

Run: `npx nuxt dev`
Expected: Server starts without errors. No runtime changes yet since cloud-cover.get.ts hasn't been modified.

- [ ] **Step 4: Commit**

```bash
git add server/utils/vedur.ts
git commit -m "feat: add 10s fetch timeout to vedur.is API calls"
```

---

### Task 2: Rewrite cloud-cover.get.ts with stale-check pattern

**Files:**
- Modify: `server/api/weather/cloud-cover.get.ts`

- [ ] **Step 1: Replace the entire file with the new implementation**

The new `cloud-cover.get.ts` does three things:
1. Check staleness via `SELECT MAX(forecast_time)`
2. If stale, fetch from vedur.is and upsert (logic from forecast.get.ts)
3. Return cloud cover rows with `stale` and `fetched_at` fields

```typescript
import { serverSupabaseServiceRole } from '#supabase/server'
import { fetchForecasts, STATION_IDS } from '../../utils/vedur'

const STALE_THRESHOLD_MS = 15 * 60 * 1000

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)

  // 1. Check how old the latest forecast data is
  const { data: latestRow, error: latestError } = await supabase
    .from('weather_forecasts')
    .select('forecast_time')
    .order('forecast_time', { ascending: false })
    .limit(1)
    .single()

  if (latestError && latestError.code !== 'PGRST116') {
    // PGRST116 = no rows found (acceptable)
    throw createError({ statusCode: 500, message: 'Failed to check forecast freshness' })
  }

  const latestTime = latestRow?.forecast_time ? new Date(latestRow.forecast_time).getTime() : 0
  const age = Date.now() - latestTime
  const isStale = age >= STALE_THRESHOLD_MS

  // 2. If stale, fetch from vedur.is and upsert
  let refreshFailed = false
  if (isStale) {
    try {
      const forecasts = await fetchForecasts(STATION_IDS)

      if (forecasts.length > 0) {
        const rows = forecasts
          .filter(fc => fc.validTime)
          .map(fc => ({
            station_id: fc.stationId,
            forecast_time: fc.forecastTime,
            valid_time: fc.validTime,
            cloud_cover: fc.cloudCover,
            precipitation_prob: fc.precipitation,
            source_model: 'vedur',
          }))

        await supabase
          .from('weather_forecasts')
          .upsert(rows, { onConflict: 'station_id,forecast_time,valid_time' })
      }
    } catch (err) {
      console.error('[cloud-cover] Failed to refresh from vedur.is:', err)
      refreshFailed = true
    }
  }

  // 3. Return latest cloud cover per station
  const now = new Date()
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString()

  const { data: forecastRows } = await supabase
    .from('weather_forecasts')
    .select('station_id, cloud_cover, valid_time, forecast_time')
    .gte('valid_time', now.toISOString())
    .gte('forecast_time', sixHoursAgo)
    .order('valid_time', { ascending: true })
    .limit(150)

  // Deduplicate: first row per station (nearest future forecast)
  const byStation = new Map<string, { station_id: string; cloud_cover: number | null }>()
  let fetchedAt: string | null = null

  for (const row of forecastRows || []) {
    if (!byStation.has(row.station_id)) {
      byStation.set(row.station_id, {
        station_id: row.station_id,
        cloud_cover: row.cloud_cover,
      })
    }
    // Track the most recent forecast_time we're returning
    if (!fetchedAt || row.forecast_time > fetchedAt) {
      fetchedAt = row.forecast_time
    }
  }

  return {
    cloud_cover: Array.from(byStation.values()),
    stale: isStale && refreshFailed,
    fetched_at: fetchedAt,
  }
})
```

- [ ] **Step 2: Verify the dev server starts**

Run: `npx nuxt dev`
Expected: Server starts without errors.

- [ ] **Step 3: Manual test — hit the endpoint**

Run: `curl http://localhost:3000/api/weather/cloud-cover`

Expected: JSON response with `cloud_cover` array, `stale` field (boolean), and `fetched_at` field. If the database has no forecast data yet, it should fetch from vedur.is (takes 2-3 seconds first time) and return fresh data.

- [ ] **Step 4: Manual test — hit again (should be cached)**

Run: `curl http://localhost:3000/api/weather/cloud-cover`

Expected: Response returns in <100ms (no vedur.is call). Same data, `stale: false`.

- [ ] **Step 5: Commit**

```bash
git add server/api/weather/cloud-cover.get.ts
git commit -m "feat: add stale-check auto-refresh to cloud-cover endpoint"
```

---

### Task 3: Verify client-side integration

**Files:** None modified — verification only.

- [ ] **Step 1: Open the map page in browser**

Navigate to `http://localhost:3000/map`

Expected: Map loads with weather station markers showing cloud cover colors. The cloud-cover endpoint was called automatically. Check the network tab — should see a single `/api/weather/cloud-cover` request.

- [ ] **Step 2: Open the recommend page**

Navigate to `http://localhost:3000/recommend`

Expected: Spot cards show weather status (Clear / Partly cloudy / etc.) and weather factor percentages. Data comes from the same cloud-cover endpoint.

- [ ] **Step 3: Check response shape in network tab**

The response should include `stale` and `fetched_at` fields alongside the `cloud_cover` array. The client-side code (map.vue, recommend.vue) accesses `cloudData.value?.cloud_cover`, so the extra fields are ignored safely.

- [ ] **Step 4: Final commit and push**

```bash
git push
```
