import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabase, createTestEvent } from '../_helpers'
import viewingSpots from '../../../mocks/fixtures/viewing-spots.json'

const { client: mockSupabase, setResult } = createMockSupabase()

const { default: handler } = await import('../../../../server/api/spots/index.get')

describe('GET /api/spots', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns spots sorted by totality duration', async () => {
    setResult(viewingSpots)
    const result = await handler(createTestEvent({ supabase: mockSupabase }))

    expect(result.spots).toHaveLength(viewingSpots.length)
    expect(result.spots[0]).toHaveProperty('name')
    expect(result.spots[0]).toHaveProperty('slug')
  })

  it('queries with correct select and order', async () => {
    setResult(viewingSpots)
    await handler(createTestEvent({ supabase: mockSupabase }))

    expect(mockSupabase.from).toHaveBeenCalledWith('viewing_spots')
    expect(mockSupabase.order).toHaveBeenCalledWith('totality_duration_seconds', { ascending: false })
  })

  it('throws 500 on Supabase error', async () => {
    setResult(null, { message: 'DB error' })
    await expect(handler(createTestEvent({ supabase: mockSupabase }))).rejects.toMatchObject({ statusCode: 500 })
  })

  it('returns the full photos array and horizon_check by default', async () => {
    setResult(viewingSpots)
    const result = await handler(createTestEvent({ supabase: mockSupabase }))

    // No ?view=list → callers like /credits and /map get everything.
    expect(result.spots[0].photos[0]).toHaveProperty('credit')
    expect(result.spots[0].horizon_check).toHaveProperty('sweep')
  })

  it('view=list trims photos to the hero thumb and horizon_check to its verdict', async () => {
    setResult(viewingSpots)
    const result = await handler(createTestEvent({ supabase: mockSupabase, query: { view: 'list' } }))

    expect(result.spots).toHaveLength(viewingSpots.length)
    const spot = result.spots[0]

    // photos → single hero entry, only the fields the grid renders
    expect(spot.photos).toHaveLength(1)
    expect(spot.photos[0]).toEqual({
      filename: 'stykkisholmur-harbour-01.webp',
      alt: 'Stykkishólmur harbour with colourful houses',
      is_hero: true,
    })
    expect(spot.photos[0]).not.toHaveProperty('credit')

    // horizon_check → verdict only (the 91-point sweep is dropped)
    expect(spot.horizon_check).toEqual({ verdict: 'clear' })

    // ranking + card fields the list still depends on survive
    expect(spot).toHaveProperty('totality_duration_seconds')
    expect(spot).toHaveProperty('spot_type')
    expect(spot).toHaveProperty('lat')
  })

  it('view=list tolerates a spot with no photos', async () => {
    setResult([{ ...viewingSpots[0], photos: [], horizon_check: null }])
    const result = await handler(createTestEvent({ supabase: mockSupabase, query: { view: 'list' } }))

    expect(result.spots[0].photos).toEqual([])
    expect(result.spots[0].horizon_check).toBeNull()
  })
})
