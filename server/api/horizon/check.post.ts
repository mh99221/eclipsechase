// server/api/horizon/check.post.ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { HorizonCheckResponse } from '~/types/horizon'

// Rate limiting: 10 req/min per IP, with eviction to prevent memory leak
const rateLimits = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimits.get(ip)
  if (!entry || now > entry.resetAt) {
    // Evict expired entries when map grows large
    if (rateLimits.size > 1000) {
      for (const [k, v] of rateLimits) {
        if (now > v.resetAt) rateLimits.delete(k)
      }
    }
    rateLimits.set(ip, { count: 1, resetAt: now + 60_000 })
    return true
  }
  entry.count++
  return entry.count <= 10
}

// Cache eclipse grid in module scope — it never changes
let eclipseGridCache: Array<{ lat: number; lng: number; sun_altitude: number; sun_azimuth: number; duration_seconds: number | null }> | null = null

export default defineEventHandler(async (event) => {
  // Rate limit
  const rawIp = getHeader(event, 'x-forwarded-for') || getHeader(event, 'x-real-ip') || 'unknown'
  const ip = rawIp.split(',')[0]!.trim()
  if (!checkRateLimit(ip)) {
    throw createError({ statusCode: 429, message: 'Too many requests, try again in a minute' })
  }

  // Parse body
  const body = await readBody<{ lat: number; lng: number }>(event)
  if (body?.lat == null || body?.lng == null || typeof body.lat !== 'number' || typeof body.lng !== 'number') {
    throw createError({ statusCode: 400, message: 'lat and lng are required numbers' })
  }

  // Pro access is enforced at the route level (pro-gate middleware on /map).
  // Rate limiting above provides API-level abuse protection.

  // Load DEM
  const demResult = await loadDEM()
  if ('error' in demResult) {
    console.error('[Horizon] DEM load failed:', demResult.error)
    throw createError({ statusCode: 503, message: 'Horizon check temporarily unavailable' })
  }

  // Bounds check
  if (!isInBounds(body.lat, body.lng, demResult.meta)) {
    throw createError({ statusCode: 422, message: 'Location outside coverage area' })
  }

  // Get sun position from eclipse grid (cached — grid is static)
  if (!eclipseGridCache) {
    try {
      const gridPath = join(process.cwd(), 'public', 'eclipse-data', 'grid.json')
      const gridJson = JSON.parse(readFileSync(gridPath, 'utf-8'))
      eclipseGridCache = (gridJson.points as Array<any>)
        .filter((p: any) => p.sun_altitude != null && p.sun_azimuth != null)
        .map((p: any) => ({
          lat: p.lat as number,
          lng: p.lng as number,
          sun_altitude: p.sun_altitude as number,
          sun_azimuth: p.sun_azimuth as number,
          duration_seconds: p.duration_seconds as number | null,
        }))
    } catch {
      throw createError({ statusCode: 503, message: 'Eclipse data not available' })
    }

    if (!eclipseGridCache.length) {
      throw createError({ statusCode: 503, message: 'Eclipse data not available' })
    }
  }

  // Find nearest grid point (filter guarantees all entries have valid sun values)
  let nearest = eclipseGridCache[0]!
  let minDist = Infinity
  for (const gp of eclipseGridCache) {
    const d = Math.sqrt((body.lat - gp.lat) ** 2 + (body.lng - gp.lng) ** 2)
    if (d < minDist) {
      minDist = d
      nearest = gp
    }
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
