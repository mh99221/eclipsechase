#!/usr/bin/env node
/**
 * Compute horizon checks for all viewing spots using the binary DEM.
 * Outputs SQL UPDATE statements to seed into Supabase.
 *
 * Usage: node scripts/compute-horizon-node.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DEM_DIR = join(__dirname, '..', 'server', 'data', 'dem')

// ---- DEM loading ----
const meta = JSON.parse(readFileSync(join(DEM_DIR, 'west-iceland-30m.meta.json'), 'utf-8'))
console.log(`Loading DEM: ${meta.width}x${meta.height} (${(meta.width * meta.height * 4 / 1e6).toFixed(0)} MB)`)
const buf = readFileSync(join(DEM_DIR, 'west-iceland-30m.bin'))
const data = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4)
console.log(`DEM loaded: ${data.length.toLocaleString()} cells`)

// ---- Constants ----
const EYE_HEIGHT = 1.7
const EARTH_RADIUS = 6371000
const DEG_TO_RAD = Math.PI / 180

// ---- Geometry ----
function moveAlongBearing(lat, lng, bearing, distanceM) {
  const bearingRad = bearing * DEG_TO_RAD
  const latRad = lat * DEG_TO_RAD
  const delta = distanceM / EARTH_RADIUS
  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(delta) + Math.cos(latRad) * Math.sin(delta) * Math.cos(bearingRad)
  )
  const newLngRad = lng * DEG_TO_RAD + Math.atan2(
    Math.sin(bearingRad) * Math.sin(delta) * Math.cos(latRad),
    Math.cos(delta) - Math.sin(latRad) * Math.sin(newLatRad)
  )
  return [newLatRad / DEG_TO_RAD, newLngRad / DEG_TO_RAD]
}

function sampleDistances() {
  const d = []
  for (let i = 50; i <= 1000; i += 50) d.push(i)
  for (let i = 1200; i <= 5000; i += 200) d.push(i)
  for (let i = 5500; i <= 20000; i += 500) d.push(i)
  return d
}
const DISTANCES = sampleDistances()

function getElevation(lat, lng) {
  if (lat < meta.minLat || lat > meta.maxLat || lng < meta.minLng || lng > meta.maxLng) return null
  const rowF = meta.rowOrder === 'south-to-north'
    ? (lat - meta.minLat) / meta.cellSizeLat
    : (meta.maxLat - lat) / meta.cellSizeLat
  const colF = (lng - meta.minLng) / meta.cellSizeLng
  const r0 = Math.floor(rowF), c0 = Math.floor(colF)
  const r1 = Math.min(r0 + 1, meta.height - 1), c1 = Math.min(c0 + 1, meta.width - 1)
  const fr = rowF - r0, fc = colF - c0
  const safe = v => (Number.isNaN(v) || v < -1000) ? 0 : v
  const v00 = safe(data[r0 * meta.width + c0] ?? 0)
  const v01 = safe(data[r0 * meta.width + c1] ?? 0)
  const v10 = safe(data[r1 * meta.width + c0] ?? 0)
  const v11 = safe(data[r1 * meta.width + c1] ?? 0)
  return (1 - fr) * ((1 - fc) * v00 + fc * v01) + fr * ((1 - fc) * v10 + fc * v11)
}

function singleRayCheck(lat, lng, observerElev, bearing) {
  let maxAngle = -90, blockingDist = 0, blockingElev = 0
  for (const dist of DISTANCES) {
    const [sLat, sLng] = moveAlongBearing(lat, lng, bearing, dist)
    const elev = getElevation(sLat, sLng)
    if (elev === null) continue
    const angle = Math.atan2(elev - observerElev, dist) / DEG_TO_RAD
    if (angle > maxAngle) { maxAngle = angle; blockingDist = dist; blockingElev = elev }
  }
  return { horizonAngle: maxAngle, blockingDistanceM: blockingDist, blockingElevationM: blockingElev }
}

function getVerdict(clearance) {
  if (clearance > 5) return 'clear'
  if (clearance >= 2) return 'marginal'
  if (clearance >= 0) return 'risky'
  return 'blocked'
}

function checkHorizon(lat, lng, sunAlt, sunAzi) {
  const demElev = getElevation(lat, lng)
  const observerElev = (demElev != null && demElev >= 0 ? demElev : 2) + EYE_HEIGHT
  const mainRay = singleRayCheck(lat, lng, observerElev, sunAzi)
  const clearance = sunAlt - mainRay.horizonAngle
  const verdict = getVerdict(clearance)
  const sweep = []
  for (let offset = -30; offset <= 30; offset++) {
    const azi = sunAzi + offset
    const normalizedAzi = ((azi % 360) + 360) % 360
    const ray = singleRayCheck(lat, lng, observerElev, azi)
    sweep.push({
      azimuth: normalizedAzi,
      horizon_angle: Math.max(Math.round(ray.horizonAngle * 10) / 10, 0),
      distance_m: ray.blockingDistanceM,
    })
  }
  return {
    verdict,
    clearance_degrees: Math.round(clearance * 10) / 10,
    max_horizon_angle: Math.round(mainRay.horizonAngle * 10) / 10,
    blocking_distance_m: verdict === 'clear' ? null : mainRay.blockingDistanceM,
    blocking_elevation_m: verdict === 'clear' ? null : Math.round(mainRay.blockingElevationM * 10) / 10,
    observer_elevation_m: Math.round(observerElev * 10) / 10,
    sun_altitude: sunAlt,
    sun_azimuth: sunAzi,
    checked_at: new Date().toISOString(),
    sweep,
  }
}

// ---- Spots ----
const spots = [
  { id: "akranes", name: "Akranes Lighthouse", lat: 64.3218, lng: -22.0749, sun_altitude: 24, sun_azimuth: 249 },
  { id: "arnarstapi", name: "Arnarstapi Coastal Platform", lat: 64.7663, lng: -23.634, sun_altitude: 24, sun_azimuth: 249 },
  { id: "bildudalur", name: "Bíldudalur Harbour", lat: 65.6859, lng: -23.5989, sun_altitude: 24, sun_azimuth: 249 },
  { id: "borgarnes", name: "Borgarnes Foreshore", lat: 64.5383, lng: -22, sun_altitude: 24, sun_azimuth: 249 },
  { id: "breidavik", name: "Breiðavík Beach", lat: 65.5493, lng: -24.3696, sun_altitude: 24, sun_azimuth: 249 },
  { id: "budir", name: "Búðir Black Church", lat: 64.8217, lng: -23.384, sun_altitude: 24, sun_azimuth: 249 },
  { id: "djupalonssandur", name: "Djúpalónssandur Beach", lat: 64.7535, lng: -23.8952, sun_altitude: 24, sun_azimuth: 249 },
  { id: "dynjandi", name: "Dynjandi Viewpoint", lat: 65.7328, lng: -23.1793, sun_altitude: 24, sun_azimuth: 249 },
  { id: "flateyri", name: "Flateyri Shore", lat: 66.05, lng: -23.5167, sun_altitude: 24, sun_azimuth: 249 },
  { id: "gardur", name: "Garður Lighthouse", lat: 64.083, lng: -22.6938, sun_altitude: 24, sun_azimuth: 249 },
  { id: "glymur", name: "Glymur Waterfall", lat: 64.3917, lng: -21.2506, sun_altitude: 24, sun_azimuth: 249 },
  { id: "grotta", name: "Grótta Lighthouse", lat: 64.1614, lng: -22.0264, sun_altitude: 24, sun_azimuth: 249 },
  { id: "hellissandur", name: "Hellissandur Village", lat: 64.9176, lng: -23.8856, sun_altitude: 24, sun_azimuth: 249 },
  { id: "isafjordur", name: "Ísafjörður Harbour Flat", lat: 66.0752, lng: -23.1352, sun_altitude: 24, sun_azimuth: 249 },
  { id: "keflavik", name: "Keflavík Airport Area", lat: 63.9872, lng: -22.5564, sun_altitude: 24, sun_azimuth: 249 },
  { id: "kirkjufell", name: "Kirkjufell Viewpoint", lat: 64.9403, lng: -23.3073, sun_altitude: 24, sun_azimuth: 249 },
  { id: "latrabjarg", name: "Látrabjarg Cliffs", lat: 65.5009, lng: -24.53, sun_altitude: 24, sun_azimuth: 249 },
  { id: "olafsvik", name: "Ólafsvík Harbour", lat: 64.8943, lng: -23.7092, sun_altitude: 24, sun_azimuth: 249 },
  { id: "patreksfjordur", name: "Patreksfjörður Beach", lat: 65.5955, lng: -23.9752, sun_altitude: 24, sun_azimuth: 249 },
  { id: "reykholt", name: "Reykholt Snorrastofa", lat: 64.6657, lng: -21.2871, sun_altitude: 24, sun_azimuth: 249 },
  { id: "reykjanesta", name: "Reykjanestá Lighthouse", lat: 63.8177, lng: -22.7032, sun_altitude: 24, sun_azimuth: 249 },
  { id: "rif", name: "Rif Harbour", lat: 64.9155, lng: -23.8208, sun_altitude: 24, sun_azimuth: 249 },
  { id: "sandgerdi", name: "Sandgerði Shore", lat: 64.0388, lng: -22.7068, sun_altitude: 24, sun_azimuth: 249 },
  { id: "saxholl", name: "Saxhóll Crater", lat: 64.8509, lng: -23.9246, sun_altitude: 24, sun_azimuth: 249 },
  { id: "snaefellsjokull", name: "Snæfellsjökull Summit", lat: 64.8057, lng: -23.7731, sun_altitude: 24, sun_azimuth: 249 },
  { id: "stykkisholmur", name: "Stykkishólmur Harbour Hill", lat: 65.0776, lng: -22.7242, sun_altitude: 24, sun_azimuth: 249 },
  { id: "sudureyri", name: "Suðureyri Harbour", lat: 66.1311, lng: -23.5272, sun_altitude: 24, sun_azimuth: 249 },
  { id: "thingeyri", name: "Þingeyri Village Shore", lat: 65.8726, lng: -23.502, sun_altitude: 24, sun_azimuth: 249 },
]

// ---- Run ----
mkdirSync(join(__dirname, 'output'), { recursive: true })

const results = {}
const sqlLines = ['-- Auto-generated horizon check data for viewing_spots\n']

for (const spot of spots) {
  console.log(`Computing: ${spot.name} (${spot.lat}, ${spot.lng})...`)
  const result = checkHorizon(spot.lat, spot.lng, spot.sun_altitude, spot.sun_azimuth)
  results[spot.id] = result
  console.log(`  → ${result.verdict} (clearance: ${result.clearance_degrees}°, horizon: ${result.max_horizon_angle}°)`)

  const jsonStr = JSON.stringify(result).replace(/'/g, "''")
  sqlLines.push(`UPDATE viewing_spots SET horizon_check = '${jsonStr}'::jsonb WHERE id = '${spot.id}';`)
}

// Write JSON
writeFileSync(join(__dirname, 'output', 'horizon-checks.json'), JSON.stringify(results, null, 2))
console.log(`\nWrote scripts/output/horizon-checks.json`)

// Write SQL
writeFileSync(join(__dirname, 'output', 'seed-horizon-checks.sql'), sqlLines.join('\n'))
console.log(`Wrote scripts/output/seed-horizon-checks.sql`)

// Summary
const verdicts = { clear: 0, marginal: 0, risky: 0, blocked: 0 }
for (const r of Object.values(results)) verdicts[r.verdict]++
console.log(`\nSummary: ${verdicts.clear} clear, ${verdicts.marginal} marginal, ${verdicts.risky} risky, ${verdicts.blocked} blocked`)
