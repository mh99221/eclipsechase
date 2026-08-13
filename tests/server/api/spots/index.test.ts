import { describe, it, expect } from 'vitest'
import { createTestEvent } from '../_helpers'
import { getAllSpots } from '../../../../server/utils/spotsArchive'

const { default: handler } = await import('../../../../server/api/spots/index.get')

describe('GET /api/spots', () => {
  it('returns every archived spot', () => {
    const res: any = handler(createTestEvent({}))
    expect(res.spots).toHaveLength(getAllSpots().length)
  })

  it('projects down to a hero photo under ?view=list', () => {
    const res: any = handler(createTestEvent({ query: { view: 'list' } }))
    for (const spot of res.spots) {
      expect(spot.photos.length).toBeLessThanOrEqual(1)
      expect(spot).not.toHaveProperty('warnings')
    }
  })

  it('keeps the full payload without ?view=list', () => {
    const res: any = handler(createTestEvent({}))
    expect(res.spots[0]).toHaveProperty('warnings')
  })

  it('needs no database', () => {
    // No supabase mock passed — a surviving Supabase call would throw.
    expect(() => handler(createTestEvent({}))).not.toThrow()
  })
})
