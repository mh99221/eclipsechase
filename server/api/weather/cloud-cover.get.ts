import { serverSupabaseServiceRole } from '#supabase/server'

// Read-only endpoint: returns latest cloud cover per station from DB
// Does NOT fetch from vedur.is (that's done by forecast.get.ts / cron)
export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)

  // Get the forecast row closest to now for each station
  const { data, error } = await supabase
    .rpc('get_latest_cloud_cover')

  if (error) {
    // Fallback: simple query if RPC doesn't exist yet
    const now = new Date().toISOString()
    const { data: fallback } = await supabase
      .from('weather_forecasts')
      .select('station_id, cloud_cover, valid_time')
      .gte('valid_time', now)
      .order('valid_time', { ascending: true })
      .limit(150)

    // Deduplicate: first row per station (nearest future forecast)
    const byStation = new Map<string, { station_id: string; cloud_cover: number | null }>()
    for (const row of fallback || []) {
      if (!byStation.has(row.station_id)) {
        byStation.set(row.station_id, row)
      }
    }

    return { cloud_cover: Array.from(byStation.values()) }
  }

  return { cloud_cover: data }
})
