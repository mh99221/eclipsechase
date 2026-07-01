import { serverSupabaseServiceRole } from '#supabase/server'
import { submitIndexNow } from '../../utils/indexnow'

// Static, indexable routes (Pro-gated /dashboard, /map, /me are excluded —
// they redirect non-Pro visitors and shouldn't be crawled/indexed).
const STATIC_PATHS = ['/', '/guide/', '/spots/', '/pro/', '/privacy/', '/terms/', '/credits/']
// i18n strategy is prefix_except_default: en has no prefix, is is prefixed.
const LOCALE_PREFIXES = ['', '/is']

export default defineEventHandler(async (event) => {
  // Same bearer-auth pattern as /api/tasks/ingest-weather: open in dev
  // (CRON_SECRET unset), required once deployed.
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const header = getHeader(event, 'authorization') || ''
    if (header !== `Bearer ${cronSecret}`) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }
  }

  const supabase = await serverSupabaseServiceRole(event)
  const { data: spots } = await supabase.from('viewing_spots').select('slug')

  const urls: string[] = []
  for (const prefix of LOCALE_PREFIXES) {
    for (const path of STATIC_PATHS) {
      urls.push(`https://eclipsechase.is${prefix}${path}`)
    }
    for (const spot of spots || []) {
      urls.push(`https://eclipsechase.is${prefix}/spots/${spot.slug}/`)
    }
  }

  const result = await submitIndexNow(urls)
  return { ...result, timestamp: new Date().toISOString() }
})
