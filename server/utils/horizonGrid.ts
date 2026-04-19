/**
 * Pre-computed horizon grid loader + spatial index.
 *
 * The grid is ~6.2 MB of JSON (scripts/precompute-horizon-grid.ts).
 * Parsing it synchronously on the first request costs ~100–300 ms on a
 * Vercel cold start, and the hot path used to linear-scan all ~10 000
 * points per `/api/horizon/check` call. Both costs are moved here:
 *
 *   - `loadHorizonGrid()` is cache-first, shared across concurrent
 *     cold-start requests, and pre-called from `server/plugins/
 *     preload-horizon.ts` so the cost is paid at boot.
 *   - A 0.1°-cell bucket index is built once when the grid loads and
 *     reused for every lookup. Search radius is always MAX_SNAP_DIST
 *     (~3 km) so a 3×3 cell window (0.3°) is guaranteed to contain any
 *     candidate match.
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface GridPoint {
  lat: number; lng: number
  v: string; c: number; mh: number; oe: number
  sa: number; sz: number
  bd: number | null; be: number | null
  td: number | null
  s: [number, number, number][] // [azimuth, horizon_angle, distance_m]
}

interface RawHorizonGrid {
  point_count: number
  points: GridPoint[]
}

export interface HorizonGrid extends RawHorizonGrid {
  /** Bucket key `${latBucket}:${lngBucket}` → points in that 0.1° cell. */
  index: Map<string, GridPoint[]>
}

/** Max snap distance in degrees (~3 km at 65°N). */
export const MAX_SNAP_DIST_DEG = 0.035

const INDEX_CELL_DEG = 0.1

function bucketKey(lat: number, lng: number): string {
  return `${Math.floor(lat / INDEX_CELL_DEG)}:${Math.floor(lng / INDEX_CELL_DEG)}`
}

function buildIndex(points: GridPoint[]): Map<string, GridPoint[]> {
  const idx = new Map<string, GridPoint[]>()
  for (const gp of points) {
    const k = bucketKey(gp.lat, gp.lng)
    const list = idx.get(k)
    if (list) list.push(gp)
    else idx.set(k, [gp])
  }
  return idx
}

let cache: HorizonGrid | null = null
let loadPromise: Promise<HorizonGrid> | null = null

function loadFromFilesystem(): RawHorizonGrid | null {
  const candidates = [
    resolve(process.cwd(), 'public', 'eclipse-data', 'horizon-grid.json'),
    resolve(process.cwd(), '.output', 'public', 'eclipse-data', 'horizon-grid.json'),
  ]

  try {
    const currentDir = dirname(fileURLToPath(import.meta.url))
    candidates.push(resolve(currentDir, '..', '..', 'public', 'eclipse-data', 'horizon-grid.json'))
    candidates.push(resolve(currentDir, '..', '..', '..', 'public', 'eclipse-data', 'horizon-grid.json'))
  } catch { /* import.meta.url may not resolve in all envs */ }

  for (const path of candidates) {
    try {
      const grid = JSON.parse(readFileSync(path, 'utf-8')) as RawHorizonGrid
      console.log(`[Horizon] Loaded grid from filesystem: ${path} (${grid.point_count} points)`)
      return grid
    } catch { /* try next */ }
  }
  return null
}

async function loadRaw(): Promise<RawHorizonGrid> {
  const fromFS = loadFromFilesystem()
  if (fromFS) return fromFS

  // Nitro serverAssets storage (works on Vercel when bundled)
  try {
    const data = await useStorage('assets:server:eclipse-data').getItem('horizon-grid.json')
    if (data) {
      const grid = (typeof data === 'string' ? JSON.parse(data) : data) as RawHorizonGrid
      console.log(`[Horizon] Loaded grid via Nitro storage (${grid.point_count} points)`)
      return grid
    }
  } catch (e: any) {
    console.warn('[Horizon] Nitro storage fallback failed:', e.message)
  }

  // Last resort: fetch from own public URL (static assets on CDN)
  try {
    const config = useRuntimeConfig()
    const baseUrl = config.public.siteUrl
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
      || 'http://localhost:3000'
    const url = `${baseUrl}/eclipse-data/horizon-grid.json`
    console.log(`[Horizon] Attempting HTTP fetch from ${url}`)
    const res = await fetch(url)
    if (res.ok) {
      const grid = await res.json() as RawHorizonGrid
      console.log(`[Horizon] Loaded grid via HTTP (${grid.point_count} points)`)
      return grid
    }
    console.error(`[Horizon] HTTP fetch failed with status ${res.status}`)
  } catch (e: any) {
    console.error('[Horizon] HTTP fallback failed:', e.message)
  }

  throw new Error('horizon-grid.json not found via filesystem, storage, or HTTP')
}

export function loadHorizonGrid(): Promise<HorizonGrid> {
  if (cache) return Promise.resolve(cache)
  if (!loadPromise) {
    loadPromise = loadRaw().then((raw) => {
      const start = Date.now()
      const index = buildIndex(raw.points)
      console.log(`[Horizon] Built bucket index (${index.size} cells, ${Date.now() - start}ms)`)
      cache = { ...raw, index }
      return cache
    }).catch((e) => {
      loadPromise = null // allow retry on failure
      throw e
    })
  }
  return loadPromise
}

/**
 * Find the nearest grid point to (lat, lng), or null if none within
 * MAX_SNAP_DIST_DEG. O(k) where k is the number of points in the 3×3
 * cell window — typically ≤100 vs a linear scan of ~10 000.
 */
export function findNearestGridPoint(
  grid: HorizonGrid,
  lat: number,
  lng: number,
): { point: GridPoint; distDeg: number } | null {
  const latBucket = Math.floor(lat / INDEX_CELL_DEG)
  const lngBucket = Math.floor(lng / INDEX_CELL_DEG)

  let nearest: GridPoint | null = null
  let minDist = Infinity
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const bucket = grid.index.get(`${latBucket + dy}:${lngBucket + dx}`)
      if (!bucket) continue
      for (const gp of bucket) {
        const d = (lat - gp.lat) ** 2 + (lng - gp.lng) ** 2
        if (d < minDist) { minDist = d; nearest = gp }
      }
    }
  }

  if (!nearest) return null
  const distDeg = Math.sqrt(minDist)
  if (distDeg > MAX_SNAP_DIST_DEG) return null
  return { point: nearest, distDeg }
}
