import { getSpotSlugs } from '../../utils/spotsArchive'

// Nitro auto-imports `defineSitemapEventHandler` at runtime via
// @nuxtjs/sitemap. An explicit `import … from '#imports'` would break
// Vitest under env:node (the virtual module is unresolvable there).
declare const defineSitemapEventHandler: <T>(
  fn: (event: import('h3').H3Event) => T | Promise<T>,
) => (event: import('h3').H3Event) => T | Promise<T>

export default defineSitemapEventHandler((event) => {
  // The archive is frozen, so lastmod is the deploy date baked into
  // runtimeConfig at build time — stable within a deploy, refreshed on
  // redeploy. autoLastmod can't reach these (no source file).
  const lastmod = useRuntimeConfig(event).buildDate as string

  return getSpotSlugs().map(slug => ({
    loc: `/spots/${slug}`,
    lastmod,
    changefreq: 'yearly',
    priority: 0.7,
    // Expand each spot across every configured locale (en + is) so the
    // Icelandic sitemap gets /is/spots/<slug> too, with hreflang
    // alternates.
    _i18nTransform: true,
  }))
})
