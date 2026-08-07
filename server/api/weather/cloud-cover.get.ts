import { serverSupabaseServiceRole } from '#supabase/server'
import {
  computeForecastStaleness,
  pickNearestForecastRow,
  ECLIPSE_INSTANT,
  ECLIPSE_FORECAST_TOLERANCE_MS,
  STATION_IDS,
} from '../../utils/vedur'

/**
 * Cloud-cover forecast per station, in one of two modes.
 *
 * Cloud cover comes from `weather_forecasts` (vedur `op_w=forec`, written
 * by /api/tasks/ingest-weather every 15 min). vedur's automatic stations
 * don't observe cloud cover, so a forecast is the only signal we have —
 * in BOTH modes this is a forecast, never a live reading.
 *
 *   ?mode=now      (default) the earliest slot at or after "now" — i.e.
 *                  current-ish conditions. This is what /map has always
 *                  shown.
 *   ?mode=eclipse  the slot closest to ECLIPSE_INSTANT, within
 *                  ECLIPSE_FORECAST_TOLERANCE_MS. Empty until vedur's
 *                  model horizon actually reaches Aug 12 (~2 days out),
 *                  which is reported via `available` so the client can
 *                  show an honest "not yet" state instead of implying it
 *                  has eclipse-day data when it doesn't.
 *
 * Per row we expose `forecast_valid_at` (the ISO valid-time of the slot
 * we picked), and globally `fetched_at` + `stale` so the client can warn
 * when the cron has fallen behind. `stale` describes ingest-pipeline
 * health and is mode-independent.
 */
export default defineEventHandler(async (event) => {
  // Edge cache: set here (not via routeRules) because trailingSlash:true
  // rewrites the request path, so the Vercel header-route keyed to the
  // no-slash path never matches the served /api/weather/cloud-cover/.
  setResponseHeader(event, 'Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300')

  const query = getQuery(event)
  const mode = query.mode === 'eclipse' ? 'eclipse' : 'now'

  const supabase = await serverSupabaseServiceRole(event)

  const now = new Date()
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString()

  // Eclipse mode narrows to a ±tolerance window around the eclipse
  // instant. Clamped to "not in the past" so a stale row can never be
  // served as the eclipse-day forecast; once the whole window is behind
  // us there is nothing to return at all.
  const eclipseMs = ECLIPSE_INSTANT.getTime()
  const windowStartMs = Math.max(now.getTime(), eclipseMs - ECLIPSE_FORECAST_TOLERANCE_MS)
  const windowEndMs = eclipseMs + ECLIPSE_FORECAST_TOLERANCE_MS

  if (mode === 'eclipse' && windowStartMs > windowEndMs) {
    // Eclipse (plus its tolerance window) is fully in the past.
    return { cloud_cover: [], stale: true, fetched_at: null, available: false }
  }

  let request = supabase
    .from('weather_forecasts')
    .select('station_id, cloud_cover, valid_time, fetched_at')
    .gte('forecast_time', sixHoursAgo)

  request = mode === 'eclipse'
    ? request
        .gte('valid_time', new Date(windowStartMs).toISOString())
        .lte('valid_time', new Date(windowEndMs).toISOString())
    : request.gte('valid_time', now.toISOString())

  const { data: forecastRows } = await request
    .order('valid_time', { ascending: true })
    .limit(STATION_IDS.length * 10)

  const cloudByStation = new Map<string, { cloud_cover: number | null; valid_time: string | null }>()

  if (mode === 'eclipse') {
    // Group every candidate row per station, then pick the one closest to
    // the eclipse instant. The tolerance check inside
    // pickNearestForecastRow is authoritative — it re-applies the window
    // in JS so the result is correct regardless of what the SQL filter
    // narrowed (and keeps the rule unit-testable).
    const rowsByStation = new Map<string, Array<{ cloud_cover: number | null; valid_time: string | null }>>()
    for (const row of forecastRows || []) {
      if (!row.station_id) continue
      if (!rowsByStation.has(row.station_id)) rowsByStation.set(row.station_id, [])
      rowsByStation.get(row.station_id)!.push({ cloud_cover: row.cloud_cover, valid_time: row.valid_time })
    }
    for (const [stationId, rows] of rowsByStation) {
      const picked = pickNearestForecastRow(rows, eclipseMs, ECLIPSE_FORECAST_TOLERANCE_MS)
      if (picked) cloudByStation.set(stationId, picked)
    }
  } else {
    // `now` mode: rows arrive ordered by valid_time ascending, so the
    // first row seen per station is the earliest upcoming slot.
    for (const row of forecastRows || []) {
      // `station_id` is nullable on the row schema (FK to weather_stations
      // can technically be null). The ingest pipeline never inserts null
      // station IDs — guard so the typecheck flows cleanly anyway.
      if (!row.station_id) continue
      if (!cloudByStation.has(row.station_id)) {
        cloudByStation.set(row.station_id, { cloud_cover: row.cloud_cover, valid_time: row.valid_time })
      }
    }
  }

  const merged = Array.from(cloudByStation.keys()).map((stationId) => {
    const fc = cloudByStation.get(stationId)
    return {
      station_id: stationId,
      cloud_cover: fc?.cloud_cover ?? null,
      forecast_valid_at: fc?.valid_time ?? null,
    }
  })

  const { fetchedAt, stale } = computeForecastStaleness(forecastRows)

  return {
    cloud_cover: merged,
    stale,
    fetched_at: fetchedAt,
    // Only meaningful for eclipse mode — `now` always has a next slot
    // whenever the pipeline is healthy, so the client never consults it.
    available: mode === 'eclipse' ? merged.length > 0 : true,
  }
})
