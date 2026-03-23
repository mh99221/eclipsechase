import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabase, createTestEvent } from '../_helpers'

const { client: mockSupabase } = createMockSupabase()
const mockFetchForecasts = vi.fn()
const mockForecastsToRows = vi.fn().mockReturnValue([])

vi.mock('../../../../server/utils/vedur', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../server/utils/vedur')>()
  return {
    ...actual,
    fetchForecasts: (...args: any[]) => mockFetchForecasts(...args),
    forecastsToRows: (...args: any[]) => mockForecastsToRows(...args),
  }
})

const { default: handler } = await import('../../../../server/api/weather/forecast.get')

describe('GET /api/weather/forecast', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns forecasts from vedur.is', async () => {
    const forecasts = [
      { stationId: '1', forecastTime: '2026-08-12T12:00:00', validTime: '2026-08-12T17:00:00', cloudCover: 30, precipitation: 0 },
    ]
    mockFetchForecasts.mockResolvedValue(forecasts)
    mockForecastsToRows.mockReturnValue([{ station_id: '1' }])

    const event = createTestEvent({ supabase: mockSupabase })
    const result = await handler(event)

    expect(result.forecasts).toHaveLength(1)
    expect(result.forecasts[0]).toMatchObject({ station_id: '1', cloud_cover: 30 })
  })

  it('throws 502 when no forecasts returned', async () => {
    mockFetchForecasts.mockResolvedValue([])

    const event = createTestEvent({ supabase: mockSupabase })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 502 })
  })
})
