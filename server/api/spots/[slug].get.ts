import { serverSupabaseServiceRole } from '#supabase/server'

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

  return { spot: data }
})
