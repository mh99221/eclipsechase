#!/usr/bin/env node
/**
 * Process raw spot photos into optimized WebP variants.
 *
 * Pure-Node implementation using `sharp` (already a project dep). Reads
 * every image-looking file from ./raw-photos (filtered by extension,
 * skips camera-default filenames starting with "_"), writes two webps
 * per source to ./public/images/spots — both pre-cropped to the hero's
 * 1.8:1 display aspect (covers a 720×400 CSS / 1080×600 device-px box):
 *
 *   ${basename}.webp        — 1200 × 667, q80 (hero full size)
 *   ${basename}-thumb.webp  — 600 × 333,  q75 (LQIP / list cards)
 *
 * Pre-cropping replaces the runtime `object-fit: cover` crop on the
 * hero box: same visible result, smaller files, no wasted pixels.
 * Crop is centre-anchored — re-frame in the source if the subject
 * sits off-centre.
 *
 * Run: node scripts/process-spot-photos.mjs
 *
 * Note: thumbnails are NOT processed from already-thumbnail sources —
 * the basename collision check skips any raw whose name already ends
 * in "-thumb".
 */

import { readdir, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
import sharp from 'sharp'

const INPUT_DIR = './raw-photos'
const OUTPUT_DIR = './public/images/spots'
const ASPECT_RATIO = 1.8 // matches the spot-hero display box (720×400 CSS / 1080×600 device px)
const FULL_WIDTH = 1200
const FULL_HEIGHT = Math.round(FULL_WIDTH / ASPECT_RATIO) // 667
const THUMB_WIDTH = 600
const THUMB_HEIGHT = Math.round(THUMB_WIDTH / ASPECT_RATIO) // 333
const FULL_QUALITY = 80
const THUMB_QUALITY = 75

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.avif'])

async function main() {
  if (!existsSync(INPUT_DIR)) {
    console.error(`Error: ${INPUT_DIR} not found.`)
    process.exit(1)
  }
  await mkdir(OUTPUT_DIR, { recursive: true })

  const entries = await readdir(INPUT_DIR, { withFileTypes: true })
  const sources = entries
    .filter(e => e.isFile())
    .map(e => e.name)
    .filter(name => {
      // Skip camera-default filenames (user flagged these as not meaningful).
      if (name.startsWith('_')) return false
      // Skip already-thumbnail sources if someone drops them in.
      const stem = basename(name, extname(name))
      if (stem.endsWith('-thumb')) return false
      return IMAGE_EXTS.has(extname(name).toLowerCase())
    })
    .sort()

  if (!sources.length) {
    console.warn(`No processable images in ${INPUT_DIR}.`)
    return
  }

  let ok = 0
  let failed = 0
  for (const name of sources) {
    const input = join(INPUT_DIR, name)
    const stem = basename(name, extname(name))
    const fullOut = join(OUTPUT_DIR, `${stem}.webp`)
    const thumbOut = join(OUTPUT_DIR, `${stem}-thumb.webp`)
    try {
      const src = sharp(input)
      await src
        .clone()
        .resize({ width: FULL_WIDTH, height: FULL_HEIGHT, fit: 'cover', position: 'centre' })
        .webp({ quality: FULL_QUALITY })
        .toFile(fullOut)
      await src
        .clone()
        .resize({ width: THUMB_WIDTH, height: THUMB_HEIGHT, fit: 'cover', position: 'centre' })
        .webp({ quality: THUMB_QUALITY })
        .toFile(thumbOut)
      ok++
      console.log(`  ✓ ${stem}  (full + thumb)`)
    } catch (e) {
      failed++
      console.warn(`  ✗ ${stem}  (${(e instanceof Error ? e.message : String(e)).split('\n')[0]})`)
    }
  }

  console.log(``)
  console.log(`Processed ${ok} image${ok === 1 ? '' : 's'} → ${OUTPUT_DIR}`)
  if (failed) console.log(`${failed} file${failed === 1 ? '' : 's'} failed (see above)`)
  console.log(`Skipped: non-image extensions + filenames starting with "_"`)
}

main().catch(err => { console.error(err); process.exit(1) })
