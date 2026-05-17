/**
 * Pre-compute horizon checks for a dense grid across the totality path.
 * Outputs public/eclipse-data/horizon-grid.json for use in production
 * where the 856MB DEM binary isn't available.
 *
 * Run: npx tsx scripts/precompute-horizon-grid.ts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// ── DEM loading (from server/utils/dem.ts) ──────────────────────────
interface DEMMeta {
  minLat: number; maxLat: number; minLng: number; maxLng: number
  width: number; height: number; cellSizeLat: number; cellSizeLng: number
  rowOrder: 'south-to-north' | 'north-to-south'
}

function loadDEM(demDir: string): { data: Float32Array; meta: DEMMeta } {
  const meta: DEMMeta = JSON.parse(readFileSync(join(demDir, 'west-iceland-30m.meta.json'), 'utf-8'))
  const buf = readFileSync(join(demDir, 'west-iceland-30m.bin'))
  const data = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4)
  if (data.length !== meta.width * meta.height) {
    throw new Error(`DEM size mismatch: expected ${meta.width * meta.height}, got ${data.length}`)
  }
  console.log(`[DEM] Loaded: ${meta.width}x${meta.height}, ${(buf.byteLength / 1e6).toFixed(0)} MB`)
  return { data, meta }
}

function getElevation(lat: number, lng: number, data: Float32Array, meta: DEMMeta): number | null {
  if (lat < meta.minLat || lat > meta.maxLat || lng < meta.minLng || lng > meta.maxLng) return null
  const rowF = meta.rowOrder === 'south-to-north'
    ? (lat - meta.minLat) / meta.cellSizeLat
    : (meta.maxLat - lat) / meta.cellSizeLat
  const colF = (lng - meta.minLng) / meta.cellSizeLng
  const r0 = Math.floor(rowF), c0 = Math.floor(colF)
  const r1 = Math.min(r0 + 1, meta.height - 1), c1 = Math.min(c0 + 1, meta.width - 1)
  const fr = rowF - r0, fc = colF - c0
  const safe = (v: number) => (Number.isNaN(v) || v < -1000) ? 0 : v
  const v00 = safe(data[r0 * meta.width + c0]!)
  const v01 = safe(data[r0 * meta.width + c1]!)
  const v10 = safe(data[r1 * meta.width + c0]!)
  const v11 = safe(data[r1 * meta.width + c1]!)
  return (1 - fr) * ((1 - fc) * v00 + fc * v01) + fr * ((1 - fc) * v10 + fc * v11)
}

// ── Horizon computation (from server/utils/horizon.ts) ──────────────
const EYE_HEIGHT = 1.7
const EARTH_RADIUS = 6371000
const DEG_TO_RAD = Math.PI / 180
const REFRACTION_COEFF = 0.25 // 4/3 effective Earth radius

function moveAlongBearing(lat: number, lng: number, bearing: number, distanceM: number): [number, number] {
  const bearingRad = bearing * DEG_TO_RAD
  const latRad = lat * DEG_TO_RAD
  const delta = distanceM / EARTH_RADIUS
  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(delta) + Math.cos(latRad) * Math.sin(delta) * Math.cos(bearingRad),
  )
  const newLngRad = lng * DEG_TO_RAD + Math.atan2(
    Math.sin(bearingRad) * Math.sin(delta) * Math.cos(latRad),
    Math.cos(delta) - Math.sin(latRad) * Math.sin(newLatRad),
  )
  return [newLatRad / DEG_TO_RAD, newLngRad / DEG_TO_RAD]
}

const DISTANCES: number[] = []
for (let d = 50; d <= 1000; d += 50) DISTANCES.push(d)
for (let d = 1200; d <= 5000; d += 200) DISTANCES.push(d)
for (let d = 5500; d <= 20000; d += 500) DISTANCES.push(d)
for (let d = 21000; d <= 50000; d += 1000) DISTANCES.push(d)

type HorizonVerdict = 'clear' | 'marginal' | 'risky' | 'blocked'

function singleRayCheck(
  observerLat: number, observerLng: number, observerElev: number,
  bearing: number, data: Float32Array, meta: DEMMeta,
) {
  let maxAngle = -90, blockingDist = 0, blockingElev = 0
  for (const dist of DISTANCES) {
    const [sLat, sLng] = moveAlongBearing(observerLat, observerLng, bearing, dist)
    const terrainElev = getElevation(sLat, sLng, data, meta)
    if (terrainElev === null) continue
    const curvatureDrop = (dist * dist) / (2 * EARTH_RADIUS) * (1 - REFRACTION_COEFF)
    const elevDiff = terrainElev - observerElev - curvatureDrop
    const angle = Math.atan2(elevDiff, dist) / DEG_TO_RAD
    if (angle > maxAngle) { maxAngle = angle; blockingDist = dist; blockingElev = terrainElev }
  }
  return { horizonAngle: maxAngle, blockingDistanceM: blockingDist, blockingElevationM: blockingElev }
}

function getVerdict(clearance: number): HorizonVerdict {
  if (clearance > 5) return 'clear'
  if (clearance >= 2) return 'marginal'
  if (clearance >= 0) return 'risky'
  return 'blocked'
}

function checkHorizon(
  lat: number, lng: number, sunAltitude: number, sunAzimuth: number,
  data: Float32Array, meta: DEMMeta,
) {
  const demElev = getElevation(lat, lng, data, meta)
  const observerElev = (demElev != null && demElev >= 0 ? demElev : 2) + EYE_HEIGHT

  const sweep: Array<[number, number, number]> = [] // [azimuth, horizon_angle, distance_m]
  let mainRay: ReturnType<typeof singleRayCheck> | null = null
  for (let offset = -45; offset <= 45; offset++) {
    const azi = sunAzimuth + offset
    const normalizedAzi = ((azi % 360) + 360) % 360
    const ray = singleRayCheck(lat, lng, observerElev, azi, data, meta)
    sweep.push([
      Math.round(normalizedAzi * 10) / 10,
      Math.round(Math.max(ray.horizonAngle, 0) * 10) / 10,
      Math.round(ray.blockingDistanceM),
    ])
    if (offset === 0) mainRay = ray
  }

  const clearance = sunAltitude - mainRay!.horizonAngle
  const verdict = getVerdict(clearance)

  return {
    v: verdict,
    c: Math.round(clearance * 10) / 10,
    mh: Math.round(mainRay!.horizonAngle * 10) / 10,
    oe: Math.round(observerElev * 10) / 10,
    sa: sunAltitude,
    sz: sunAzimuth,
    bd: verdict === 'clear' ? null : mainRay!.blockingDistanceM,
    be: verdict === 'clear' ? null : Math.round(mainRay!.blockingElevationM * 10) / 10,
    s: sweep,
  }
}

// ── Main ────────────────────────────────────────────────────────────
const root = join(import.meta.dirname!, '..')
const demDir = join(root, 'server', 'data', 'dem')
const gridPath = join(root, 'public', 'eclipse-data', 'grid.json')
const outPath = join(root, 'public', 'eclipse-data', 'horizon-grid.json')

console.log('Loading DEM...')
const { data, meta } = loadDEM(demDir)

console.log('Loading eclipse grid...')
const eclipseGrid = JSON.parse(readFileSync(gridPath, 'utf-8')).points
  .filter((p: any) => p.sun_altitude != null && p.sun_azimuth != null)
  .map((p: any) => ({
    lat: p.lat as number, lng: p.lng as number,
    sun_altitude: p.sun_altitude as number, sun_azimuth: p.sun_azimuth as number,
    duration_seconds: p.duration_seconds as number | null,
  }))

function findNearestSun(lat: number, lng: number) {
  let best = eclipseGrid[0]!, minD = Infinity
  for (const gp of eclipseGrid) {
    const d = (lat - gp.lat) ** 2 + (lng - gp.lng) ** 2
    if (d < minD) { minD = d; best = gp }
  }
  return best
}

// Grid parameters: ~2km spacing
// At 65°N: 1° lat ≈ 111km, 1° lng ≈ 47km
const LAT_STEP = 0.018  // ~2km
const LNG_STEP = 0.043  // ~2km at 65°N

// Adaptive densification near roads. Most user clicks on /map happen at
// or near a road (pullouts, parking, viewpoints), so we want the
// snap-distance there to be much smaller than the coarse 2 km step. We
// lay a ~150 m secondary grid inside a small buffer along every road
// in roads.geojson. Tune DENSE_*_STEP up to trade precompute time for
// snap accuracy; DENSE_ROAD_SAMPLE_M trades road coverage for the same.
const DENSE_LAT_STEP = 0.00135  // ~150m
const DENSE_LNG_STEP = 0.00319  // ~150m at 65°N
const DENSE_ROAD_SAMPLE_M = 100  // resample each road segment this often

// Bounds: intersection of DEM coverage and totality path
const gridMinLat = Math.max(meta.minLat, 63.5)
const gridMaxLat = Math.min(meta.maxLat, 66.5)
const gridMinLng = Math.max(meta.minLng, -24.5)
const gridMaxLng = Math.min(meta.maxLng, -21.5)

console.log(`Grid bounds: ${gridMinLat}–${gridMaxLat}N, ${gridMinLng}–${gridMaxLng}E`)
console.log(`Grid step: ${LAT_STEP}° lat, ${LNG_STEP}° lng`)

const latSteps = Math.ceil((gridMaxLat - gridMinLat) / LAT_STEP)
const lngSteps = Math.ceil((gridMaxLng - gridMinLng) / LNG_STEP)
const totalCandidates = latSteps * lngSteps
console.log(`Candidate points: ${totalCandidates} (${latSteps} × ${lngSteps})`)

type GridPoint = ReturnType<typeof checkHorizon> & { lat: number; lng: number; td: number | null }
const points: GridPoint[] = []
let processed = 0
let skippedOcean = 0

for (let latIdx = 0; latIdx <= latSteps; latIdx++) {
  const lat = Math.round((gridMinLat + latIdx * LAT_STEP) * 1e6) / 1e6

  for (let lngIdx = 0; lngIdx <= lngSteps; lngIdx++) {
    const lng = Math.round((gridMinLng + lngIdx * LNG_STEP) * 1e6) / 1e6
    processed++

    // Skip points outside DEM or in ocean
    const elev = getElevation(lat, lng, data, meta)
    if (elev === null || elev <= 0) { skippedOcean++; continue }

    // Find sun position for this location
    const sun = findNearestSun(lat, lng)
    const result = checkHorizon(lat, lng, sun.sun_altitude, sun.sun_azimuth, data, meta)
    points.push({ lat, lng, td: sun.duration_seconds, ...result })
  }

  if (latIdx % 10 === 0) {
    console.log(`  ${latIdx}/${latSteps} rows, ${points.length} land points so far...`)
  }
}

console.log(`\nCoarse pass done: ${points.length} land points, ${skippedOcean} ocean/null skipped`)

// ── Adaptive densification near roads ──────────────────────────────
// Walk every LineString in roads.geojson, resample at DENSE_ROAD_SAMPLE_M
// intervals, snap each sample to the dense grid, and run a horizon check
// on every unique dense cell that hasn't already been covered by the
// coarse pass. The dense and coarse grids are not aligned, so any
// dense-cell horizon check sits ~700 m or less from a tap on a road —
// well inside the snap radius — while the coarse 2 km pass continues to
// cover the back-country.
const roadsPath = join(root, 'public', 'eclipse-data', 'roads.geojson')
console.log(`\nLoading roads from ${roadsPath}...`)
const roadsRaw = JSON.parse(readFileSync(roadsPath, 'utf-8')) as {
  features: Array<{
    geometry:
      | { type: 'LineString'; coordinates: [number, number][] }
      | { type: 'MultiLineString'; coordinates: [number, number][][] }
  }>
}

function* iterateLines(): Generator<[number, number][]> {
  for (const f of roadsRaw.features) {
    if (f.geometry.type === 'LineString') yield f.geometry.coordinates
    else if (f.geometry.type === 'MultiLineString') for (const line of f.geometry.coordinates) yield line
  }
}

// Haversine in metres — only used for road segment lengths; the
// coordinate steps along a segment use moveAlongBearing for accuracy.
function haversineM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const φ1 = aLat * DEG_TO_RAD
  const φ2 = bLat * DEG_TO_RAD
  const dφ = (bLat - aLat) * DEG_TO_RAD
  const dλ = (bLng - aLng) * DEG_TO_RAD
  const x = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2
  return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(x))
}

function bearing(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const φ1 = aLat * DEG_TO_RAD, φ2 = bLat * DEG_TO_RAD
  const dλ = (bLng - aLng) * DEG_TO_RAD
  const y = Math.sin(dλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dλ)
  return (Math.atan2(y, x) / DEG_TO_RAD + 360) % 360
}

// Snap a sample point onto the dense grid. Origin is the same as the
// coarse grid's lower-left corner so dense cells line up consistently
// across re-runs.
function denseCell(lat: number, lng: number): { lat: number; lng: number; key: string } {
  const latIdx = Math.round((lat - gridMinLat) / DENSE_LAT_STEP)
  const lngIdx = Math.round((lng - gridMinLng) / DENSE_LNG_STEP)
  const cellLat = Math.round((gridMinLat + latIdx * DENSE_LAT_STEP) * 1e6) / 1e6
  const cellLng = Math.round((gridMinLng + lngIdx * DENSE_LNG_STEP) * 1e6) / 1e6
  return { lat: cellLat, lng: cellLng, key: `${latIdx}:${lngIdx}` }
}

// Already-covered cell keys (coarse). The coarse grid does not align
// with the dense grid, so this is approximate — but exact-position
// dedup further down catches the rare collision.
const coarseDenseKeys = new Set<string>()
for (const p of points) coarseDenseKeys.add(denseCell(p.lat, p.lng).key)

const denseCellsToCompute = new Map<string, { lat: number; lng: number }>()
let roadSampleCount = 0
let roadLineCount = 0

for (const line of iterateLines()) {
  roadLineCount++
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i]!, b = line[i + 1]!
    const [aLng, aLat] = a
    const [bLng, bLat] = b
    if (aLat == null || aLng == null || bLat == null || bLng == null) continue
    const segLenM = haversineM(aLat, aLng, bLat, bLng)
    if (segLenM === 0) continue
    const brg = bearing(aLat, aLng, bLat, bLng)
    // Sample at fixed metre spacing along the segment, plus the endpoint.
    const stepCount = Math.max(1, Math.floor(segLenM / DENSE_ROAD_SAMPLE_M))
    for (let s = 0; s <= stepCount; s++) {
      const distM = (s / stepCount) * segLenM
      const [sLat, sLng] = moveAlongBearing(aLat, aLng, brg, distM)
      // Skip samples outside the coverage box (some roads dip out and back).
      if (sLat < gridMinLat || sLat > gridMaxLat || sLng < gridMinLng || sLng > gridMaxLng) continue
      roadSampleCount++
      const cell = denseCell(sLat, sLng)
      if (coarseDenseKeys.has(cell.key)) continue
      if (denseCellsToCompute.has(cell.key)) continue
      denseCellsToCompute.set(cell.key, { lat: cell.lat, lng: cell.lng })
    }
  }
}

console.log(`Sampled ${roadSampleCount} points along ${roadLineCount} road lines`)
console.log(`Dense cells to compute (after dedup vs coarse): ${denseCellsToCompute.size}`)

let denseLandPoints = 0
let denseSkipped = 0
let denseDone = 0
for (const { lat, lng } of denseCellsToCompute.values()) {
  denseDone++
  const elev = getElevation(lat, lng, data, meta)
  if (elev === null || elev <= 0) { denseSkipped++; continue }
  const sun = findNearestSun(lat, lng)
  const result = checkHorizon(lat, lng, sun.sun_altitude, sun.sun_azimuth, data, meta)
  points.push({ lat, lng, td: sun.duration_seconds, ...result })
  denseLandPoints++
  if (denseDone % 500 === 0) {
    console.log(`  Dense ${denseDone}/${denseCellsToCompute.size}, ${denseLandPoints} land, ${denseSkipped} ocean/null`)
  }
}

console.log(`Dense pass done: +${denseLandPoints} land points (${denseSkipped} ocean/null skipped)`)
console.log(`\nTotal: ${points.length} points`)

// Write output
const output = {
  generated_at: new Date().toISOString(),
  grid_step_deg: [LAT_STEP, LNG_STEP],
  dense_step_deg: [DENSE_LAT_STEP, DENSE_LNG_STEP],
  dense_road_sample_m: DENSE_ROAD_SAMPLE_M,
  point_count: points.length,
  // Key mapping for compact format
  keys: {
    v: 'verdict', c: 'clearance_degrees', mh: 'max_horizon_angle',
    oe: 'observer_elevation_m', sa: 'sun_altitude', sz: 'sun_azimuth',
    bd: 'blocking_distance_m', be: 'blocking_elevation_m',
    td: 'totality_duration_seconds',
    s: 'sweep [azimuth, horizon_angle, distance_m]',
  },
  points,
}

const json = JSON.stringify(output)
writeFileSync(outPath, json)
const sizeMB = (Buffer.byteLength(json) / 1e6).toFixed(1)
console.log(`Written to ${outPath} (${sizeMB} MB)`)
