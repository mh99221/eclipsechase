import { serverSupabaseServiceRole } from '#supabase/server'
import { computeForecastStaleness } from '../../utils/vedur'

// Cache station metadata in memory (static data, never changes)
let stationCache: Array<{ id: string; name: string; lat: number; lng: number; region: string | null }> | null = null

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const hours = Math.min(Number(query.hours) || 24, 48)

  const supabase = await serverSupabaseServiceRole(event)

  const now = new Date()
  const windowEnd = new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString()
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString()

  const [forecastResult, stations] = await Promise.all([
    supabase
      .from('weather_forecasts')
      .select('station_id, cloud_cover, precipitation_prob, valid_time, forecast_time, fetched_at')
      .gte('valid_time', now.toISOString())
      .lte('valid_time', windowEnd)
      .gte('forecast_time', sixHoursAgo)
      .order('valid_time', { ascending: true })
      .limit(3000),
    stationCache
      ? Promise.resolve(stationCache)
      : supabase
          .from('weather_stations')
          .select('id, name, lat, lng, region')
          .then(({ data }: any) => {
            stationCache = data || []
            return stationCache!
          }),
  ])

  const stationMap = new Map(stations.map((s: any) => [s.id, s]))

  // 3. Group forecasts by station
  const byStation = new Map<string, Array<{
    valid_time: string
    cloud_cover: number | null
    precip_prob: number | null
  }>>()

  for (const row of forecastResult.data || []) {
    // station_id is nullable in the row schema; ingest never inserts null.
    if (!row.station_id) continue
    if (!byStation.has(row.station_id)) {
      byStation.set(row.station_id, [])
    }
    byStation.get(row.station_id)!.push({
      valid_time: row.valid_time,
      cloud_cover: row.cloud_cover,
      precip_prob: row.precipitation_prob,
    })
  }

  // 4. Build response
  const result = Array.from(byStation.entries())
    .map(([stationId, forecasts]) => {
      const meta = stationMap.get(stationId) as any
      return {
        id: stationId,
        name: meta?.name || stationId,
        lat: meta?.lat || 0,
        lng: meta?.lng || 0,
        region: meta?.region || null,
        forecasts,
      }
    })
    .filter(s => s.forecasts.length > 0)

  const { stale } = computeForecastStaleness(forecastResult.data)

  return {
    stations: result,
    hours,
    stale,
    fetched_at: now.toISOString(),
  }
})
