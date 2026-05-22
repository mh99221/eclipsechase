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
const DEG_TO_RAD = Math.PI / 180, REFRACTION_COEFF = 0.25
// Known ground elevation (user-supplied) for the actual cliff-ledge ground above the falls.
// The 30m DEM under-reports this point (reports ~32m, true ground is 99m per user).
const KNOWN_ELEV = { haestahjallafoss: 99 }

function move(lat, lng, bearing, dist) {
  const br = bearing * DEG_TO_RAD, lr = lat * DEG_TO_RAD
  const d = dist / EARTH_RADIUS
  const nl = Math.asin(Math.sin(lr) * Math.cos(d) + Math.cos(lr) * Math.sin(d) * Math.cos(br))
  const nlng = lng * DEG_TO_RAD + Math.atan2(
    Math.sin(br) * Math.sin(d) * Math.cos(lr),
    Math.cos(d) - Math.sin(lr) * Math.sin(nl),
  )
  return [nl / DEG_TO_RAD, nlng / DEG_TO_RAD]
}
function distances() {
  const d = []
  for (let i = 50; i <= 1000; i += 50) d.push(i)
  for (let i = 1200; i <= 5000; i += 200) d.push(i)
  for (let i = 5500; i <= 20000; i += 500) d.push(i)
  for (let i = 21000; i <= 50000; i += 1000) d.push(i)
  return d
}
const DISTS = distances()

function elev(lat, lng) {
  if (lat < meta.minLat || lat > meta.maxLat || lng < meta.minLng || lng > meta.maxLng) return null
  const rowF = (lat - meta.minLat) / meta.cellSizeLat
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

function ray(lat, lng, obs, bearing) {
  let maxA = -90, bD = 0, bE = 0
  for (const d of DISTS) {
    const [sla, sln] = move(lat, lng, bearing, d)
    const e = elev(sla, sln)
    if (e == null) continue
    const curv = (d * d) / (2 * EARTH_RADIUS) * (1 - REFRACTION_COEFF)
    const a = Math.atan2(e - obs - curv, d) / DEG_TO_RAD
    if (a > maxA) { maxA = a; bD = d; bE = e }
  }
  return { angle: maxA, dist: bD, elev: bE }
}

function check(name, lat, lng, knownElevKey) {
  const dem = elev(lat, lng)
  const demSafe = dem != null && dem >= 0 ? dem : 2
  const known = KNOWN_ELEV[knownElevKey] ?? 0
  const base = Math.max(demSafe, known)
  const obs = base + EYE_HEIGHT
  let sweep = [], main = null, worst = -90, worstAz = null
  for (let off = -45; off <= 45; off++) {
    const az = SUN_AZIMUTH + off
    const r = ray(lat, lng, obs, az)
    sweep.push({ az: ((az % 360) + 360) % 360, angle: Math.max(r.angle, 0), dist: r.dist })
    if (r.angle > worst) { worst = r.angle; worstAz = ((az % 360) + 360) % 360 }
    if (off === 0) main = r
  }
  const maxH = Math.max(main.angle, 0)
  const clear = SUN_ALTITUDE - maxH
  const verdict = clear > 5 ? 'clear' : clear >= 2 ? 'marginal' : clear >= 0 ? 'risky' : 'blocked'
  console.log(`\n${name}`)
  console.log(`  coord:          ${lat.toFixed(6)}, ${lng.toFixed(6)}`)
  console.log(`  DEM elev:       ${demSafe.toFixed(1)} m  (known override: ${known} m)`)
  console.log(`  observer elev:  ${obs.toFixed(1)} m (= max(DEM,known) + 1.7m eye)`)
  console.log(`  sun:            alt ${SUN_ALTITUDE}° az ${SUN_AZIMUTH}°`)
  console.log(`  horizon @az250: ${maxH.toFixed(2)}°  (blocked by ${main.elev.toFixed(0)}m terrain ${main.dist}m out)`)
  console.log(`  worst in sweep: ${Math.max(worst, 0).toFixed(2)}° @ az ${worstAz}`)
  console.log(`  clearance:      ${clear.toFixed(2)}°  → verdict: ${verdict.toUpperCase()}`)
}

check('PARKING (user-supplied)',         65.7367007572071,  -23.209297687333873)
check('HÆSTAHJALLAFOSS (user-supplied)', 65.73334571021223, -23.201396166460484, 'haestahjallafoss')
