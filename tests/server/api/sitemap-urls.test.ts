import { describe, it, expect } from 'vitest'
import { createTestEvent } from './_helpers'
import { getSpotSlugs } from '../../../server/utils/spotsArchive'

// `defineSitemapEventHandler` is auto-imported by Nitro at runtime
// (and declared as a type-only global in the handler). Provide a
// passthrough here so the imported handler is just the inner function.
;(globalThis as any).defineSitemapEventHandler = (fn: any) => fn

const { default: handler } = await import('../../../server/api/__sitemap__/urls')

describe('GET /api/__sitemap__/urls', () => {
  it('returns one entry per archived spot', async () => {
    const result = await handler(createTestEvent({}))
    expect(result).toHaveLength(getSpotSlugs().length)
  })

  it('emits archive-appropriate metadata', async () => {
    const result = await handler(createTestEvent({}))
    expect(result[0]).toEqual({
      loc: `/spots/${getSpotSlugs()[0]}`,
      lastmod: expect.any(String),
      changefreq: 'yearly',
      priority: 0.7,
      _i18nTransform: true,
    })
  })

  it('needs no database', () => {
    // No supabase mock is passed — if the handler still called
    // serverSupabaseServiceRole this would throw. The handler is now
    // synchronous (it reads the bundled archive), so it returns the
    // array directly rather than a promise — hence no `.resolves`.
    expect(handler(createTestEvent({}))).toBeDefined()
  })
})
