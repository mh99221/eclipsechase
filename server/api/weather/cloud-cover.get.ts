import { serverSupabaseServiceRole } from '#supabase/server'
import { computeForecastStaleness, STATION_IDS } from '../../utils/vedur'

/**
 * Latest cloud-cover forecast per station.
 *
 * Cloud cover comes from `weather_forecasts` (vedur `op_w=forec`, written
 * by /api/tasks/ingest-weather every 15 min). vedur's automatic stations
 * don't observe cloud cover, so the forecast is the only signal we have.
 *
 * Per row we expose `forecast_valid_at` (the ISO valid-time of the slot
 * we picked), and globally `fetched_at` + `stale` so the client can warn
 * when the cron has fallen behind.
 */
export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)

  const now = new Date()
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString()

  const { data: forecastRows } = await supabase
    .from('weather_forecasts')
    .select('station_id, cloud_cover, valid_time, fetched_at')
    .gte('valid_time', now.toISOString())
    .gte('forecast_time', sixHoursAgo)
    .order('valid_time', { ascending: true })
    .limit(STATION_IDS.length * 10)

  const cloudByStation = new Map<string, { cloud_cover: number | null; valid_time: string | null }>()
  for (const row of forecastRows || []) {
    // `station_id` is nullable on the row schema (FK to weather_stations
    // can technically be null). The ingest pipeline never inserts null
    // station IDs — guard so the typecheck flows cleanly anyway.
    if (!row.station_id) continue
    if (!cloudByStation.has(row.station_id)) {
      cloudByStation.set(row.station_id, { cloud_cover: row.cloud_cover, valid_time: row.valid_time })
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
  }
})
