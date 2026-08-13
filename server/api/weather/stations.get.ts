import { getAllStations } from '../../utils/weatherArchive'

/**
 * Weather stations, served from the frozen eclipse-day archive
 * (see server/utils/weatherArchive.ts). Previously read Supabase per
 * request; the eclipse has passed and the station list is immutable, so
 * the runtime database dependency was removed 2026-08-13.
 *
 * Response shape is unchanged: { stations: [{ id, name, lat, lng, region }] }
 * ordered by region — the consuming pages were not modified.
 */
export default defineEventHandler((event) => {
  // Edge cache: set here (not via routeRules) because trailingSlash:true
  // rewrites the request path, so the Vercel header-route keyed to the
  // no-slash path never matches the served /api/weather/stations/.
  setResponseHeader(event, 'Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')

  return { stations: getAllStations() }
})
