// server/api/horizon/check.post.ts
// Grid loading + nearest-point lookup live in server/utils/horizonGrid.ts.
import type { HorizonCheckResponse, HorizonSweepPoint } from '~/types/horizon'
import { findNearestGridPoint, loadHorizonGrid } from '../../utils/horizonGrid'

export default defineEventHandler(async (event) => {
  // Rate limit: 10 req/min per IP
  const rawIp = getHeader(event, 'x-forwarded-for') || getHeader(event, 'x-real-ip') || 'unknown'
  const ip = rawIp.split(',')[0]!.trim()
  if (!checkRateLimit(`horizon:${ip}`, 10, 60_000)) {
    throw createError({ statusCode: 429, statusMessage: 'Too many requests, try again in a minute' })
  }

  const body = await readBody<{ lat: number; lng: number }>(event)
  if (body?.lat == null || body?.lng == null || typeof body.lat !== 'number' || typeof body.lng !== 'number') {
    throw createError({ statusCode: 400, statusMessage: 'lat and lng are required numbers' })
  }

  let grid
  try {
    grid = await loadHorizonGrid()
  } catch (e) {
    console.error('[Horizon] Failed to load grid:', e)
    throw createError({ statusCode: 503, statusMessage: 'Horizon data not available' })
  }

  const match = findNearestGridPoint(grid, body.lat, body.lng)
  if (!match) {
    throw createError({ statusCode: 422, statusMessage: 'Location outside coverage area' })
  }

  const { point } = match

  const sweep: HorizonSweepPoint[] = point.s.map(([azimuth, horizon_angle, distance_m]) => ({
    azimuth, horizon_angle, distance_m,
  }))

  const peakfinderUrl = `https://www.peakfinder.com/?lat=${body.lat}&lng=${body.lng}&name=Custom%20Location&ele=${Math.round(point.oe)}&azi=${Math.round(point.sz)}`

  const response: HorizonCheckResponse = {
    verdict: point.v as HorizonCheckResponse['verdict'],
    clearance_degrees: point.c,
    max_horizon_angle: point.mh,
    blocking_distance_m: point.bd,
    blocking_elevation_m: point.be,
    observer_elevation_m: point.oe,
    sun_altitude: point.sa,
    sun_azimuth: point.sz,
    checked_at: new Date().toISOString(),
    sweep,
    peakfinder_url: peakfinderUrl,
    totality_duration_seconds: point.td,
    in_totality_path: point.td != null && point.td > 0,
  }

  return response
})
