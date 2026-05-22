import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DEM_DIR = join(__dirname, '..', '..', 'server', 'data', 'dem')
const meta = JSON.parse(readFileSync(join(DEM_DIR, 'west-iceland-30m.meta.json'), 'utf-8'))
const buf = readFileSync(join(DEM_DIR, 'west-iceland-30m.bin'))
const demData = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4)

const SUN_ALTITUDE = 24, SUN_AZIMUTH = 250
const EYE_HEIGHT = 1.7, EARTH_RADIUS = 6371000
const DEG = Math.PI / 180, REFR = 0.25
const KNOWN_ELEV = { sandafell: 367 }

function move(lat, lng, b, d) {
  const br = b * DEG, lr = lat * DEG, x = d / EARTH_RADIUS
  const nl = Math.asin(Math.sin(lr) * Math.cos(x) + Math.cos(lr) * Math.sin(x) * Math.cos(br))
  const nln = lng * DEG + Math.atan2(Math.sin(br) * Math.sin(x) * Math.cos(lr), Math.cos(x) - Math.sin(lr) * Math.sin(nl))
  return [nl / DEG, nln / DEG]
}
function dists() {
  const d = []
  for (let i = 50; i <= 1000; i += 50) d.push(i)
  for (let i = 1200; i <= 5000; i += 200) d.push(i)
  for (let i = 5500; i <= 20000; i += 500) d.push(i)
  for (let i = 21000; i <= 50000; i += 1000) d.push(i)
  return d
}
const DS = dists()
function elev(lat, lng) {
  if (lat < meta.minLat || lat > meta.maxLat || lng < meta.minLng || lng > meta.maxLng) return null
  const rF = (lat - meta.minLat) / meta.cellSizeLat, cF = (lng - meta.minLng) / meta.cellSizeLng
  const r0 = Math.floor(rF), c0 = Math.floor(cF)
  const r1 = Math.min(r0 + 1, meta.height - 1), c1 = Math.min(c0 + 1, meta.width - 1)
  const fr = rF - r0, fc = cF - c0
  const s = v => (Number.isNaN(v) || v < -1000) ? 0 : v
  const v00 = s(demData[r0 * meta.width + c0] ?? 0), v01 = s(demData[r0 * meta.width + c1] ?? 0)
  const v10 = s(demData[r1 * meta.width + c0] ?? 0), v11 = s(demData[r1 * meta.width + c1] ?? 0)
  return (1 - fr) * ((1 - fc) * v00 + fc * v01) + fr * ((1 - fc) * v10 + fc * v11)
}
function ray(lat, lng, obs, b) {
  let mA = -90, bD = 0, bE = 0
  for (const d of DS) {
    const [sl, sln] = move(lat, lng, b, d)
    const e = elev(sl, sln)
    if (e == null) continue
    const cv = (d * d) / (2 * EARTH_RADIUS) * (1 - REFR)
    const a = Math.atan2(e - obs - cv, d) / DEG
    if (a > mA) { mA = a; bD = d; bE = e }
  }
  return { angle: mA, dist: bD, elev: bE }
}
function check(name, lat, lng, key) {
  const dem = elev(lat, lng), demSafe = dem != null && dem >= 0 ? dem : 2
  const known = KNOWN_ELEV[key] ?? 0
  const obs = Math.max(demSafe, known) + EYE_HEIGHT
  let main = null, worst = -90, worstAz = null
  for (let off = -45; off <= 45; off++) {
    const az = SUN_AZIMUTH + off
    const r = ray(lat, lng, obs, az)
    if (r.angle > worst) { worst = r.angle; worstAz = ((az % 360) + 360) % 360 }
    if (off === 0) main = r
  }
  const maxH = Math.max(main.angle, 0)
  const cl = SUN_ALTITUDE - maxH
  const v = cl > 5 ? 'CLEAR' : cl >= 2 ? 'MARGINAL' : cl >= 0 ? 'RISKY' : 'BLOCKED'
  console.log(`\n${name}`)
  console.log(`  coord:          ${lat.toFixed(6)}, ${lng.toFixed(6)}`)
  console.log(`  DEM elev:       ${demSafe.toFixed(1)} m  (known: ${known} m → obs ${obs.toFixed(1)} m)`)
  console.log(`  horizon @az250: ${maxH.toFixed(2)}°  (terrain ${main.elev.toFixed(0)} m at ${main.dist} m)`)
  console.log(`  worst sweep:    ${Math.max(worst, 0).toFixed(2)}° @ az ${worstAz}`)
  console.log(`  clearance:      ${cl.toFixed(2)}°  → ${v}`)
}

check('SANDAFELL summit (367 m)',  65.87239273496029, -23.50567126937135, 'sandafell')
check('Parking (Þingeyri side)',  65.86123054085608, -23.477419169626966)

// Cloud history
const YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]
const URL = 'https://archive-api.open-meteo.com/v1/archive'
function band(c) { return c == null ? '—' : c < 40 ? 'clear' : c <= 70 ? 'partly' : 'overcast' }
function interp(a, b) { if (a == null && b == null) return null; if (a == null) return b; if (b == null) return a; return Math.round(a * 0.25 + b * 0.75) }

console.log('\n=== 10-year Aug-12 cloud history at 17:45 UTC (ERA5) — Sandafell summit ===\n')
let clear = 0, partly = 0, overcast = 0, valid = 0, sum = 0
for (const y of YEARS) {
  const u = `${URL}?latitude=65.87239&longitude=-23.50567&start_date=${y}-08-12&end_date=${y}-08-12&hourly=cloud_cover&timezone=UTC`
  const r = await fetch(u)
  const j = await r.json()
  const t = j.hourly?.time || [], cl = j.hourly?.cloud_cover || []
  const i17 = t.findIndex(x => x.endsWith('T17:00')), i18 = t.findIndex(x => x.endsWith('T18:00'))
  const cc = interp(i17 >= 0 ? cl[i17] : null, i18 >= 0 ? cl[i18] : null)
  const b = band(cc)
  if (b === 'clear') clear++
  else if (b === 'partly') partly++
  else if (b === 'overcast') overcast++
  if (cc != null) { valid++; sum += cc }
  console.log(`  ${y}  ${String(cc ?? '—').padStart(4)}%  ${b}`)
  await new Promise(r => setTimeout(r, 80))
}
console.log(`\n  clear ${clear}/${valid}  partly ${partly}/${valid}  overcast ${overcast}/${valid}  avg ${valid ? Math.round(sum / valid) : '—'}%`)
