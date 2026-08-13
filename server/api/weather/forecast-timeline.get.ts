import { CAPTURED_AT, getAllTimelines, windowAroundTotality } from '../../utils/weatherArchive'

/**
 * Hourly forecast timeline, served from the frozen eclipse-day archive
 * (see server/utils/weatherArchive.ts). Previously paged through
 * Supabase per request; the ingest cron was stopped on 2026-08-13 and
 * the runtime database dependency was removed with it.
 *
 * `?hours=` (12 and 48 are both used by the spot-detail forecast cards)
 * used to select a rolling now→now+hours window. The archive holds
 * exactly one 24 h day, so a rolling window is meaningless — instead the
 * timeline is windowed around the eclipse instant: `hours=12` returns the
 * ~12 real slots straddling totality, and anything at or above the
 * archived span returns the whole of Aug 12. No slot is ever invented,
 * padded or extrapolated; a narrower window simply yields fewer rows.
 *
 * Response shape is unchanged so the unmodified client components keep
 * working:
 *   { stations: [{ id, name, lat, lng, region, forecasts: [
 *       { valid_time, cloud_cover, precip_prob } ] }],
 *     hours, stale, fetched_at }
 *
 * `stale` is false — it described ingest-pipeline health, and a frozen
 * archive cannot fall behind. `fetched_at` is the snapshot capture
 * instant rather than request time.
 */
export default defineEventHandler((event) => {
  // Edge cache: set here (not via routeRules) because trailingSlash:true
  // rewrites the request path, so the Vercel header-route keyed to the
  // no-slash path never matches the served /api/weather/forecast-timeline/.
  // Immutable data, so the TTL is now a day rather than two minutes.
  setResponseHeader(event, 'Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')

  const query = getQuery(event)
  const hours = Math.min(Number(query.hours) || 24, 48)

  const stations = getAllTimelines()
    .map(station => ({
      id: station.id,
      name: station.name,
      lat: station.lat,
      lng: station.lng,
      region: station.region,
      forecasts: windowAroundTotality(station.forecasts, hours),
    }))
    .filter(s => s.forecasts.length > 0)

  return {
    stations,
    hours,
    stale: false,
    fetched_at: CAPTURED_AT,
  }
})
