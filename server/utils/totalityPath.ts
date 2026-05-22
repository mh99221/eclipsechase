/**
 * Point-in-polygon test against public/eclipse-data/path.geojson.
 *
 * The path polygon is a global umbra footprint; only the slice covering
 * Iceland matters for us, but the ray-casting test works on any
 * lat/lng ring. Distance-to-centerline is delegated to nearestGridPoint
 * — every grid point in our Skyfield grid records its on-centerline
 * geometry, so picking the nearest and reporting its perpendicular
 * distance is good enough for the marketing-grade verdict.
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

interface GeoJsonPolygon {
  type: 'Polygon' | 'MultiPolygon'
  coordinates: number[][][] | number[][][][]
}

interface GeoJsonFeature {
  type: 'Feature'
  geometry: GeoJsonPolygon
  properties?: Record<string, unknown>
}

interface GeoJsonFeatureCollection {
  type: 'FeatureCollection'
  features: GeoJsonFeature[]
}

let cache: number[][][] | null = null  // array of rings: [outer, holes?...]
let loadPromise: Promise<number[][][]> | null = null

function loadFromFilesystem(): GeoJsonFeatureCollection | null {
  const candidates = [
    resolve(process.cwd(), 'public', 'eclipse-data', 'path.geojson'),
    resolve(process.cwd(), '.output', 'public', 'eclipse-data', 'path.geojson'),
  ]
  try {
    const currentDir = dirname(fileURLToPath(import.meta.url))
    candidates.push(resolve(currentDir, '..', '..', 'public', 'eclipse-data', 'path.geojson'))
    candidates.push(resolve(currentDir, '..', '..', '..', 'public', 'eclipse-data', 'path.geojson'))
  } catch { /* import.meta.url unavailable */ }

  for (const path of candidates) {
    try {
      return JSON.parse(readFileSync(path, 'utf-8')) as GeoJsonFeatureCollection
    } catch { /* try next */ }
  }
  return null
}

async function loadRings(): Promise<number[][][]> {
  let fc = loadFromFilesystem()
  if (!fc) {
    try {
      const data = await useStorage('assets:server:eclipse-data').getItem('path.geojson')
      if (data) fc = (typeof data === 'string' ? JSON.parse(data) : data) as GeoJsonFeatureCollection
    } catch { /* fall through to error */ }
  }
  if (!fc) throw new Error('[TotalityPath] path.geojson not found')

  // Pull the first Polygon (the totality path) — its coordinates are
  // an array of linear rings: [outer, hole1, hole2, ...].
  const feature = fc.features.find(f => f.geometry?.type === 'Polygon')
    || fc.features.find(f => f.geometry?.type === 'MultiPolygon')
  if (!feature) throw new Error('[TotalityPath] no polygon feature found')

  if (feature.geometry.type === 'Polygon') {
    return feature.geometry.coordinates as number[][][]
  }
  // MultiPolygon: flatten — for our use-case any inside-any-piece counts.
  const multi = feature.geometry.coordinates as number[][][][]
  return multi.flat()
}

export async function loadTotalityRings(): Promise<number[][][]> {
  if (cache) return cache
  if (loadPromise) return loadPromise
  loadPromise = loadRings().then((rings) => { cache = rings; loadPromise = null; return rings })
  return loadPromise
}

/**
 * Ray-casting point-in-polygon. `ring` is an array of [lng, lat] pairs
 * (GeoJSON order). Returns true if (lng, lat) is inside. Handles the
 * antimeridian-spanning umbra by short-circuiting: our caller has
 * already validated lat/lng are in Iceland's bbox.
 */
function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]![0]!, yi = ring[i]![1]!
    const xj = ring[j]![0]!, yj = ring[j]![1]!
    const intersect = ((yi > lat) !== (yj > lat))
      && (lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

export async function isInTotalityPath(lat: number, lng: number): Promise<boolean> {
  const rings = await loadTotalityRings()
  // Treat first ring as outer, remaining as holes.
  if (rings.length === 0) return false
  const outer = rings[0]!
  if (!pointInRing(lng, lat, outer)) return false
  for (let i = 1; i < rings.length; i++) {
    if (pointInRing(lng, lat, rings[i]!)) return false
  }
  return true
}
