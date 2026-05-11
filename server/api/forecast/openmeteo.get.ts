/**
 * Open-Meteo proxy with in-memory caching, used by the spot detail
 * Weather tab's subseasonal + extended phase cards.
 *
 * - `model=ifs_hres` → 16-day deterministic ECMWF IFS HRES (api.open-meteo.com).
 *   Hourly cloud_cover total + low/mid/high split, wind, temp, precip.
 * - `model=ec46`     → 46-day ECMWF IFS04 sub-seasonal (seasonal-api.open-meteo.com).
 *   Six-hourly cloud_cover total + temp + wind. No layer split or ensemble
 *   on the free tier — paid Standard Plan adds those.
 *
 * Both models return data anchored at 2026-08-12 17:00 UTC ("totality_slot"
 * — closest top-of-hour to the path's earliest C2 at 17:43). When the
 * forecast horizon doesn't reach Aug 12 yet (true today at T-105 for both
 * models), `totality_slot` is null and the client renders a graceful
 * "horizon doesn't extend that far yet" state.
 *
 * Caching is per (model, lat-rounded, lng-rounded). 1 h TTL for ifs_hres,
 * 6 h for ec46 (matches the spec §6 refresh cadence at this distance from
 * the eclipse). With 22 spots × 2 models that's max 44 cache keys —
 * well within Open-Meteo's 10k/day free-tier limit. Production swaps the
 * host to customer-api.open-meteo.com on July 1 (paid sub kicks in) —
 * one-line change.
 *
 * Attribution requirement (CC BY 4.0): clients must surface
 * "Weather data by Open-Meteo.com" with link. The cards already do.
 */
import { createError, defineEventHandler, getQuery } from 'h3'
import { $fetch } from 'ofetch'

type Model = 'ifs_hres' | 'ec46'

interface ForecastSlot {
  valid_time: string                    // ISO 8601, UTC
  cloud_cover: number | null
  cloud_cover_low: number | null
  cloud_cover_mid: number | null
  cloud_cover_high: number | null
  wind_speed: number | null
  temperature: number | null
  precipitation_probability: number | null
}

interface NormalizedForecast {
  model: Model
  forecast_days: number
  horizon_end: string | null            // ISO 8601, UTC; last forecast slot
  totality_slot: ForecastSlot | null    // null if horizon doesn't reach Aug 12
  latest_slot: ForecastSlot | null      // always populated when data present
  fetched_at: string
  cached: boolean
}

const CACHE_TTL_MS: Record<Model, number> = {
  ifs_hres: 60 * 60 * 1000,        // 1 h
  ec46: 6 * 60 * 60 * 1000,        // 6 h
}

const cache = new Map<string, { data: NormalizedForecast; expires: number }>()

// Path's earliest C2 at 2026-08-12 17:43 UTC, snapped to top-of-hour
// because IFS HRES is hourly. EC46 is six-hourly so it rounds further to
// the nearest six-hour bin (12:00 or 18:00 UTC); we still match around
// 17:00 with a 6 h tolerance window.
const ECLIPSE_TARGET_MS = new Date('2026-08-12T17:00:00Z').getTime()
const TOTALITY_TOLERANCE_MS = 6 * 60 * 60 * 1000

export default defineEventHandler(async (event): Promise<NormalizedForecast> => {
  const q = getQuery(event)
  const lat = Number(q.lat)
  const lng = Number(q.lng)
  const model: Model = q.model === 'ec46' ? 'ec46' : 'ifs_hres'

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Query params lat + lng (numbers) are required',
    })
  }

  // Round coordinates to 3 dp before caching: Open-Meteo grid is ~9 km
  // (IFS HRES) so 3 dp = 110 m precision is more than the model resolves.
  // Letting micro-jitter in spot lat/lng bypass the cache would cost calls.
  const key = `${model}:${lat.toFixed(3)}:${lng.toFixed(3)}`
  const now = Date.now()
  const cached = cache.get(key)
  if (cached && cached.expires > now) {
    return { ...cached.data, cached: true }
  }

  const url = buildUrl(model, lat, lng)
  let upstream: any
  try {
    upstream = await $fetch(url, {
      timeout: 15_000,
      headers: { 'User-Agent': 'eclipsechase.is/1.0' },
    })
  }
  catch (err: any) {
    throw createError({
      statusCode: 502,
      statusMessage: `Open-Meteo fetch failed: ${err?.message ?? 'unknown'}`,
    })
  }

  const normalized = normalize(model, upstream)
  cache.set(key, { data: normalized, expires: now + CACHE_TTL_MS[model] })
  return normalized
})

