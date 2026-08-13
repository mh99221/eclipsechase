import { describe, it, expect } from 'vitest'
import {
  getAllSpots,
  getSpotBySlug,
  getSpotSlugs,
} from '../../../server/utils/spotsArchive'

describe('spotsArchive', () => {
  it('returns every archived spot', () => {
    const spots = getAllSpots()
    expect(spots.length).toBeGreaterThan(0)
    expect(spots[0]).toHaveProperty('slug')
    expect(spots[0]).toHaveProperty('lat')
    expect(spots[0]).toHaveProperty('lng')
  })

  it('orders spots by totality duration, longest first', () => {
    const durations = getAllSpots().map(s => s.totality_duration_seconds ?? 0)
    expect(durations).toEqual([...durations].sort((a, b) => b - a))
  })

  it('finds a spot by slug', () => {
    const slug = getAllSpots()[0]!.slug
    expect(getSpotBySlug(slug)?.slug).toBe(slug)
  })

  it('returns null for an unknown slug', () => {
    expect(getSpotBySlug('no-such-spot-anywhere')).toBeNull()
  })

  it('lists every slug', () => {
    expect(getSpotSlugs()).toHaveLength(getAllSpots().length)
  })

  it('returns a defensive copy so callers cannot mutate the archive', () => {
    const first = getAllSpots()[0]!
    const originalName = first.name
    first.name = 'MUTATED'
    expect(getAllSpots()[0]!.name).toBe(originalName)
  })

  it('leaves English rows unchanged', () => {
    const slug = getAllSpots()[0]!.slug
    expect(getSpotBySlug(slug, 'en')).toEqual(getSpotBySlug(slug))
  })

  it('applies the Icelandic overlay where one exists', () => {
    // The archive has `is` translations for all 30 spots.
    const base = getAllSpots()[0]!
    const localised = getSpotBySlug(base.slug, 'is')!
    expect(localised.slug).toBe(base.slug)
    // At least one translatable field must differ somewhere in the set,
    // otherwise the overlay is not wired up at all.
    const anyDiffers = getAllSpots().some((s) => {
      const is = getSpotBySlug(s.slug, 'is')!
      return is.name !== s.name || is.description !== s.description
    })
    expect(anyDiffers).toBe(true)
  })

  it('falls back to English for a locale with no translations', () => {
    const slug = getAllSpots()[0]!.slug
    expect(getSpotBySlug(slug, 'fr')).toEqual(getSpotBySlug(slug, 'en'))
  })
})
