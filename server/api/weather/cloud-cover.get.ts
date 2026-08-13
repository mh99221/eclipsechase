import { CAPTURED_AT, getTotalityCloudCover } from '../../utils/weatherArchive'

/**
 * Cloud cover per station, served from the frozen eclipse-day archive
 * (see server/utils/weatherArchive.ts). Previously read Supabase per
 * request; the ingest cron was stopped on 2026-08-13 and the runtime
 * database dependency was removed with it.
 *
 * What this now returns, in BOTH `?mode=now` and `?mode=eclipse`, is the
 * archived vedur forecast slot nearest the eclipse instant — i.e. what
 * the sky was forecast to be doing at totality on Aug 12 2026. There is
 * no "now" any more, and inventing one would be dishonest, so the two
 * modes are deliberately identical rather than one of them 404-ing.
 *
 * Response shape is unchanged so the unmodified client components keep
 * working:
 *   { cloud_cover: [{ station_id, cloud_cover, forecast_valid_at }],
 *     stale, fetched_at, available }
 *
 * `stale` is false: it always described ingest-pipeline health, and a
 * frozen archive is complete by definition — there is no cron that can
 * fall behind. `fetched_at` is the snapshot capture instant.
 * `available` is true because the eclipse-day reading now always exists
 * (it used to be false until vedur's model horizon reached Aug 12).
 */
export default defineEventHandler((event) => {
  // Edge cache: set here (not via routeRules) because trailingSlash:true
  // rewrites the request path, so the Vercel header-route keyed to the
  // no-slash path never matches the served /api/weather/cloud-cover/.
  // Immutable data, so the TTL is now a day rather than two minutes.
  setResponseHeader(event, 'Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')

  return {
    cloud_cover: getTotalityCloudCover(),
    stale: false,
    fetched_at: CAPTURED_AT,
    available: true,
  }
})
