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

export interface VedurForecast {
  stationId: string
  forecastTime: string
  validTime: string
  cloudCover: number | null
  temp: number | null
  precipitation: number | null
}

// 90 min — cron runs every 15, plus a safety margin.
export const FORECAST_STALE_THRESHOLD_MS = 90 * 60 * 1000

/**
 * The eclipse instant used when selecting an "eclipse day" forecast slot.
 * Pinned to the earliest C2 across the Iceland path — the exact second
 * varies a few seconds per spot (longitude), which is far below the
 * 3-hourly resolution of the forecast slots we're matching against.
 *
 * Mirrors ECLIPSE_DATE in app/composables/useForecastPhase.ts. Duplicated
 * rather than shared because server/ and app/ have no common import root
 * in this project; keep the two in sync if the anchor ever moves.
 */
export const ECLIPSE_INSTANT = new Date('2026-08-12T17:43:00Z')

/**
 * How far from ECLIPSE_INSTANT a forecast slot may sit and still count as
 * "the eclipse-day forecast". vedur's HARMONIE-AROME forecast steps are
 * 3-hourly, so a ±3 h window always captures the nearest slot once the
 * model horizon reaches Aug 12, and captures nothing before then — which
 * is exactly the signal /map uses to decide between showing eclipse-day
 * markers and showing its "not available yet" state.
 */
export const ECLIPSE_FORECAST_TOLERANCE_MS = 3 * 60 * 60 * 1000

/**
 * From a set of forecast rows for ONE station, return the row whose
 * `valid_time` is closest to `targetMs`, or null when none falls within
 * `toleranceMs`. Rows with an unparseable `valid_time` are skipped.
 *
 * Pure + exported so the selection rule is unit-testable without a
 * Supabase mock (same rationale as computeForecastStaleness above).
 */
export function pickNearestForecastRow<T extends { valid_time: string | null }>(
  rows: T[],
  targetMs: number,
  toleranceMs: number,
): T | null {
  let best: T | null = null
  let bestDelta = Infinity

  for (const row of rows) {
    if (!row.valid_time) continue
    const ts = Date.parse(row.valid_time)
    if (Number.isNaN(ts)) continue
    const delta = Math.abs(ts - targetMs)
    if (delta > toleranceMs) continue
    if (delta < bestDelta) {
      bestDelta = delta
      best = row
    }
  }

  return best
}

/**
 * Given a set of forecast rows, return the newest `fetched_at` (when
 * our cron last upserted) and whether that makes the set stale. Shared
 * by the cloud-cover and forecast-timeline endpoints.
 *
 * Note: we deliberately use `fetched_at` (our ingest time), not
 * `forecast_time` (vedur's batch-issue time / `atime`). Vedur publishes
 * new forecast batches every few hours, so basing staleness on
 * `forecast_time` would flap between batches even when the ingest cron
 * is healthy. `fetched_at` is the genuine pipeline-health signal.
 */
export function computeForecastStaleness(
  rows: Array<{ fetched_at?: string | null }> | null | undefined,
  thresholdMs: number = FORECAST_STALE_THRESHOLD_MS,
): { fetchedAt: string | null; stale: boolean } {
  let fetchedAt: string | null = null
  for (const row of rows || []) {
    if (row.fetched_at && (!fetchedAt || row.fetched_at > fetchedAt)) {
      fetchedAt = row.fetched_at
    }
  }
  const stale = fetchedAt
    ? (Date.now() - new Date(fetchedAt).getTime()) >= thresholdMs
    : true
  return { fetchedAt, stale }
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
  const fetchedAt = new Date().toISOString()
  return forecasts
    .filter(fc => fc.validTime)
    .map(fc => ({
      station_id: fc.stationId,
      forecast_time: fc.forecastTime,
      valid_time: fc.validTime,
      cloud_cover: fc.cloudCover,
      precipitation_prob: fc.precipitation,
      source_model: 'vedur',
      fetched_at: fetchedAt,
    }))
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

