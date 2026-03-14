import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)

  const { data, error } = await supabase
    .from('viewing_spots')
    .select('id, name, slug, lat, lng, region, has_services, cell_coverage, totality_duration_seconds')
    .order('totality_duration_seconds', { ascending: false })

  if (error) {
    throw createError({ statusCode: 500, message: 'Failed to fetch spots' })
  }

  return { spots: data }
})
