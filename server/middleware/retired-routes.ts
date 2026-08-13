/**
 * RETIRED 2026-08-13.
 *
 * The Pro app surfaces are gone. `/map`, `/dashboard` and the Pro-only
 * APIs 410 permanently — they were gated and never indexed, so a 410
 * tells crawlers to drop them immediately rather than retrying a 404 for
 * months. `/pro` and `/pro/success` were public and indexed, so they
 * 301 to `/farewell` instead of 410ing.
 *
 * Both the 410s and the /pro redirect are handled HERE, in one place,
 * rather than splitting the redirect into `nuxt.config.ts` routeRules.
 * They were originally split, and it was a real bug: @nuxtjs/i18n's
 * `prefix_except_default` strategy does not localize routeRules, so a
 * routeRules-only redirect answered `/pro` correctly but left `/is/pro`
 * serving the full, live purchase page — €9.99 price, Stripe copy and
 * all — and `/is/map` / `/is/dashboard` returning 200 instead of 410.
 * Confirmed by curling a built server. Centralising the logic here, with
 * explicit locale-prefix handling, closes that gap for every route this
 * middleware knows about, present and future.
 *
 * NOTE: /check and /api/check are deliberately absent from both lists.
 * They are public, ungated, and run entirely on static grids with no
 * database — they survive the sunset intact. Only /api/horizon/check
 * (the /map overlay endpoint) is retired here.
 */

// Non-default locale codes from nuxt.config.ts `i18n.locales`. `en` is the
// default locale under `prefix_except_default` and carries no prefix.
const NON_DEFAULT_LOCALES = ['is']

const RETIRED_410_PREFIXES = [
  '/map',
  '/dashboard',
  '/api/cameras',
  '/api/traffic',
  '/api/horizon',
]

const REDIRECT_TO_FAREWELL = ['/pro', '/pro/success']

/**
 * Strips a leading `/is` (etc.) locale prefix so the retirement lists only
 * need to know the canonical, unprefixed route once.
 */
function stripLocalePrefix(path: string): { path: string; locale: string | null } {
  for (const locale of NON_DEFAULT_LOCALES) {
    const prefix = `/${locale}`
    if (path === prefix) return { path: '/', locale }
    if (path.startsWith(prefix + '/')) return { path: path.slice(prefix.length) || '/', locale }
  }
  return { path, locale: null }
}

export default defineEventHandler((event) => {
  const rawPath = event.path.split('?')[0]!.replace(/\/$/, '') || '/'
  const { path, locale } = stripLocalePrefix(rawPath)

  if (REDIRECT_TO_FAREWELL.includes(path)) {
    const target = locale ? `/${locale}/farewell` : '/farewell'
    return sendRedirect(event, target, 301)
  }

  const retired = RETIRED_410_PREFIXES.some(p => path === p || path.startsWith(p + '/'))
  if (!retired) return

  throw createError({
    statusCode: 410,
    statusMessage: 'This feature retired after the August 12, 2026 eclipse',
  })
})
