import { describe, it, expect } from 'vitest'
import { computeSunTrajectoryByTime } from '../../../app/utils/solar'

describe('computeSunTrajectoryByTime', () => {
  // Reykjavik coords, totality 17:46 UTC → window 17:31 to 18:01
  const REYKJAVIK = { lat: 64.15, lng: -21.94 }

  it('returns one point per step within the window', () => {
    const points = computeSunTrajectoryByTime(REYKJAVIK.lat, REYKJAVIK.lng, 17.5, 18.0, 5)
    // 17:30, 17:35, 17:40, 17:45, 17:50, 17:55, 18:00 → 7 points
    expect(points).toHaveLength(7)
  })

  it('produces monotonically increasing utcHours', () => {
    const points = computeSunTrajectoryByTime(REYKJAVIK.lat, REYKJAVIK.lng, 17.5, 18.0, 5)
    for (let i = 1; i < points.length; i++) {
      expect(points[i]!.utcHours).toBeGreaterThan(points[i - 1]!.utcHours)
    }
  })

  it('returns realistic Iceland totality-time azimuth (around 250° WSW)', () => {
    const points = computeSunTrajectoryByTime(REYKJAVIK.lat, REYKJAVIK.lng, 17.75, 17.78, 1)
    const mid = points[0]!
    expect(mid.azimuth).toBeGreaterThan(240)
    expect(mid.azimuth).toBeLessThan(260)
  })

  it('returns realistic Iceland totality-time altitude (20°–30°)', () => {
    const points = computeSunTrajectoryByTime(REYKJAVIK.lat, REYKJAVIK.lng, 17.75, 17.78, 1)
    expect(points[0]!.altitude).toBeGreaterThan(20)
    expect(points[0]!.altitude).toBeLessThan(30)
  })

  it('handles fractional step minutes', () => {
    const points = computeSunTrajectoryByTime(REYKJAVIK.lat, REYKJAVIK.lng, 17.75, 17.80, 1)
    // 17:45, 17:46, 17:47, 17:48 → 4 points (0.05h * 60 / 1 = 3, inclusive = 4)
    expect(points).toHaveLength(4)
  })
})
