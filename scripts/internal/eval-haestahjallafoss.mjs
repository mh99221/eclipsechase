#!/usr/bin/env node
/**
 * Ad-hoc evaluation script for the Hæstahjallafoss candidate spot.
 *
 * Mirrors the horizon algorithm from scripts/recompute-spot-horizons.mjs
 * and the cloud-history pull from scripts/fetch-historical-weather.mjs,
 * but runs them at several candidate coords along the Dynjandi trail
 * (parking → top of Fjallfoss). Open-Meteo's grid is ~9 km so the cloud
 * history is identical for every point in the cluster — fetched once.
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DEM_DIR = join(__dirname, '..', '..', 'server', 'data', 'dem')

const SUN_ALTITUDE = 24
const SUN_AZIMUTH = 250
const EYE_HEIGHT = 1.7
const EARTH_RADIUS = 6371000
const DEG_TO_RAD = Math.PI / 180
const REFRACTION_COEFF = 0.25

const meta = JSON.parse(readFileSync(join(DEM_DIR, 'west-iceland-30m.meta.json'), 'utf-8'))
const buf = readFileSync(join(DEM_DIR, 'west-iceland-30m.bin'))
const demData = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4)

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

function checkHorizon(lat, lng) {
  const demElev = getElevation(lat, lng)
  const demSafe = demElev != null && demElev >= 0 ? demElev : 2
  const observerElev = demSafe + EYE_HEIGHT

  const sweep = []
  let mainRay = null
  let worstSweepAngle = -90
  let worstSweepAz = null
  for (let offset = -45; offset <= 45; offset++) {
    const azi = SUN_AZIMUTH + offset
    const ray = singleRayCheck(lat, lng, observerElev, azi)
    sweep.push({ azimuth: ((azi % 360) + 360) % 360, horizon_angle: Math.max(ray.horizonAngle, 0), distance_m: ray.blockingDistanceM })
    if (ray.horizonAngle > worstSweepAngle) { worstSweepAngle = ray.horizonAngle; worstSweepAz = ((azi % 360) + 360) % 360 }
    if (offset === 0) mainRay = ray
  }

  const maxHorizonAngle = Math.max(mainRay.horizonAngle, 0)
  const clearance = SUN_ALTITUDE - maxHorizonAngle
  const verdict = getVerdict(clearance)
  const worstClearance = SUN_ALTITUDE - Math.max(worstSweepAngle, 0)

  return {
    verdict,
    clearance_at_az250: Math.round(clearance * 10) / 10,
    horizon_angle_at_az250: Math.round(maxHorizonAngle * 10) / 10,
    worst_sweep_angle: Math.round(Math.max(worstSweepAngle, 0) * 10) / 10,
    worst_sweep_az: worstSweepAz,
    worst_sweep_clearance: Math.round(worstClearance * 10) / 10,
    observer_elev_m: Math.round(observerElev * 10) / 10,
    dem_elev_m: Math.round(demSafe * 10) / 10,
    blocking_distance_m: mainRay.blockingDistanceM,
    blocking_elev_m: Math.round(mainRay.blockingElevationM),
  }
}

// ── Candidate points along the Dynjandi trail ─────────────────────
// Parking is at ~65.7328, -23.1793 (~5m DEM). The cliff face climbs to
// the SE; the named cascades pin like beads on the trail. These coords
// are best-guess approximations from public maps; exact field placement
// should be confirmed before seeding.
const candidates = [
  { name: 'parking (existing dynjandi spot)', lat: 65.7328, lng: -23.1793 },
  { name: 'Sjóarfoss (lower)',              lat: 65.7325, lng: -23.1780 },
  { name: 'Göngumannsfoss (middle)',        lat: 65.7320, lng: -23.1760 },
  { name: 'Strokkur (upper-middle)',        lat: 65.7317, lng: -23.1740 },
  { name: 'Hæstahjallafoss (upper)',        lat: 65.7314, lng: -23.1725 },
  { name: 'Fjallfoss top (Dynjandi crest)', lat: 65.7310, lng: -23.1710 },
  { name: 'plateau above (50m east of crest)', lat: 65.7310, lng: -23.1700 },
]

console.log('\n=== Horizon checks (sun alt 24°, az 250°) ===\n')
console.log('coord                                    DEM   obs   az250-clear  worst (az)         verdict')
console.log('---------------------------------------- ----- ----- ------------ ------------------ --------')
for (const c of candidates) {
  const hc = checkHorizon(c.lat, c.lng)
  const coord = `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`
  console.log(
    `${coord}  ${c.name.padEnd(38).slice(0, 38)}`
    + `  ${String(hc.dem_elev_m).padStart(4)}m`
    + `  ${String(hc.observer_elev_m).padStart(4)}m`
    + `  ${String(hc.clearance_at_az250).padStart(5)}°@${String(hc.horizon_angle_at_az250).padStart(4)}°`
    + `  worst ${String(hc.worst_sweep_angle).padStart(4)}° @az${String(hc.worst_sweep_az).padStart(3)}`
    + `  ${hc.verdict}`
  )
}

// ── 10-year cloud history (Open-Meteo, ~9km grid — one fetch suffices) ─
const OPEN_METEO = 'https://archive-api.open-meteo.com/v1/archive'
const YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]

function interp(c17, c18) {
  if (c17 == null && c18 == null) return null
  if (c17 == null) return c18
  if (c18 == null) return c17
  return Math.round(c17 * 0.25 + c18 * 0.75)
}
function band(cc) {
  if (cc == null) return 'unknown'
  if (cc < 40) return 'clear'
  if (cc <= 70) return 'partly'
  return 'overcast'
}

async function fetchCloudHistory(lat, lng) {
  const out = []
  for (const year of YEARS) {
    const url = `${OPEN_METEO}?latitude=${lat}&longitude=${lng}`
      + `&start_date=${year}-08-12&end_date=${year}-08-12`
      + `&hourly=cloud_cover&timezone=UTC`
    try {
      const res = await fetch(url)
      if (!res.ok) { out.push({ year, cloud_cover: null }); continue }
      const data = await res.json()
      const times = data.hourly?.time || []
      const clouds = data.hourly?.cloud_cover || []
      const i17 = times.findIndex(t => t.endsWith('T17:00'))
      const i18 = times.findIndex(t => t.endsWith('T18:00'))
      out.push({ year, cloud_cover: interp(i17 >= 0 ? clouds[i17] : null, i18 >= 0 ? clouds[i18] : null) })
    }
    catch (e) {
      out.push({ year, cloud_cover: null })
    }
    await new Promise(r => setTimeout(r, 80))
  }
  return out
}

console.log('\n=== 10-year Aug 12 cloud history at 17:45 UTC (ERA5 via Open-Meteo) ===')
console.log('Querying once at the upper-trail candidate — Open-Meteo grid is ~9km so the')
console.log('whole Dynjandi cluster shares one cell.\n')
const upper = candidates.find(c => c.name.startsWith('Hæstahjallafoss'))
const years = await fetchCloudHistory(upper.lat, upper.lng)
let clear = 0, partly = 0, overcast = 0
for (const y of years) {
  const b = band(y.cloud_cover)
  if (b === 'clear') clear++
  else if (b === 'partly') partly++
  else if (b === 'overcast') overcast++
  console.log(`  ${y.year}  ${String(y.cloud_cover ?? '—').padStart(4)}%  ${b}`)
}
const valid = years.filter(y => y.cloud_cover != null)
const avg = valid.length ? Math.round(valid.reduce((s, y) => s + y.cloud_cover, 0) / valid.length) : null
console.log(`\n  clear ${clear}/${valid.length}  partly ${partly}/${valid.length}  overcast ${overcast}/${valid.length}  avg ${avg}%`)
