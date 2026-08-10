import { serverSupabaseServiceRole } from '#supabase/server'
import { computeForecastStaleness } from '../../utils/vedur'

// Cache station metadata in memory (static data, never changes)
let stationCache: Array<{ id: string; name: string; lat: number; lng: number; region: string | null }> | null = null

// PostgREST hard-caps a single response at Supabase's `db.max_rows`
// (1000 by default) — a plain `.limit(3000)` is silently clamped, so a
// 48 h × 55-station window (~2640 rows) came back truncated to ~20 h per
// station. Page through with `.range()` instead.
const PAGE_SIZE = 1000
// 55 stations × 48 hourly slots = 2640; ×2 in case two forecast batches
// overlap inside the 6 h `forecast_time` window. 6 pages is head-room.
const MAX_PAGES = 6

export default defineEventHandler(async (event) => {
  // Edge cache: set here (not via routeRules) because trailingSlash:true
  // rewrites the request path, so the Vercel header-route keyed to the
  // no-slash path never matches the served /api/weather/forecast-timeline/.
  setResponseHeader(event, 'Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300')

  const query = getQuery(event)
  const hours = Math.min(Number(query.hours) || 24, 48)

  const supabase = await serverSupabaseServiceRole(event)

  const now = new Date()
  const windowEnd = new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString()
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString()

  // Paged read. The secondary sort keys give the rows a total order so
  // page boundaries can't drop or repeat a row when many share a
  // `valid_time` (they all do — 55 stations per hourly slot).
  const fetchAllForecasts = async () => {
    const rows: any[] = []
    for (let page = 0; page < MAX_PAGES; page++) {
      const from = page * PAGE_SIZE
      const { data, error } = await supabase
        .from('weather_forecasts')
        .select('station_id, cloud_cover, precipitation_prob, valid_time, forecast_time, fetched_at')
        .gte('valid_time', now.toISOString())
        .lte('valid_time', windowEnd)
        .gte('forecast_time', sixHoursAgo)
        .order('valid_time', { ascending: true })
        .order('station_id', { ascending: true })
        .order('forecast_time', { ascending: true })
        .range(from, from + PAGE_SIZE - 1)

      if (error) {
        console.error('Failed to read forecast page', page, error.message)
        break
      }
      const page_rows = data || []
      rows.push(...page_rows)
      if (page_rows.length < PAGE_SIZE) break
    }
    return { data: rows }
  }

  const [forecastResult, stations] = await Promise.all([
    fetchAllForecasts(),
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

  // 3. Group forecasts by station, keyed on valid_time so an overlap of
  // two vedur batches inside the 6 h `forecast_time` window can't emit the
  // same hour twice (which would halve the visible span of the timeline).
  // Rows arrive forecast_time-ascending, so the last write per key is the
  // freshest batch.
  interface Slot { valid_time: string; cloud_cover: number | null; precip_prob: number | null }
  const byStation = new Map<string, Map<string, Slot>>()

  for (const row of forecastResult.data || []) {
    // station_id is nullable in the row schema; ingest never inserts null.
    if (!row.station_id) continue
    if (!byStation.has(row.station_id)) {
      byStation.set(row.station_id, new Map())
    }
    byStation.get(row.station_id)!.set(row.valid_time, {
      valid_time: row.valid_time,
      cloud_cover: row.cloud_cover,
      precip_prob: row.precipitation_prob,
    })
  }

  // 4. Build response
  const result = Array.from(byStation.entries())
    .map(([stationId, slots]) => {
      const meta = stationMap.get(stationId) as any
      return {
        id: stationId,
        name: meta?.name || stationId,
        lat: meta?.lat || 0,
        lng: meta?.lng || 0,
        region: meta?.region || null,
        // Insertion order is already valid_time-ascending (the query is).
        forecasts: Array.from(slots.values()),
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
