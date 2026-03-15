import { parseStringPromise } from 'xml2js'

const VEDUR_BASE = 'https://xmlweather.vedur.is'

// All station IDs we track
export const STATION_IDS = [
  '1', '1477', '990', '1453', '1777',
  '178', '1938', '1924', '1919',
  '2266', '2319', '2428', '2631', '2644', '2738',
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

interface VedurForecast {
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

export async function fetchObservations(stationIds: string[] = STATION_IDS): Promise<VedurObservation[]> {
  const ids = stationIds.join(';')
  const url = `${VEDUR_BASE}/?op_w=xml&type=obs&lang=en&view=xml&ids=${ids}&params=F;D;T;R`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  let xml: string
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`vedur.is observations request failed: ${response.status}`)
    }
    xml = await response.text()
  } finally {
    clearTimeout(timeout)
  }
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

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  let xml: string
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`vedur.is forecast request failed: ${response.status}`)
    }
    xml = await response.text()
  } finally {
    clearTimeout(timeout)
  }
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
