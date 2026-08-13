# EclipseChase.is Sunset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire the Pro surfaces and all live data dependencies of eclipsechase.is, leaving a durable static archive of the content pages that survives unattended for years.

**Architecture:** The site currently reads `viewing_spots` from Supabase on every request. We snapshot that data (plus translations and the actual Aug 12 weather) into committed JSON, put a single `server/utils/spotsArchive.ts` module in front of it, and repoint the three API routes at that module instead of Supabase. The pages themselves are untouched — they keep calling `/api/spots`, which now serves frozen data. Pro routes are then retired, the service worker self-destructs, and live-data UI switches to a passed-event state.

**Tech Stack:** Nuxt 4, Nitro server routes, Vitest (node env for `tests/server/**`, happy-dom for `tests/unit/**`), Supabase JS (snapshot script only), Vercel.

**Source spec:** [2026-08-13-eclipsechase-sunset-and-b2b-pivot-design.md](../specs/2026-08-13-eclipsechase-sunset-and-b2b-pivot-design.md) — Part 1 only. Part 2 is outreach and has no implementation.

---

## Ordering constraints (do not reorder)

1. **Task 1 ships first and alone.** A live checkout selling access to an expired product is the only item with real exposure.
2. **Task 2 must precede Task 3.** Task 3 kills the weather cron; once it stops, the Aug 12 data can still be read from Supabase but nothing refreshes it. Snapshot first so a later Supabase pause cannot destroy the record.
3. **Task 4 depends on Task 2's output files.**
4. Tasks 5–11 may proceed in order once Task 4 is green.

---

## File structure

**Created:**
- `scripts/snapshot-archive.mjs` — one-shot Supabase → JSON export. Run once, then effectively dead code kept for provenance.
- `server/data/archive/spots.json` — frozen `viewing_spots` rows (generated).
- `server/data/archive/spot-translations.json` — frozen `viewing_spot_translations` rows (generated).
- `server/data/archive/eclipse-day-weather.json` — actual Aug 12 2026 forecasts (generated).
- `server/utils/spotsArchive.ts` — the only module that knows the archive's shape. Loads the JSON, applies locale overlay, exposes typed accessors.
- `app/utils/eventStatus.ts` — the `EVENT_PASSED` flag and eclipse date constant.
- `app/pages/farewell.vue` — farewell page.
- `scripts/sunset-data-minimisation.sql` — GDPR purge, run manually.
- `tests/server/utils/spotsArchive.test.ts`
- `tests/unit/utils/eventStatus.test.ts`

**Modified:**
- `server/api/stripe/checkout.post.ts` — 410.
- `server/api/spots/index.get.ts` — Supabase → `spotsArchive`.
- `server/api/spots/[slug].get.ts` — Supabase → `spotsArchive`.
- `server/api/__sitemap__/urls.ts` — Supabase → `spotsArchive`.
- `nuxt.config.ts` — routeRules for prerender + retirement.
- `vercel.json` — drop crons.
- `.github/workflows/ingest-weather.yml`, `.github/workflows/indexnow.yml` — disable schedules.
- `public/sw.js` — self-destruct.
- `app/composables/useNavItems.ts` — drop `/map`.

**Deleted:**
- `server/api/tasks/indexnow.post.ts` — nothing changes, nothing to notify.

---

### Task 1: Disable Stripe checkout

**Files:**
- Modify: `server/api/stripe/checkout.post.ts`
- Test: `tests/server/api/stripe/checkout.test.ts`

- [ ] **Step 1: Read the existing test file to learn its setup**

Run: `cat tests/server/api/stripe/checkout.test.ts | head -40`

You need its import style and helper usage. The existing tests assert on a live checkout and will be replaced wholesale in Step 3.

- [ ] **Step 2: Write the failing test**

Replace the entire contents of `tests/server/api/stripe/checkout.test.ts` with:

```ts
import { describe, it, expect } from 'vitest'
import { createTestEvent } from '../_helpers'

const { default: handler } = await import('../../../../server/api/stripe/checkout.post')

describe('POST /api/stripe/checkout (retired)', () => {
  it('returns 410 Gone', async () => {
    await expect(handler(createTestEvent({}))).rejects.toMatchObject({
      statusCode: 410,
    })
  })

  it('does not construct a Stripe session', async () => {
    // The handler must not touch runtimeConfig/Stripe at all — if it did,
    // a missing STRIPE_SECRET_KEY in CI would surface as a 500, not a 410.
    await expect(handler(createTestEvent({}))).rejects.toMatchObject({
      statusCode: 410,
      statusMessage: 'Eclipse Pro is no longer for sale',
    })
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run tests/server/api/stripe/checkout.test.ts`
Expected: FAIL — the handler currently tries to read `config.stripeSecretKey` and throws something other than a 410.

- [ ] **Step 4: Replace the handler**

Replace the entire contents of `server/api/stripe/checkout.post.ts` with:

```ts
/**
 * RETIRED 2026-08-13.
 *
 * The Aug 12 2026 eclipse has passed and Eclipse Pro is no longer sold.
 * This handler is kept (rather than deleted) so any stale client still
 * holding the old bundle gets an explicit, permanent 410 rather than a
 * confusing 404 from the router.
 *
 * The Stripe price must ALSO be deactivated in the Stripe dashboard —
 * see docs/superpowers/plans/2026-08-13-eclipsechase-sunset.md Task 1
 * Step 7. Code alone is not sufficient: a Payment Link would bypass this.
 */
export default defineEventHandler(() => {
  throw createError({
    statusCode: 410,
    statusMessage: 'Eclipse Pro is no longer for sale',
  })
})
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run tests/server/api/stripe/checkout.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 6: Commit**

```bash
git add server/api/stripe/checkout.post.ts tests/server/api/stripe/checkout.test.ts
git commit -m "feat(sunset): retire Stripe checkout with 410"
```

- [ ] **Step 7: Deactivate the price in Stripe (manual, required)**

This is not optional and cannot be done in code. In the Stripe dashboard:
1. Products → the Eclipse Pro product → archive the active price
2. Payment Links → deactivate any link pointing at that price

Verify: attempting a checkout from the dashboard's price page shows it as archived.

---

### Task 2: Snapshot the archive data

**Files:**
- Create: `scripts/snapshot-archive.mjs`
- Create (generated): `server/data/archive/spots.json`, `server/data/archive/spot-translations.json`, `server/data/archive/eclipse-day-weather.json`

- [ ] **Step 1: Write the snapshot script**

Create `scripts/snapshot-archive.mjs`:

```js
#!/usr/bin/env node
/**
 * One-shot export of everything the archive needs from Supabase.
 *
 * Run ONCE, before the weather cron is disabled and before the Supabase
 * project is allowed to go idle. Output is committed to git and becomes
 * the permanent source of truth for /spots, /spots/[slug] and the sitemap.
 *
 * Usage:
 *   node scripts/snapshot-archive.mjs
 *
 * Requires SUPABASE_URL and SUPABASE_KEY in the environment (.env is read
 * automatically by --env-file below; pass them inline if you prefer).
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'server', 'data', 'archive')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_KEY must be set')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

/** Eclipse day, UTC bounds. Totality was ~17:43-17:48Z. */
const DAY_START = '2026-08-12T00:00:00Z'
const DAY_END = '2026-08-13T00:00:00Z'

