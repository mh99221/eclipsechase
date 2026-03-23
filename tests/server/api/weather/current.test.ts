import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabase, createTestEvent } from '../_helpers'

const { client: mockSupabase } = createMockSupabase()

const mockFetchObservations = vi.fn()

vi.mock('../../../../server/utils/vedur', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../server/utils/vedur')>()
  return {
    ...actual,
    fetchObservations: (...args: any[]) => mockFetchObservations(...args),
  }
})

const { default: handler } = await import('../../../../server/api/weather/current.get')

describe('GET /api/weather/current', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns observations from vedur.is', async () => {
    const obs = [
      { stationId: '1', name: 'Reykjavík', timestamp: '2026-08-12T17:00:00', temp: 12.5, windSpeed: 4.2, windDir: 'SW', precipitation: 0 },
    ]
    mockFetchObservations.mockResolvedValue(obs)

    const event = createTestEvent({ supabase: mockSupabase })
    const result = await handler(event)

    expect(result.observations).toHaveLength(1)
    expect(result.observations[0]).toEqual({
      station_id: '1', name: 'Reykjavík', timestamp: '2026-08-12T17:00:00',
      temp: 12.5, wind_speed: 4.2, wind_dir: 'SW', precipitation: 0,
    })
  })

  it('upserts observations into Supabase', async () => {
    mockFetchObservations.mockResolvedValue([
      { stationId: '1', name: 'Reykjavík', timestamp: '2026-08-12T17:00:00', temp: 12.5, windSpeed: 4.2, windDir: 'SW', precipitation: 0 },
    ])

    const event = createTestEvent({ supabase: mockSupabase })
    await handler(event)

    expect(mockSupabase.from).toHaveBeenCalledWith('weather_observations')
    expect(mockSupabase.upsert).toHaveBeenCalled()
  })

  it('throws 502 when no observations returned', async () => {
    mockFetchObservations.mockResolvedValue([])

    const event = createTestEvent({ supabase: mockSupabase })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 502 })
  })
})
