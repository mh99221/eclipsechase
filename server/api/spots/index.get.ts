import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
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

  // Overlay translations for this locale in a single query rather than
  // N+1 lookups. Only `name` and `warnings` are exposed on the list
  // view (description / parking_info / terrain_notes are spot-detail
  // only), so we fetch just those.
  if (locale !== 'en') {
    const ids = data.map((s: any) => s.id)
    const { data: trs } = await supabase
      .from('viewing_spot_translations')
      .select('spot_id, name, warnings')
      .eq('locale', locale)
      .in('spot_id', ids)
    if (trs && trs.length > 0) {
      const byId = new Map<string, { name: string | null; warnings: unknown }>()
      for (const tr of trs) byId.set(tr.spot_id, { name: tr.name, warnings: tr.warnings })
      for (const spot of data) {
        const tr = byId.get((spot as any).id)
        if (!tr) continue
        if (tr.name) (spot as any).name = tr.name
        if (tr.warnings != null) (spot as any).warnings = tr.warnings
      }
    }
  }

  return { spots: data }
})
