import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  // Edge cache: set here (not via routeRules) because trailingSlash:true
  // rewrites the request path, so the Vercel header-route keyed to the
  // no-slash path never matches the served /api/weather/stations/.
  setResponseHeader(event, 'Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')

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
