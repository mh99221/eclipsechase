// server/utils/horizon.ts
import type { HorizonVerdict, HorizonSweepPoint, HorizonCheck } from '~/types/horizon'

const EYE_HEIGHT = 1.7 // meters
const EARTH_RADIUS = 6371000 // meters
const DEG_TO_RAD = Math.PI / 180
const REFRACTION_COEFF = 0.13 // standard atmospheric refraction (k ≈ 0.13)

interface DEMAccessor {
  data: Float32Array
  meta: {
    minLat: number; maxLat: number; minLng: number; maxLng: number
    width: number; height: number; cellSizeLat: number; cellSizeLng: number
    rowOrder: 'south-to-north' | 'north-to-south'
  }
}

/**
 * Move from a lat/lng point along a compass bearing for a given distance in meters.
 */
function moveAlongBearing(lat: number, lng: number, bearing: number, distanceM: number): [number, number] {
  const bearingRad = bearing * DEG_TO_RAD
  const latRad = lat * DEG_TO_RAD
  const delta = distanceM / EARTH_RADIUS

  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(delta) + Math.cos(latRad) * Math.sin(delta) * Math.cos(bearingRad),
  )
  const newLngRad = lng * DEG_TO_RAD + Math.atan2(
    Math.sin(bearingRad) * Math.sin(delta) * Math.cos(latRad),
    Math.cos(delta) - Math.sin(latRad) * Math.sin(newLatRad),
  )

  return [newLatRad / DEG_TO_RAD, newLngRad / DEG_TO_RAD]
}

/**
 * Generate sample distances along a ray: 50m to 1km (50m steps), 1-5km (200m), 5-20km (500m), 20-50km (1km).
 */
function sampleDistances(): number[] {
  const distances: number[] = []
  for (let d = 50; d <= 1000; d += 50) distances.push(d)
  for (let d = 1200; d <= 5000; d += 200) distances.push(d)
  for (let d = 5500; d <= 20000; d += 500) distances.push(d)
  for (let d = 21000; d <= 50000; d += 1000) distances.push(d)
  return distances
}

const DISTANCES = sampleDistances()

/**
 * Cast a single ray along a bearing and find the maximum horizon angle.
 */
function singleRayCheck(
  observerLat: number,
  observerLng: number,
  observerElev: number,
  bearing: number,
  dem: DEMAccessor,
): { horizonAngle: number; blockingDistanceM: number; blockingElevationM: number } {
  let maxAngle = -90
  let blockingDist = 0
  let blockingElev = 0

  for (const dist of DISTANCES) {
    const [sampleLat, sampleLng] = moveAlongBearing(observerLat, observerLng, bearing, dist)
    const terrainElev = getElevation(sampleLat, sampleLng, dem.data, dem.meta)
    if (terrainElev === null) continue

    // Earth curvature drops terrain by dist²/(2R), atmospheric refraction lifts it back by k * that amount
    const curvatureDrop = (dist * dist) / (2 * EARTH_RADIUS) * (1 - REFRACTION_COEFF)
    const elevDiff = terrainElev - observerElev - curvatureDrop
    const angle = Math.atan2(elevDiff, dist) / DEG_TO_RAD

    if (angle > maxAngle) {
      maxAngle = angle
      blockingDist = dist
      blockingElev = terrainElev
    }
  }

  return { horizonAngle: maxAngle, blockingDistanceM: blockingDist, blockingElevationM: blockingElev }
}

function getVerdict(clearance: number): HorizonVerdict {
  if (clearance > 5) return 'clear'
  if (clearance >= 2) return 'marginal'
  if (clearance >= 0) return 'risky'
  return 'blocked'
}

/**
 * Run full horizon check: single ray at sun azimuth + ±45° sweep.
 */
export function checkHorizon(
  lat: number,
  lng: number,
  sunAltitude: number,
  sunAzimuth: number,
  dem: DEMAccessor,
): HorizonCheck {
  // Observer elevation
  const demElev = getElevation(lat, lng, dem.data, dem.meta)
  const observerElev = (demElev != null && demElev >= 0 ? demElev : 2) + EYE_HEIGHT

  // Azimuth sweep ±45° in 1° steps (includes sun azimuth at offset=0)
  const sweep: HorizonSweepPoint[] = []
  let mainRay: { horizonAngle: number; blockingDistanceM: number; blockingElevationM: number } | null = null
  for (let offset = -45; offset <= 45; offset++) {
    const azi = sunAzimuth + offset
    const normalizedAzi = ((azi % 360) + 360) % 360
    const ray = singleRayCheck(lat, lng, observerElev, azi, dem)
    sweep.push({
      azimuth: normalizedAzi,
      horizon_angle: Math.max(ray.horizonAngle, 0),
      distance_m: ray.blockingDistanceM,
    })
    if (offset === 0) mainRay = ray
  }

  const clearance = sunAltitude - mainRay!.horizonAngle
  const verdict = getVerdict(clearance)

  return {
    verdict,
    clearance_degrees: Math.round(clearance * 10) / 10,
    max_horizon_angle: Math.round(mainRay!.horizonAngle * 10) / 10,
    blocking_distance_m: verdict === 'clear' ? null : mainRay!.blockingDistanceM,
    blocking_elevation_m: verdict === 'clear' ? null : mainRay!.blockingElevationM,
    observer_elevation_m: Math.round(observerElev * 10) / 10,
    sun_altitude: sunAltitude,
    sun_azimuth: sunAzimuth,
    checked_at: new Date().toISOString(),
    sweep,
  }
}
