// Renders the favicon's eclipse glyph to a fixed-color PNG for use in
// transactional emails. We can't load `public/favicon.svg` directly
// because it relies on `prefers-color-scheme` to pick `--fav`; emails
// have no scheme switch, so we hard-bake the dark-theme amber.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const AMBER = '#f59e0b'
const OUT_SIZE = 88

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <clipPath id="left70">
      <rect x="0" y="0" width="82.6" height="128"/>
    </clipPath>
  </defs>
  <circle cx="64" cy="64" r="60" fill="none" stroke="${AMBER}" stroke-width="8"/>
  <circle cx="64" cy="64" r="43" fill="${AMBER}" clip-path="url(#left70)"/>
</svg>
`

const png = new Resvg(svg, {
  fitTo: { mode: 'width', value: OUT_SIZE },
  background: 'rgba(0,0,0,0)',
}).render().asPng()

const outDir = resolve(root, 'public/email')
mkdirSync(outDir, { recursive: true })
const outPath = resolve(outDir, 'brand-icon.png')
writeFileSync(outPath, png)

console.log(`wrote ${outPath} (${png.length} bytes, ${OUT_SIZE}x${OUT_SIZE})`)
