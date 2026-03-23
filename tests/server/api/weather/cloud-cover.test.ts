import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabase, createTestEvent } from '../_helpers'

const { client: mockSupabase, setResult } = createMockSupabase()
const mockEnsureFreshForecasts = vi.fn()

vi.mock('../../../../server/utils/vedur', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../server/utils/vedur')>()
  return {
    ...actual,
    ensureFreshForecasts: (...args: any[]) => mockEnsureFreshForecasts(...args),
  }
})

const { default: handler } = await import('../../../../server/api/weather/cloud-cover.get')

describe('GET /api/weather/cloud-cover', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnsureFreshForecasts.mockResolvedValue({ isStale: false, refreshFailed: false })
  })

  it('returns cloud cover data per station', async () => {
    const rows = [
      { station_id: '1', cloud_cover: 30, valid_time: '2026-08-12T18:00:00Z', forecast_time: '2026-08-12T12:00:00Z' },
      { station_id: '990', cloud_cover: 70, valid_time: '2026-08-12T18:00:00Z', forecast_time: '2026-08-12T12:00:00Z' },
    ]
    setResult(rows)

    const event = createTestEvent({ supabase: mockSupabase })
    const result = await handler(event)

    expect(result.cloud_cover).toHaveLength(2)
    expect(result.cloud_cover[0]).toEqual({ station_id: '1', cloud_cover: 30 })
    expect(result.stale).toBe(false)
    expect(result.fetched_at).toBeTruthy()
  })

  it('deduplicates by station (first forecast per station)', async () => {
    setResult([
      { station_id: '1', cloud_cover: 30, valid_time: '2026-08-12T18:00:00Z', forecast_time: '2026-08-12T12:00:00Z' },
      { station_id: '1', cloud_cover: 50, valid_time: '2026-08-12T19:00:00Z', forecast_time: '2026-08-12T12:00:00Z' },
    ])

    const result = await handler(createTestEvent({ supabase: mockSupabase }))
    expect(result.cloud_cover).toHaveLength(1)
    expect(result.cloud_cover[0].cloud_cover).toBe(30)
  })

  it('sets stale=true when data is stale and refresh failed', async () => {
    mockEnsureFreshForecasts.mockResolvedValue({ isStale: true, refreshFailed: true })
    setResult([])

    const result = await handler(createTestEvent({ supabase: mockSupabase }))
    expect(result.stale).toBe(true)
  })

  it('returns empty array when no data', async () => {
    setResult(null)
    const result = await handler(createTestEvent({ supabase: mockSupabase }))
    expect(result.cloud_cover).toEqual([])
  })
})
