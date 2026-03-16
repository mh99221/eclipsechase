import { defineSitemapEventHandler } from '#imports'
import { serverSupabaseServiceRole } from '#supabase/server'

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
