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
    // Recent fetched_at so staleness check returns false
    const recent = new Date().toISOString()
    setResult([
      { station_id: '1', cloud_cover: 30, valid_time: '2026-08-12T18:00:00Z', forecast_time: recent, fetched_at: recent },
      { station_id: '990', cloud_cover: 70, valid_time: '2026-08-12T18:00:00Z', forecast_time: recent, fetched_at: recent },
    ])

    const result = await handler(createTestEvent({ supabase: mockSupabase }))

    expect(result.cloud_cover).toHaveLength(2)
    expect(result.cloud_cover[0]).toEqual({ station_id: '1', cloud_cover: 30, forecast_valid_at: '2026-08-12T18:00:00Z' })
    expect(result.stale).toBe(false)
    expect(result.fetched_at).toBeTruthy()
  })

  it('deduplicates by station (first forecast per station)', async () => {
    const recent = new Date().toISOString()
    setResult([
      { station_id: '1', cloud_cover: 30, valid_time: '2026-08-12T18:00:00Z', forecast_time: recent, fetched_at: recent },
      { station_id: '1', cloud_cover: 50, valid_time: '2026-08-12T19:00:00Z', forecast_time: recent, fetched_at: recent },
    ])

    const result = await handler(createTestEvent({ supabase: mockSupabase }))
    expect(result.cloud_cover).toHaveLength(1)
    expect(result.cloud_cover[0].cloud_cover).toBe(30)
  })

  it('marks stale=true when the newest fetched_at is older than the threshold', async () => {
    // fetched_at 3 hours old — past the 90-min staleness threshold.
    // forecast_time can stay recent; staleness is decoupled from vedur's batch cadence.
    const recent = new Date().toISOString()
    const old = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    setResult([
      { station_id: '1', cloud_cover: 30, valid_time: '2026-08-12T18:00:00Z', forecast_time: recent, fetched_at: old },
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

describe('GET /api/weather/cloud-cover?mode=eclipse', () => {
  // Fixed "now" comfortably before the eclipse so the ±3 h window is
  // entirely in the future and never clamped by the not-in-the-past rule.
  const NOW = new Date('2026-08-11T12:00:00Z')

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  it('picks the slot closest to the eclipse instant per station', async () => {
    const recent = NOW.toISOString()
    setResult([
      // Station 1: 18:00 is 17 min after C2 (17:43) — the closest slot.
      { station_id: '1', cloud_cover: 10, valid_time: '2026-08-12T15:00:00Z', forecast_time: recent, fetched_at: recent },
      { station_id: '1', cloud_cover: 20, valid_time: '2026-08-12T18:00:00Z', forecast_time: recent, fetched_at: recent },
      { station_id: '990', cloud_cover: 55, valid_time: '2026-08-12T18:00:00Z', forecast_time: recent, fetched_at: recent },
    ])

    const result = await handler(createTestEvent({ supabase: mockSupabase, query: { mode: 'eclipse' } }))

    expect(result.available).toBe(true)
    expect(result.cloud_cover).toHaveLength(2)
    const s1 = result.cloud_cover.find((c: any) => c.station_id === '1')
    expect(s1).toEqual({ station_id: '1', cloud_cover: 20, forecast_valid_at: '2026-08-12T18:00:00Z' })
  })

  it('reports available=false when no slot reaches the eclipse window', async () => {
    // Typical T-5 state: the model horizon only extends ~48 h, so every
    // ingested row sits far short of Aug 12 17:43.
    const recent = NOW.toISOString()
    setResult([
      { station_id: '1', cloud_cover: 100, valid_time: '2026-08-11T15:00:00Z', forecast_time: recent, fetched_at: recent },
      { station_id: '990', cloud_cover: 90, valid_time: '2026-08-11T18:00:00Z', forecast_time: recent, fetched_at: recent },
    ])

    const result = await handler(createTestEvent({ supabase: mockSupabase, query: { mode: 'eclipse' } }))

    expect(result.available).toBe(false)
    expect(result.cloud_cover).toEqual([])
  })

  it('omits only the stations that lack an in-window slot', async () => {
    const recent = NOW.toISOString()
    setResult([
      { station_id: '1', cloud_cover: 20, valid_time: '2026-08-12T18:00:00Z', forecast_time: recent, fetched_at: recent },
      // Station 990's only row is a day early — outside the ±3 h window.
      { station_id: '990', cloud_cover: 90, valid_time: '2026-08-11T18:00:00Z', forecast_time: recent, fetched_at: recent },
    ])

    const result = await handler(createTestEvent({ supabase: mockSupabase, query: { mode: 'eclipse' } }))

    expect(result.available).toBe(true)
    expect(result.cloud_cover).toHaveLength(1)
    expect(result.cloud_cover[0].station_id).toBe('1')
  })

  it('returns available=false once the eclipse window is fully in the past', async () => {
    vi.setSystemTime(new Date('2026-08-13T00:00:00Z'))
    setResult([])

    const result = await handler(createTestEvent({ supabase: mockSupabase, query: { mode: 'eclipse' } }))

    expect(result.available).toBe(false)
    expect(result.cloud_cover).toEqual([])
  })

  it('defaults to now-mode (available=true) when mode is absent or unknown', async () => {
    const recent = NOW.toISOString()
    const rows = [
      { station_id: '1', cloud_cover: 30, valid_time: '2026-08-11T15:00:00Z', forecast_time: recent, fetched_at: recent },
    ]

    setResult(rows)
    const bare = await handler(createTestEvent({ supabase: mockSupabase }))
    expect(bare.available).toBe(true)
    expect(bare.cloud_cover).toHaveLength(1)

    setResult(rows)
    const bogus = await handler(createTestEvent({ supabase: mockSupabase, query: { mode: 'wat' } }))
    expect(bogus.available).toBe(true)
    expect(bogus.cloud_cover).toHaveLength(1)
  })
})
