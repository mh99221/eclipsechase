import { serverSupabaseServiceRole } from '#supabase/server'
import { computeForecastStaleness, STATION_IDS } from '../../utils/vedur'

/**
 * Latest cloud-cover forecast per station, plus the timestamp of the
 * most recent live observation for that station.
 *
 * Cloud cover comes from `weather_forecasts` (vedur `op_w=forec`, written
 * by /api/tasks/ingest-weather every 15 min) — observations don't include
 * cloud for any of our 55 automatic stations.
 *
 * `observed_at` comes from `weather_observations` and lets the WEATHER
 * dock show "Updated N min ago" per station.
 *
 * `stale` lets the client warn if the cron has fallen behind.
 */
export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)

  const now = new Date()
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString()

  // Latest cloud-cover forecast per station — same logic as before, just
  // moved out of the response shape so we can merge in observed_at below.
  const [{ data: forecastRows }, { data: obsRows }] = await Promise.all([
    supabase
      .from('weather_forecasts')
      .select('station_id, cloud_cover, valid_time, forecast_time')
      .gte('valid_time', now.toISOString())
      .gte('forecast_time', sixHoursAgo)
      .order('valid_time', { ascending: true })
      .limit(STATION_IDS.length * 10),
    supabase
      .from('weather_observations')
      .select('station_id, timestamp')
      .gte('timestamp', sixHoursAgo)
      .order('timestamp', { ascending: false })
      .limit(STATION_IDS.length * 24),
  ])

  // Forecast: first row per station = nearest future slot.
  const cloudByStation = new Map<string, number | null>()
  for (const row of forecastRows || []) {
    if (!cloudByStation.has(row.station_id)) {
      cloudByStation.set(row.station_id, row.cloud_cover)
    }
  }

  // Observation: first row per station = most recent (we ordered DESC).
  const observedByStation = new Map<string, string>()
  for (const row of obsRows || []) {
    if (!observedByStation.has(row.station_id)) {
      observedByStation.set(row.station_id, row.timestamp)
    }
  }

  const merged = Array.from(cloudByStation.keys()).map(stationId => ({
    station_id: stationId,
    cloud_cover: cloudByStation.get(stationId) ?? null,
    observed_at: observedByStation.get(stationId) ?? null,
  }))

  const { fetchedAt, stale } = computeForecastStaleness(forecastRows)

  return {
    cloud_cover: merged,
    stale,
    fetched_at: fetchedAt,
  }
})
