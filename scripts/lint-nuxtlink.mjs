#!/usr/bin/env node
/**
 * Fail the build on any `<NuxtLink>` whose destination is an internal
 * route. With i18n strategy `prefix_except_default`, plain NuxtLink
 * always resolves to the default-locale URL — so a user on /is/*
 * who clicks the link gets bounced back to English. The fix is to
 * use `<NuxtLinkLocale>` (the i18n-aware variant) for any internal
 * navigation. This script keeps the codebase honest as it grows.
 *
 * Scans `.vue` files under app/.
 *
 * Flags:
 *   <NuxtLink   to="/something">         (literal internal path)
 *   <NuxtLink   to="/" />                 (root)
 *   <NuxtLink :to="`/spots/${slug}`">    (template literal starting /)
 *   <NuxtLink :to="'/foo'">              (string-literal :to)
 *
 * Allowlists:
 *   - app/components/LocaleSwitcher.vue — its destination comes from
 *     useSwitchLocalePath() which already returns a fully localized
 *     path; re-running localePath() on it would be wrong.
 *
 * Run: `npm run lint:nuxtlink`
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SCAN_ROOTS = ['app']
const ALLOWLIST = new Set([
  'app/components/LocaleSwitcher.vue',
])

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) yield* walk(full)
    else if (full.endsWith('.vue')) yield full
  }
}

// `<NuxtLink` followed by attributes up to the matching `>`. We
// match the whole opening tag (greedy until `>`), then inspect its
// `to=` / `:to=` payload. Multi-line tags are common — use [\s\S].
const TAG_RE = /<NuxtLink\b([\s\S]*?)>/g

// Static `to="…"`: anything starting with `/` is internal. We
// explicitly skip `to="#"` (in-page anchor), `to=""` (no-op), and
// schemes (`https://`, `mailto:`, `tel:`).
const STATIC_TO = /\bto="([^"]*)"/
// Dynamic `:to="…"`: flag if the inline expression contains a string
// or template literal that begins with `/`. We don't try to evaluate
// arbitrary JS — just catch the common shapes.
const DYNAMIC_TO = /:to="([^"]*)"/
const DYNAMIC_INTERNAL = /^\s*(?:'\/[^']*'|"\/[^"]*"|`\/[^`]*`)/

const offenders = []
for (const root of SCAN_ROOTS) {
  const dir = join(ROOT, root)
  try { statSync(dir) } catch { continue }
  for (const file of walk(dir)) {
    const rel = relative(ROOT, file).replace(/\\/g, '/')
    if (ALLOWLIST.has(rel)) continue
    const src = readFileSync(file, 'utf8')
    let m
    TAG_RE.lastIndex = 0
    while ((m = TAG_RE.exec(src)) !== null) {
      const tagBody = m[1]
      let target = null

      const stat = STATIC_TO.exec(tagBody)
      if (stat) {
        const v = stat[1].trim()
        if (v.startsWith('/')) target = v
      }
      if (!target) {
        const dyn = DYNAMIC_TO.exec(tagBody)
        if (dyn && DYNAMIC_INTERNAL.test(dyn[1])) target = dyn[1].trim()
      }
      if (!target) continue

      // Locate the opening tag's line number for a friendly message.
      const upToHere = src.slice(0, m.index)
      const line = upToHere.split(/\r?\n/).length
      offenders.push({ file: rel, line, target })
    }
  }
}

if (offenders.length === 0) {
  console.log('✓ No <NuxtLink> with internal routes found. Use <NuxtLinkLocale> for new internal links.')
  process.exit(0)
}

console.error('✗ Internal-route <NuxtLink> usages detected.')
console.error('  Use <NuxtLinkLocale> instead — it resolves the destination through localePath() so')
console.error('  the user\'s active locale (e.g. /is/*) persists across navigation.\n')
for (const o of offenders) {
  console.error(`  ${o.file}:${o.line} → to=${JSON.stringify(o.target)}`)
}
console.error(`\n${offenders.length} site${offenders.length === 1 ? '' : 's'} must be migrated. If a specific file legitimately needs plain <NuxtLink> (e.g. its destination is already localized via useSwitchLocalePath), add it to ALLOWLIST in scripts/lint-nuxtlink.mjs with a comment.`)
process.exit(1)
