import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestEvent } from '../_helpers'

// The handler reads horizon-grid.json from the filesystem.
// In the test, it will read the real file if it exists (public/eclipse-data/horizon-grid.json).
// We test against the actual grid data structure.

const { default: handler } = await import('../../../../server/api/horizon/check.post')

describe('POST /api/horizon/check', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns horizon check response for a known location (Stykkisholmur)', async () => {
    // Stykkisholmur is at ~65.075, -22.729 — should be in the grid
    const event = createTestEvent({
      body: { lat: 65.075, lng: -22.729 },
      headers: { 'x-forwarded-for': '127.0.0.1' },
    })
    const result = await handler(event)

    expect(result).toHaveProperty('verdict')
    expect(['clear', 'marginal', 'risky', 'blocked']).toContain(result.verdict)
    expect(typeof result.clearance_degrees).toBe('number')
    expect(typeof result.sun_altitude).toBe('number')
    expect(typeof result.sun_azimuth).toBe('number')
    expect(Array.isArray(result.sweep)).toBe(true)
    expect(result.sweep.length).toBeGreaterThan(0)
    expect(result.sweep[0]).toHaveProperty('azimuth')
    expect(result.sweep[0]).toHaveProperty('horizon_angle')
    expect(result.sweep[0]).toHaveProperty('distance_m')
    expect(result.peakfinder_url).toContain('peakfinder.com')
    expect(typeof result.checked_at).toBe('string')
    expect(result).toHaveProperty('in_totality_path')
    // totality_start is present for locations inside the totality path
    if (result.in_totality_path) {
      expect(typeof result.totality_start).toBe('string')
    }
  })

  it('throws 400 for missing lat/lng', async () => {
    const event = createTestEvent({
      body: {},
      headers: { 'x-forwarded-for': '127.0.0.1' },
    })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 400 for non-number lat/lng', async () => {
    const event = createTestEvent({
      body: { lat: 'abc', lng: -22.7 },
      headers: { 'x-forwarded-for': '127.0.0.1' },
    })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 422 for location outside coverage area', async () => {
    const event = createTestEvent({
      body: { lat: 60.0, lng: -15.0 },
      headers: { 'x-forwarded-for': '127.0.0.1' },
    })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 422 })
  })
})
