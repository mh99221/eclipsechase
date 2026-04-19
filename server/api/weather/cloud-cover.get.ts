import { serverSupabaseServiceRole } from '#supabase/server'
import { computeForecastStaleness, STATION_IDS } from '../../utils/vedur'

/**
 * Return the latest cloud cover forecast per station.
 *
 * Pure read against `weather_forecasts`; the /api/tasks/ingest-weather
 * cron keeps that table current (15-min cadence). We used to refresh
 * synchronously here, but that blocked every map page load on an
 * upstream XML fetch — moved to the cron to keep user requests fast.
 *
 * `stale` lets the client warn if the cron has fallen behind.
 */
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
  for (const row of forecastRows || []) {
    if (!byStation.has(row.station_id)) {
      byStation.set(row.station_id, {
        station_id: row.station_id,
        cloud_cover: row.cloud_cover,
      })
    }
  }

  const { fetchedAt, stale } = computeForecastStaleness(forecastRows)

  return {
    cloud_cover: Array.from(byStation.values()),
    stale,
    fetched_at: fetchedAt,
  }
})
