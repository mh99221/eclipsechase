import { serverSupabaseServiceRole } from '#supabase/server'
import { STATION_IDS } from '../../utils/vedur'

/**
 * Return the latest cloud cover forecast per station.
 *
 * This is a pure read — we no longer run ensureFreshForecasts() here.
 * The /api/tasks/ingest-weather cron is responsible for keeping the
 * weather_forecasts table current (every 15 min). Doing the refresh
 * synchronously from this GET made the map page block on an upstream
 * XML fetch + upsert on every user load, which was the largest single
 * contributor to slow map loads.
 *
 * The returned `stale` flag is computed from the newest row's forecast
 * timestamp vs now, so the client can still surface a warning if the
 * cron has fallen behind.
 */
const STALE_THRESHOLD_MS = 90 * 60 * 1000 // 90 min — cron runs every 15

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)

  const now = new Date()
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString()

  const { data: forecastRows } = await supabase
    .from('weather_forecasts')
    .select('station_id, cloud_cover, valid_time, forecast_time')
    .gte('valid_time', now.toISOString())
    .gte('forecast_time', sixHoursAgo)
    .order('valid_time', { ascending: true })
    .limit(STATION_IDS.length * 10) // ~10 nearest forecast slots per station

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
    if (!fetchedAt || row.forecast_time > fetchedAt) {
      fetchedAt = row.forecast_time
    }
  }

  const isStale = fetchedAt
    ? (Date.now() - new Date(fetchedAt).getTime()) >= STALE_THRESHOLD_MS
    : true

  return {
    cloud_cover: Array.from(byStation.values()),
    stale: isStale,
    fetched_at: fetchedAt,
  }
})
