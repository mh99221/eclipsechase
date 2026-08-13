import { describe, it, expect } from 'vitest'
import { createTestEvent } from '../_helpers'
import { CAPTURED_AT, getTotalityCloudCover } from '../../../../server/utils/weatherArchive'

const { default: handler } = await import('../../../../server/api/weather/cloud-cover.get')

describe('GET /api/weather/cloud-cover', () => {
  it('returns the archived totality reading per station', () => {
    const res: any = handler(createTestEvent({}))

    expect(res.cloud_cover).toHaveLength(getTotalityCloudCover().length)
    expect(res.cloud_cover.length).toBeGreaterThan(0)
    for (const row of res.cloud_cover) {
      expect(Object.keys(row).sort()).toEqual(['cloud_cover', 'forecast_valid_at', 'station_id'])
      expect(row.forecast_valid_at.startsWith('2026-08-12')).toBe(true)
    }
  })

  it('reports the frozen archive as fresh and available', () => {
    const res: any = handler(createTestEvent({}))
    expect(res.stale).toBe(false)
    expect(res.fetched_at).toBe(CAPTURED_AT)
    expect(res.available).toBe(true)
  })

  it('serves the same eclipse-day reading in every mode', () => {
    const bare: any = handler(createTestEvent({}))
    const eclipse: any = handler(createTestEvent({ query: { mode: 'eclipse' } }))
    const bogus: any = handler(createTestEvent({ query: { mode: 'wat' } }))

    expect(eclipse).toEqual(bare)
    expect(bogus).toEqual(bare)
  })

  it('needs no database', () => {
    // No supabase mock passed — a surviving Supabase call would throw.
    expect(() => handler(createTestEvent({ query: { mode: 'eclipse' } }))).not.toThrow()
  })
})
