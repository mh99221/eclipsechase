import { serverSupabaseServiceRole } from '#supabase/server'
import { ensureFreshForecasts, STATION_IDS } from '../../utils/vedur'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)

  // 1. Ensure forecast data is fresh
  const { isStale, refreshFailed } = await ensureFreshForecasts(supabase, 'cloud-cover')

  // 2. Return latest cloud cover per station
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
