import { parseStringPromise } from 'xml2js'

const VEDUR_BASE = 'https://xmlweather.vedur.is'
const VEDUR_FETCH_TIMEOUT_MS = 10_000

// All station IDs we track (55 stations from vedur.is forecast areas)
// Keep in sync with scripts/seed-weather-stations.sql
export const STATION_IDS = [
  // Reykjavík area
  '1', '1471', '1477', '1479', '1481', '1482', '1578', '1590', '1596', '31579', '36504',
  // Reykjanes peninsula
  '990', '1361', '1453', '1473', '1474', '1487', '6300', '7001', '31109', '31380', '31392', '31488',
  // Borgarfjörður
  '1777', '1868', '6802', '31572', '31985', '32097',
  // Snæfellsnes peninsula
  '178', '1919', '1924', '1936', '1938', '31932', '31948',
  // Westfjords
  '293', '2175', '2266', '2304', '2315', '2319', '2428', '2481', '2530', '2631', '2644', '2655', '2738', '2862', '2941', '32250', '32336', '32355', '32390',
]

interface VedurObservation {
  stationId: string
  name: string
  timestamp: string
  temp: number | null
  windSpeed: number | null
  windDir: string | null
  precipitation: number | null
}

export interface VedurForecast {
  stationId: string
  forecastTime: string
  validTime: string
  cloudCover: number | null
  temp: number | null
  precipitation: number | null
}

function parseNum(val: string | undefined): number | null {
  if (val === undefined || val === '') return null
  const n = Number(val)
  return Number.isNaN(n) ? null : n
}

async function fetchWithTimeout(url: string, errorLabel: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), VEDUR_FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`${errorLabel}: ${response.status}`)
    }
    return await response.text()
  } finally {
    clearTimeout(timeout)
  }
}

export function forecastsToRows(forecasts: VedurForecast[]) {
  return forecasts
    .filter(fc => fc.validTime)
    .map(fc => ({
      station_id: fc.stationId,
      forecast_time: fc.forecastTime,
      valid_time: fc.validTime,
      cloud_cover: fc.cloudCover,
      precipitation_prob: fc.precipitation,
      source_model: 'vedur',
    }))
}

export async function fetchObservations(stationIds: string[] = STATION_IDS): Promise<VedurObservation[]> {
  const ids = stationIds.join(';')
  const url = `${VEDUR_BASE}/?op_w=xml&type=obs&lang=en&view=xml&ids=${ids}&params=F;D;T;R`

  const xml = await fetchWithTimeout(url, 'vedur.is observations request failed')
  const parsed = await parseStringPromise(xml, { explicitArray: false })

  const stations = parsed?.observations?.station
  if (!stations) return []

  const stationArr = Array.isArray(stations) ? stations : [stations]
  const results: VedurObservation[] = []

  // Each station object IS the observation (flat structure, not nested)
  for (const station of stationArr) {
    if (!station.time) continue

    results.push({
      stationId: station.$.id,
      name: station.name || '',
      timestamp: station.time,
      temp: parseNum(station.T),
      windSpeed: parseNum(station.F),
      windDir: station.D || null,
      precipitation: parseNum(station.R),
    })
  }

  return results
}

export async function fetchForecasts(stationIds: string[] = STATION_IDS): Promise<VedurForecast[]> {
  const ids = stationIds.join(';')
  const url = `${VEDUR_BASE}/?op_w=xml&type=forec&lang=en&view=xml&ids=${ids}&params=N;T;R`

  const xml = await fetchWithTimeout(url, 'vedur.is forecast request failed')
  const parsed = await parseStringPromise(xml, { explicitArray: false })

  const stations = parsed?.forecasts?.station
  if (!stations) return []

  const stationArr = Array.isArray(stations) ? stations : [stations]
  const results: VedurForecast[] = []

  for (const station of stationArr) {
    const stationId = station.$.id
    const forecastTime = station.atime || new Date().toISOString()
    const forecasts = station.forecast
    if (!forecasts) continue

    const forecastArr = Array.isArray(forecasts) ? forecasts : [forecasts]
    for (const f of forecastArr) {
      results.push({
        stationId,
        forecastTime,
        validTime: f.ftime || '',
        cloudCover: parseNum(f.N),
        temp: parseNum(f.T),
        precipitation: parseNum(f.R),
      })
    }
  }

  return results
}

const STALE_THRESHOLD_MS = 15 * 60 * 1000

/**
 * Ensure forecast data is fresh. If stale (>15min), fetches from vedur.is and upserts.
 */
export async function ensureFreshForecasts(supabase: any, logPrefix = 'weather'): Promise<{ isStale: boolean; refreshFailed: boolean }> {
  const { data: latestRow } = await supabase
    .from('weather_forecasts')
    .select('forecast_time')
    .order('forecast_time', { ascending: false })
    .limit(1)
    .maybeSingle()

  const latestTime = latestRow?.forecast_time ? new Date(latestRow.forecast_time).getTime() : 0
  const isStale = (Date.now() - latestTime) >= STALE_THRESHOLD_MS

  let refreshFailed = false
  if (isStale) {
    try {
      const forecasts = await fetchForecasts(STATION_IDS)
      if (forecasts.length > 0) {
        const { error: upsertError } = await supabase
          .from('weather_forecasts')
          .upsert(forecastsToRows(forecasts), { onConflict: 'station_id,forecast_time,valid_time' })
        if (upsertError) {
          console.error(`[${logPrefix}] Upsert failed:`, upsertError.message)
          refreshFailed = true
        }
      }
    }
    catch (err) {
      console.error(`[${logPrefix}] Failed to refresh from vedur.is:`, err)
      refreshFailed = true
    }
  }

  return { isStale, refreshFailed }
}
