import { serverSupabaseServiceRole } from '#supabase/server'
import { fetchForecasts, forecastsToRows, STATION_IDS } from '../../utils/vedur'

const STALE_THRESHOLD_MS = 15 * 60 * 1000

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)

  // 1. Check how old the latest forecast data is
  const { data: latestRow, error: latestError } = await supabase
    .from('weather_forecasts')
    .select('forecast_time')
    .order('forecast_time', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestError) {
    throw createError({ statusCode: 500, message: 'Failed to check forecast freshness' })
  }

  const latestTime = latestRow?.forecast_time ? new Date(latestRow.forecast_time).getTime() : 0
  const isStale = (Date.now() - latestTime) >= STALE_THRESHOLD_MS

  // 2. If stale, fetch from vedur.is and upsert
  let refreshFailed = false
  if (isStale) {
    try {
      const forecasts = await fetchForecasts(STATION_IDS)

      if (forecasts.length > 0) {
        const { error: upsertError } = await supabase
          .from('weather_forecasts')
          .upsert(forecastsToRows(forecasts), { onConflict: 'station_id,forecast_time,valid_time' })
        if (upsertError) {
          console.error('[cloud-cover] Upsert failed:', upsertError.message)
          refreshFailed = true
        }
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
