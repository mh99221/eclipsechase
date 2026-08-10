import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestEvent } from '../_helpers'

// forecast-timeline.get.ts queries weather_forecasts and weather_stations.
// It has a module-level stationCache. We test with a single module import.

const mockForecastRows: any[] = []
const mockStationRows: any[] = []
const rangeCalls: Array<[number, number]> = []

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
    // weather_forecasts — the handler pages with .range(from, to) because
    // PostgREST clamps any single response to db.max_rows (1000). Slice the
    // fixture the same way so the paging loop is exercised for real.
    return {
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockImplementation((from: number, to: number) => {
        rangeCalls.push([from, to])
        return { data: mockForecastRows.slice(from, to + 1), error: null }
      }),
    }
  }),
}

const { default: handler } = await import('../../../../server/api/weather/forecast-timeline.get')

describe('GET /api/weather/forecast-timeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockForecastRows.length = 0
    mockStationRows.length = 0
    rangeCalls.length = 0
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

  // Regression: PostgREST clamps a single response to db.max_rows (1000),
  // so `.limit(3000)` silently truncated a 48 h × 55-station window to
  // ~20 h per station. The handler must page until a short page arrives.
  it('pages past the 1000-row PostgREST cap to return the full window', async () => {
    const stationCount = 55
    const hours = 48
    for (let h = 0; h < hours; h++) {
      for (let s = 0; s < stationCount; s++) {
        const id = `s${s}`
        mockForecastRows.push({
          station_id: id,
          cloud_cover: 40,
          precipitation_prob: 0,
          valid_time: new Date(Date.UTC(2026, 7, 10, 18 + h)).toISOString(),
          forecast_time: '2026-08-10T12:00:00Z',
          fetched_at: new Date().toISOString(),
        })
      }
    }

    const event = createTestEvent({ supabase: mockSupabase, query: { hours: '48' } })
    const result = await handler(event)

    expect(rangeCalls.length).toBeGreaterThan(1)
    expect(result.stations).toHaveLength(stationCount)
    for (const station of result.stations) {
      expect(station.forecasts).toHaveLength(hours)
    }
  })

  // Regression: two vedur batches can land inside the 6 h forecast_time
  // window. Emitting both would double every hour and halve the span the
  // timeline actually covers.
  it('keeps only the freshest batch when two cover the same valid_time', async () => {
    mockStationRows.push({ id: '1', name: 'Reykjavík', lat: 64.13, lng: -21.9, region: 'reykjavik' })
    // Ordered forecast_time-ascending, as the query returns them.
    mockForecastRows.push(
      {
        station_id: '1', cloud_cover: 10, precipitation_prob: 0,
        valid_time: '2026-08-12T18:00:00Z', forecast_time: '2026-08-12T06:00:00Z',
        fetched_at: new Date().toISOString(),
      },
      {
        station_id: '1', cloud_cover: 90, precipitation_prob: 0,
        valid_time: '2026-08-12T18:00:00Z', forecast_time: '2026-08-12T12:00:00Z',
        fetched_at: new Date().toISOString(),
      },
    )

    const event = createTestEvent({ supabase: mockSupabase })
    const result = await handler(event)

    expect(result.stations[0].forecasts).toHaveLength(1)
    expect(result.stations[0].forecasts[0].cloud_cover).toBe(90)
  })

  it('includes stale flag and fetched_at', async () => {
    const event = createTestEvent({ supabase: mockSupabase })
    const result = await handler(event)
    expect(result).toHaveProperty('stale')
    expect(result).toHaveProperty('fetched_at')
  })
})
