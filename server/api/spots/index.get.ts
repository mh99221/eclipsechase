import { getAllSpots } from '../../utils/spotsArchive'

/**
 * Spots list, served from the frozen archive (see server/utils/spotsArchive.ts).
 * Previously read Supabase per request; the eclipse has passed and the data
 * is immutable, so the runtime database dependency was removed 2026-08-13.
 */
export default defineEventHandler((event) => {
  // Edge cache: set here (not via routeRules) because trailingSlash:true
  // rewrites the request path, so the Vercel header-route keyed to the
  // no-slash path never matches the served /api/spots/. Immutable data,
  // so the TTL is now a day rather than five minutes.
  setResponseHeader(event, 'Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')

  const query = getQuery(event)
  const locale = typeof query.locale === 'string' && query.locale.length <= 8
    ? query.locale
    : 'en'

  const data = getAllSpots(locale)
  const view = typeof query.view === 'string' ? query.view : null

  // List-view projection (the /spots grid). That page renders only each
  // spot's hero thumbnail and reads horizon_check.verdict for ranking — it
  // never touches the full photos array or warnings. Shipping the complete
  // photos JSONB made the list payload ~240 KB and dominated the critical
  // path on throttled mobile. Project down to just what the list needs.
  if (view === 'list') {
    const asJson = (v: unknown) => {
      if (typeof v !== 'string') return v
      try { return JSON.parse(v) } catch { return null }
    }
    const projected = data.map((spot: any) => {
      const photos = asJson(spot.photos)
      const arr = Array.isArray(photos) ? photos : []
      const hero = arr.find((p: any) => p?.is_hero) || arr[0] || null
      const hc = asJson(spot.horizon_check) as { verdict?: string } | null
      const { warnings: _warnings, ...rest } = spot
      return {
        ...rest,
        horizon_check: hc?.verdict ? { verdict: hc.verdict } : null,
        photos: hero
          ? [{ filename: hero.filename ?? null, alt: hero.alt ?? null, is_hero: true }]
          : [],
      }
    })
    return { spots: projected }
  }

  return { spots: data }
})
