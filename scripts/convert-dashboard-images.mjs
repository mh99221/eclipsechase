// One-off: source PNGs in D:\Downloads are already at native phone-screen
// dimensions (1048×2340 from Pixel 9 Pro). Encode as WebP q82 and place
// in public/landing/. Spec target was ≤100 KB per image; we tune quality
// down per-file if encoding overruns.
import sharp from 'sharp'
import { mkdir, stat } from 'node:fs/promises'

const SRC_DIR = 'D:/Downloads'
const OUT_DIR = 'public/landing'
const FILES = [
  'dashboard-1-scoring.png',
  'dashboard-2-horizon.png',
  'dashboard-3-roadcam.png',
]
const MAX_BYTES = 100 * 1024

await mkdir(OUT_DIR, { recursive: true })

for (const name of FILES) {
  const src = `${SRC_DIR}/${name}`
  const out = `${OUT_DIR}/${name.replace(/\.png$/, '.webp')}`
  // Try q=82 at native, then shrink width in steps before dropping quality.
  // Photo-heavy frames (roadcam) compress worse than UI screenshots, but
  // we'd rather lose pixels than introduce WebP block artefacts.
  const attempts = [
    { width: null, q: 82 },
    { width: 900, q: 80 },
    { width: 800, q: 78 },
    { width: 720, q: 76 },
  ]
  let chosen = null
  for (const a of attempts) {
    const pipe = sharp(src)
    if (a.width) pipe.resize({ width: a.width })
    await pipe.webp({ quality: a.q, effort: 6 }).toFile(out)
    const size = (await stat(out)).size
    if (size <= MAX_BYTES || a === attempts.at(-1)) {
      chosen = { ...a, size }
      break
    }
  }
  const meta = await sharp(out).metadata()
  console.log(
    `${out.padEnd(46)} ${meta.width}x${meta.height}  q=${chosen.q}  ${(chosen.size / 1024).toFixed(1)} KB`,
  )
}
