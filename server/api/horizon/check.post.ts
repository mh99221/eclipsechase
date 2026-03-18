// server/api/horizon/check.post.ts
import { serverSupabaseServiceRole } from '#supabase/server'
import type { HorizonCheckResponse } from '~/types/horizon'

// Rate limiting: 10 req/min per IP
const rateLimits = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimits.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + 60_000 })
    return true
  }
  entry.count++
  return entry.count <= 10
}

export default defineEventHandler(async (event) => {
  // Rate limit
  const ip = getHeader(event, 'x-forwarded-for') || getHeader(event, 'x-real-ip') || 'unknown'
  if (!checkRateLimit(ip)) {
    throw createError({ statusCode: 429, message: 'Too many requests, try again in a minute' })
  }

  // Parse body
  const body = await readBody<{ lat: number; lng: number }>(event)
  if (body?.lat == null || body?.lng == null || typeof body.lat !== 'number' || typeof body.lng !== 'number') {
    throw createError({ statusCode: 400, message: 'lat and lng are required numbers' })
  }

  // Check Pro status
  const email = getHeader(event, 'x-pro-email')
  if (email) {
    const supabase = await serverSupabaseServiceRole(event)
    const { data: proUser } = await supabase
      .from('pro_users')
      .select('is_active')
      .eq('email', email)
      .single()

    if (!proUser?.is_active) {
      throw createError({ statusCode: 403, message: 'Pro subscription required' })
    }
  } else {
    throw createError({ statusCode: 403, message: 'Pro subscription required' })
  }

  // Load DEM
  const demResult = await loadDEM()
  if ('error' in demResult) {
    throw createError({ statusCode: 503, message: 'Horizon check temporarily unavailable' })
  }

  // Bounds check
  if (!isInBounds(body.lat, body.lng, demResult.meta)) {
    throw createError({ statusCode: 422, message: 'Location outside coverage area' })
  }

  // Get sun position from eclipse_grid (nearest neighbor)
  const supabase = await serverSupabaseServiceRole(event)
  const { data: gridPoints } = await supabase
    .from('eclipse_grid')
    .select('lat, lng, sun_altitude, sun_azimuth, duration_seconds')
    .not('totality_start', 'is', null)
    .order('lat', { ascending: true })

  if (!gridPoints?.length) {
    throw createError({ statusCode: 503, message: 'Eclipse data not available' })
  }

  // Find nearest grid point
  let nearest = gridPoints[0]!
  let minDist = Infinity
  for (const gp of gridPoints) {
    const d = (gp.sun_altitude != null && gp.sun_azimuth != null)
      ? Math.sqrt((body.lat - gp.lat) ** 2 + (body.lng - gp.lng) ** 2)
      : Infinity
    if (d < minDist) {
      minDist = d
      nearest = gp
    }
  }

  if (nearest.sun_altitude == null || nearest.sun_azimuth == null) {
    return { in_totality_path: false } as any
  }

  // Run horizon check
  const result = checkHorizon(body.lat, body.lng, nearest.sun_altitude, nearest.sun_azimuth, demResult)

  // Generate PeakFinder URL
  const peakfinderUrl = `https://www.peakfinder.com/?lat=${body.lat}&lng=${body.lng}&name=Custom%20Location&ele=${Math.round(result.observer_elevation_m)}&azi=${Math.round(nearest.sun_azimuth)}`

  const response: HorizonCheckResponse = {
    ...result,
    peakfinder_url: peakfinderUrl,
    totality_duration_seconds: nearest.duration_seconds ?? null,
    in_totality_path: true,
  }

  return response
})
