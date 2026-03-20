#!/usr/bin/env node
/**
 * Generate roads.geojson for the eclipse region from Overpass Turbo.
 * Fetches trunk + primary roads in western Iceland (63,-25,67,-20),
 * merges ways by road ref number into MultiLineString features.
 * Output: public/eclipse-data/roads.geojson
 */

import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT = resolve(__dirname, '../public/eclipse-data/roads.geojson')

// Eclipse region bounding box
const BBOX = '63.0,-25.0,67.0,-20.0'

// Split into sub-regions to avoid Overpass timeout
const REGIONS = [
  '63.0,-25.0,65.0,-22.0',  // SW: Reykjanes + Reykjavik + Snæfellsnes
  '63.0,-22.0,65.0,-20.0',  // SE: South coast
  '65.0,-25.0,67.0,-22.0',  // NW: Westfjords
  '65.0,-22.0,67.0,-20.0',  // NE: North
]

function buildQuery(bbox) {
  return `[out:json][timeout:30];
(
  way["highway"="trunk"](${bbox});
  way["highway"="primary"](${bbox});
);
out geom;`
}

async function main() {
  console.log('Fetching roads from Overpass API (4 regions)...')

  let ways = []
  for (const bbox of REGIONS) {
    console.log(`  Fetching region ${bbox}...`)
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(buildQuery(bbox))}`,
    })
    if (res.status === 429) {
      console.log('    Rate limited, waiting 15s...')
      await new Promise(r => setTimeout(r, 15000))
      const retry = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(buildQuery(bbox))}`,
      })
      if (!retry.ok) throw new Error(`Overpass API error: ${retry.status} for bbox ${bbox}`)
      const retryData = await retry.json()
      const retryWays = retryData.elements || []
      console.log(`    Got ${retryWays.length} ways (retry)`)
      ways = ways.concat(retryWays)
    } else if (!res.ok) {
      throw new Error(`Overpass API error: ${res.status} for bbox ${bbox}`)
    } else {
      const data = await res.json()
      const regionWays = data.elements || []
      console.log(`    Got ${regionWays.length} ways`)
      ways = ways.concat(regionWays)
    }
    // Be polite to Overpass
    await new Promise(r => setTimeout(r, 5000))
  }

  // Deduplicate by way ID
  const seen = new Set()
  ways = ways.filter(w => {
    if (seen.has(w.id)) return false
    seen.add(w.id)
    return true
  })
  console.log(`Total: ${ways.length} unique ways`)

  // Group ways by road ref number
  const roadGroups = new Map()

  for (const way of ways) {
    const tags = way.tags || {}
    const ref = tags.ref || ''
    const name = tags.name || ''
    const highway = tags.highway || ''

    if (!ref && !name) continue // skip unnamed roads
    if (!way.geometry || way.geometry.length < 2) continue

    const key = ref || name
    if (!roadGroups.has(key)) {
      roadGroups.set(key, {
        ref,
        name,
        highway,
        lines: [],
      })
    }

    // Convert Overpass geometry to [lng, lat] coordinate arrays
    const coords = way.geometry.map(p => [p.lon, p.lat])
    roadGroups.get(key).lines.push(coords)
  }

  console.log(`Merged into ${roadGroups.size} roads`)

  // Build GeoJSON
  const features = []
  for (const [key, road] of roadGroups) {
    // Try to connect consecutive line segments
    const merged = mergeLines(road.lines)

    features.push({
      type: 'Feature',
      properties: {
        roadRef: road.ref,
        roadName: road.name,
        highway: road.highway,
      },
      geometry: merged.length === 1
        ? { type: 'LineString', coordinates: merged[0] }
        : { type: 'MultiLineString', coordinates: merged },
    })
  }

  const geojson = {
    type: 'FeatureCollection',
    features,
  }

  // Calculate file size
  const json = JSON.stringify(geojson)
  const sizeMB = (json.length / 1024 / 1024).toFixed(2)

  writeFileSync(OUTPUT, json)
  console.log(`Written ${features.length} road features to ${OUTPUT} (${sizeMB} MB)`)

  // Summary
  const refs = features.filter(f => f.properties.roadRef).map(f => f.properties.roadRef)
  console.log(`Roads with ref numbers: ${refs.sort((a, b) => Number(a) - Number(b)).join(', ')}`)
}

/**
 * Merge line segments that share endpoints into longer lines.
 * Returns array of coordinate arrays (each a LineString).
 */
function mergeLines(lines) {
  if (lines.length <= 1) return lines

  const result = [lines[0]]

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    let merged = false

    for (let j = 0; j < result.length; j++) {
      const existing = result[j]
      const existEnd = existing[existing.length - 1]
      const existStart = existing[0]
      const lineStart = line[0]
      const lineEnd = line[line.length - 1]

      const EPSILON = 0.0001 // ~11 meters

      if (distance(existEnd, lineStart) < EPSILON) {
        // Append line to end of existing
        result[j] = existing.concat(line.slice(1))
        merged = true
        break
      } else if (distance(existEnd, lineEnd) < EPSILON) {
        // Append reversed line to end of existing
        result[j] = existing.concat(line.slice(0, -1).reverse())
        merged = true
        break
      } else if (distance(existStart, lineEnd) < EPSILON) {
        // Prepend line to start of existing
        result[j] = line.concat(existing.slice(1))
        merged = true
        break
      } else if (distance(existStart, lineStart) < EPSILON) {
        // Prepend reversed line to start of existing
        result[j] = line.reverse().concat(existing.slice(1))
        merged = true
        break
      }
    }

    if (!merged) {
      result.push(line)
    }
  }

  // Multiple merge passes to catch chains
  if (result.length < lines.length) {
    return mergeLines(result)
  }

  return result
}

function distance(a, b) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
