import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabase, createTestEvent } from './_helpers'
import viewingSpots from '../../mocks/fixtures/viewing-spots.json'

const { client: mockSupabase, setResult } = createMockSupabase()

// `defineSitemapEventHandler` is auto-imported by Nitro at runtime
// (and declared as a type-only global in the handler). Provide a
// passthrough here so the imported handler is just the inner function.
;(globalThis as any).defineSitemapEventHandler = (fn: any) => fn

const { default: handler } = await import('../../../server/api/__sitemap__/urls')

describe('GET /api/__sitemap__/urls', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns sitemap URLs for all spots', async () => {
    const slugs = viewingSpots.map(s => ({ slug: s.slug }))
    setResult(slugs)

    const result = await handler(createTestEvent({ supabase: mockSupabase }))
    expect(result).toHaveLength(slugs.length)
    expect(result[0]).toEqual({ loc: `/spots/${viewingSpots[0].slug}`, changefreq: 'weekly', priority: 0.7 })
  })

  it('returns empty array when no spots', async () => {
    setResult(null)
    const result = await handler(createTestEvent({ supabase: mockSupabase }))
    expect(result).toEqual([])
  })

  it('queries viewing_spots for slugs', async () => {
    setResult([])
    await handler(createTestEvent({ supabase: mockSupabase }))
    expect(mockSupabase.from).toHaveBeenCalledWith('viewing_spots')
    expect(mockSupabase.select).toHaveBeenCalledWith('slug')
  })
})
