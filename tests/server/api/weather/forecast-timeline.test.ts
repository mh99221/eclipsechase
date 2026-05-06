import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestEvent } from '../_helpers'

// forecast-timeline.get.ts queries weather_forecasts and weather_stations.
// It has a module-level stationCache. We test with a single module import.

const mockForecastRows: any[] = []
const mockStationRows: any[] = []

const mockSupabase = {
  from: vi.fn().mockImplementation((table: string) => {
    if (table === 'weather_stations') {
      return {
        select: vi.fn().mockReturnValue({
          then: (resolve: any, reject?: any) => {
            // Properly chain: call resolve with the result, and return
            // a promise that resolves with resolve's return value
            const result = { data: mockStationRows }
            try {
              const mapped = resolve(result)
              return Promise.resolve(mapped)
            } catch (e) {
              if (reject) return Promise.resolve(reject(e))
              return Promise.reject(e)
            }
          },
        }),
      }
    }
    // weather_forecasts — the main query returns an awaitable of { data, error }
    return {
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation(() => ({ data: mockForecastRows, error: null })),
    }
  }),
}

const { default: handler } = await import('../../../../server/api/weather/forecast-timeline.get')

describe('GET /api/weather/forecast-timeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockForecastRows.length = 0
    mockStationRows.length = 0
  })

  it('returns stations with forecast timelines', async () => {
    mockStationRows.push({ id: '1', name: 'Reykjavík', lat: 64.13, lng: -21.9, region: 'reykjavik' })
    mockForecastRows.push({
      station_id: '1', cloud_cover: 30, precipitation_prob: 0,
      valid_time: '2026-08-12T18:00:00Z', forecast_time: '2026-08-12T12:00:00Z',
      fetched_at: new Date().toISOString(),
    })

    const event = createTestEvent({ supabase: mockSupabase })
    const result = await handler(event)

    expect(result.stations).toHaveLength(1)
    expect(result.stations[0].id).toBe('1')
    expect(result.stations[0].forecasts).toHaveLength(1)
  })

  it('defaults to 24 hours', async () => {
    const event = createTestEvent({ supabase: mockSupabase })
    const result = await handler(event)
    expect(result.hours).toBe(24)
  })

  it('caps hours at 48', async () => {
    const event = createTestEvent({ supabase: mockSupabase, query: { hours: '100' } })
    const result = await handler(event)
    expect(result.hours).toBe(48)
  })

  it('includes stale flag and fetched_at', async () => {
    const event = createTestEvent({ supabase: mockSupabase })
    const result = await handler(event)
    expect(result).toHaveProperty('stale')
    expect(result).toHaveProperty('fetched_at')
  })
})
