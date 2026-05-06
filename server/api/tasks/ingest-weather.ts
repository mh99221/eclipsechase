import { serverSupabaseServiceRole } from '#supabase/server'
import { fetchForecasts, forecastsToRows, STATION_IDS } from '../../utils/vedur'

export default defineEventHandler(async (event) => {
  // Auth: require Bearer $CRON_SECRET if the env var is set.
  // Vercel's scheduled cron and our GitHub Actions workflow both send this
  // header. If CRON_SECRET is unset (dev/local), the endpoint is open —
  // that's intentional so you can hit it manually during development.
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const header = getHeader(event, 'authorization') || ''
    if (header !== `Bearer ${cronSecret}`) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }
  }

  const supabase = await serverSupabaseServiceRole(event)

  const forecasts = await fetchForecasts(STATION_IDS)

  // Upsert forecasts into weather_forecasts
  const forecastRows = forecastsToRows(forecasts)

  let forecastCount = 0
  if (forecastRows.length > 0) {
    const { error: fcError } = await supabase
      .from('weather_forecasts')
      .upsert(forecastRows, { onConflict: 'station_id,forecast_time,valid_time' })

    if (fcError) {
      console.error('Failed to upsert forecasts:', fcError.message)
    } else {
      forecastCount = forecastRows.length
    }
  }

  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  const { error: pruneError } = await supabase
    .from('weather_forecasts')
    .delete()
    .lt('forecast_time', twoDaysAgo)

  if (pruneError) {
    console.error('Failed to prune old forecasts:', pruneError.message)
  }

  return {
    forecasts: forecastCount,
    timestamp: new Date().toISOString(),
  }
})
