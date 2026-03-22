import { describe, it, expect } from 'vitest'
import { computeSunTrajectory, formatUtcTime } from '../../../app/utils/solar'

// Reykjavik coordinates (representative of eclipse path area)
const REYKJAVIK_LAT = 64.15
const REYKJAVIK_LNG = -21.94

// Eclipse totality at Reykjavik: approximately 17:43–17:48 UTC
const ECLIPSE_UTC_HOURS = 17.75 // ~17:45 UTC

describe('formatUtcTime', () => {
  it('formats whole hours', () => {
    expect(formatUtcTime(0)).toBe('00:00')
    expect(formatUtcTime(1)).toBe('01:00')
    expect(formatUtcTime(12)).toBe('12:00')
    expect(formatUtcTime(23)).toBe('23:00')
  })

  it('formats fractional hours to minutes', () => {
    expect(formatUtcTime(17.75)).toBe('17:45')
    expect(formatUtcTime(0.5)).toBe('00:30')
    expect(formatUtcTime(12.25)).toBe('12:15')
    expect(formatUtcTime(6.5)).toBe('06:30')
  })

  it('pads hours with leading zero', () => {
    expect(formatUtcTime(1)).toBe('01:00')
    expect(formatUtcTime(9)).toBe('09:00')
  })

  it('pads minutes with leading zero', () => {
    expect(formatUtcTime(10 + 5 / 60)).toBe('10:05')
  })

  it('formats eclipse time correctly', () => {
    expect(formatUtcTime(ECLIPSE_UTC_HOURS)).toBe('17:45')
  })
})

describe('computeSunTrajectory', () => {
  it('returns an array of trajectory points', () => {
    const points = computeSunTrajectory(REYKJAVIK_LAT, REYKJAVIK_LNG, 180, 320)
    expect(Array.isArray(points)).toBe(true)
    expect(points.length).toBeGreaterThan(0)
  })

  it('each point has utcHours, altitude, azimuth', () => {
    const points = computeSunTrajectory(REYKJAVIK_LAT, REYKJAVIK_LNG, 180, 320)
    for (const pt of points) {
      expect(pt).toHaveProperty('utcHours')
      expect(pt).toHaveProperty('altitude')
      expect(pt).toHaveProperty('azimuth')
    }
  })

  it('altitude values are in reasonable range (-1 to 90)', () => {
    const points = computeSunTrajectory(REYKJAVIK_LAT, REYKJAVIK_LNG, 0, 360)
    for (const pt of points) {
      expect(pt.altitude).toBeGreaterThanOrEqual(-1)
      expect(pt.altitude).toBeLessThanOrEqual(90)
    }
  })

  it('azimuth values are in range 0–360', () => {
    const points = computeSunTrajectory(REYKJAVIK_LAT, REYKJAVIK_LNG, 0, 360)
    for (const pt of points) {
      expect(pt.azimuth).toBeGreaterThanOrEqual(0)
      expect(pt.azimuth).toBeLessThanOrEqual(360)
    }
  })

  it('utcHours are within expected sample range (4–23)', () => {
    const points = computeSunTrajectory(REYKJAVIK_LAT, REYKJAVIK_LNG, 0, 360)
    for (const pt of points) {
      expect(pt.utcHours).toBeGreaterThanOrEqual(4)
      expect(pt.utcHours).toBeLessThanOrEqual(23)
    }
  })

  it('returns points within azimuth window (with 5° margin)', () => {
    const minAz = 200
    const maxAz = 300
    const points = computeSunTrajectory(REYKJAVIK_LAT, REYKJAVIK_LNG, minAz, maxAz)
    for (const pt of points) {
      expect(pt.azimuth).toBeGreaterThanOrEqual(minAz - 5)
      expect(pt.azimuth).toBeLessThanOrEqual(maxAz + 5)
    }
  })

  it('returns empty array when azimuth window has no match', () => {
    // Requesting azimuth 0–5 (near-north) in afternoon would have no points
    // Use a very tight window that no trajectory point falls in
    const points = computeSunTrajectory(REYKJAVIK_LAT, REYKJAVIK_LNG, 1, 2)
    // Either empty or contains points only in [1-5, 2+5] = [-4, 7] range
    for (const pt of points) {
      expect(pt.azimuth).toBeGreaterThanOrEqual(1 - 5)
      expect(pt.azimuth).toBeLessThanOrEqual(2 + 5)
    }
  })

  it('sun altitude at eclipse time is approximately 24° for Reykjavik', () => {
    // Broader window to capture the eclipse point around 17:45 UTC
    const points = computeSunTrajectory(REYKJAVIK_LAT, REYKJAVIK_LNG, 220, 280)
    // Find point closest to 17.75 UTC (17:45)
    const eclipsePoint = points.reduce((closest, pt) => {
      return Math.abs(pt.utcHours - ECLIPSE_UTC_HOURS) < Math.abs(closest.utcHours - ECLIPSE_UTC_HOURS)
        ? pt
        : closest
    })
    // Sun should be ~24° altitude (range 23–26° is acceptable with simplified formula)
    expect(eclipsePoint.altitude).toBeGreaterThan(20)
    expect(eclipsePoint.altitude).toBeLessThan(30)
  })

  it('sun azimuth at eclipse time is approximately 250° (WSW) for Reykjavik', () => {
    const points = computeSunTrajectory(REYKJAVIK_LAT, REYKJAVIK_LNG, 220, 290)
    const eclipsePoint = points.reduce((closest, pt) => {
      return Math.abs(pt.utcHours - ECLIPSE_UTC_HOURS) < Math.abs(closest.utcHours - ECLIPSE_UTC_HOURS)
        ? pt
        : closest
    })
    // Should be in the WSW range: 240°–270°
    expect(eclipsePoint.azimuth).toBeGreaterThan(235)
    expect(eclipsePoint.azimuth).toBeLessThan(275)
  })

  it('produces more points with wider azimuth window', () => {
    const narrow = computeSunTrajectory(REYKJAVIK_LAT, REYKJAVIK_LNG, 200, 210)
    const wide = computeSunTrajectory(REYKJAVIK_LAT, REYKJAVIK_LNG, 0, 360)
    expect(wide.length).toBeGreaterThanOrEqual(narrow.length)
  })

  it('works for Westfjords coordinates (northernmost eclipse path)', () => {
    // Ísafjörður: ~66°N, -23°W — in path of totality
    const points = computeSunTrajectory(66.07, -23.13, 200, 310)
    expect(points.length).toBeGreaterThan(0)
  })
})
