import { describe, it, expect } from 'vitest'
import { createTestEvent } from '../_helpers'
import { getAllStations } from '../../../../server/utils/weatherArchive'

const { default: handler } = await import('../../../../server/api/weather/stations.get')

describe('GET /api/weather/stations', () => {
  it('returns every archived station', () => {
    const res: any = handler(createTestEvent({}))
    expect(res.stations).toHaveLength(getAllStations().length)
    expect(res.stations[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
        lat: expect.any(Number),
        lng: expect.any(Number),
      }),
    )
  })

  it('keeps the region ordering the client relies on', () => {
    const res: any = handler(createTestEvent({}))
    const regions = res.stations.map((s: any) => s.region ?? '')
    expect(regions).toEqual([...regions].sort())
  })

  it('needs no database', () => {
    // No supabase mock passed — a surviving Supabase call would throw.
    expect(() => handler(createTestEvent({}))).not.toThrow()
  })
})
