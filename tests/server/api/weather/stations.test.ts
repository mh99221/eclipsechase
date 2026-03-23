import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabase, createTestEvent } from '../_helpers'

const { client: mockSupabase, setResult } = createMockSupabase()

const { default: handler } = await import('../../../../server/api/weather/stations.get')

describe('GET /api/weather/stations', () => {
  beforeEach(() => {
    mockSupabase.from.mockClear()
    mockSupabase.select.mockClear()
    mockSupabase.order.mockClear()
  })

  it('returns stations from Supabase', async () => {
    const stations = [
      { id: '1', name: 'Reykjavík', lat: 64.13, lng: -21.9, region: 'reykjavik' },
      { id: '990', name: 'Keflavík', lat: 64.0, lng: -22.6, region: 'reykjanes' },
    ]
    setResult(stations)

    const event = createTestEvent({ supabase: mockSupabase })
    const result = await handler(event)

    expect(result).toEqual({ stations })
    expect(mockSupabase.from).toHaveBeenCalledWith('weather_stations')
    expect(mockSupabase.select).toHaveBeenCalledWith('id, name, lat, lng, region')
    expect(mockSupabase.order).toHaveBeenCalledWith('region')
  })

  it('throws 500 when Supabase returns an error', async () => {
    setResult(null, { message: 'DB error' })

    const event = createTestEvent({ supabase: mockSupabase })
    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 500,
    })
  })
})
