import { serverSupabaseServiceRole } from '#supabase/server'

// Nitro auto-imports `defineSitemapEventHandler` at runtime via
// @nuxtjs/sitemap. An explicit `import … from '#imports'` would break
// Vitest under env:node (the virtual module is unresolvable there).
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
