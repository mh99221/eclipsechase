#!/usr/bin/env node
/**
 * Search the totality path for land points with historically clear
 * weather (5+ out of 10 years clear at 17:45 UTC on Aug 12).
 *
 * Pipeline:
 *   1. Load public/eclipse-data/path.geojson (totality path polygon)
 *   2. Generate a grid over its bounding box at ~5 km spacing
 *   3. Filter to points that are:
 *        - inside the totality polygon
 *        - inside our DEM coverage (western Iceland)
 *        - on land (DEM elevation > 10 m)
 *   4. Query Open-Meteo's archive for each candidate (10 years, one
 *      per API call — easy to rate-limit + retry)
 *   5. Compute clear_years per candidate; keep those >= MIN_CLEAR
 *   6. Sort by (clear_years desc, avg_cloud asc), save to
 *      scripts/output/discovered-clear-spots.json
 *
 * Output: scripts/output/discovered-clear-spots.json  (for review)
 *         Also prints top candidates to stdout.
 *
 *   node scripts/discover-clear-spots.mjs
 *   node scripts/discover-clear-spots.mjs --step=0.03     # finer grid
 *   node scripts/discover-clear-spots.mjs --min-clear=4   # loosen
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DEM_DIR = join(__dirname, '..', 'server', 'data', 'dem')
const PATH_GEOJSON = join(__dirname, '..', 'public', 'eclipse-data', 'path.geojson')
const OUTPUT_DIR = join(__dirname, 'output')
const OUTPUT_JSON = join(OUTPUT_DIR, 'discovered-clear-spots.json')
const CACHE_JSON = join(OUTPUT_DIR, 'discovery-cache.json')

// Args
const args = process.argv.slice(2).reduce((acc, a) => {
  const m = a.match(/^--([a-z-]+)(?:=(.*))?$/)
  if (m) acc[m[1]] = m[2] ?? 'true'
  return acc
}, {})
const LAT_STEP = parseFloat(args.step ?? '0.045')   // ~5km at 65°N
const LNG_STEP = parseFloat(args.step ?? '0.1')     // ~5km at 65°N
const MIN_CLEAR = parseInt(args['min-clear'] ?? '5', 10)
const MIN_ELEVATION_M = parseInt(args['min-elev'] ?? '10', 10)

const YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]
const OPEN_METEO = 'https://archive-api.open-meteo.com/v1/archive'

// ─────────────────────────────────────────────────────────────
// DEM — reuses the binary produced by scripts/prepare-dem-binary.py
// ─────────────────────────────────────────────────────────────
const demMeta = JSON.parse(readFileSync(join(DEM_DIR, 'west-iceland-30m.meta.json'), 'utf-8'))
const demBuf = readFileSync(join(DEM_DIR, 'west-iceland-30m.bin'))
const demData = new Float32Array(demBuf.buffer, demBuf.byteOffset, demBuf.byteLength / 4)
console.log(`DEM: ${demMeta.width}×${demMeta.height}  bounds ${demMeta.minLat}..${demMeta.maxLat}N  ${demMeta.minLng}..${demMeta.maxLng}E`)

function getElevation(lat, lng) {
  const m = demMeta
  if (lat < m.minLat || lat > m.maxLat || lng < m.minLng || lng > m.maxLng) return null
  const row = m.rowOrder === 'south-to-north'
    ? Math.floor((lat - m.minLat) / m.cellSizeLat)
    : Math.floor((m.maxLat - lat) / m.cellSizeLat)
  const col = Math.floor((lng - m.minLng) / m.cellSizeLng)
  if (row < 0 || row >= m.height || col < 0 || col >= m.width) return null
  const v = demData[row * m.width + col]
  return (Number.isNaN(v) || v < -1000) ? null : v
}

// ─────────────────────────────────────────────────────────────
// Point-in-polygon (ray casting). Path may wrap around the globe;
// we only care about the portion near Iceland, so pre-clip works.
// ─────────────────────────────────────────────────────────────
function pointInPolygon(point, poly) {
  const [px, py] = point
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    const intersect = ((yi > py) !== (yj > py))
      && (px < ((xj - xi) * (py - yi)) / (yj - yi || 1e-9) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

const pathGeo = JSON.parse(readFileSync(PATH_GEOJSON, 'utf-8'))
const totalityFeature = pathGeo.features.find(f => f.properties?.type === 'totality_path')
if (!totalityFeature) throw new Error('totality_path polygon not found in path.geojson')
// Clip polygon to Iceland's rough longitude range so point-in-polygon
// is numerically well-behaved near our area of interest.
const totalityPoly = totalityFeature.geometry.coordinates[0]
  .filter(([lng, lat]) => lng > -30 && lng < -15 && lat > 62 && lat < 68)
console.log(`Totality polygon (clipped): ${totalityPoly.length} vertices`)

// ─────────────────────────────────────────────────────────────
// Build candidate grid
// ─────────────────────────────────────────────────────────────
const GRID_LAT_MIN = Math.max(demMeta.minLat, 63.9)
const GRID_LAT_MAX = Math.min(demMeta.maxLat, 66.2)
const GRID_LNG_MIN = Math.max(demMeta.minLng, -24.5)
const GRID_LNG_MAX = Math.min(demMeta.maxLng, -21.5)

const candidates = []
for (let lat = GRID_LAT_MIN; lat <= GRID_LAT_MAX; lat = +(lat + LAT_STEP).toFixed(4)) {
  for (let lng = GRID_LNG_MIN; lng <= GRID_LNG_MAX; lng = +(lng + LNG_STEP).toFixed(4)) {
    if (!pointInPolygon([lng, lat], totalityPoly)) continue
    const elev = getElevation(lat, lng)
    if (elev == null || elev < MIN_ELEVATION_M) continue
    candidates.push({ lat, lng, elev: Math.round(elev) })
  }
}
console.log(`Grid ${LAT_STEP}° × ${LNG_STEP}°  →  ${candidates.length} land candidates inside totality\n`)

// ─────────────────────────────────────────────────────────────
// Region tagging (for output readability)
// ─────────────────────────────────────────────────────────────
function regionFor(lat, lng) {
  if (lat > 65.5) return 'westfjords'
  if (lat > 64.85 && lng < -22.5) return 'snaefellsnes'
  if (lat > 64.35 && lng > -21.8) return 'borgarfjordur'
  if (lat < 64.15) return 'reykjanes'
  return 'reykjavik'
}

// ─────────────────────────────────────────────────────────────
// Cloud cover interpolation at 17:45 UTC between 17:00 and 18:00
// ─────────────────────────────────────────────────────────────
function interp(c17, c18) {
  if (c17 == null && c18 == null) return null
  if (c17 == null) return c18
  if (c18 == null) return c17
  return Math.round(c17 * 0.25 + c18 * 0.75)
}

// Batch fetch 10 years in ONE API call per point — far fewer requests,
// less rate-limit pressure. Returns null if the call fails entirely.
async function fetchPointBatch(lat, lng) {
  const start = `${YEARS[0]}-08-12`
  const end = `${YEARS[YEARS.length - 1]}-08-12`
  const url = `${OPEN_METEO}?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}`
    + `&start_date=${start}&end_date=${end}`
    + `&hourly=cloud_cover&timezone=UTC`

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url)
      if (res.status === 429 || res.status === 503) {
        // Rate-limited — back off and retry
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)))
        continue
      }
      if (!res.ok) return null
      const data = await res.json()
      const times = data.hourly?.time || []
      const clouds = data.hourly?.cloud_cover || []

      // Extract Aug 12 17:00 + 18:00 for each year, interpolate 17:45
      const result = []
      for (const year of YEARS) {
        const idx17 = times.findIndex(t => t === `${year}-08-12T17:00`)
        const idx18 = times.findIndex(t => t === `${year}-08-12T18:00`)
        const c17 = idx17 >= 0 ? clouds[idx17] : null
        const c18 = idx18 >= 0 ? clouds[idx18] : null
        result.push({ year, cloud_cover: interp(c17, c18) })
      }
      return result
    } catch {
      await new Promise(r => setTimeout(r, 1000))
    }
  }
  return null
}

function summarise(years) {
  const valid = years.filter(y => y.cloud_cover != null)
  let clear = 0, partly = 0, overcast = 0
  for (const y of valid) {
    if (y.cloud_cover < 40) clear++
    else if (y.cloud_cover <= 70) partly++
    else overcast++
  }
  const avg = valid.length ? Math.round(valid.reduce((s, y) => s + y.cloud_cover, 0) / valid.length) : null
  return { years, clear_years: clear, partly_years: partly, overcast_years: overcast, total_years: valid.length, avg_cloud_cover: avg }
}

// File-backed cache so re-runs after a rate-limit pick up where we left off
function loadCache() {
  try { return JSON.parse(readFileSync(CACHE_JSON, 'utf-8')) } catch { return {} }
}
function saveCache(c) {
  mkdirSync(OUTPUT_DIR, { recursive: true })
  writeFileSync(CACHE_JSON, JSON.stringify(c, null, 2) + '\n', 'utf-8')
}
function cacheKey(lat, lng) { return `${lat.toFixed(4)},${lng.toFixed(4)}` }

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────
async function main() {
  const cache = loadCache()
  const cachedCount = Object.keys(cache).length
  console.log(`Querying ${candidates.length} candidates (batch mode: 1 call per point)`)
  console.log(`Cache has ${cachedCount} hits — those points will be skipped.`)
  console.log(`Threshold: ≥ ${MIN_CLEAR} clear years out of ${YEARS.length}\n`)

  const keepers = []
  let cacheWriteCounter = 0

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i]
    const key = cacheKey(c.lat, c.lng)
    process.stdout.write(`  [${String(i + 1).padStart(3)}/${candidates.length}] ${c.lat.toFixed(3)}, ${c.lng.toFixed(3)}  elev ${c.elev}m ... `)

    let years = cache[key]?.years
    let fromCache = !!years
    if (!fromCache) {
      const fetched = await fetchPointBatch(c.lat, c.lng)
      if (!fetched) {
        console.log(`FAIL (will retry next run)`)
        continue
      }
      years = fetched
      cache[key] = { lat: c.lat, lng: c.lng, elev: c.elev, years }
      // Flush every 10 new fetches so a crash mid-run still saves progress
      if (++cacheWriteCounter % 10 === 0) saveCache(cache)
      await new Promise(r => setTimeout(r, 150))
    }

    const stats = summarise(years)
    const region = regionFor(c.lat, c.lng)
    if (stats.clear_years >= MIN_CLEAR) {
      keepers.push({ ...c, region, ...stats })
      console.log(`★ ${stats.clear_years}/${stats.total_years} clear (avg ${stats.avg_cloud_cover}% cloud) — ${region}${fromCache ? ' [cached]' : ''}`)
    } else {
      console.log(`${stats.clear_years}/${stats.total_years}${fromCache ? ' [cached]' : ''}`)
    }
  }

  saveCache(cache)

  keepers.sort((a, b) => b.clear_years - a.clear_years || (a.avg_cloud_cover ?? 100) - (b.avg_cloud_cover ?? 100))

  mkdirSync(OUTPUT_DIR, { recursive: true })
  const output = {
    generated_at: new Date().toISOString(),
    source: 'open-meteo-era5',
    eclipse_time_utc: '17:45',
    years_covered: [YEARS[0], YEARS[YEARS.length - 1]],
    min_clear_threshold: MIN_CLEAR,
    min_elevation_m: MIN_ELEVATION_M,
    grid_step_deg: { lat: LAT_STEP, lng: LNG_STEP },
    candidate_count: candidates.length,
    results: keepers,
  }
  writeFileSync(OUTPUT_JSON, JSON.stringify(output, null, 2) + '\n', 'utf-8')

  console.log(`\n✓ Found ${keepers.length} land points with ≥ ${MIN_CLEAR}/${YEARS.length} clear years`)
  console.log(`  Saved to ${OUTPUT_JSON}`)
  if (keepers.length > 0) {
    console.log(`\nTop ${Math.min(20, keepers.length)}:`)
    console.log(`  ${'clear'.padEnd(5)} ${'avg%'.padEnd(5)} ${'elev'.padEnd(6)} ${'region'.padEnd(14)}  lat, lng`)
    for (const k of keepers.slice(0, 20)) {
      console.log(`  ${String(k.clear_years + '/' + k.total_years).padEnd(5)} ${String(k.avg_cloud_cover).padEnd(5)} ${(k.elev + 'm').padEnd(6)} ${k.region.padEnd(14)}  ${k.lat.toFixed(4)}, ${k.lng.toFixed(4)}`)
    }
  }
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
