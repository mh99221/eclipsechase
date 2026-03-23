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
})
