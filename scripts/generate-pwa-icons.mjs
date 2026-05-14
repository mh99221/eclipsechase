// Rasterise the brand glyph from public/favicon.svg into the PNG icon set
// Chrome requires for PWA installability (192 + 512 + maskable). Without
// proper raster icons, `beforeinstallprompt` never fires and the install
// CTA on /pro/success + /dashboard never appears.
//
// Run with: node scripts/generate-pwa-icons.mjs
// Output:   public/icons/icon-{192,512,maskable-512}.png
//
// One-shot script — commits the output PNGs so production has them
// without a build-time step. Re-run only when the brand mark changes.

import { Resvg } from '@resvg/resvg-js'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const outDir = resolve(root, 'public/icons')
mkdirSync(outDir, { recursive: true })

// Manifest theme/background colour. Keep in sync with public/manifest.json.
const BG = '#0a0e17'

// Brand glyph re-built here (rather than loaded from favicon.svg) for two
// reasons:
//   1. favicon.svg uses CSS variables + prefers-color-scheme media query —
//      resvg-js renders it as transparent because it can't resolve the var.
//      Inline the colours directly to get a stable raster.
//   2. We want an opaque background for the launcher tile (matches the
//      manifest theme so the OS doesn't show a transparent square).
function glyph({ size, padding, accent }) {
  // The viewBox is 128 — keep the original geometry and translate it into
  // the inner safe zone defined by `padding`.
  const inner = size - padding * 2
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" fill="${BG}"/>
      <g transform="translate(${padding}, ${padding}) scale(${inner / 128})">
        <defs>
          <clipPath id="left70">
            <rect x="0" y="0" width="82.6" height="128"/>
          </clipPath>
        </defs>
        <circle cx="64" cy="64" r="60" fill="none" stroke="${accent}" stroke-width="8"/>
        <circle cx="64" cy="64" r="43" fill="${accent}" clip-path="url(#left70)"/>
      </g>
    </svg>
  `
}

function render(svg, size) {
  return new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()
}

const ACCENT = '#E89A3C' // dark-theme accent (matches BrandLogo)

// Standard "any" purpose — minimal padding so the glyph fills the tile.
writeFileSync(resolve(outDir, 'icon-192.png'), render(glyph({ size: 192, padding: 16, accent: ACCENT }), 192))
writeFileSync(resolve(outDir, 'icon-512.png'), render(glyph({ size: 512, padding: 40, accent: ACCENT }), 512))

// Maskable: platform masks into a circle/squircle. Spec says the inner 80%
// must contain the brand mark — pad to 20% on each side.
writeFileSync(resolve(outDir, 'icon-maskable-512.png'), render(glyph({ size: 512, padding: 102, accent: ACCENT }), 512))

console.log('Generated:')
console.log('  public/icons/icon-192.png')
console.log('  public/icons/icon-512.png')
console.log('  public/icons/icon-maskable-512.png')
