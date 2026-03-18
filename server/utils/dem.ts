// server/utils/dem.ts
// Uses Nitro's serverAssets (configured in nuxt.config.ts) to access DEM files.

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

export async function loadDEM(): Promise<{ data: Float32Array; meta: DEMMeta } | { error: string }> {
  if (demData && demMeta) return { data: demData, meta: demMeta }

  // Don't cache transient errors — allow retry on next request
  try {
    const storage = useStorage('assets:dem')

    // Load metadata
    const metaRaw = await storage.getItem('west-iceland-30m.meta.json')
    if (!metaRaw) {
      return { error: 'DEM metadata not found' }
    }
    const meta = (typeof metaRaw === 'string' ? JSON.parse(metaRaw) : metaRaw) as DEMMeta

    // Reject placeholder metadata (width/height = 0 means DEM hasn't been generated yet)
    if (meta.width === 0 || meta.height === 0) {
      return { error: 'DEM not yet generated — run scripts/prepare-dem-binary.py first' }
    }

    // Load binary DEM
    const binBuffer = await storage.getItemRaw('west-iceland-30m.bin')
    if (!binBuffer) {
      return { error: 'DEM binary not found' }
    }

    // Convert to Float32Array
    const arrayBuffer = binBuffer instanceof ArrayBuffer
      ? binBuffer
      : (binBuffer as Buffer).buffer.slice(
          (binBuffer as Buffer).byteOffset,
          (binBuffer as Buffer).byteOffset + (binBuffer as Buffer).byteLength,
        )
    const data = new Float32Array(arrayBuffer)

    if (data.length !== meta.width * meta.height) {
      return { error: `DEM size mismatch: expected ${meta.width * meta.height}, got ${data.length}` }
    }

    // Cache successfully loaded data
    demData = data
    demMeta = meta
    return { data: demData, meta: demMeta }
  } catch (e) {
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
