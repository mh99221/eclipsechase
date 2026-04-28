import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)

  // `photos` is included so the spots list can render hero thumbnails on
  // the cards. `sun_altitude`/`sun_azimuth` round out the geometry needed
  // by AlternatesList ranking and any future map preview on the listing.
  const { data, error } = await supabase
    .from('viewing_spots')
    .select('id, name, slug, lat, lng, region, has_services, cell_coverage, totality_duration_seconds, sun_altitude, sun_azimuth, spot_type, trail_distance_km, trail_time_minutes, difficulty, elevation_gain_m, trailhead_lat, trailhead_lng, horizon_check, warnings, photos')
    .order('totality_duration_seconds', { ascending: false })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch spots' })
  }

  return { spots: data }
})
