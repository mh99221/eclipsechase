import { serverSupabaseServiceRole } from '#supabase/server'
import { fetchObservations, STATION_IDS } from '../../utils/vedur'

/**
 * @deprecated as a per-request hot path. Synchronously fetches all 55
 * stations from vedur.is on every call — fine for the cron pipeline,
 * dangerous for user-driven traffic. No app code reads this endpoint
 * today; UI consumers should hit /api/weather/cloud-cover (Supabase
 * read, no upstream call) or /api/weather/forecast-timeline instead.
 * Kept around so server-side scripts and ad-hoc debug calls have a
 * direct vedur.is shortcut, but callers must respect the upstream
 * fair-use ceiling — see CLAUDE.md "vedur.is call volume" for math.
 */
export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)

  // Fetch latest observations from vedur.is
  const observations = await fetchObservations(STATION_IDS)

  if (observations.length === 0) {
    throw createError({ statusCode: 502, statusMessage: 'No data from vedur.is' })
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
