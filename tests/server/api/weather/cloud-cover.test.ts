import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabase, createTestEvent } from '../_helpers'

const { client: mockSupabase, setResult } = createMockSupabase()

const { default: handler } = await import('../../../../server/api/weather/cloud-cover.get')

describe('GET /api/weather/cloud-cover', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('returns cloud cover data per station', async () => {
    // Recent forecast_time so staleness check returns false
    const recent = new Date().toISOString()
    setResult([
      { station_id: '1', cloud_cover: 30, valid_time: '2026-08-12T18:00:00Z', forecast_time: recent },
      { station_id: '990', cloud_cover: 70, valid_time: '2026-08-12T18:00:00Z', forecast_time: recent },
    ])

    const result = await handler(createTestEvent({ supabase: mockSupabase }))

    expect(result.cloud_cover).toHaveLength(2)
    expect(result.cloud_cover[0]).toEqual({ station_id: '1', cloud_cover: 30 })
    expect(result.stale).toBe(false)
    expect(result.fetched_at).toBeTruthy()
  })

  it('deduplicates by station (first forecast per station)', async () => {
    const recent = new Date().toISOString()
    setResult([
      { station_id: '1', cloud_cover: 30, valid_time: '2026-08-12T18:00:00Z', forecast_time: recent },
      { station_id: '1', cloud_cover: 50, valid_time: '2026-08-12T19:00:00Z', forecast_time: recent },
    ])

    const result = await handler(createTestEvent({ supabase: mockSupabase }))
    expect(result.cloud_cover).toHaveLength(1)
    expect(result.cloud_cover[0].cloud_cover).toBe(30)
  })

  it('marks stale=true when the newest forecast is older than the threshold', async () => {
    // 3 hours old — past the 90-min staleness threshold
    const old = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    setResult([
      { station_id: '1', cloud_cover: 30, valid_time: '2026-08-12T18:00:00Z', forecast_time: old },
    ])

    const result = await handler(createTestEvent({ supabase: mockSupabase }))
    expect(result.stale).toBe(true)
  })

  it('returns empty array + stale=true when no data', async () => {
    setResult(null)
    const result = await handler(createTestEvent({ supabase: mockSupabase }))
    expect(result.cloud_cover).toEqual([])
    expect(result.stale).toBe(true)
  })
})
