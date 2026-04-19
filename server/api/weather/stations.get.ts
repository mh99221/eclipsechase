import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)

  const { data, error } = await supabase
    .from('weather_stations')
    .select('id, name, lat, lng, region')
    .order('region')

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch stations' })
  }

  return { stations: data }
})
