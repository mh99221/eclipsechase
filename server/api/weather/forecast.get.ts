import { serverSupabaseServiceRole } from '#supabase/server'
import { fetchForecasts, forecastsToRows, STATION_IDS } from '../../utils/vedur'

/**
 * @deprecated as a per-request hot path. Synchronously fetches all 55
 * stations' forecasts from vedur.is on every call. Use
 * /api/weather/forecast-timeline instead — that one reads the
 * cron-fed `weather_forecasts` table from Supabase without hitting
 * upstream. Kept for ad-hoc/manual refresh during dev. See CLAUDE.md
 * "vedur.is call volume" for fair-use math before wiring this into
 * any user-facing flow.
 */
export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)

  // Fetch forecasts from vedur.is
  const forecasts = await fetchForecasts(STATION_IDS)

  if (forecasts.length === 0) {
    throw createError({ statusCode: 502, statusMessage: 'No forecast data from vedur.is' })
  }

  // Upsert into Supabase (batch)
  await supabase
    .from('weather_forecasts')
    .upsert(forecastsToRows(forecasts), { onConflict: 'station_id,forecast_time,valid_time' })

  // Return forecasts grouped by station
  return {
    forecasts: forecasts.map(fc => ({
      station_id: fc.stationId,
      forecast_time: fc.forecastTime,
      valid_time: fc.validTime,
      cloud_cover: fc.cloudCover,
      precipitation: fc.precipitation,
    })),
  }
})
