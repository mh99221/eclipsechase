// Parses raw-photos/viewing_spots_rows.sql (a Supabase export of
// the full viewing_spots table) into raw-photos/parsed-spots.json,
// which generate-spot-translations-is.mjs consumes.
//
// Why a separate step:
//   - The export is one massive INSERT with 28 tuples and ~200 KB
//     of horizon_check JSONB embedded; reading it through a single
//     pass is unwieldy.
//   - Splitting it into a parsed JSON makes the generator
//     deterministic and the diffs reviewable.
//
// Run from repo root:
//   node scripts/internal/parse-spots.mjs

import fs from 'node:fs'

const ROOT = 'D:/Projects/eclipsechase/eclipse-chaser'
const SRC = `${ROOT}/raw-photos/viewing_spots_rows.sql`
const OUT = `${ROOT}/raw-photos/parsed-spots.json`

const txt = fs.readFileSync(SRC, 'utf8')
const valuesIdx = txt.indexOf('VALUES')
if (valuesIdx === -1) throw new Error('No VALUES clause found')
const body = txt.slice(valuesIdx + 'VALUES'.length)

// Walker: split by top-level parentheses while respecting quoted
// strings. PostgreSQL escapes a literal single-quote inside a string
// as '', so we look for that pattern when closing a string.
let depth = 0
let inStr = false
let cur = ''
const tuples = []
for (let i = 0; i < body.length; i++) {
  const c = body[i]
  if (inStr) {
    cur += c
    if (c === "'") {
      if (body[i + 1] === "'") cur += body[++i]
      else inStr = false
    }
    continue
  }
  if (c === "'") { inStr = true; cur += c; continue }
  if (c === '(') { if (depth === 0) cur = ''; else cur += c; depth++; continue }
  if (c === ')') {
    depth--
    if (depth === 0) { tuples.push(cur); cur = ''; continue }
    cur += c
    continue
  }
  if (depth > 0) cur += c
}

// Split a tuple's inner body by top-level commas. We need to track
// strings and bracket depth ([] for JSONB arrays, () for any nested
// constructor) so commas inside JSON / arrays don't split rows.
function splitFields(t) {
  const out = []
  let cur = ''
  let inStr = false
  let depth = 0
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (inStr) {
      cur += c
      if (c === "'") {
        if (t[i + 1] === "'") cur += t[++i]
        else inStr = false
      }
      continue
    }
    if (c === "'") { inStr = true; cur += c; continue }
    if (c === '(' || c === '[') { depth++; cur += c; continue }
    if (c === ')' || c === ']') { depth--; cur += c; continue }
    if (c === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue }
    cur += c
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}

function unquote(v) {
  if (v == null) return null
  if (v === 'null') return null
  if (v.startsWith("'") && v.endsWith("'")) {
    return v.slice(1, -1).replace(/''/g, "'")
  }
  return v
}

// Column order must match the INSERT column list. Indices match the
// production schema circa migration 005 + the photos/horizon/warnings
// JSONB add-ons. If the schema shifts, update these constants alongside
// the export.
const COL = {
  id: 0,
  name: 1,
  slug: 2,
  region: 5,
  description: 6,
  parking_info: 7,
  terrain_notes: 8,
  warnings: 24,
}

const rows = []
for (const t of tuples) {
  const f = splitFields(t)
  rows.push({
    id: unquote(f[COL.id]),
    name: unquote(f[COL.name]),
    slug: unquote(f[COL.slug]),
    region: unquote(f[COL.region]),
    description: unquote(f[COL.description]),
    parking_info: unquote(f[COL.parking_info]),
    terrain_notes: unquote(f[COL.terrain_notes]),
    warnings: unquote(f[COL.warnings]),
  })
}

fs.writeFileSync(OUT, JSON.stringify(rows, null, 2))
console.log(`Wrote ${OUT}`)
console.log(`  ${rows.length} rows`)
console.log(`  slugs: ${rows.map(r => r.slug).join(', ')}`)
