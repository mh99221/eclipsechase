import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DEM_DIR = join(__dirname, '..', '..', 'server', 'data', 'dem')
const meta = JSON.parse(readFileSync(join(DEM_DIR, 'west-iceland-30m.meta.json'), 'utf-8'))
const buf = readFileSync(join(DEM_DIR, 'west-iceland-30m.bin'))
const demData = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4)

function getElev(lat, lng) {
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

// Probe a coarse grid around the head of Arnarfjörður to find the fjord-shore vs plateau.
console.log('Coarse grid around suspected Dynjandi area (head of Arnarfjörður):\n')
console.log('         lng=-23.215  -23.210  -23.205  -23.200  -23.195  -23.190  -23.185  -23.180  -23.175  -23.170')
for (let lat = 65.745; lat >= 65.725; lat -= 0.002) {
  const row = []
  for (let lng = -23.215; lng <= -23.170; lng += 0.005) {
    row.push(Math.round(getElev(lat, lng)).toString().padStart(5))
  }
  console.log(`lat=${lat.toFixed(3)}  ${row.join('   ')}`)
}

console.log('\nSpecific control points:')
const points = [
  ['existing seed dynjandi',     65.7328, -23.1793],
  ['my guess for actual parking', 65.7370, -23.2010],
  ['shoreline NW of falls',       65.7400, -23.2000],
  ['shoreline N of falls',        65.7400, -23.1900],
  ['true head of fjord (river mouth?)', 65.7420, -23.2050],
]
for (const [name, la, ln] of points) {
  console.log(`  ${name.padEnd(40)} ${la}, ${ln} → ${getElev(la, ln).toFixed(1)}m`)
}
