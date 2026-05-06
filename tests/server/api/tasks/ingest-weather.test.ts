import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabase, createTestEvent } from '../_helpers'

const { client: mockSupabase } = createMockSupabase()
const mockFetchForecasts = vi.fn()
const mockForecastsToRows = vi.fn()

vi.mock('../../../../server/utils/vedur', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../server/utils/vedur')>()
  return {
    ...actual,
    fetchForecasts: (...args: any[]) => mockFetchForecasts(...args),
    forecastsToRows: (...args: any[]) => mockForecastsToRows(...args),
  }
})

const { default: handler } = await import('../../../../server/api/tasks/ingest-weather')

describe('POST /api/tasks/ingest-weather', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns forecast count', async () => {
    mockFetchForecasts.mockResolvedValue([
      { stationId: '1', forecastTime: 'T', validTime: 'T', cloudCover: 30, precipitation: 0 },
    ])
    mockForecastsToRows.mockReturnValue([{ station_id: '1' }])

    const event = createTestEvent({ supabase: mockSupabase })
    const result = await handler(event)

    expect(result.forecasts).toBe(1)
    expect(typeof result.timestamp).toBe('string')
  })

  it('returns 0 forecasts when vedur.is returns no data', async () => {
    mockFetchForecasts.mockResolvedValue([])
    mockForecastsToRows.mockReturnValue([])

    const result = await handler(createTestEvent({ supabase: mockSupabase }))
    expect(result.forecasts).toBe(0)
  })
})
