import { serverSupabaseServiceRole } from '#supabase/server'

// `defineSitemapEventHandler` is auto-imported at runtime by Nitro via
// the @nuxtjs/sitemap module — declared on globalThis so the explicit
// `import … from '#imports'` would be redundant (and breaks vitest,
// which can't resolve the `#imports` virtual module under env: node).
declare const defineSitemapEventHandler: <T>(
  fn: (event: import('h3').H3Event) => T | Promise<T>,
) => (event: import('h3').H3Event) => T | Promise<T>

export default defineSitemapEventHandler(async (event) => {
  const supabase = await serverSupabaseServiceRole(event)

  const { data: spots } = await supabase
    .from('viewing_spots')
    .select('slug')

  return (spots || []).map((spot) => ({
    loc: `/spots/${spot.slug}`,
    changefreq: 'weekly',
    priority: 0.7,
  }))
})
