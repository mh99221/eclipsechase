/**
 * RETIRED 2026-08-13.
 *
 * The Pro app surfaces are gone. They were gated and never indexed, so a
 * permanent 410 is the correct signal — it tells crawlers to drop them
 * immediately rather than retrying a 404 for months.
 *
 * /pro and /pro/success are handled by routeRules redirects instead: those
 * URLs were public, so they get a 301 to /farewell.
 *
 * NOTE: /check and /api/check are deliberately absent. They are public,
 * ungated, and run entirely on static grids with no database — they
 * survive the sunset intact. Only /api/horizon/check (the /map overlay
 * endpoint) is retired here.
 */
const RETIRED_PREFIXES = [
  '/map',
  '/dashboard',
  '/api/cameras',
  '/api/traffic',
  '/api/horizon',
]

export default defineEventHandler((event) => {
  const path = event.path.split('?')[0]!.replace(/\/$/, '') || '/'
  const retired = RETIRED_PREFIXES.some(p => path === p || path.startsWith(p + '/'))
  if (!retired) return

  throw createError({
    statusCode: 410,
    statusMessage: 'This feature retired after the August 12, 2026 eclipse',
  })
})
