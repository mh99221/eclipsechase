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

  // C1 (partial begins) and C4 (partial ends) are stored per-spot since
  // migration 017 — populated from Skyfield at each spot's exact
  // coordinates with 1s precision. If those columns are NULL (e.g. a
  // new spot before the next regeneration of skyfield-contacts.json),
  // fall back to the nearest grid point so the page still renders.
  let c1: string | null = (data as Record<string, unknown>).c1 as string | null ?? null
  let c4: string | null = (data as Record<string, unknown>).c4 as string | null ?? null
  if (!c1 || !c4) {
    try {
      const point = await nearestGridPoint(data.lat, data.lng, { onlyInTotality: true })
      c1 = c1 ?? point?.c1 ?? null
      c4 = c4 ?? point?.c4 ?? null
    } catch (e: any) {
      console.warn(`[spots/${slug}] Eclipse grid fallback failed:`, e.message)
    }
  }

  return { spot: { ...data, c1, c4 } }
})
