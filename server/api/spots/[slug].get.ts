import { serverSupabaseServiceRole } from '#supabase/server'
import { nearestGridPoint } from '../../utils/eclipseGrid'

const TRANSLATABLE_FIELDS = ['name', 'description', 'parking_info', 'terrain_notes', 'warnings'] as const

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Slug is required' })
  }

  // The client passes its active locale via `?locale=is` so the API
  // can overlay translations from viewing_spot_translations. Default
  // is `en` (the locale the base viewing_spots rows are seeded in).
  const query = getQuery(event)
  const locale = typeof query.locale === 'string' && query.locale.length <= 8
    ? query.locale
    : 'en'

  const supabase = await serverSupabaseServiceRole(event)

  const { data, error } = await supabase
    .from('viewing_spots')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !data) {
    throw createError({ statusCode: 404, statusMessage: 'Spot not found' })
  }

  // Overlay locale-specific copy where available (see migration 008
  // for schema). Any field that's NULL on the translation row falls
  // back to the English base row, so partial translations are safe.
  if (locale !== 'en') {
    const { data: tr } = await supabase
      .from('viewing_spot_translations')
      .select('name, description, parking_info, terrain_notes, warnings')
      .eq('spot_slug', data.slug)
      .eq('locale', locale)
      .maybeSingle()
    if (tr) {
      for (const field of TRANSLATABLE_FIELDS) {
        const value = (tr as Record<string, unknown>)[field]
        if (value !== null && value !== undefined) {
          (data as Record<string, unknown>)[field] = value
        }
      }
    }
  }

  // Enrich with C1 (partial begins) and C4 (partial ends) from the
  // pre-computed eclipse grid. These aren't stored on viewing_spots
  // because the grid is the source of truth for eclipse geometry — the
  // grid script (scripts/compute-eclipse-grid.py) computes them via
  // bisection with sub-second precision.
  //
  // If the grid hasn't been regenerated since the C1/C4 fields were
  // added, the lookup returns objects without those keys; in that case
  // the client falls back to the calibrated approximation in
  // ContactList.vue, so the page still works during the rollout.
  let c1: string | null = null
  let c4: string | null = null
  try {
    const point = await nearestGridPoint(data.lat, data.lng, { onlyInTotality: true })
    c1 = point?.c1 ?? null
    c4 = point?.c4 ?? null
  } catch (e: any) {
    console.warn(`[spots/${slug}] Eclipse grid lookup failed:`, e.message)
  }

  return { spot: { ...data, c1, c4 } }
})
