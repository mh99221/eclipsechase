// server/utils/dem.ts
// Reads DEM binary directly from the filesystem for efficiency with large files.
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

export interface DEMMeta {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
  width: number
  height: number
  cellSizeLat: number
  cellSizeLng: number
  rowOrder: 'south-to-north' | 'north-to-south'
}

let demData: Float32Array | null = null
let demMeta: DEMMeta | null = null

/**
 * Resolve the DEM directory. In dev mode, read from the source tree.
 * In production, use Nitro's server assets.
 */
function getDemDir(): string {
  // In dev: files live at server/data/dem/ relative to the project root
  // process.cwd() in Nitro dev points to the project root
  const devPath = join(process.cwd(), 'server', 'data', 'dem')
  if (existsSync(devPath)) return devPath

  // Fallback: check relative to this file (for production builds)
  const altPath = join(__dirname, '..', '..', 'data', 'dem')
  if (existsSync(altPath)) return altPath

  return devPath // return dev path for error messaging
}

export async function loadDEM(): Promise<{ data: Float32Array; meta: DEMMeta } | { error: string }> {
  if (demData && demMeta) return { data: demData, meta: demMeta }

  try {
    const demDir = getDemDir()
    const metaPath = join(demDir, 'west-iceland-30m.meta.json')
    const binPath = join(demDir, 'west-iceland-30m.bin')

    // Load metadata
    if (!existsSync(metaPath)) {
      console.error(`[DEM] Metadata not found: ${metaPath}`)
      return { error: 'DEM metadata not found' }
    }
    const meta = JSON.parse(readFileSync(metaPath, 'utf-8')) as DEMMeta
    console.log(`[DEM] Metadata loaded: ${meta.width}x${meta.height} from ${metaPath}`)

    if (meta.width === 0 || meta.height === 0) {
      return { error: 'DEM not yet generated — run scripts/prepare-dem-binary.py first' }
    }

    // Load binary DEM — readFileSync is more memory-efficient for large files
    // than going through Nitro's storage abstraction
    if (!existsSync(binPath)) {
      console.error(`[DEM] Binary not found: ${binPath}`)
      return { error: 'DEM binary not found' }
    }
    console.log(`[DEM] Loading binary (this may take a moment for large files)...`)
    const buf = readFileSync(binPath)
    console.log(`[DEM] Binary loaded: ${(buf.byteLength / 1e6).toFixed(0)} MB`)

    // Create Float32Array directly from the buffer without copying
    const data = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4)

    if (data.length !== meta.width * meta.height) {
      return { error: `DEM size mismatch: expected ${meta.width * meta.height}, got ${data.length}` }
    }

    // Cache successfully loaded data
    demData = data
    demMeta = meta
    console.log(`[DEM] Ready: ${data.length.toLocaleString()} cells`)
    return { data: demData, meta: demMeta }
  } catch (e) {
    console.error('[DEM] Failed to load:', e)
    return { error: `Failed to load DEM: ${e}` }
  }
}

export function getElevation(lat: number, lng: number, data: Float32Array, meta: DEMMeta): number | null {
  if (lat < meta.minLat || lat > meta.maxLat || lng < meta.minLng || lng > meta.maxLng) {
    return null
  }

  // Compute fractional row/col
  const rowF = meta.rowOrder === 'south-to-north'
    ? (lat - meta.minLat) / meta.cellSizeLat
    : (meta.maxLat - lat) / meta.cellSizeLat
  const colF = (lng - meta.minLng) / meta.cellSizeLng

  // Bilinear interpolation
  const r0 = Math.floor(rowF)
  const c0 = Math.floor(colF)
  const r1 = Math.min(r0 + 1, meta.height - 1)
  const c1 = Math.min(c0 + 1, meta.width - 1)

  const fr = rowF - r0
  const fc = colF - c0

  const v00 = data[r0 * meta.width + c0] ?? 0
  const v01 = data[r0 * meta.width + c1] ?? 0
  const v10 = data[r1 * meta.width + c0] ?? 0
  const v11 = data[r1 * meta.width + c1] ?? 0

  // Treat nodata (NaN or very negative) as ocean = 0m
  const safe = (v: number) => (Number.isNaN(v) || v < -1000) ? 0 : v

  const elev = (1 - fr) * ((1 - fc) * safe(v00) + fc * safe(v01))
    + fr * ((1 - fc) * safe(v10) + fc * safe(v11))

  return elev
}

export function isInBounds(lat: number, lng: number, meta: DEMMeta): boolean {
  return lat >= meta.minLat && lat <= meta.maxLat && lng >= meta.minLng && lng <= meta.maxLng
}
