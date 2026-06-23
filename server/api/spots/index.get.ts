import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  // Edge cache: set here (not via routeRules) because trailingSlash:true
  // rewrites the request path, so the Vercel header-route keyed to the
  // no-slash path never matches the served /api/spots/.
  setResponseHeader(event, 'Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')

  const supabase = await serverSupabaseServiceRole(event)

  // The client passes its active locale via `?locale=is` so the API
  // can overlay translations from viewing_spot_translations. Default
  // is `en` (the locale the base viewing_spots rows are seeded in).
  const query = getQuery(event)
  const locale = typeof query.locale === 'string' && query.locale.length <= 8
    ? query.locale
    : 'en'

  // `photos` is included so the spots list can render hero thumbnails on
  // the cards. `sun_altitude`/`sun_azimuth` round out the geometry needed
  // by AlternatesList ranking and any future map preview on the listing.
  const { data, error } = await supabase
    .from('viewing_spots')
    .select('id, name, slug, lat, lng, region, has_services, cell_coverage, totality_duration_seconds, sun_altitude, sun_azimuth, spot_type, trail_distance_km, trail_time_minutes, difficulty, elevation_gain_m, trailhead_lat, trailhead_lng, horizon_check, warnings, photos')
    .order('totality_duration_seconds', { ascending: false })

  if (error || !data) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch spots' })
  }

  const view = typeof query.view === 'string' ? query.view : null

  // Overlay translations for this locale in a single query rather than
  // N+1 lookups. Only `name` and `warnings` are exposed on the list
  // view (description / parking_info / terrain_notes are spot-detail
  // only), so we fetch just those.
  if (locale !== 'en') {
    const slugs = data.map((s: any) => s.slug)
    const { data: trs } = await supabase
      .from('viewing_spot_translations')
      .select('spot_slug, name, warnings')
      .eq('locale', locale)
      .in('spot_slug', slugs)
    if (trs && trs.length > 0) {
      const bySlug = new Map<string, { name: string | null; warnings: unknown }>()
      for (const tr of trs) bySlug.set(tr.spot_slug, { name: tr.name, warnings: tr.warnings })
      for (const spot of data) {
        const tr = bySlug.get((spot as any).slug)
        if (!tr) continue
        if (tr.name) (spot as any).name = tr.name
        if (tr.warnings != null) (spot as any).warnings = tr.warnings
      }
    }
  }

  // List-view projection (the /spots grid). That page renders only each
  // spot's hero thumbnail and reads horizon_check.verdict for ranking — it
  // never touches the full photos array or warnings. Shipping the complete
  // photos JSONB (filename, alt, credit, photographer, license, url, caption,
  // dimensions … for 150+ photos across 30 spots) made the list payload
  // ~240 KB, the dominant critical-path cost on throttled mobile and the
  // reason FCP/LCP scored poorly. Project down to just what the list needs.
  // Other consumers (/credits attribution, /map lightbox, /spots/[slug]
  // alternates) omit ?view=list and still receive the full response.
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
