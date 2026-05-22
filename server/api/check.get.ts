/**
 * Free coordinate-check endpoint. Returns horizon verdict, 10-year
 * historical cloud cover, and totality info for any lat/lng inside
 * Iceland's bounding box.
 *
 * Differs from /api/horizon/check: no Pro gate, stricter rate limit
 * (10/hour by IP), 24-hour result cache keyed on rounded coords.
 *
 * Reuses existing infra:
 *   - horizonGrid     → 91-point sweep + sun position + totality duration
 *   - eclipseGrid     → C1/C2/C3/C4 contact times
 *   - totalityPath    → in-path ray-cast against path.geojson
 *   - historicalWeatherGrid → 10-yr ERA5 cloud cover (snaps to 0.25° cell)
 */
import { findNearestGridPoint, loadHorizonGrid, type GridPoint } from '../utils/horizonGrid'
import { nearestGridPoint as nearestEclipseGridPoint } from '../utils/eclipseGrid'
import { isInTotalityPath } from '../utils/totalityPath'
import { findNearestHistoricalWeather, type HistoricalWeatherCell } from '../utils/historicalWeatherGrid'
import { isValidIcelandCoord } from '~/utils/parseCoordinates'
import { getCachedResult, setCachedResult } from '../utils/resultCache'
import { checkRateLimit } from '../utils/rateLimit'

const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000  // 1 hour
const CACHE_TTL_SECONDS = 24 * 60 * 60       // 24 hours

export interface CheckResult {
  input: { lat: number; lng: number }
  horizon: {
    verdict: 'clear' | 'marginal' | 'risky' | 'blocked' | 'unknown'
    clearanceDegrees: number | null
    maxHorizonAngle: number | null
    sunAltitude: number
    sunAzimuth: number
    sweep: { azimuth: number; horizon_angle: number; distance_m: number }[]
    nearestGridPoint: {
      lat: number
      lng: number
      distanceMeters: number
      bearing: number
    } | null
    coverage: 'in-grid' | 'outside-grid'
  }
  cloudHistory: {
    cell: HistoricalWeatherCell
    sampledAt: { lat: number; lng: number; distanceMeters: number }
  } | null
  totality: {
    insidePath: boolean
    durationSeconds: number | null
    contactTimes: {
      c1: string | null
      c2: string | null
      c3: string | null
      c4: string | null
    }
    distanceFromNearestPointMeters: number | null
    nearestGridLat: number | null
    nearestGridLng: number | null
  }
  computedAt: string
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

function bearingDegrees(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const toDeg = (r: number) => (r * 180) / Math.PI
  const dLng = toRad(lng2 - lng1)
  const y = Math.sin(dLng) * Math.cos(toRad(lat2))
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2))
    - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

function clientKey(event: any): string {
  const raw = getHeader(event, 'x-forwarded-for') || getHeader(event, 'x-real-ip') || 'unknown'
  return `check:ip:${raw.split(',')[0]!.trim()}`
}

function buildHorizonResult(
  point: GridPoint | null,
  inputLat: number,
  inputLng: number,
): CheckResult['horizon'] {
  if (!point) {
    return {
      verdict: 'unknown',
      clearanceDegrees: null,
      maxHorizonAngle: null,
      sunAltitude: 0,
      sunAzimuth: 0,
      sweep: [],
      nearestGridPoint: null,
      coverage: 'outside-grid',
    }
  }
  return {
    verdict: point.v as CheckResult['horizon']['verdict'],
    clearanceDegrees: point.c,
    maxHorizonAngle: point.mh,
    sunAltitude: point.sa,
    sunAzimuth: point.sz,
    sweep: point.s.map(([azimuth, horizon_angle, distance_m]) => ({ azimuth, horizon_angle, distance_m })),
    nearestGridPoint: {
      lat: point.lat,
      lng: point.lng,
      distanceMeters: haversineMeters(inputLat, inputLng, point.lat, point.lng),
      bearing: bearingDegrees(inputLat, inputLng, point.lat, point.lng),
    },
    coverage: 'in-grid',
  }
}

