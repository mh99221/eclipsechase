#!/usr/bin/env node
/**
 * One-shot export of everything the archive needs from Supabase.
 *
 * Run ONCE, before the weather cron is disabled and before the Supabase
 * project is allowed to go idle. Output is committed to git and becomes
 * the permanent source of truth for /spots, /spots/[slug] and the sitemap.
 *
 * Usage:
 *   node --env-file=.env scripts/snapshot-archive.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'server', 'data', 'archive')

const SUPABASE_URL = process.env.SUPABASE_URL
// Use the service-role key, not the anon key: RLS silently filters
// viewing_spots / weather_forecasts down to 0 rows for anon (no error,
// just empty results), which would produce a corrupt "successful" snapshot.
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_KEY) must be set')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

/** Eclipse day, UTC bounds. Totality was ~17:43-17:48Z. */
const DAY_START = '2026-08-12T00:00:00Z'
const DAY_END = '2026-08-13T00:00:00Z'

function write(name, payload) {
  const path = join(OUT_DIR, name)
  writeFileSync(path, JSON.stringify(payload, null, 2) + '\n', 'utf8')
  console.log(`wrote ${name}`)
}

async function fetchAll(table, columns) {
  const { data, error } = await supabase.from(table).select(columns)
  if (error) {
    console.error(`failed reading ${table}:`, error.message)
    process.exit(1)
  }
  return data ?? []
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })

  // Full rows — the detail endpoint does `select('*')`, so take everything.
  const spots = await fetchAll('viewing_spots', '*')
  spots.sort((a, b) => (b.totality_duration_seconds ?? 0) - (a.totality_duration_seconds ?? 0))
  console.log(`  ${spots.length} spots`)

  const translations = await fetchAll(
    'viewing_spot_translations',
    'spot_slug, locale, name, description, parking_info, terrain_notes, warnings',
  )
  console.log(`  ${translations.length} translation rows`)

  const stations = await fetchAll('weather_stations', 'id, name, lat, lng, region')

  // PostgREST caps a single select at 1000 rows by default; a full day
  // across 55 stations can exceed that, so paginate with .range() until
  // a short page comes back.
  const PAGE_SIZE = 1000
  const forecasts = []
  for (let page = 0; ; page++) {
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    const { data, error: fErr } = await supabase
      .from('weather_forecasts')
      .select('station_id, forecast_time, valid_time, cloud_cover, precipitation_prob')
      .gte('valid_time', DAY_START)
      .lt('valid_time', DAY_END)
      .order('valid_time', { ascending: true })
      .range(from, to)
    if (fErr) {
      console.error('failed reading weather_forecasts:', fErr.message)
      process.exit(1)
    }
    forecasts.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) break
  }
  console.log(`  ${forecasts.length} eclipse-day forecast rows`)

  write('spots.json', {
    snapshot_of: 'viewing_spots',
    captured_at: new Date().toISOString(),
    count: spots.length,
    spots,
  })

  write('spot-translations.json', {
    snapshot_of: 'viewing_spot_translations',
    captured_at: new Date().toISOString(),
    count: translations.length,
    translations,
  })

  write('eclipse-day-weather.json', {
    snapshot_of: 'weather_forecasts',
    eclipse_date: '2026-08-12',
    captured_at: new Date().toISOString(),
    stations,
    forecasts,
  })
}

main()
