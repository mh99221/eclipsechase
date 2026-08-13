import { describe, it, expect } from 'vitest'
import { createTestEvent } from '../_helpers'
import { getAllSpots } from '../../../../server/utils/spotsArchive'

const { default: handler } = await import('../../../../server/api/spots/[slug].get')

const KNOWN_SLUG = getAllSpots()[0]!.slug

describe('GET /api/spots/[slug]', () => {
  it('returns the requested spot', () => {
    const res: any = handler(createTestEvent({ params: { slug: KNOWN_SLUG } }))
    expect(res.spot.slug).toBe(KNOWN_SLUG)
  })

  it('includes the stored C1/C4 contact times', () => {
    const res: any = handler(createTestEvent({ params: { slug: KNOWN_SLUG } }))
    expect(res.spot.c1).toBeTruthy()
    expect(res.spot.c4).toBeTruthy()
  })

  // The handler is synchronous, so it THROWS rather than returning a
  // rejected promise. Do not use `await expect(...).rejects`.
  it('404s on an unknown slug', () => {
    expect(() => handler(createTestEvent({ params: { slug: 'nope-not-a-spot' } })))
      .toThrowError(expect.objectContaining({ statusCode: 404 }))
  })

  it('400s when the slug is missing', () => {
    expect(() => handler(createTestEvent({ params: {} })))
      .toThrowError(expect.objectContaining({ statusCode: 400 }))
  })
})
