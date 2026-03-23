import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabase, createTestEvent } from '../_helpers'

const { client: mockSupabase } = createMockSupabase()
const mockFetchObservations = vi.fn()
const mockFetchForecasts = vi.fn()
const mockForecastsToRows = vi.fn()

vi.mock('../../../../server/utils/vedur', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../server/utils/vedur')>()
  return {
    ...actual,
    fetchObservations: (...args: any[]) => mockFetchObservations(...args),
    fetchForecasts: (...args: any[]) => mockFetchForecasts(...args),
    forecastsToRows: (...args: any[]) => mockForecastsToRows(...args),
  }
})

const { default: handler } = await import('../../../../server/api/tasks/ingest-weather')

describe('POST /api/tasks/ingest-weather', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns observation and forecast counts', async () => {
    mockFetchObservations.mockResolvedValue([
      { stationId: '1', timestamp: '2026-08-12T17:00:00', temp: 12, windSpeed: 4, windDir: 'SW', precipitation: 0 },
      { stationId: '990', timestamp: '2026-08-12T17:00:00', temp: 10, windSpeed: 6, windDir: 'W', precipitation: 0.2 },
    ])
    mockFetchForecasts.mockResolvedValue([
      { stationId: '1', forecastTime: 'T', validTime: 'T', cloudCover: 30, precipitation: 0 },
    ])
    mockForecastsToRows.mockReturnValue([{ station_id: '1' }])

    const event = createTestEvent({ supabase: mockSupabase })
    const result = await handler(event)

    expect(result.observations).toBe(2)
    expect(result.forecasts).toBe(1)
    expect(typeof result.timestamp).toBe('string')
  })

  it('returns 0 counts when vedur.is returns no data', async () => {
    mockFetchObservations.mockResolvedValue([])
    mockFetchForecasts.mockResolvedValue([])
    mockForecastsToRows.mockReturnValue([])

    const result = await handler(createTestEvent({ supabase: mockSupabase }))
    expect(result.observations).toBe(0)
    expect(result.forecasts).toBe(0)
  })

  it('filters out observations without timestamp', async () => {
    mockFetchObservations.mockResolvedValue([
      { stationId: '1', timestamp: '2026-08-12T17:00:00', temp: 12, windSpeed: 4, windDir: 'SW', precipitation: 0 },
      { stationId: '990', timestamp: '', temp: 10, windSpeed: 6, windDir: 'W', precipitation: 0.2 },
    ])
    mockFetchForecasts.mockResolvedValue([])
    mockForecastsToRows.mockReturnValue([])

    const result = await handler(createTestEvent({ supabase: mockSupabase }))
    expect(result.observations).toBe(1)
  })
})
