import { getSpotBySlug } from '../../utils/spotsArchive'

/**
 * Spot detail, served from the frozen archive.
 *
 * The nearestGridPoint() fallback for c1/c4 is gone: migration 017 stored
 * both per-spot, the snapshot captured them for all 30 spots, and no new
 * spots will ever be added. Whatever the archive holds is final.
 */
export default defineEventHandler((event) => {
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Slug is required' })
  }

  const query = getQuery(event)
  const locale = typeof query.locale === 'string' && query.locale.length <= 8
    ? query.locale
    : 'en'

  const spot = getSpotBySlug(slug, locale)

  if (!spot) {
    throw createError({ statusCode: 404, statusMessage: 'Spot not found' })
  }

  setResponseHeader(event, 'Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')

  return { spot }
})
