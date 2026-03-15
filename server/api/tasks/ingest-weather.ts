import { serverSupabaseServiceRole } from '#supabase/server'
import { fetchObservations, fetchForecasts, forecastsToRows, STATION_IDS } from '../../utils/vedur'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)

  // Fetch observations and forecasts in parallel
  const [observations, forecasts] = await Promise.all([
    fetchObservations(STATION_IDS),
    fetchForecasts(STATION_IDS),
  ])

  // Upsert observations into weather_observations
  const observationRows = observations
    .filter(obs => obs.timestamp)
    .map(obs => ({
      station_id: obs.stationId,
      timestamp: obs.timestamp,
      temp: obs.temp,
      wind_speed: obs.windSpeed,
      wind_dir: obs.windDir,
      precipitation: obs.precipitation,
    }))

  let observationCount = 0
  if (observationRows.length > 0) {
    const { error: obsError } = await supabase
      .from('weather_observations')
      .upsert(observationRows as any, { onConflict: 'station_id,timestamp' })

    if (obsError) {
      console.error('Failed to upsert observations:', obsError.message)
    } else {
      observationCount = observationRows.length
    }
  }

  // Upsert forecasts into weather_forecasts
  const forecastRows = forecastsToRows(forecasts)

  let forecastCount = 0
  if (forecastRows.length > 0) {
    const { error: fcError } = await supabase
      .from('weather_forecasts')
      .upsert(forecastRows as any, { onConflict: 'station_id,forecast_time,valid_time' })

    if (fcError) {
      console.error('Failed to upsert forecasts:', fcError.message)
    } else {
      forecastCount = forecastRows.length
    }
  }

  return {
    observations: observationCount,
    forecasts: forecastCount,
    timestamp: new Date().toISOString(),
  }
})