export default defineEventHandler(async (event): Promise<CheckResult> => {
  const query = getQuery(event) as { lat?: string; lng?: string }
  const latNum = parseFloat(query.lat ?? '')
  const lngNum = parseFloat(query.lng ?? '')

  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
    throw createError({ statusCode: 400, statusMessage: 'lat and lng query params are required' })
  }
  if (!isValidIcelandCoord(latNum, lngNum)) {
    throw createError({ statusCode: 400, statusMessage: 'Coordinates are outside Iceland' })
  }

  // Cache key: 4 decimal places ≈ 11 m precision, finer than both grids.
  const cacheKey = `check:${latNum.toFixed(4)}:${lngNum.toFixed(4)}`
  const cached = getCachedResult<CheckResult>(cacheKey)
  if (cached) {
    setHeader(event, 'x-check-cache', 'HIT')
    setHeader(event, 'cache-control', 'public, s-maxage=86400, stale-while-revalidate=604800')
    return cached
  }

  // Rate-limit fresh computations only.
  if (!checkRateLimit(clientKey(event), RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)) {
    throw createError({
      statusCode: 429,
      statusMessage: `Rate limit reached (${RATE_LIMIT_MAX}/hour). Try again later or upgrade to Pro for unlimited checks.`,
    })
  }

  let horizonPoint: GridPoint | null = null
  try {
    const grid = await loadHorizonGrid()
    horizonPoint = findNearestGridPoint(grid, latNum, lngNum)?.point ?? null
  } catch (e) {
    console.error('[check] horizon grid load failed:', e)
  }

  const eclipsePoint = await nearestEclipseGridPoint(latNum, lngNum)
  const insidePath = await isInTotalityPath(latNum, lngNum)
  const totalityDuration = horizonPoint?.td
    ?? (insidePath ? (eclipsePoint?.duration_seconds ?? null) : null)

  const gridHistory = await findNearestHistoricalWeather(latNum, lngNum)
  // Treat cells where every year came back null (e.g. the pre-compute
  // script hit Open-Meteo's rate limit) as missing rather than surfacing
  // an empty 10-bar chart to the user.
  const hasUsableCloudData = !!gridHistory && gridHistory.cell.total_years > 0
  const cloudHistory = hasUsableCloudData
    ? {
        cell: gridHistory!.cell,
        sampledAt: {
          lat: gridHistory!.cellLat,
          lng: gridHistory!.cellLng,
          distanceMeters: gridHistory!.distanceMeters,
        },
      }
    : null

  const result: CheckResult = {
    input: { lat: latNum, lng: lngNum },
    horizon: buildHorizonResult(horizonPoint, latNum, lngNum),
    cloudHistory,
    totality: {
      insidePath,
      durationSeconds: totalityDuration,
      contactTimes: {
        c1: eclipsePoint?.c1 ?? null,
        c2: insidePath ? (eclipsePoint?.totality_start ?? null) : null,
        c3: insidePath ? (eclipsePoint?.totality_end ?? null) : null,
        c4: eclipsePoint?.c4 ?? null,
      },
      distanceFromNearestPointMeters: eclipsePoint
        ? haversineMeters(latNum, lngNum, eclipsePoint.lat, eclipsePoint.lng)
        : null,
      nearestGridLat: eclipsePoint?.lat ?? null,
      nearestGridLng: eclipsePoint?.lng ?? null,
    },
    computedAt: new Date().toISOString(),
  }

  setCachedResult(cacheKey, result, CACHE_TTL_SECONDS)
  setHeader(event, 'x-check-cache', 'MISS')
  setHeader(event, 'cache-control', 'public, s-maxage=86400, stale-while-revalidate=604800')
  return result
})