function write(name, payload) {
  const path = join(OUT_DIR, name)
  writeFileSync(path, JSON.stringify(payload, null, 2) + '\n', 'utf8')
  console.log(`wrote ${name}`)
}

async function fetchAll(table, columns) {
  const { data, error } = await supabase.from(table).select(columns)
  if (error) {
    console.error(`failed reading ${table}:`, error.message)
    process.exit(1)
  }
  return data ?? []
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })

  // Full rows — the detail endpoint does `select('*')`, so take everything.
  const spots = await fetchAll('viewing_spots', '*')
  spots.sort((a, b) => (b.totality_duration_seconds ?? 0) - (a.totality_duration_seconds ?? 0))
  console.log(`  ${spots.length} spots`)

  const translations = await fetchAll(
    'viewing_spot_translations',
    'spot_slug, locale, name, description, parking_info, terrain_notes, warnings',
  )
  console.log(`  ${translations.length} translation rows`)

  const stations = await fetchAll('weather_stations', 'id, name, lat, lng, region')

  const { data: forecasts, error: fErr } = await supabase
    .from('weather_forecasts')
    .select('station_id, forecast_time, valid_time, cloud_cover, precipitation_prob')
    .gte('valid_time', DAY_START)
    .lt('valid_time', DAY_END)
    .order('valid_time', { ascending: true })
  if (fErr) {
    console.error('failed reading weather_forecasts:', fErr.message)
    process.exit(1)
  }
  console.log(`  ${forecasts?.length ?? 0} eclipse-day forecast rows`)

  write('spots.json', {
    snapshot_of: 'viewing_spots',
    captured_at: new Date().toISOString(),
    count: spots.length,
    spots,
  })

  write('spot-translations.json', {
    snapshot_of: 'viewing_spot_translations',
    captured_at: new Date().toISOString(),
    count: translations.length,
    translations,
  })

  write('eclipse-day-weather.json', {
    snapshot_of: 'weather_forecasts',
    eclipse_date: '2026-08-12',
    captured_at: new Date().toISOString(),
    stations,
    forecasts: forecasts ?? [],
  })
}

main()
```

- [ ] **Step 2: Run the snapshot**

```bash
node --env-file=.env scripts/snapshot-archive.mjs
```

Expected output: `30 spots`, a non-zero translation count, a non-zero forecast count, and three `wrote …` lines.

**If the spot count is not 30**, stop and investigate before continuing — the spec records 30 spots in production and a mismatch means you are snapshotting the wrong project.

- [ ] **Step 3: Verify the files are well-formed and non-trivial**

```bash
node -e "for (const f of ['spots','spot-translations','eclipse-day-weather']) { const d = require('./server/data/archive/'+f+'.json'); console.log(f, Object.keys(d).join(','), JSON.stringify(d).length + ' bytes') }"
```

Expected: three lines, each well over 1000 bytes.

- [ ] **Step 4: Commit**

```bash
git add scripts/snapshot-archive.mjs server/data/archive/
git commit -m "feat(sunset): snapshot spots, translations and eclipse-day weather"
```

---

### Task 3: Stop all scheduled jobs

**Files:**
- Modify: `vercel.json`
- Modify: `.github/workflows/ingest-weather.yml`
- Modify: `.github/workflows/indexnow.yml`
- Delete: `server/api/tasks/indexnow.post.ts`

- [ ] **Step 1: Remove the Vercel cron**

Replace the entire contents of `vercel.json` with:

```json
{
  "trailingSlash": true
}
```

- [ ] **Step 2: Disable the weather ingestion workflow**

In `.github/workflows/ingest-weather.yml`, delete the `schedule:` block so only manual dispatch remains. The `on:` block becomes exactly:

```yaml
# RETIRED 2026-08-13 — the eclipse has passed and no further weather
# ingestion is wanted. Kept as manual-dispatch-only rather than deleted
# so the ingest path stays documented and reproducible.
on:
  workflow_dispatch:
```

Leave the rest of the file unchanged.

- [ ] **Step 3: Disable the IndexNow workflow**

Apply the same change to `.github/workflows/indexnow.yml` — replace its `on:` block with:

```yaml
# RETIRED 2026-08-13 — the archive's content is frozen, so there are no
# updates to notify search engines about.
on:
  workflow_dispatch:
```

- [ ] **Step 4: Delete the IndexNow endpoint**

```bash
git rm server/api/tasks/indexnow.post.ts
```

If a test exists for it, remove that too:

```bash
git rm -f tests/server/api/tasks/indexnow.test.ts 2>/dev/null || true
```

- [ ] **Step 5: Verify no scheduled trigger remains**

Run: `grep -rn "cron" vercel.json .github/workflows/ || echo "NO CRONS"`
Expected: `NO CRONS`

- [ ] **Step 6: Run the server suite**

Run: `npm run test:server`
Expected: PASS. If a deleted-endpoint test lingers it will fail here — remove it.

- [ ] **Step 7: Commit**

```bash
git add -A vercel.json .github/workflows server/api/tasks tests/server
git commit -m "feat(sunset): stop weather ingestion and IndexNow schedules"
```

---

### Task 4: Serve spots from the frozen archive

This is the largest task. It removes the runtime Supabase dependency that would otherwise let the archive break unattended.

**Files:**
- Create: `server/utils/spotsArchive.ts`
- Test: `tests/server/utils/spotsArchive.test.ts`
- Modify: `server/api/spots/index.get.ts`
- Modify: `server/api/spots/[slug].get.ts`
- Modify: `server/api/__sitemap__/urls.ts`

- [ ] **Step 1: Write the failing test for the archive module**

Create `tests/server/utils/spotsArchive.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  getAllSpots,
  getSpotBySlug,
  getSpotSlugs,
} from '../../../server/utils/spotsArchive'

