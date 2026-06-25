import { serverSupabaseServiceRole } from '#supabase/server'

// Nitro auto-imports `defineSitemapEventHandler` at runtime via
// @nuxtjs/sitemap. An explicit `import … from '#imports'` would break
// Vitest under env:node (the virtual module is unresolvable there).
declare const defineSitemapEventHandler: <T>(
  fn: (event: import('h3').H3Event) => T | Promise<T>,
) => (event: import('h3').H3Event) => T | Promise<T>

export default defineSitemapEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)

  // viewing_spots has no per-row timestamp, so fall back to the deploy date
  // baked into runtimeConfig at build time (see nuxt.config). Stable within a
  // deploy, refreshed on redeploy — the signal Google needs to recrawl after
  // a content/SEO change, without the per-request churn `new Date()` here
  // would cause. autoLastmod can't reach these (no source file).
  const lastmod = useRuntimeConfig(event).buildDate as string

  const { data: spots } = await supabase
    .from('viewing_spots')
    .select('slug')

  return (spots || []).map((spot) => ({
    loc: `/spots/${spot.slug}`,
    lastmod,
    changefreq: 'weekly',
    priority: 0.7,
    // Expand each spot across every configured locale (en + is) so the
    // Icelandic sitemap gets /is/spots/<slug> too, with hreflang
    // alternates. Without this the dynamic source lands only in the
    // default-locale (en) sitemap; static pages are already localized
    // by the i18n↔sitemap integration.
    _i18nTransform: true,
  }))
})
