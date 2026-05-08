#!/usr/bin/env node
/**
 * Fail the build if any user-visible source still contains template
 * markers that should have been filled in before merge. Catches the
 * "Elite Consulting, s.r.o., registered in Slovakia ([IČO], [Address])"
 * regression where the privacy policy shipped with bracketed TODOs.
 *
 * Scans content/, app/pages/, app/components/, i18n/.
 *
 * Markers that fail the check (case-sensitive):
 *   [TODO] [FIXME] [XXX] [PLACEHOLDER] [IČO] [Address]
 *
 * Run: `npm run lint:placeholders`
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const DIRS = ['content', 'app/pages', 'app/components', 'i18n']
const EXTENSIONS = new Set(['.vue', '.md', '.mdc', '.json', '.ts', '.tsx', '.js'])

// Markers that indicate unfilled template content. Listed as a regex
// rather than literals so we catch variants like [Iço] or [IČO ] too.
const MARKER = /\[(TODO|FIXME|XXX|PLACEHOLDER|I[CČ]O|Address)\]/

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      // Skip node_modules, .nuxt, dist if they ever leak into a scanned path
      if (entry === 'node_modules' || entry.startsWith('.')) continue
      yield* walk(full)
    } else {
      const ext = full.slice(full.lastIndexOf('.'))
      if (EXTENSIONS.has(ext)) yield full
    }
  }
}

const offenders = []
for (const dir of DIRS) {
  const full = join(ROOT, dir)
  try { statSync(full) } catch { continue }
  for (const file of walk(full)) {
    const lines = readFileSync(file, 'utf8').split(/\r?\n/)
    lines.forEach((line, i) => {
      const m = line.match(MARKER)
      if (m) offenders.push({ file: relative(ROOT, file), line: i + 1, match: m[0], excerpt: line.trim().slice(0, 120) })
    })
  }
}

if (offenders.length === 0) {
  console.log('✓ No template placeholders found.')
  process.exit(0)
}

console.error('✗ Unfilled template placeholders detected:\n')
for (const o of offenders) {
  console.error(`  ${o.file}:${o.line} — ${o.match}`)
  console.error(`    ${o.excerpt}`)
}
console.error(`\n${offenders.length} placeholder marker${offenders.length === 1 ? '' : 's'} must be resolved before merge.`)
process.exit(1)
