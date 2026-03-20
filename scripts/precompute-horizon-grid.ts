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
const REFRACTION_COEFF = 0.13

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

console.log(`\nDone: ${points.length} land points, ${skippedOcean} ocean/null skipped`)

// Write output
const output = {
  generated_at: new Date().toISOString(),
  grid_step_deg: [LAT_STEP, LNG_STEP],
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
