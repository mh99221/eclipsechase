import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabase, createTestEvent } from '../_helpers'
import viewingSpots from '../../../mocks/fixtures/viewing-spots.json'

const { client: mockSupabase, setResult } = createMockSupabase()

const { default: handler } = await import('../../../../server/api/spots/[slug].get')

describe('GET /api/spots/[slug]', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns spot for valid slug', async () => {
    setResult(viewingSpots[0])
    const event = createTestEvent({ supabase: mockSupabase, params: { slug: 'stykkisholmur-harbour' } })
    const result = await handler(event)

    expect(result.spot).toEqual(viewingSpots[0])
    expect(mockSupabase.eq).toHaveBeenCalledWith('slug', 'stykkisholmur-harbour')
    expect(mockSupabase.single).toHaveBeenCalled()
  })

  it('throws 404 for unknown slug', async () => {
    setResult(null, { message: 'not found' })
    const event = createTestEvent({ supabase: mockSupabase, params: { slug: 'nonexistent' } })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('throws 400 when slug is missing', async () => {
    const event = createTestEvent({ supabase: mockSupabase, params: {} })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 400 })
  })
})
