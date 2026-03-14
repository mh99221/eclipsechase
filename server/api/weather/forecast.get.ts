import { serverSupabaseServiceRole } from '#supabase/server'
import { fetchForecasts, STATION_IDS } from '../../utils/vedur'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)

  // Fetch forecasts from vedur.is
  const forecasts = await fetchForecasts(STATION_IDS)

  if (forecasts.length === 0) {
    throw createError({ statusCode: 502, message: 'No forecast data from vedur.is' })
  }

  // Upsert into Supabase (batch)
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
