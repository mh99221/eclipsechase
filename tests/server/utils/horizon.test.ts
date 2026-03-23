import { describe, it, expect, vi, beforeAll } from 'vitest'
import { getElevation } from '../../../server/utils/dem'
import type { DEMMeta } from '../../../server/utils/dem'

// horizon.ts uses getElevation as a Nitro auto-import (bare global call, no explicit import).
// In unit tests the auto-import mechanism is not available, so we must inject it as a global
// before importing checkHorizon.
vi.stubGlobal('getElevation', getElevation)

// Import after stubbing the global
const { checkHorizon } = await import('../../../server/utils/horizon')

// Build a minimal flat DEM (all elevation = 0m) covering western Iceland
const flatMeta: DEMMeta = {
  minLat: 63.5,
  maxLat: 67.0,
  minLng: -26.0,
  maxLng: -19.0,
  width: 70,
  height: 35,
  cellSizeLat: (67.0 - 63.5) / 35,
  cellSizeLng: (-19.0 - -26.0) / 70,
  rowOrder: 'south-to-north',
}

// All cells at 0m elevation (flat terrain)
const flatData = new Float32Array(flatMeta.width * flatMeta.height).fill(0)
const flatDEM = { data: flatData, meta: flatMeta }

// Eclipse sun parameters for Reykjavík area on August 12, 2026
const LAT = 64.1
const LNG = -21.9
const SUN_ALTITUDE = 24.0  // degrees
const SUN_AZIMUTH = 250.0  // WSW

describe('checkHorizon', () => {
  it('returns a HorizonCheck object with all required fields', () => {
    const result = checkHorizon(LAT, LNG, SUN_ALTITUDE, SUN_AZIMUTH, flatDEM)

    expect(result).toHaveProperty('verdict')
    expect(result).toHaveProperty('clearance_degrees')
    expect(result).toHaveProperty('max_horizon_angle')
    expect(result).toHaveProperty('blocking_distance_m')
    expect(result).toHaveProperty('blocking_elevation_m')
    expect(result).toHaveProperty('observer_elevation_m')
    expect(result).toHaveProperty('sun_altitude')
    expect(result).toHaveProperty('sun_azimuth')
    expect(result).toHaveProperty('checked_at')
    expect(result).toHaveProperty('sweep')
  })

  it('returns "clear" verdict on flat terrain with high sun altitude', () => {
    // On flat terrain, horizon ≈ 0°; sun at 24° → clearance ≈ 24° → "clear"
    const result = checkHorizon(LAT, LNG, SUN_ALTITUDE, SUN_AZIMUTH, flatDEM)
    expect(result.verdict).toBe('clear')
  })

  it('returns clearance_degrees close to sun altitude on flat terrain', () => {
    const result = checkHorizon(LAT, LNG, SUN_ALTITUDE, SUN_AZIMUTH, flatDEM)
    // On a flat DEM, horizon angle ≈ 0°, so clearance ≈ sun altitude
    expect(result.clearance_degrees).toBeGreaterThan(20)
  })

  it('sun_altitude and sun_azimuth are preserved in output', () => {
    const result = checkHorizon(LAT, LNG, SUN_ALTITUDE, SUN_AZIMUTH, flatDEM)
    expect(result.sun_altitude).toBe(SUN_ALTITUDE)
    expect(result.sun_azimuth).toBe(SUN_AZIMUTH)
  })

  it('sweep contains 91 points (±45° in 1° steps)', () => {
    const result = checkHorizon(LAT, LNG, SUN_ALTITUDE, SUN_AZIMUTH, flatDEM)
    expect(result.sweep).toHaveLength(91)
  })

  it('each sweep point has azimuth, horizon_angle, and distance_m', () => {
    const result = checkHorizon(LAT, LNG, SUN_ALTITUDE, SUN_AZIMUTH, flatDEM)
    for (const point of result.sweep) {
      expect(point).toHaveProperty('azimuth')
      expect(point).toHaveProperty('horizon_angle')
      expect(point).toHaveProperty('distance_m')
      expect(typeof point.azimuth).toBe('number')
      expect(typeof point.horizon_angle).toBe('number')
      expect(typeof point.distance_m).toBe('number')
    }
  })

  it('sweep azimuths are in [0, 360)', () => {
    const result = checkHorizon(LAT, LNG, SUN_ALTITUDE, SUN_AZIMUTH, flatDEM)
    for (const point of result.sweep) {
      expect(point.azimuth).toBeGreaterThanOrEqual(0)
      expect(point.azimuth).toBeLessThan(360)
    }
  })

  it('blocking_distance_m and blocking_elevation_m are null for "clear" verdict', () => {
    const result = checkHorizon(LAT, LNG, SUN_ALTITUDE, SUN_AZIMUTH, flatDEM)
    expect(result.verdict).toBe('clear')
    expect(result.blocking_distance_m).toBeNull()
    expect(result.blocking_elevation_m).toBeNull()
  })

  it('observer_elevation_m includes eye height (≈ 1.7m) above terrain', () => {
    // On flat 0m terrain, observer should be ~1.7m (0 + EYE_HEIGHT=1.7)
    const result = checkHorizon(LAT, LNG, SUN_ALTITUDE, SUN_AZIMUTH, flatDEM)
    expect(result.observer_elevation_m).toBeCloseTo(1.7, 0)
  })

  it('checked_at is a valid ISO timestamp', () => {
    const result = checkHorizon(LAT, LNG, SUN_ALTITUDE, SUN_AZIMUTH, flatDEM)
    const parsed = new Date(result.checked_at)
    expect(parsed.getTime()).not.toBeNaN()
  })

  it('returns "blocked" verdict when sun altitude is negative on flat terrain', () => {
    // Sun at -5° → clearance = -5 - 0 = -5 → "blocked"
    const result = checkHorizon(LAT, LNG, -5, SUN_AZIMUTH, flatDEM)
    expect(result.verdict).toBe('blocked')
    expect(result.clearance_degrees).toBeLessThan(0)
  })

  it('verdict thresholds: sun at 10° on flat terrain is "clear"', () => {
    const result = checkHorizon(LAT, LNG, 10, SUN_AZIMUTH, flatDEM)
    // clearance ≈ 10° → > 5° threshold → "clear"
    expect(result.verdict).toBe('clear')
  })
})

describe('getVerdict thresholds (via checkHorizon on flat terrain)', () => {
  it('clearance > 5 → "clear"', () => {
    const result = checkHorizon(LAT, LNG, 10, SUN_AZIMUTH, flatDEM)
    expect(result.verdict).toBe('clear')
  })

  it('clearance < 0 → "blocked"', () => {
    const result = checkHorizon(LAT, LNG, -1, SUN_AZIMUTH, flatDEM)
    expect(result.verdict).toBe('blocked')
  })
})

describe('azimuth sweep wrapping', () => {
  it('handles sun azimuth near 0° without negative azimuths in output', () => {
    const result = checkHorizon(LAT, LNG, SUN_ALTITUDE, 20, flatDEM)
    for (const p of result.sweep) {
      expect(p.azimuth).toBeGreaterThanOrEqual(0)
      expect(p.azimuth).toBeLessThan(360)
    }
  })

  it('handles sun azimuth near 360° without out-of-range azimuths', () => {
    const result = checkHorizon(LAT, LNG, SUN_ALTITUDE, 350, flatDEM)
    for (const p of result.sweep) {
      expect(p.azimuth).toBeGreaterThanOrEqual(0)
      expect(p.azimuth).toBeLessThan(360)
    }
  })
})
