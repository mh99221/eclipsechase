import { serverSupabaseServiceRole } from '#supabase/server'
import { nearestGridPoint } from '../../utils/eclipseGrid'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Slug is required' })
  }

  const supabase = await serverSupabaseServiceRole(event)

  const { data, error } = await supabase
    .from('viewing_spots')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !data) {
    throw createError({ statusCode: 404, statusMessage: 'Spot not found' })
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
