#!/usr/bin/env node
/**
 * Fetch 10 years of historical cloud cover for every viewing spot on
 * Aug 12 around totality (17:00-18:00 UTC).
 *
 * Data source: Open-Meteo Archive API (ERA5 reanalysis underneath).
 * Free, no API key, ~9km spatial resolution. Plenty for climatology.
 *
 * For each spot we store:
 *   - years[]: { year, cloud_cover } for 2016-2025
 *   - clear_years / partly_years / overcast_years (counts)
 *   - total_years (may be < 10 if the API omits a year)
 *
 * Output: public/eclipse-data/historical-weather.json
 *
 * Usage:
 *   node scripts/fetch-historical-weather.mjs
 *   node scripts/fetch-historical-weather.mjs --api=http://localhost:3000
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = join(__dirname, '..', 'public', 'eclipse-data', 'historical-weather.json')

const argApi = process.argv.find(a => a.startsWith('--api='))
const API_BASE = argApi ? argApi.split('=')[1] : 'https://eclipsechase.is'

const YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]
const OPEN_METEO = 'https://archive-api.open-meteo.com/v1/archive'

/** Classify a cloud cover % into a visual band (matches the detail page legend). */
function band(cc) {
  if (cc == null) return 'unknown'
  if (cc < 40) return 'clear'
  if (cc <= 70) return 'partly'
  return 'overcast'
}

/** Linear interpolate between two hourly samples to estimate 17:45 UTC. */
function interp(c17, c18) {
  if (c17 == null && c18 == null) return null
  if (c17 == null) return c18
  if (c18 == null) return c17
  // 17:45 is 75% of the way from 17:00 to 18:00
  return Math.round(c17 * 0.25 + c18 * 0.75)
}

async function fetchSpotHistory(spot) {
  const results = []

  for (const year of YEARS) {
    const url = `${OPEN_METEO}?latitude=${spot.lat}&longitude=${spot.lng}`
      + `&start_date=${year}-08-12&end_date=${year}-08-12`
      + `&hourly=cloud_cover&timezone=UTC`

    try {
      const res = await fetch(url)
      if (!res.ok) {
        console.warn(`  ${year}: HTTP ${res.status}`)
        results.push({ year, cloud_cover: null })
        continue
      }
      const data = await res.json()
      const times = data.hourly?.time || []
      const clouds = data.hourly?.cloud_cover || []

      // times look like "2020-08-12T17:00"
      const idx17 = times.findIndex(t => t.endsWith('T17:00'))
      const idx18 = times.findIndex(t => t.endsWith('T18:00'))
      const c17 = idx17 >= 0 ? clouds[idx17] : null
      const c18 = idx18 >= 0 ? clouds[idx18] : null
      const cloudCover = interp(c17, c18)

      results.push({ year, cloud_cover: cloudCover })
    }
    catch (err) {
      console.warn(`  ${year}: ${err.message}`)
      results.push({ year, cloud_cover: null })
    }

    // Be polite to the free API — tiny pause between year-queries
    await new Promise(r => setTimeout(r, 80))
  }

  return results
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

async function fetchSpots() {
  console.log(`Fetching spots from ${API_BASE}/api/spots ...`)
  const res = await fetch(`${API_BASE}/api/spots`)
  if (!res.ok) throw new Error(`API error ${res.status}`)
  const json = await res.json()
  return json.spots || []
}

async function main() {
  const spots = await fetchSpots()
  console.log(`Processing ${spots.length} spots × ${YEARS.length} years = ${spots.length * YEARS.length} API calls\n`)

  const output = {
    generated_at: new Date().toISOString(),
    source: 'open-meteo-era5',
    eclipse_time_utc: '17:45',
    years_covered: [YEARS[0], YEARS[YEARS.length - 1]],
    note: 'Cloud cover at totality (17:45 UTC) on Aug 12. Based on ERA5 reanalysis. Past years do not guarantee eclipse day conditions.',
    spots: {},
  }

  for (const spot of spots) {
    process.stdout.write(`  ${spot.slug.padEnd(32)} ... `)
    const years = await fetchSpotHistory(spot)
    const stats = summarise(years)
    output.spots[spot.slug] = { years, ...stats }
    console.log(`clear ${stats.clear_years}/${stats.total_years} · avg ${stats.avg_cloud_cover}% clouds`)
  }

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf-8')
  console.log(`\n✓ Wrote ${spots.length} spot histories to ${OUTPUT_PATH}`)
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
