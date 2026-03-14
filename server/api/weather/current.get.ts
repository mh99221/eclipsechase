import { serverSupabaseServiceRole } from '#supabase/server'
import { fetchObservations, STATION_IDS } from '../../utils/vedur'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)

  // Fetch latest observations from vedur.is
  const observations = await fetchObservations(STATION_IDS)

  if (observations.length === 0) {
    throw createError({ statusCode: 502, message: 'No data from vedur.is' })
  }

  // Upsert into Supabase
  const rows = observations.map(obs => ({
    station_id: obs.stationId,
    timestamp: obs.timestamp,
    temp: obs.temp,
    wind_speed: obs.windSpeed,
    wind_dir: obs.windDir,
    precipitation: obs.precipitation,
  }))

  await supabase
    .from('weather_observations')
    .upsert(rows, { onConflict: 'station_id,timestamp' })

  // Return fresh observations joined with station metadata
  return {
    observations: observations.map(obs => ({
      station_id: obs.stationId,
      name: obs.name,
      timestamp: obs.timestamp,
      temp: obs.temp,
      wind_speed: obs.windSpeed,
      wind_dir: obs.windDir,
      precipitation: obs.precipitation,
    })),
  }
})
