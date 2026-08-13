import { describe, it, expect } from 'vitest'
import { createTestEvent } from '../_helpers'
import { CAPTURED_AT, getAllTimelines } from '../../../../server/utils/weatherArchive'

const { default: handler } = await import('../../../../server/api/weather/forecast-timeline.get')

describe('GET /api/weather/forecast-timeline', () => {
  it('returns every archived station with an eclipse-day timeline', () => {
    const res: any = handler(createTestEvent({}))

    expect(res.stations).toHaveLength(getAllTimelines().length)
    const station = res.stations[0]
    expect(Object.keys(station).sort()).toEqual(['forecasts', 'id', 'lat', 'lng', 'name', 'region'])
    expect(station.forecasts.length).toBeGreaterThan(0)
    expect(Object.keys(station.forecasts[0]).sort()).toEqual(['cloud_cover', 'precip_prob', 'valid_time'])
  })

  it('emits each hour once, ascending, all on eclipse day', () => {
    const res: any = handler(createTestEvent({ query: { hours: '48' } }))
    for (const station of res.stations) {
      const times = station.forecasts.map((f: any) => f.valid_time)
      expect(times).toEqual([...times].sort())
      expect(new Set(times).size).toBe(times.length)
      expect(times.every((t: string) => t.startsWith('2026-08-12'))).toBe(true)
    }
  })

  it('defaults to 24 hours and caps at 48', () => {
    expect((handler(createTestEvent({})) as any).hours).toBe(24)
    expect((handler(createTestEvent({ query: { hours: '100' } })) as any).hours).toBe(48)
  })

  // The archive covers one day, so `hours` narrows a window centred on
  // totality rather than extending a rolling one. A 12 h request must
  // return real slots straddling C2 — never padded or extrapolated ones.
  it('narrows to a totality-centred window for hours=12', () => {
    const twelve: any = handler(createTestEvent({ query: { hours: '12' } }))
    const full: any = handler(createTestEvent({ query: { hours: '48' } }))

    const short = twelve.stations[0].forecasts
    const long = full.stations[0].forecasts
    expect(short.length).toBeLessThanOrEqual(12)
    expect(short.length).toBeLessThan(long.length)
    for (const slot of short) {
      expect(long.some((f: any) => f.valid_time === slot.valid_time)).toBe(true)
    }
    // The window straddles the 17:43Z eclipse instant.
    expect(short[0].valid_time <= '2026-08-12T17:43').toBe(true)
    expect(short[short.length - 1]!.valid_time >= '2026-08-12T17:43').toBe(true)
  })

  it('reports the frozen archive as fresh, stamped with the capture time', () => {
    const res: any = handler(createTestEvent({}))
    expect(res.stale).toBe(false)
    expect(res.fetched_at).toBe(CAPTURED_AT)
  })

  it('needs no database', () => {
    // No supabase mock passed — a surviving Supabase call would throw.
    expect(() => handler(createTestEvent({ query: { hours: '48' } }))).not.toThrow()
  })
})
