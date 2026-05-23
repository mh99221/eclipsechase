/**
 * Loader for the ERA5 cloud-history grid (public/eclipse-data/
 * historical-weather-grid.json). The grid is pre-computed by
 * scripts/fetch-historical-weather-grid.mjs at 0.25° resolution
 * matching ERA5's native cell size.
 *
 * If the grid file is missing (pre-compute hasn't run yet), the
 * loader returns null and the caller falls back to the per-spot
 * historical-weather.json.
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface HistoricalYearPoint {
  year: number
  cloud_cover: number | null
}

export interface HistoricalWeatherCell {
  years: HistoricalYearPoint[]
  clear_years: number
  partly_years: number
  overcast_years: number
  total_years: number
  avg_cloud_cover: number | null
}

interface RawHistoricalGrid {
  generated_at: string
  source: string
  eclipse_time_utc: string
  years_covered: [number, number]
  note: string
  step: number  // grid spacing in degrees (0.25 for ERA5)
  cells: Record<string, HistoricalWeatherCell>  // key: `${lat},${lng}` (rounded)
}

let cache: RawHistoricalGrid | null | undefined  // undefined = not yet loaded; null = confirmed missing
let loadPromise: Promise<RawHistoricalGrid | null> | null = null

function loadFromFilesystem(): RawHistoricalGrid | null {
  const candidates = [
    resolve(process.cwd(), 'public', 'eclipse-data', 'historical-weather-grid.json'),
    resolve(process.cwd(), '.output', 'public', 'eclipse-data', 'historical-weather-grid.json'),
  ]
  try {
    const currentDir = dirname(fileURLToPath(import.meta.url))
    candidates.push(resolve(currentDir, '..', '..', 'public', 'eclipse-data', 'historical-weather-grid.json'))
    candidates.push(resolve(currentDir, '..', '..', '..', 'public', 'eclipse-data', 'historical-weather-grid.json'))
  } catch { /* import.meta.url unavailable */ }

  for (const path of candidates) {
    try {
      if (!existsSync(path)) continue
      return JSON.parse(readFileSync(path, 'utf-8')) as RawHistoricalGrid
    } catch { /* try next */ }
  }
  return null
}

export async function loadHistoricalWeatherGrid(): Promise<RawHistoricalGrid | null> {
  if (cache !== undefined) return cache
  if (loadPromise) return loadPromise
  loadPromise = (async () => {
    const fromFS = loadFromFilesystem()
    if (fromFS) {
      console.log(`[CloudHistory] Loaded grid from filesystem (${Object.keys(fromFS.cells || {}).length} cells)`)
      cache = fromFS
      return fromFS
    }
    try {
      const data = await useStorage('assets:server:eclipse-data').getItem('historical-weather-grid.json')
      if (data) {
        const grid = (typeof data === 'string' ? JSON.parse(data) : data) as RawHistoricalGrid
        console.log(`[CloudHistory] Loaded grid via Nitro storage (${Object.keys(grid.cells || {}).length} cells)`)
        cache = grid
        return grid
      }
    } catch (e: any) {
      console.warn('[CloudHistory] Nitro storage fallback failed:', e?.message)
    }
    // HTTP fallback — matches the pattern used by horizonGrid.ts +
    // eclipseGrid.ts so the endpoint stays available even when the
    // serverless bundler dropped the file.
    try {
      const config = useRuntimeConfig()
      const baseUrl = (config.public.siteUrl as string)
        || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
        || 'http://localhost:3000'
      const res = await fetch(`${baseUrl}/eclipse-data/historical-weather-grid.json`)
      if (res.ok) {
        const grid = await res.json() as RawHistoricalGrid
        console.log(`[CloudHistory] Loaded grid via HTTP (${Object.keys(grid.cells || {}).length} cells)`)
        cache = grid
        return grid
      }
      console.warn(`[CloudHistory] HTTP fallback returned ${res.status}`)
    } catch (e: any) {
      console.warn('[CloudHistory] HTTP fallback failed:', e?.message)
    }
    console.warn('[CloudHistory] grid file not found via filesystem, storage, or HTTP')
    cache = null
    return null
  })()
  loadPromise.finally(() => { loadPromise = null })
  return loadPromise
}

function gridKey(lat: number, lng: number, step: number): string {
  const gLat = Math.round(lat / step) * step
  const gLng = Math.round(lng / step) * step
  // Match the precision the script writes (4 decimals avoids float drift)
  return `${gLat.toFixed(2)},${gLng.toFixed(2)}`
}

export interface HistoricalGridMatch {
  cell: HistoricalWeatherCell
  cellLat: number
  cellLng: number
  distanceMeters: number
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/**
 * "Usable" means the cell exists AND has at least one non-null year.
 * Cells with `total_years === 0` are skipped because they're either
 * an ocean square Open-Meteo didn't return data for, or a square the
 * pre-compute script couldn't fetch (e.g. mid-run rate-limit).
 */
function isUsable(cell: HistoricalWeatherCell | undefined): cell is HistoricalWeatherCell {
  return !!cell && cell.total_years > 0
}

export async function findNearestHistoricalWeather(
  lat: number,
  lng: number,
): Promise<HistoricalGridMatch | null> {
  const grid = await loadHistoricalWeatherGrid()
  if (!grid) return null

  const step = grid.step ?? 0.25
  const cellLat = Math.round(lat / step) * step
  const cellLng = Math.round(lng / step) * step

  // First try the exact bucket.
  const exactKey = gridKey(lat, lng, step)
  const exact = grid.cells[exactKey]
  if (isUsable(exact)) {
    return {
      cell: exact,
      cellLat,
      cellLng,
      distanceMeters: haversineMeters(lat, lng, cellLat, cellLng),
    }
  }

  // Spiral outward in growing rings until we find a usable cell.
  // ring=1 → 3×3, ring=2 → 5×5, etc. Capped at 4 (~125 km radius)
  // so a single unfilled patch doesn't bleed all the way across the
  // country.
  for (let ring = 1; ring <= 4; ring++) {
    let best: HistoricalGridMatch | null = null
    let bestDist = Infinity
    for (let dy = -ring; dy <= ring; dy++) {
      for (let dx = -ring; dx <= ring; dx++) {
        // Only the ring's outer edge — skip the interior we already searched.
        if (Math.max(Math.abs(dy), Math.abs(dx)) !== ring) continue
        const tryLat = cellLat + dy * step
        const tryLng = cellLng + dx * step
        const tryKey = `${tryLat.toFixed(2)},${tryLng.toFixed(2)}`
        const tryCell = grid.cells[tryKey]
        if (!isUsable(tryCell)) continue
        const d = haversineMeters(lat, lng, tryLat, tryLng)
        if (d < bestDist) {
          bestDist = d
          best = { cell: tryCell, cellLat: tryLat, cellLng: tryLng, distanceMeters: d }
        }
      }
    }
    if (best) return best
  }
  return null
}
