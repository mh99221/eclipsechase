#!/usr/bin/env node
/**
 * Pre-compute 10-year (2016-2025) cloud cover at 17:45 UTC on Aug 12
 * for every cell on an 0.25° grid covering Iceland's bounding box.
 *
 * 0.25° matches ERA5's native resolution. ~17 lat steps × ~49 lng
 * steps = ~833 cells. At 10 years × ~80 ms politeness pause each =
 * roughly 12-15 minutes wall-clock. Run it once; commit the output.
 *
 * Data source: Open-Meteo Archive API (ERA5 reanalysis). Free, no key.
 *
 * Output: public/eclipse-data/historical-weather-grid.json
 *   Shape:
 *     {
 *       generated_at, source, eclipse_time_utc, years_covered,
 *       step: 0.25,
 *       cells: { "<lat>,<lng>": HistoricalWeatherCell }
 *     }
 *
 * Usage:
 *   node scripts/fetch-historical-weather-grid.mjs
 *   node scripts/fetch-historical-weather-grid.mjs --resume   # skip cells already present
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = join(__dirname, '..', 'public', 'eclipse-data', 'historical-weather-grid.json')

const RESUME = process.argv.includes('--resume')
const STEP = 0.25
const LAT_MIN = 63.0, LAT_MAX = 67.5
const LNG_MIN = -25.0, LNG_MAX = -13.0
const YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]
const OPEN_METEO = 'https://archive-api.open-meteo.com/v1/archive'

function band(cc) {
  if (cc == null) return 'unknown'
  if (cc < 40) return 'clear'
  if (cc <= 70) return 'partly'
  return 'overcast'
}

function interp(c17, c18) {
  if (c17 == null && c18 == null) return null
  if (c17 == null) return c18
  if (c18 == null) return c17
  return Math.round(c17 * 0.25 + c18 * 0.75)
}

function summarise(years) {
  const valid = years.filter(y => y.cloud_cover != null)
  let clear = 0, partly = 0, overcast = 0
  for (const y of valid) {
    const b = band(y.cloud_cover)
    if (b === 'clear') clear++
    else if (b === 'partly') partly++
    else if (b === 'overcast') overcast++
  }
  const avg = valid.length
    ? Math.round(valid.reduce((s, y) => s + y.cloud_cover, 0) / valid.length)
    : null
  return {
    clear_years: clear,
    partly_years: partly,
    overcast_years: overcast,
    total_years: valid.length,
    avg_cloud_cover: avg,
  }
}

async function fetchCellHistory(lat, lng) {
  const results = []
  for (const year of YEARS) {
    const url = `${OPEN_METEO}?latitude=${lat}&longitude=${lng}`
      + `&start_date=${year}-08-12&end_date=${year}-08-12`
      + `&hourly=cloud_cover&timezone=UTC`
    try {
      const res = await fetch(url)
      if (!res.ok) {
        results.push({ year, cloud_cover: null })
        continue
      }
      const data = await res.json()
      const times = data.hourly?.time || []
      const clouds = data.hourly?.cloud_cover || []
      const idx17 = times.findIndex(t => t.endsWith('T17:00'))
      const idx18 = times.findIndex(t => t.endsWith('T18:00'))
      const c17 = idx17 >= 0 ? clouds[idx17] : null
      const c18 = idx18 >= 0 ? clouds[idx18] : null
      results.push({ year, cloud_cover: interp(c17, c18) })
    } catch {
      results.push({ year, cloud_cover: null })
    }
    await new Promise(r => setTimeout(r, 80))
  }
  return results
}

function gridSteps(min, max, step) {
  const arr = []
  // Snap to step grid: e.g. step=0.25 means cells live at .00, .25, .50, .75
  const start = Math.round(min / step) * step
  for (let v = start; v <= max + 1e-9; v += step) {
    arr.push(parseFloat(v.toFixed(2)))
  }
  return arr
}

async function main() {
  const lats = gridSteps(LAT_MIN, LAT_MAX, STEP)
  const lngs = gridSteps(LNG_MIN, LNG_MAX, STEP)
  const totalCells = lats.length * lngs.length

  let output = {
    generated_at: new Date().toISOString(),
    source: 'open-meteo-era5',
    eclipse_time_utc: '17:45',
    years_covered: [YEARS[0], YEARS[YEARS.length - 1]],
    note: 'Cloud cover at totality (17:45 UTC) on Aug 12, interpolated from ERA5 17:00 + 18:00 hourly samples. Grid cells at 0.25° resolution (ERA5 native).',
    step: STEP,
    cells: {},
  }

  if (RESUME && existsSync(OUTPUT_PATH)) {
    output = JSON.parse(readFileSync(OUTPUT_PATH, 'utf-8'))
    output.cells = output.cells || {}
    console.log(`Resuming — ${Object.keys(output.cells).length} cells already present`)
  }

  console.log(`Grid: ${lats.length} × ${lngs.length} = ${totalCells} cells × ${YEARS.length} years`)
  let done = 0
  for (const lat of lats) {
    for (const lng of lngs) {
      done++
      const key = `${lat.toFixed(2)},${lng.toFixed(2)}`
      if (output.cells[key]) continue  // resume skip
      process.stdout.write(`  [${String(done).padStart(4)}/${totalCells}] ${key.padEnd(15)} ... `)
      const years = await fetchCellHistory(lat, lng)
      const stats = summarise(years)
      output.cells[key] = { years, ...stats }
      console.log(`avg ${stats.avg_cloud_cover ?? '—'}% (${stats.total_years}/${YEARS.length})`)

      // Persist periodically so a crash doesn't lose hours of work.
      if (done % 25 === 0) {
        mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
        writeFileSync(OUTPUT_PATH, JSON.stringify(output) + '\n', 'utf-8')
      }
    }
  }

  output.generated_at = new Date().toISOString()
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
  writeFileSync(OUTPUT_PATH, JSON.stringify(output) + '\n', 'utf-8')
  console.log(`\n✓ Wrote ${Object.keys(output.cells).length} cells to ${OUTPUT_PATH}`)
}

main().catch((err) => { console.error('Error:', err); process.exit(1) })
