/**
 * Simplified solar position calculator for the sun trajectory on the horizon profile.
 * Uses standard astronomical formulas — accurate to ~0.5° which is sufficient for visualization.
 *
 * Reference: Jean Meeus, "Astronomical Algorithms" (simplified)
 */

const DEG = Math.PI / 180
const RAD = 180 / Math.PI

/** Eclipse date: August 12, 2026 */
const ECLIPSE_DATE = new Date('2026-08-12T00:00:00Z')

function dayOfYear(date: Date): number {
  const start = new Date(date.getUTCFullYear(), 0, 0)
  return Math.floor((date.getTime() - start.getTime()) / 86400000)
}

/**
 * Compute sun altitude and azimuth for a given location and UTC time.
 */
function solarPosition(lat: number, lng: number, utcHours: number): { altitude: number; azimuth: number } {
  const doy = dayOfYear(ECLIPSE_DATE)

  // Solar declination (simplified, ~0.3° accuracy)
  const declination = 23.45 * Math.sin(DEG * (360 / 365) * (doy - 81))

  // Equation of time correction (minutes) — improves accuracy by ~15 min
  const B = DEG * (360 / 365) * (doy - 81)
  const EoT = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B)

  // Solar noon in UTC hours for this longitude
  const solarNoon = 12 - lng / 15 - EoT / 60

  // Hour angle (degrees, negative = morning, positive = afternoon)
  const hourAngle = (utcHours - solarNoon) * 15

  const latRad = lat * DEG
  const decRad = declination * DEG
  const haRad = hourAngle * DEG

  // Solar altitude
  const sinAlt = Math.sin(latRad) * Math.sin(decRad)
    + Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad)
  const altitude = Math.asin(sinAlt) * RAD

  // Solar azimuth (measured from North, clockwise)
  const cosAz = (Math.sin(decRad) - Math.sin(latRad) * sinAlt)
    / (Math.cos(latRad) * Math.cos(Math.asin(sinAlt)))
  let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAz))) * RAD

  // Afternoon: azimuth > 180°
  if (hourAngle > 0) azimuth = 360 - azimuth

  return { altitude, azimuth }
}

export interface SunTrajectoryPoint {
  utcHours: number
  altitude: number
  azimuth: number
}

/**
 * Compute the sun trajectory for eclipse day (Aug 12 2026) at a given location.
 * Returns points every 15 minutes from sunrise to sunset, filtered to the
 * azimuth range visible on the horizon profile chart.
 *
 * @param lat Latitude in degrees
 * @param lng Longitude in degrees
 * @param minAzimuth Left edge of chart (degrees)
 * @param maxAzimuth Right edge of chart (degrees)
 */
export function computeSunTrajectory(
  lat: number,
  lng: number,
  minAzimuth: number,
  maxAzimuth: number,
): SunTrajectoryPoint[] {
  const points: SunTrajectoryPoint[] = []

  // Sample every 10 minutes from 4:00 to 23:00 UTC (covers full Iceland daylight)
  for (let m = 240; m <= 1380; m += 10) {
    const utcHours = m / 60
    const pos = solarPosition(lat, lng, utcHours)

    // Only keep points above horizon and within chart azimuth range (with margin)
    if (pos.altitude > -1 && pos.azimuth >= minAzimuth - 5 && pos.azimuth <= maxAzimuth + 5) {
      points.push({
        utcHours,
        altitude: pos.altitude,
        azimuth: pos.azimuth,
      })
    }
  }

  return points
}

/**
 * Format UTC hours as HH:MM string.
 */
export function formatUtcTime(utcHours: number): string {
  const h = Math.floor(utcHours)
  const m = Math.round((utcHours - h) * 60)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}
