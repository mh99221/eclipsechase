#!/usr/bin/env node
/**
 * Recompute horizon checks for all viewing spots using the corrected algorithm
 * from eclipsechase-horizon-algorithm-spec.md.
 *
 * Mirror of server/utils/horizon.ts with per-slug observer elevation overrides.
 *
 *   REFRACTION_COEFF = 0.25 (4/3 effective Earth radius)
 *   observer_elevation = max(DEM[lat,lng], known_elevation_override) + eye_height + observer_height_above_ground
 *   angle = atan2(terrain - observer - curvature_drop, distance)
 *
 * Reads all spots from the live production API (no Supabase credentials needed).
 * Outputs SQL UPDATE statements to scripts/output/seed-horizon-checks.sql.
 *
 * Usage:
 *   node scripts/recompute-spot-horizons.mjs
 *   node scripts/recompute-spot-horizons.mjs --api=http://localhost:3000
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DEM_DIR = join(__dirname, '..', 'server', 'data', 'dem')
const OUTPUT_DIR = join(__dirname, 'output')
const OUTPUT_SQL = join(OUTPUT_DIR, 'seed-horizon-checks.sql')

const argApi = process.argv.find(a => a.startsWith('--api='))
const API_BASE = argApi ? argApi.split('=')[1] : 'https://eclipsechase.is'

// ── Eclipse parameters ──────────────────────────────────────────────
const SUN_ALTITUDE = 24
const SUN_AZIMUTH = 265

// ── Per-slug overrides ──────────────────────────────────────────────
// Known ground elevation (meters ASL). Used when DEM under-reports a peak
// or when the observer is at a specific known point (summit, etc.).
const KNOWN_ELEVATION = {
  'snaefellsjokull-summit': 1446,
}

// ── Algorithm constants (match server/utils/horizon.ts) ──────────────
const EYE_HEIGHT = 1.7
const EARTH_RADIUS = 6371000
const DEG_TO_RAD = Math.PI / 180
const REFRACTION_COEFF = 0.25 // 4/3 effective Earth radius

// ── DEM loading ─────────────────────────────────────────────────────
const meta = JSON.parse(readFileSync(join(DEM_DIR, 'west-iceland-30m.meta.json'), 'utf-8'))
console.log(`Loading DEM: ${meta.width}x${meta.height}`)
const buf = readFileSync(join(DEM_DIR, 'west-iceland-30m.bin'))
const demData = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4)
console.log(`DEM loaded: ${demData.length.toLocaleString()} cells\n`)

// ── Geometry ────────────────────────────────────────────────────────
function moveAlongBearing(lat, lng, bearing, distanceM) {
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

function sampleDistances() {
  const d = []
  for (let i = 50; i <= 1000; i += 50) d.push(i)
  for (let i = 1200; i <= 5000; i += 200) d.push(i)
  for (let i = 5500; i <= 20000; i += 500) d.push(i)
  for (let i = 21000; i <= 50000; i += 1000) d.push(i)
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
  const v00 = safe(demData[r0 * meta.width + c0] ?? 0)
  const v01 = safe(demData[r0 * meta.width + c1] ?? 0)
  const v10 = safe(demData[r1 * meta.width + c0] ?? 0)
  const v11 = safe(demData[r1 * meta.width + c1] ?? 0)
  return (1 - fr) * ((1 - fc) * v00 + fc * v01) + fr * ((1 - fc) * v10 + fc * v11)
}

function singleRayCheck(lat, lng, observerElev, bearing) {
  let maxAngle = -90, blockingDist = 0, blockingElev = 0
  for (const dist of DISTANCES) {
    const [sLat, sLng] = moveAlongBearing(lat, lng, bearing, dist)
    const elev = getElevation(sLat, sLng)
    if (elev === null) continue
    // Earth curvature drop minus refraction lift (4/3 effective radius via k=0.25)
    const curvatureDrop = (dist * dist) / (2 * EARTH_RADIUS) * (1 - REFRACTION_COEFF)
    const elevDiff = elev - observerElev - curvatureDrop
    const angle = Math.atan2(elevDiff, dist) / DEG_TO_RAD
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

function checkHorizon(lat, lng, slug, heightAboveGround) {
  // Observer elevation: max(DEM, known_elevation) + eye_height + observer_height_above_ground
  const demElev = getElevation(lat, lng)
  const demSafe = demElev != null && demElev >= 0 ? demElev : 2
  const knownElev = KNOWN_ELEVATION[slug] ?? 0
  const base = Math.max(demSafe, knownElev)
  const observerElev = base + EYE_HEIGHT + (heightAboveGround || 0)

  // 91-point sweep ±45° around sun azimuth
  const sweep = []
  let mainRay = null
  for (let offset = -45; offset <= 45; offset++) {
    const azi = SUN_AZIMUTH + offset
    const normalizedAzi = ((azi % 360) + 360) % 360
    const ray = singleRayCheck(lat, lng, observerElev, azi)
    sweep.push({
      azimuth: normalizedAzi,
      horizon_angle: Math.max(ray.horizonAngle, 0),
      distance_m: ray.blockingDistanceM,
    })
    if (offset === 0) mainRay = ray
  }

  const maxHorizonAngle = Math.max(mainRay.horizonAngle, 0)
  const clearance = SUN_ALTITUDE - maxHorizonAngle
  const verdict = getVerdict(clearance)

  return {
    verdict,
    clearance_degrees: Math.round(clearance * 10) / 10,
    max_horizon_angle: Math.round(maxHorizonAngle * 10) / 10,
    blocking_distance_m: verdict === 'clear' ? null : mainRay.blockingDistanceM,
    blocking_elevation_m: verdict === 'clear' ? null : mainRay.blockingElevationM,
    observer_elevation_m: Math.round(observerElev * 10) / 10,
    sun_altitude: SUN_ALTITUDE,
    sun_azimuth: SUN_AZIMUTH,
    checked_at: new Date().toISOString(),
    sweep,
  }
}

// ── Fetch spots from live API ───────────────────────────────────────
async function fetchSpots() {
  console.log(`Fetching spots from ${API_BASE}/api/spots ...`)
  const res = await fetch(`${API_BASE}/api/spots`)
  if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`)
  const json = await res.json()
  return json.spots || []
}

function sqlEscape(str) {
  return String(str).replace(/'/g, "''")
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  const spots = await fetchSpots()
  console.log(`Processing ${spots.length} spots\n`)

  mkdirSync(OUTPUT_DIR, { recursive: true })
  const lines = []
  lines.push('-- Generated by scripts/recompute-spot-horizons.mjs')
  lines.push(`-- Algorithm: REFRACTION_COEFF=0.25 (4/3 effective Earth radius)`)
  lines.push(`-- Sun: altitude=${SUN_ALTITUDE}°, azimuth=${SUN_AZIMUTH}°`)
  lines.push(`-- Generated at: ${new Date().toISOString()}`)
  lines.push('')
  lines.push('BEGIN;')
  lines.push('')

  for (const spot of spots) {
    const hc = checkHorizon(spot.lat, spot.lng, spot.slug, spot.observer_height_above_ground)
    const status = hc.verdict.padEnd(8)
    const clear = String(hc.clearance_degrees).padStart(5)
    const elev = String(hc.observer_elevation_m).padStart(6)
    console.log(`  ${status}  clearance=${clear}°  obs_elev=${elev}m  ${spot.slug}`)

    const json = sqlEscape(JSON.stringify(hc))
    lines.push(`UPDATE viewing_spots SET horizon_check = '${json}'::jsonb WHERE slug = '${spot.slug}';`)
  }

  lines.push('')
  lines.push('COMMIT;')

  writeFileSync(OUTPUT_SQL, lines.join('\n') + '\n', 'utf-8')
  console.log(`\n✓ Wrote ${spots.length} UPDATE statements to ${OUTPUT_SQL}`)
  console.log(`  Run in Supabase SQL Editor to apply.`)
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