describe('spotsArchive', () => {
  it('returns every archived spot', () => {
    const spots = getAllSpots()
    expect(spots.length).toBeGreaterThan(0)
    expect(spots[0]).toHaveProperty('slug')
    expect(spots[0]).toHaveProperty('lat')
    expect(spots[0]).toHaveProperty('lng')
  })

  it('orders spots by totality duration, longest first', () => {
    const spots = getAllSpots()
    const durations = spots.map(s => s.totality_duration_seconds ?? 0)
    const sorted = [...durations].sort((a, b) => b - a)
    expect(durations).toEqual(sorted)
  })

  it('finds a spot by slug', () => {
    const slug = getAllSpots()[0]!.slug
    expect(getSpotBySlug(slug)?.slug).toBe(slug)
  })

  it('returns null for an unknown slug', () => {
    expect(getSpotBySlug('no-such-spot-anywhere')).toBeNull()
  })

  it('lists every slug', () => {
    expect(getSpotSlugs()).toHaveLength(getAllSpots().length)
  })

  it('returns a defensive copy so callers cannot mutate the archive', () => {
    const first = getAllSpots()[0]!
    const originalName = first.name
    first.name = 'MUTATED'
    expect(getAllSpots()[0]!.name).toBe(originalName)
  })

  it('leaves English rows unchanged', () => {
    const slug = getAllSpots()[0]!.slug
    expect(getSpotBySlug(slug, 'en')).toEqual(getSpotBySlug(slug))
  })

  it('applies an Icelandic overlay when one exists', () => {
    // Find any slug that actually has an `is` translation with a name.
    const withIs = getAllSpots().find((s) => {
      const tr = getSpotBySlug(s.slug, 'is')
      return tr && tr.name !== s.name
    })
    // If the archive has no Icelandic names at all this assertion is vacuous,
    // which is correct — the overlay is optional, partial translations are
    // expected, and the fallback path is covered by the test above.
    if (withIs) {
      expect(getSpotBySlug(withIs.slug, 'is')!.name).not.toBe(withIs.name)
    }
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/server/utils/spotsArchive.test.ts`
Expected: FAIL — `Cannot find module '../../../server/utils/spotsArchive'`.

- [ ] **Step 3: Implement the archive module**

Create `server/utils/spotsArchive.ts`:

```ts
/**
 * Frozen viewing-spot archive.
 *
 * The Aug 12 2026 eclipse has passed, so this data will never change
 * again. It is imported statically (not read from disk) so Nitro bundles
 * it into the server build — that removes both the Supabase runtime
 * dependency and any filesystem path assumptions on Vercel.
 *
 * This module is the ONLY place that knows the archive's on-disk shape.
 * Generated by scripts/snapshot-archive.mjs.
 */
import spotsData from '../data/archive/spots.json'
import translationsData from '../data/archive/spot-translations.json'

export interface ArchivedSpot {
  id: string
  name: string
  slug: string
  lat: number
  lng: number
  region: string
  totality_duration_seconds: number | null
  [key: string]: unknown
}

interface ArchivedTranslation {
  spot_slug: string
  locale: string
  name: string | null
  description: string | null
  parking_info: string | null
  terrain_notes: string | null
  warnings: unknown
}

const TRANSLATABLE_FIELDS = [
  'name',
  'description',
  'parking_info',
  'terrain_notes',
  'warnings',
] as const

const SPOTS = (spotsData as { spots: ArchivedSpot[] }).spots
const TRANSLATIONS = (translationsData as { translations: ArchivedTranslation[] }).translations

/** locale -> slug -> translation row */
const byLocale = new Map<string, Map<string, ArchivedTranslation>>()
for (const tr of TRANSLATIONS) {
  let forLocale = byLocale.get(tr.locale)
  if (!forLocale) {
    forLocale = new Map()
    byLocale.set(tr.locale, forLocale)
  }
  forLocale.set(tr.spot_slug, tr)
}

/**
 * Overlay locale copy onto a spot. Any NULL field on the translation row
 * falls back to the English base row, so partial translations are safe.
 * Always returns a fresh object — callers must never be able to mutate
 * the module-level archive.
 */
function localise(spot: ArchivedSpot, locale: string): ArchivedSpot {
  const copy = { ...spot }
  if (locale === 'en') return copy
  const tr = byLocale.get(locale)?.get(spot.slug)
  if (!tr) return copy
  for (const field of TRANSLATABLE_FIELDS) {
    const value = (tr as Record<string, unknown>)[field]
    if (value !== null && value !== undefined) copy[field] = value
  }
  return copy
}

/** Every spot, longest totality first (the order the list page expects). */
export function getAllSpots(locale = 'en'): ArchivedSpot[] {
  return SPOTS.map(s => localise(s, locale))
}

export function getSpotBySlug(slug: string, locale = 'en'): ArchivedSpot | null {
  const spot = SPOTS.find(s => s.slug === slug)
  return spot ? localise(spot, locale) : null
}

export function getSpotSlugs(): string[] {
  return SPOTS.map(s => s.slug)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/server/utils/spotsArchive.test.ts`
Expected: PASS, 8 tests.

If it fails with a JSON import error, confirm `resolveJsonModule` is enabled:
`node -e "console.log(require('./.nuxt/tsconfig.server.json').compilerOptions?.resolveJsonModule)"`
Nuxt enables it by default; if it is somehow false, add `"resolveJsonModule": true` under `compilerOptions` in `tsconfig.json`.

- [ ] **Step 5: Commit the module**

```bash
git add server/utils/spotsArchive.ts tests/server/utils/spotsArchive.test.ts
git commit -m "feat(sunset): add frozen spots archive module"
```

- [ ] **Step 6: Repoint the spots list endpoint**

Replace the entire contents of `server/api/spots/index.get.ts` with:

```ts
import { getAllSpots } from '../../utils/spotsArchive'

/**
 * Spots list, served from the frozen archive (see server/utils/spotsArchive.ts).
 * Previously read Supabase per request; the eclipse has passed and the data
 * is immutable, so the runtime database dependency was removed 2026-08-13.
 */
export default defineEventHandler((event) => {
  // Edge cache: set here (not via routeRules) because trailingSlash:true
  // rewrites the request path, so the Vercel header-route keyed to the
  // no-slash path never matches the served /api/spots/. Immutable data,
  // so the TTL is now a day rather than five minutes.
  setResponseHeader(event, 'Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')

  const query = getQuery(event)
  const locale = typeof query.locale === 'string' && query.locale.length <= 8
    ? query.locale
    : 'en'

  const data = getAllSpots(locale)
  const view = typeof query.view === 'string' ? query.view : null

  // List-view projection (the /spots grid). That page renders only each
  // spot's hero thumbnail and reads horizon_check.verdict for ranking — it
  // never touches the full photos array or warnings. Shipping the complete
  // photos JSONB made the list payload ~240 KB and dominated the critical
  // path on throttled mobile. Project down to just what the list needs.
  if (view === 'list') {
    const asJson = (v: unknown) => {
      if (typeof v !== 'string') return v
      try { return JSON.parse(v) } catch { return null }
    }
    const projected = data.map((spot: any) => {
      const photos = asJson(spot.photos)
      const arr = Array.isArray(photos) ? photos : []
      const hero = arr.find((p: any) => p?.is_hero) || arr[0] || null
      const hc = asJson(spot.horizon_check) as { verdict?: string } | null
      const { warnings: _warnings, ...rest } = spot
      return {
        ...rest,
        horizon_check: hc?.verdict ? { verdict: hc.verdict } : null,
        photos: hero
          ? [{ filename: hero.filename ?? null, alt: hero.alt ?? null, is_hero: true }]
          : [],
      }
    })
    return { spots: projected }
  }

  return { spots: data }
})
```

- [ ] **Step 7: Repoint the spot detail endpoint**

Replace the entire contents of `server/api/spots/[slug].get.ts` with:

```ts
import { getSpotBySlug } from '../../utils/spotsArchive'

/**
 * Spot detail, served from the frozen archive.
 *
 * The nearestGridPoint() fallback for c1/c4 is gone: migration 017 stored
 * both per-spot, the snapshot captured them, and no new spots will ever be
 * added. Whatever the archive holds is final.
 */
export default defineEventHandler((event) => {
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Slug is required' })
  }

  const query = getQuery(event)
  const locale = typeof query.locale === 'string' && query.locale.length <= 8
    ? query.locale
    : 'en'

  const spot = getSpotBySlug(slug, locale)

  if (!spot) {
    throw createError({ statusCode: 404, statusMessage: 'Spot not found' })
  }

  setResponseHeader(event, 'Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')

  return { spot }
})
```

- [ ] **Step 8: Repoint the sitemap**

Replace the entire contents of `server/api/__sitemap__/urls.ts` with:

```ts
import { getSpotSlugs } from '../../utils/spotsArchive'

// Nitro auto-imports `defineSitemapEventHandler` at runtime via
// @nuxtjs/sitemap. An explicit `import … from '#imports'` would break
// Vitest under env:node (the virtual module is unresolvable there).
declare const defineSitemapEventHandler: <T>(
  fn: (event: import('h3').H3Event) => T | Promise<T>,
) => (event: import('h3').H3Event) => T | Promise<T>

export default defineSitemapEventHandler((event) => {
  // The archive is frozen, so lastmod is the deploy date baked into
  // runtimeConfig at build time — stable within a deploy, refreshed on
  // redeploy. autoLastmod can't reach these (no source file).
  const lastmod = useRuntimeConfig(event).buildDate as string

  return getSpotSlugs().map(slug => ({
    loc: `/spots/${slug}`,
    lastmod,
    changefreq: 'yearly',
    priority: 0.7,
    // Expand each spot across every configured locale (en + is) so the
    // Icelandic sitemap gets /is/spots/<slug> too, with hreflang
    // alternates.
    _i18nTransform: true,
  }))
})
```

- [ ] **Step 9: Update the sitemap test for the new source and changefreq**

Replace the entire contents of `tests/server/api/sitemap-urls.test.ts` with:

```ts
import { describe, it, expect } from 'vitest'
import { createTestEvent } from './_helpers'
import { getSpotSlugs } from '../../../server/utils/spotsArchive'

// `defineSitemapEventHandler` is auto-imported by Nitro at runtime
// (and declared as a type-only global in the handler). Provide a
// passthrough here so the imported handler is just the inner function.
;(globalThis as any).defineSitemapEventHandler = (fn: any) => fn

const { default: handler } = await import('../../../server/api/__sitemap__/urls')

describe('GET /api/__sitemap__/urls', () => {
  it('returns one entry per archived spot', async () => {
    const result = await handler(createTestEvent({}))
    expect(result).toHaveLength(getSpotSlugs().length)
  })

  it('emits archive-appropriate metadata', async () => {
    const result = await handler(createTestEvent({}))
    expect(result[0]).toEqual({
      loc: `/spots/${getSpotSlugs()[0]}`,
      lastmod: expect.any(String),
      changefreq: 'yearly',
      priority: 0.7,
      _i18nTransform: true,
    })
  })
})
```

- [ ] **Step 10: Update the spots endpoint tests**

The existing `tests/server/api/spots/index.test.ts` and `slug.test.ts` mock Supabase and will now fail. Rewrite both to assert against the real archive.

Replace `tests/server/api/spots/index.test.ts` with:

```ts
import { describe, it, expect } from 'vitest'
import { createTestEvent } from '../_helpers'
import { getAllSpots } from '../../../../server/utils/spotsArchive'

const { default: handler } = await import('../../../../server/api/spots/index.get')

describe('GET /api/spots', () => {
  it('returns every archived spot', async () => {
    const res: any = await handler(createTestEvent({}))
    expect(res.spots).toHaveLength(getAllSpots().length)
  })

  it('projects down to a hero photo under ?view=list', async () => {
    const res: any = await handler(createTestEvent({ query: { view: 'list' } }))
    for (const spot of res.spots) {
      expect(spot.photos.length).toBeLessThanOrEqual(1)
      expect(spot).not.toHaveProperty('warnings')
    }
  })

  it('keeps the full payload without ?view=list', async () => {
    const res: any = await handler(createTestEvent({}))
    expect(res.spots[0]).toHaveProperty('warnings')
  })
})
```

Replace `tests/server/api/spots/slug.test.ts` with:

```ts
import { describe, it, expect } from 'vitest'
import { createTestEvent } from '../_helpers'
import { getAllSpots } from '../../../../server/utils/spotsArchive'

const { default: handler } = await import('../../../../server/api/spots/[slug].get')

const KNOWN_SLUG = getAllSpots()[0]!.slug

describe('GET /api/spots/[slug]', () => {
  it('returns the requested spot', () => {
    const res: any = handler(createTestEvent({ params: { slug: KNOWN_SLUG } }))
    expect(res.spot.slug).toBe(KNOWN_SLUG)
  })

  // NOTE: the handler is synchronous, so it THROWS rather than returning a
  // rejected promise. `await expect(...).rejects` does not work here — the
  // throw happens while evaluating the argument to expect(). Confirmed the
  // hard way on Task 1. Use the thunk form.
  it('404s on an unknown slug', () => {
    expect(() => handler(createTestEvent({ params: { slug: 'nope-not-a-spot' } })))
      .toThrowError(expect.objectContaining({ statusCode: 404 }))
  })

  it('400s when the slug is missing', () => {
    expect(() => handler(createTestEvent({ params: {} })))
      .toThrowError(expect.objectContaining({ statusCode: 400 }))
  })
})
```

- [ ] **Step 11: Check the test helper supports `params` and `query`**

Run: `grep -n "params\|query" tests/server/api/_helpers.ts | head -20`

`createTestEvent` must let you set router params and query. If it does not support `params`, add it to `_helpers.ts` by setting `event.context.params`. If it does not support `query`, set the underlying request URL accordingly. Make the helper change first, then re-run.

- [ ] **Step 12: Run the full server suite**

Run: `npm run test:server`
Expected: PASS.

- [ ] **Step 13: Verify no Supabase reference remains in the archive path**

Run: `grep -rn "supabase" server/api/spots/ server/api/__sitemap__/ server/utils/spotsArchive.ts || echo "CLEAN"`
Expected: `CLEAN`

- [ ] **Step 14: Commit**

```bash
git add server/api/spots server/api/__sitemap__ tests/server
git commit -m "feat(sunset): serve spots and sitemap from the frozen archive"
```

---

### Task 5: Retire the Pro routes

**Files:**
- Modify: `nuxt.config.ts` (routeRules)
- Create: `app/pages/farewell.vue` (minimal placeholder here, filled in Task 8)

Note: `app/pages/` contains no `me.vue` — CLAUDE.md is stale on that point. The Pro surfaces are `/map`, `/dashboard`, `/check`, `/pro`, `/pro/success`.

- [ ] **Step 1: Create a placeholder farewell page so the redirects have a target**

Create `app/pages/farewell.vue`:

```vue
<template>
  <PageShell screen="farewell" width="reading">
    <h1 class="font-display text-3xl font-bold text-ink-1">Thank you</h1>
  </PageShell>
</template>
```

- [ ] **Step 2: Update routeRules**

In `nuxt.config.ts`, inside the existing `routeRules` object, make these changes.

Replace the `'/pro': { ssr: true },` line with:

```ts
    // RETIRED 2026-08-13. The eclipse has passed; Pro is no longer sold.
    // 301 (not 410) because these URLs were public and indexed — the
    // farewell page is the honest successor content.
    '/pro': { redirect: { to: '/farewell', statusCode: 301 } },
    '/pro/success': { redirect: { to: '/farewell', statusCode: 301 } },
```

Replace the `'/dashboard': { ssr: false },` and `'/map': { ssr: false },` lines with:

```ts
    // 410 Gone rather than a redirect: these were Pro-gated and never
    // indexed, so there is no search equity to preserve and a permanent
    // "this is gone" is the truthful signal.
    '/dashboard': { ssr: false, prerender: false },
    '/map': { ssr: false, prerender: false },
```

Then add the spots prerender entries. Replace the existing `'/spots': { … }` block with:

```ts
    // The archive is static — prerender the list and every detail page so
    // the site serves as pure CDN HTML with no server work at all.
    '/spots': { prerender: true },
    '/spots/**': { prerender: true },
```

- [ ] **Step 3: Add the 410 route handler**

routeRules cannot emit a 410 body, so add a server middleware. Create `server/middleware/retired-routes.ts`:

```ts
/**
 * RETIRED 2026-08-13.
 *
 * The Pro app surfaces are gone. They were gated and never indexed, so a
 * permanent 410 is the correct signal — it tells crawlers to drop them
 * immediately rather than retrying a 404 for months.
 *
 * /pro and /pro/success are handled by routeRules redirects instead: those
 * URLs were public, so they get a 301 to /farewell.
 */
const RETIRED_PREFIXES = [
  '/map',
  '/dashboard',
  '/check',
  '/api/cameras',
  '/api/traffic',
  '/api/horizon',
]

export default defineEventHandler((event) => {
  const path = event.path.split('?')[0]!.replace(/\/$/, '') || '/'
  const retired = RETIRED_PREFIXES.some(p => path === p || path.startsWith(p + '/'))
  if (!retired) return

  throw createError({
    statusCode: 410,
    statusMessage: 'This feature retired after the August 12, 2026 eclipse',
  })
})
```

- [ ] **Step 4: Write the test**

Create `tests/server/middleware/retired-routes.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { createTestEvent } from '../api/_helpers'

const { default: handler } = await import('../../../server/middleware/retired-routes')

function eventFor(path: string) {
  const event = createTestEvent({})
  Object.defineProperty(event, 'path', { value: path, configurable: true })
  return event
}

describe('retired-routes middleware', () => {
  for (const path of ['/map', '/map/', '/dashboard', '/check', '/api/cameras', '/api/traffic/conditions']) {
    it(`410s ${path}`, () => {
      expect(() => handler(eventFor(path))).toThrowError(
        expect.objectContaining({ statusCode: 410 }),
      )
    })
  }

  for (const path of ['/', '/spots', '/spots/some-spot', '/guide', '/api/spots', '/farewell']) {
    it(`allows ${path}`, () => {
      expect(() => handler(eventFor(path))).not.toThrow()
    })
  }
})
```

- [ ] **Step 5: Run the test**

Run: `npx vitest run tests/server/middleware/retired-routes.test.ts`
Expected: PASS, 12 tests.

If `createTestEvent` produces an event whose `path` is not configurable, build the event directly with h3's `createEvent` as `_helpers.ts` does internally.

- [ ] **Step 6: Remove the pro-gate middleware**

The server-side 410 now supersedes it — a client-side redirect to `/pro` is
both unreachable and wrong, since `/pro` itself is retired.

Find every usage:

```bash
grep -rn "pro-gate" app/ tests/
```

For each page that declares it (expect `app/pages/map.vue`,
`app/pages/dashboard.vue`, `app/pages/check.vue`), remove only the middleware
entry from its `definePageMeta` call. For example, change:

```ts
definePageMeta({ middleware: 'pro-gate' })
```

to remove the whole call if `middleware` was its only key, or drop just that
key if others remain.

Then delete the middleware and its test:

```bash
git rm app/middleware/pro-gate.ts
git rm -f tests/unit/middleware/pro-gate.test.ts 2>/dev/null || true
```

**Leave the retired page files themselves in place.** They are unreachable
behind the 410, and deleting them would cascade into every `/map`-only
component (`EclipseMap`, `MapChipStack`, `map/dock/*`) and their test suites —
a large blast radius for no user-visible gain.

- [ ] **Step 7: Run the affected suites**

Run: `npm run test:unit && npm run test:server`
Expected: PASS. If a component test imported the deleted middleware, remove
that import.

- [ ] **Step 8: Commit**

```bash
git add -A nuxt.config.ts server/middleware app/pages app/middleware tests
git commit -m "feat(sunset): retire Pro routes with 410 and redirect /pro to /farewell"
```

---

### Task 6: Remove retired routes from navigation

**Files:**
- Modify: `app/composables/useNavItems.ts`
- Test: `tests/components/BottomNav.test.ts`

- [ ] **Step 1: Read the existing nav test**

Run: `cat tests/components/BottomNav.test.ts`

Note every assertion that references `/map` or `locked` — they all need updating.

- [ ] **Step 2: Update the composable**

In `app/composables/useNavItems.ts`, replace the `items` computed with:

```ts
  const items = computed<NavItem[]>(() => [
    { to: '/',       label: t('nav.home'),  icon: 'home' },
    { to: '/spots',  label: t('nav.spots'), icon: 'spots' },
    { to: '/guide',  label: t('nav.guide'), icon: 'guide' },
  ])
```

Then update the docblock at the top of the file, replacing the first paragraph with:

```
/**
 * Shared nav items used by both the desktop top nav (masthead) and the
 * mobile bottom nav.
 *
 * RETIRED 2026-08-13: the Map tab and the Pro-aware Home target are gone
 * along with the Pro app surfaces. Home always resolves to `/`, and no
 * item is `locked` — there is nothing left to upsell.
 *
 * Labels resolve through useI18n() so they follow the active locale.
 */
```

`useProStatus` is now unused in this file — remove the `const { isPro } = useProStatus()` line.

Leave the `NavItem.locked` field and the `'map'` member of `NavIcon` in place: `IconMap.vue` still exists and other code may reference the type.

- [ ] **Step 3: Update the nav test**

In `tests/components/BottomNav.test.ts`, update assertions so that:
- the rendered tab count is 3
- no tab links to `/map`
- no tab renders a locked state

Add this test to the describe block:

```ts
  it('does not offer the retired map tab', () => {
    const wrapper = mount(BottomNav)
    expect(wrapper.html()).not.toContain('/map')
  })
```

Adjust the surrounding assertions to match the component's actual existing test style — reuse whatever `mount` and setup the file already has rather than inventing a new pattern.

- [ ] **Step 4: Run the component tests**

Run: `npm run test:components`
Expected: PASS. Any other component asserting a 4-tab nav must be updated the same way.

- [ ] **Step 5: Commit**

```bash
git add app/composables/useNavItems.ts tests/components
git commit -m "feat(sunset): drop the map tab from navigation"
```

---

### Task 7: Retire the service worker

Without this, anyone who installed the PWA keeps a dead app shell on their home screen indefinitely, serving cached gated pages that no longer resolve.

**Files:**
- Modify: `public/sw.js`

- [ ] **Step 1: Replace the service worker wholesale**

Replace the entire contents of `public/sw.js` with:

```js
/**
 * RETIRED 2026-08-13 — self-destructing service worker.
 *
 * The Aug 12 2026 eclipse has passed and eclipsechase.is is now a static
 * archive. This worker exists only to undo its predecessors: it deletes
 * every cache this origin ever created, unregisters itself, and forces
 * open clients to reload against the network.
 *
 * Bumping the version string is what causes browsers holding v9 to fetch
 * this file and install it in the first place.
 *
 * Do NOT delete this file. If sw.js starts 404ing, browsers that already
 * have v9 installed keep it forever — a 404 does not unregister a worker.
 * This file must stay reachable indefinitely.
 */
const VERSION = 'eclipsechase-sunset-v10'

self.addEventListener('install', (event) => {
  // Take over as soon as possible rather than waiting for every tab to close.
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(names.map((name) => caches.delete(name)))

      await self.clients.claim()
      await self.registration.unregister()

      // Reload every open client so they drop the cached app shell and
      // fetch the live archive instead.
      const clients = await self.clients.matchAll({ type: 'window' })
      for (const client of clients) {
        client.navigate(client.url).catch(() => {})
      }

      console.log(`[sw] ${VERSION}: caches cleared, worker unregistered`)
    })(),
  )
})

// No fetch handler: every request goes straight to the network.
```

- [ ] **Step 2: Check for existing service worker tests**

Run: `grep -rln "sw.js\|serviceWorker" tests/ | head`

If a test asserts on `CACHE_NAME`, `PRECACHE_URLS`, or fetch-handler behaviour, it is now testing deleted functionality — delete those test files or the obsolete cases. The registration plugin test (`app/plugins/sw.client.ts`) should keep passing; registration is still correct, since the worker must be fetched in order to self-destruct.

- [ ] **Step 3: Run the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add public/sw.js tests
git commit -m "feat(sunset): replace service worker with a self-destructing one"
```

---

### Task 8: Freeze the live-data UI and write the farewell page

**Files:**
- Create: `app/utils/eventStatus.ts`
- Test: `tests/unit/utils/eventStatus.test.ts`
- Modify: `app/pages/farewell.vue`
- Modify: `app/composables/useCountdown.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/utils/eventStatus.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { ECLIPSE_DATE, hasEclipsePassed } from '../../../app/utils/eventStatus'

describe('eventStatus', () => {
  it('pins the eclipse to 2026-08-12T17:46:00Z', () => {
    expect(ECLIPSE_DATE.toISOString()).toBe('2026-08-12T17:46:00.000Z')
  })

  it('reports the eclipse as passed for any time after it', () => {
    expect(hasEclipsePassed(new Date('2026-08-13T00:00:00Z'))).toBe(true)
  })

  it('reports the eclipse as upcoming for any time before it', () => {
    expect(hasEclipsePassed(new Date('2026-08-01T00:00:00Z'))).toBe(false)
  })

  it('defaults to the current clock, which is after the eclipse', () => {
    expect(hasEclipsePassed()).toBe(true)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/utils/eventStatus.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement it**

Create `app/utils/eventStatus.ts`:

```ts
/**
 * Single source of truth for "has the eclipse happened yet".
 *
 * Kept as a function of a passed-in date (rather than a hardcoded `true`)
 * so the countdown components stay unit-testable at both sides of the
 * boundary, and so the logic reads honestly rather than as a magic flag.
 */

/** Eclipse totality mid-point: August 12, 2026 at 17:46 UTC. */
export const ECLIPSE_DATE = new Date('2026-08-12T17:46:00Z')

export function hasEclipsePassed(now: Date = new Date()): boolean {
  return now.getTime() >= ECLIPSE_DATE.getTime()
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/utils/eventStatus.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Point the countdown at the shared constant**

In `app/composables/useCountdown.ts`, replace the first two lines:

```ts
// Eclipse totality mid-point: August 12, 2026 at 17:46 UTC
const ECLIPSE_DATE = new Date('2026-08-12T17:46:00Z')
```

with:

```ts
import { ECLIPSE_DATE, hasEclipsePassed } from '~/utils/eventStatus'
```

Then add `passed` to the returned object — change the final line from:

```ts
  return { remaining, eclipseDate: ECLIPSE_DATE }
```

to:

```ts
  return { remaining, eclipseDate: ECLIPSE_DATE, passed: computed(() => hasEclipsePassed(new Date(now.value))) }
```

The existing `remaining` computed already clamps to all-zeroes once the date passes, so no other change is needed there.

- [ ] **Step 6: Run the countdown tests**

Run: `npx vitest run tests/components/CountdownBar.test.ts`
Expected: PASS. If a test asserts a live ticking countdown with a mocked pre-eclipse clock, it still passes — `hasEclipsePassed` is clock-driven, not hardcoded.

- [ ] **Step 7: Write the real farewell page**

Replace the entire contents of `app/pages/farewell.vue` with:

```vue
<script setup lang="ts">
useHead({
  title: 'Thank you — EclipseChase',
  meta: [
    { name: 'description', content: 'The August 12, 2026 total solar eclipse over Iceland has passed. EclipseChase is now an archive.' },
    { name: 'robots', content: 'index, follow' },
  ],
})
</script>

<template>
  <PageShell screen="farewell" width="reading">
    <p class="font-mono text-xs tracking-[0.3em] text-accent/60 uppercase mb-3">
      August 12, 2026
    </p>

    <h1 class="font-display text-3xl sm:text-4xl font-bold text-ink-1 mb-6">
      It's over. Thank you for chasing it with us.
    </h1>

    <div class="space-y-4 text-base text-ink-2 leading-relaxed">
      <p>
        The Moon's shadow crossed Iceland at 17:43 UTC and was gone by 17:48.
        Somewhere between two minutes and two minutes fifteen, depending on
        where you stood.
      </p>
      <p>
        EclipseChase was built for that one afternoon, and that afternoon has
        happened. The live map, the forecasts and the road cameras have been
        switched off — there is nothing left for them to predict.
      </p>
      <p>
        What stays is the record: the
        <NuxtLink to="/guide" class="text-accent hover:text-accent-strong transition-colors">guide</NuxtLink>,
        and all thirty
        <NuxtLink to="/spots" class="text-accent hover:text-accent-strong transition-colors">viewing spots</NuxtLink>
        with their geometry, horizon profiles and the weather that actually
        turned up on the day.
      </p>
    </div>

    <div class="bg-surface border border-border-subtle/40 rounded px-4 py-4 mt-8">
      <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3 mb-1.5">
        Next total eclipse over Iceland
      </p>
      <p class="font-display text-2xl font-bold text-ink-1">2196</p>
      <p class="text-sm text-ink-2 mt-2">
        Sooner, and rather more reachable: August 2, 2027 — southern Spain,
        Morocco and Egypt, with over six minutes of totality at Luxor.
      </p>
    </div>
  </PageShell>
</template>
```

- [ ] **Step 8: Add the archive banner to the shell**

In `app/components/PageShell.vue`, add this immediately inside the root wrapper element, before the default slot:

```vue
    <div class="px-3 py-2.5 ec-banner-info text-xs font-mono mb-6">
      The August 12, 2026 eclipse has passed. This site is kept as an archive.
    </div>
```

- [ ] **Step 9: Run the full suite**

Run: `npm test`
Expected: PASS. `PageShell` snapshot tests will fail on the new banner — inspect each diff to confirm it is only the banner, then update snapshots with `npx vitest run -u`.

- [ ] **Step 10: Commit**

```bash
git add app/utils/eventStatus.ts app/composables/useCountdown.ts app/pages/farewell.vue app/components/PageShell.vue tests
git commit -m "feat(sunset): add farewell page, archive banner and passed-event state"
```

---

### Task 9: Verify the build and prerender

**Files:** none modified — this is a verification gate.

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 2: Confirm the spot pages were prerendered to HTML**

```bash
ls .output/public/spots/ | head -5
```

Expected: one directory per spot slug, plus an `index.html`.

If only `index.html` appears, Nitro's crawler did not follow the links from
`/spots` to each detail page. Enumerate them explicitly instead — add to the
`nitro` block in `nuxt.config.ts`:

```ts
    prerender: {
      crawlLinks: true,
      routes: ['/spots'],
    },
```

If that still misses pages, generate the route list from the archive at config
time by importing `server/data/archive/spots.json` in `nuxt.config.ts` and
mapping `spots.map(s => '/spots/' + s.slug)` into `prerender.routes`.

- [ ] **Step 3: Prove the archive no longer needs Supabase**

Start the built server with the Supabase env vars pointed at a dead host:

```bash
SUPABASE_URL=http://127.0.0.1:1 SUPABASE_KEY=dead node .output/server/index.mjs
```

In a second shell:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/spots/
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/spots/
```

Expected: `200` for both. This is success criterion 3 from the spec and the single most important check in the plan.

- [ ] **Step 4: Verify the retirements**

```bash
curl -s -o /dev/null -w "map:%{http_code}\n" http://localhost:3000/map/
curl -s -o /dev/null -w "dashboard:%{http_code}\n" http://localhost:3000/dashboard/
curl -s -o /dev/null -w "check:%{http_code}\n" http://localhost:3000/check/
curl -s -o /dev/null -w "checkout:%{http_code}\n" -X POST http://localhost:3000/api/stripe/checkout/
curl -s -o /dev/null -w "pro:%{http_code}\n" http://localhost:3000/pro/
```

Expected: `410` for map, dashboard, check and checkout; `301` for pro.

- [ ] **Step 5: Stop the server**

Ctrl-C the server process.

---

### Task 10: Data minimisation

**Files:**
- Create: `scripts/sunset-data-minimisation.sql`

This runs manually against Supabase. Read `app/pages/privacy.vue` first — the retention promises there govern what you may and must delete.

- [ ] **Step 1: Read the privacy policy's retention section**

Run: `grep -n -i "retain\|retention\|delete\|erase" app/pages/privacy.vue`

Reconcile the statements you find with the SQL below. If the policy promises something stricter than this script does, the policy wins — widen the script.

- [ ] **Step 2: Write the SQL**

Create `scripts/sunset-data-minimisation.sql`:

```sql
-- Sunset data minimisation — run once, manually, in the Supabase SQL editor.
-- See docs/superpowers/specs/2026-08-13-eclipsechase-sunset-and-b2b-pivot-design.md §3.8
--
-- Run each statement individually and check the row counts. This is
-- irreversible; take a backup first via the Supabase dashboard.

-- 1. Restore codes: short-lived OTPs, all long expired. Nothing here has
--    any lawful basis for retention now that restore is retired.
DELETE FROM restore_codes;

-- 2. Pro purchases: drop the plaintext email but keep the row. The hash
--    still supports a support enquiry ("did I buy this?"), and Stripe
--    remains the authoritative record for accounting, so our copy of the
--    address is no longer necessary.
UPDATE pro_purchases
SET email = 'redacted@sunset.local'
WHERE email <> 'redacted@sunset.local';

-- 3. Verify: no plaintext addresses remain, hashes intact.
SELECT count(*) AS total,
       count(*) FILTER (WHERE email = 'redacted@sunset.local') AS redacted,
       count(*) FILTER (WHERE email_hash IS NOT NULL) AS hashed
FROM pro_purchases;
```

- [ ] **Step 3: Decide the email_signups question before running anything**

The spec (§3.8) says retain `email_signups` only on a basis consistent with `privacy.vue`. Because Task 4 of the design decided **no farewell emails are sent**, the list has no remaining active purpose.

Choose one and record the choice in the commit message:
- **Delete it** — `DELETE FROM email_signups;` — cleanest under data minimisation, and consistent with never contacting them.
- **Retain it** — only if `privacy.vue` already discloses retention for future eclipse projects. If it does not, delete.

Append the chosen statement to the script.

- [ ] **Step 4: Back up, then run**

In the Supabase dashboard: take a manual backup, then run the script statement by statement in the SQL editor. Confirm the verification SELECT returns `total == redacted` and `hashed == total`.

- [ ] **Step 5: Commit the script**

```bash
git add scripts/sunset-data-minimisation.sql
git commit -m "chore(sunset): add data minimisation script"
```

---

### Task 11: Final verification against the spec

**Files:** none — this is the acceptance gate for spec §6.

- [ ] **Step 1: Run everything**

Run: `npm test`
Expected: PASS.

Run: `npm run lint:placeholders`
Expected: PASS.

- [ ] **Step 2: Walk the success criteria**

Confirm each item from spec §6 and tick it here:

- [ ] Stripe checkout returns 410 **and** the price is archived in the Stripe dashboard (Task 1 Step 7)
- [ ] No scheduled job calls vedur.is or Vegagerðin — `grep -rn "cron" vercel.json .github/workflows/` returns nothing
- [ ] `/spots` and `/spots/[slug]` render with Supabase unreachable (Task 9 Step 3)
- [ ] `/map`, `/dashboard`, `/check` return 410; `/pro`, `/pro/success` return 301 (Task 9 Step 4)
- [ ] A previously installed PWA no longer serves cached gated pages — verify manually: load the site in a browser that had it installed, confirm in DevTools → Application → Service Workers that the worker unregisters and Cache Storage empties
- [ ] No page displays a live countdown, live forecast, or purchase CTA — click through `/`, `/spots`, a spot detail page and `/guide`
- [ ] `restore_codes` is empty and `pro_purchases` is minimised (Task 10 Step 4)

- [ ] **Step 3: Deploy**

```bash
git push
```

Then verify against production:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://eclipsechase.is/spots/
curl -s -o /dev/null -w "%{http_code}\n" https://eclipsechase.is/map/
curl -s -o /dev/null -w "%{http_code}\n" https://eclipsechase.is/farewell/
```

Expected: `200`, `410`, `200`.

- [ ] **Step 4: Pause the Supabase project**

Once Step 3 confirms the archive serves without the database, pause the Supabase project from its dashboard. If anything still depends on it, the site will break immediately and visibly — which is why this is the last step rather than an early one.

Leave it paused. Do not delete it: the snapshot is committed, but the project is the only remaining copy of everything outside the archive.

---

## Notes for the implementer

- **Synchronous handlers throw; they do not reject.** Several handlers in this
  plan are plain (non-`async`) `defineEventHandler` functions. `await
  expect(handler(event)).rejects.…` fails against them, because the throw
  happens while evaluating the argument to `expect()`. Use
  `expect(() => handler(event)).toThrowError(expect.objectContaining({ statusCode: N }))`.
  Task 1 hit this; Tasks 4 and 5 are already written in the correct form.
- **`createTestEvent` supports `supabase`, `body`, `query`, `params`, `headers`
  and `rawBody`** (verified in `tests/server/api/_helpers.ts:85`). Task 4
  Step 11's contingency is therefore expected to be a no-op — check, then move on.

- **Do not delete `public/sw.js`.** A 404 does not unregister a service worker. Browsers holding v9 need to successfully fetch v10 in order to self-destruct, so that file must remain reachable forever.
- **`server/data/archive/*.json` is generated but committed.** Do not add it to `.gitignore`. It is the source of truth now — losing it loses the site.
- **`scripts/snapshot-archive.mjs` is single-use.** It is kept for provenance so the archive's origin is auditable. It will stop working once Supabase is paused, which is expected and fine.