function buildUrl(model: Model, lat: number, lng: number): string {
  // timeformat=unixtime sidesteps the JS Date pitfall where Open-Meteo's
  // `"2026-08-12T17:00"` (no Z) parses as local time. Epoch seconds → ms
  // → ISO is unambiguous.
  if (model === 'ifs_hres') {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      hourly: [
        'temperature_2m',
        'cloud_cover',
        'cloud_cover_low',
        'cloud_cover_mid',
        'cloud_cover_high',
        'wind_speed_10m',
        'precipitation_probability',
      ].join(','),
      timezone: 'UTC',
      timeformat: 'unixtime',
      forecast_days: '16',
    })
    return `https://api.open-meteo.com/v1/forecast?${params.toString()}`
  }
  // EC46 sub-seasonal endpoint. No cloud-layer split or precip prob on
  // the free tier; wind + temp + total cloud only.
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    models: 'ecmwf_ifs04',
    six_hourly: 'cloud_cover,temperature_2m,wind_speed_10m,precipitation',
    timeformat: 'unixtime',
    forecast_days: '46',
  })
  return `https://seasonal-api.open-meteo.com/v1/seasonal?${params.toString()}`
}

function normalize(model: Model, raw: any): NormalizedForecast {
  // ifs_hres uses `hourly` block, ec46 uses `six_hourly` (singular naming
  // varies per Open-Meteo docs — both flatten to the same shape here).
  const blockKey = model === 'ifs_hres' ? 'hourly' : 'six_hourly'
  const block = raw?.[blockKey]
  const times: number[] = Array.isArray(block?.time) ? block.time : []
  const fetched_at = new Date().toISOString()

  if (times.length === 0) {
    return {
      model,
      forecast_days: model === 'ifs_hres' ? 16 : 46,
      horizon_end: null,
      totality_slot: null,
      latest_slot: null,
      fetched_at,
      cached: false,
    }
  }

  // Find the slot whose timestamp is nearest to the totality target,
  // within the tolerance window. For IFS HRES that's the 17:00 hourly
  // slot when reachable; for EC46 it's whichever of 12:00 / 18:00 UTC is
  // closer (resolution is six-hourly).
  let totalityIdx = -1
  let bestDelta = Number.POSITIVE_INFINITY
  for (let i = 0; i < times.length; i++) {
    const ts = times[i]
    if (ts == null) continue
    const ms = ts * 1000
    const delta = Math.abs(ms - ECLIPSE_TARGET_MS)
    if (delta < bestDelta && delta <= TOTALITY_TOLERANCE_MS) {
      bestDelta = delta
      totalityIdx = i
    }
  }

  const latestIdx = times.length - 1
  const latestTs = times[latestIdx]!
  return {
    model,
    forecast_days: model === 'ifs_hres' ? 16 : 46,
    horizon_end: new Date(latestTs * 1000).toISOString(),
    totality_slot: totalityIdx >= 0 ? buildSlot(block, totalityIdx) : null,
    latest_slot: buildSlot(block, latestIdx),
    fetched_at,
    cached: false,
  }
}

function buildSlot(block: any, i: number): ForecastSlot {
  const at = (arr: any[] | undefined, j: number) =>
    Array.isArray(arr) && arr[j] != null ? Number(arr[j]) : null
  return {
    valid_time: new Date((block.time[i] as number) * 1000).toISOString(),
    cloud_cover: at(block.cloud_cover, i),
    cloud_cover_low: at(block.cloud_cover_low, i),
    cloud_cover_mid: at(block.cloud_cover_mid, i),
    cloud_cover_high: at(block.cloud_cover_high, i),
    wind_speed: at(block.wind_speed_10m, i),
    temperature: at(block.temperature_2m, i),
    precipitation_probability: at(block.precipitation_probability, i),
  }
}
