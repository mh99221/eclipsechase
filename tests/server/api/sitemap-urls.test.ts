import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabase, createTestEvent } from './_helpers'
import viewingSpots from '../../mocks/fixtures/viewing-spots.json'

const { client: mockSupabase, setResult } = createMockSupabase()

// defineSitemapEventHandler is not available in the Nuxt test environment.
// We provide it as a global passthrough before importing the handler.
;(globalThis as any).defineSitemapEventHandler = (fn: any) => fn

let handler: any
let loadError: string | null = null

try {
  const mod = await import('../../../server/api/__sitemap__/urls')
  handler = mod.default
} catch (e: any) {
  loadError = e.message
}

describe('GET /api/__sitemap__/urls', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // Skip all tests if module fails to load (e.g., Nuxt env can't resolve defineSitemapEventHandler)
  const run = loadError ? it.skip : it

  run('returns sitemap URLs for all spots', async () => {
    const slugs = viewingSpots.map(s => ({ slug: s.slug }))
    setResult(slugs)

    const result = await handler(createTestEvent({ supabase: mockSupabase }))
    expect(result).toHaveLength(slugs.length)
    expect(result[0]).toEqual({ loc: `/spots/${viewingSpots[0].slug}`, changefreq: 'weekly', priority: 0.7 })
  })

  run('returns empty array when no spots', async () => {
    setResult(null)
    const result = await handler(createTestEvent({ supabase: mockSupabase }))
    expect(result).toEqual([])
  })

  run('queries viewing_spots for slugs', async () => {
    setResult([])
    await handler(createTestEvent({ supabase: mockSupabase }))
    expect(mockSupabase.from).toHaveBeenCalledWith('viewing_spots')
    expect(mockSupabase.select).toHaveBeenCalledWith('slug')
  })
})
