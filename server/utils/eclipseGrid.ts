/**
 * Eclipse-grid loader. The grid at public/eclipse-data/grid.json (~135 KB,
 * 588 points at 0.15° spacing) carries Skyfield-computed totality geometry
 * per point: totality_start/end, duration, sun altitude/azimuth. The
 * horizon-grid.json pipeline consumes sun altitude/azimuth from this grid
 * but drops the ISO timestamps, so the horizon-check API loads it
 * separately to return totality_start in responses.
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export interface EclipsePoint {
  lat: number
  lng: number
  sun_altitude: number
  sun_azimuth: number
  totality_start: string
  totality_end: string
  duration_seconds: number
}

export interface EclipseGrid {
  points: EclipsePoint[]
}

/** Max snap distance in degrees (~5 km at 65°N, wider than horizon grid's
 *  3 km because eclipse grid is coarser at 0.15° spacing). */
const MAX_SNAP_DIST_DEG = 0.12

let cached: EclipseGrid | null = null
let loading: Promise<EclipseGrid> | null = null

async function tryFileSystem(): Promise<EclipseGrid | null> {
  const path = join(process.cwd(), 'public', 'eclipse-data', 'grid.json')
  if (!existsSync(path)) return null
  const raw = JSON.parse(readFileSync(path, 'utf-8'))
  const pts: EclipsePoint[] = raw.points
    .filter((p: any) => p.totality_start && p.sun_altitude != null && p.sun_azimuth != null)
  return { points: pts }
}

async function tryNitroStorage(): Promise<EclipseGrid | null> {
  try {
    // @ts-expect-error useStorage is a Nitro global, not available in test env
    const data = await useStorage('assets:server:eclipse-data').getItem('grid.json')
    if (!data) return null
    const raw = typeof data === 'string' ? JSON.parse(data) : data as any
    const pts: EclipsePoint[] = raw.points
      .filter((p: any) => p.totality_start && p.sun_altitude != null && p.sun_azimuth != null)
    return { points: pts }
  } catch { return null }
}

export async function loadEclipseGrid(): Promise<EclipseGrid> {
  if (cached) return cached
  if (loading) return loading
  loading = (async () => {
    const fs = await tryFileSystem()
    if (fs) { cached = fs; return fs }
    const nitro = await tryNitroStorage()
    if (nitro) { cached = nitro; return nitro }
    throw new Error('eclipse grid unavailable')
  })()
  try { return await loading } finally { loading = null }
}

/**
 * Nearest-point lookup. Simple linear scan (N=588 is cheap). Returns null
 * if the nearest point is further than MAX_SNAP_DIST_DEG — we don't want
 * to attribute totality to points outside the path.
 */
export function findNearestEclipsePoint(
  grid: EclipseGrid,
  lat: number,
  lng: number,
): { point: EclipsePoint; distDeg: number } | null {
  let nearest: EclipsePoint | null = null
  let bestSq = Infinity
  for (const p of grid.points) {
    const d = (p.lat - lat) ** 2 + (p.lng - lng) ** 2
    if (d < bestSq) { bestSq = d; nearest = p }
  }
  if (!nearest) return null
  const distDeg = Math.sqrt(bestSq)
  if (distDeg > MAX_SNAP_DIST_DEG) return null
  return { point: nearest, distDeg }
}
