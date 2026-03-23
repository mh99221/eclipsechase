/**
 * Patches @nuxt/test-utils Playwright fixture timeout for Windows.
 *
 * The default 120s timeout is insufficient for this project's Nuxt build
 * which takes ~110s on Windows. This script increases it to 360s.
 *
 * Run via: node scripts/patch-e2e-timeout.js
 * Or add to postinstall: "postinstall": "node scripts/patch-e2e-timeout.js"
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const filePath = resolve('node_modules/@nuxt/test-utils/dist/playwright.mjs')

try {
  let content = readFileSync(filePath, 'utf-8')
  const original = 'isWindows ? 12e4 : 6e4'
  const patched = 'isWindows ? 36e4 : 18e4'

  if (content.includes(patched)) {
    console.log('[patch-e2e-timeout] Already patched.')
  }
  else if (content.includes(original)) {
    content = content.replace(original, patched)
    writeFileSync(filePath, content)
    console.log('[patch-e2e-timeout] Patched fixture timeout: 120s → 360s (Windows), 60s → 180s (other).')
  }
  else {
    console.warn('[patch-e2e-timeout] Could not find timeout pattern to patch. Library may have been updated.')
  }
}
catch (err) {
  console.warn('[patch-e2e-timeout] Skipping patch:', err.message)
}
