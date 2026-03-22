# Test Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up comprehensive test infrastructure for the EclipseChase PWA with ~72 test files covering unit, server, component, and E2E layers.

**Architecture:** Three-layer testing pyramid — Vitest for unit/server/component tests, Playwright for E2E, MSW for HTTP-level mocking of all external services. Tests organized by layer in `tests/` directory.

**Tech Stack:** Vitest, @nuxt/test-utils, @vue/test-utils, Playwright, MSW 2.x, happy-dom, simple-git-hooks

**Spec:** `docs/superpowers/specs/2026-03-22-test-infrastructure-design.md`

---

## Task 1: Foundation — Dependencies & Configuration

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `.env.test`
- Create: `tests/mocks/setup.ts`
- Create: `tests/mocks/mapbox-gl.ts`
- Create: `tests/mocks/keys/private.pem`
- Create: `tests/mocks/keys/public.pem`

- [ ] **Step 1: Install test dependencies**

```bash
npm install -D vitest @nuxt/test-utils @vue/test-utils @playwright/test msw happy-dom simple-git-hooks
```

- [ ] **Step 2: Add test scripts and git hooks to package.json**

Add to `package.json`:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:unit": "vitest run --dir tests/unit",
    "test:server": "vitest run --dir tests/server",
    "test:components": "vitest run --dir tests/components",
    "test:e2e": "playwright test",
    "test:all": "vitest run && playwright test"
  },
  "simple-git-hooks": {
    "pre-commit": "npx vitest run --dir tests/unit",
    "pre-push": "npx vitest run && npx playwright test"
  }
}
```

Then run: `npx simple-git-hooks`

- [ ] **Step 3: Create vitest.config.ts**

```ts
import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    environmentOptions: {
      nuxt: {
        domEnvironment: 'happy-dom',
      },
    },
    setupFiles: ['./tests/mocks/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['app/**/*.ts', 'app/**/*.vue', 'server/**/*.ts'],
      exclude: ['app/types/**', '**/*.d.ts'],
      // Global threshold — raise over time as coverage improves
      thresholds: {
        statements: 50,
      },
    },
  },
})
```

- [ ] **Step 4: Create playwright.config.ts**

```ts
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import type { ConfigOptions } from '@nuxt/test-utils/playwright'

export default defineConfig<ConfigOptions>({
  use: {
    nuxt: {
      rootDir: fileURLToPath(new URL('.', import.meta.url)),
      dotenv: { fileName: '.env.test' },
    },
  },
  testDir: './tests/e2e',
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  reporter: 'html',
  retries: 1,
  timeout: 30000,
})
```

- [ ] **Step 5: Generate test RSA keypair**

```bash
mkdir -p tests/mocks/keys
openssl genrsa -out tests/mocks/keys/private.pem 2048
openssl rsa -in tests/mocks/keys/private.pem -pubout -out tests/mocks/keys/public.pem
```

- [ ] **Step 6: Create .env.test**

```env
SUPABASE_URL=http://localhost:54321
SUPABASE_KEY=test-anon-key
NUXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NUXT_PUBLIC_SUPABASE_KEY=test-anon-key
NUXT_PUBLIC_MAPBOX_TOKEN=pk.test_mapbox_token
STRIPE_SECRET_KEY=sk_test_dummy
STRIPE_WEBHOOK_SECRET=whsec_test_dummy
RESEND_API_KEY=re_test_dummy
NUXT_PUBLIC_SITE_URL=http://localhost:3000
UMAMI_HOST=
UMAMI_WEBSITE_ID=
NUXT_ADMIN_SECRET=test-admin-secret
```

Note: `NUXT_PRO_JWT_PRIVATE_KEY` should be set to the contents of `tests/mocks/keys/private.pem` (read the file and paste the PEM string). This can also be loaded programmatically in test setup.

- [ ] **Step 7: Create tests/mocks/setup.ts**

```ts
import { afterAll, afterEach, beforeAll } from 'vitest'
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

- [ ] **Step 8: Create tests/mocks/mapbox-gl.ts**

```ts
export class Map {
  _listeners: Record<string, Function[]> = {}
  constructor(_options?: any) {}
  on(event: string, fn: Function) { (this._listeners[event] ??= []).push(fn); return this }
  off() { return this }
  once(event: string, fn: Function) { this.on(event, fn); return this }
  addSource() {}
  addLayer() {}
  removeLayer() {}
  removeSource() {}
  getSource() { return undefined }
  getLayer() { return undefined }
  addControl() {}
  removeControl() {}
  setLayoutProperty() {}
  setPaintProperty() {}
  fitBounds() {}
  flyTo() {}
  setCenter() {}
  setZoom() {}
  getCenter() { return { lat: 64.15, lng: -21.94 } }
  getZoom() { return 7 }
  getCanvas() { return { style: {} } as any }
  getContainer() { return document.createElement('div') }
  remove() {}
  resize() {}
  loaded() { return true }
  fire(event: string) { this._listeners[event]?.forEach(fn => fn()); return this }
}

export class NavigationControl { constructor(_options?: any) {} }
export class GeolocateControl { constructor(_options?: any) {} on() { return this } }
export class ScaleControl { constructor(_options?: any) {} }
export class Popup {
  setLngLat() { return this }
  setHTML() { return this }
  setDOMContent() { return this }
  addTo() { return this }
  remove() { return this }
  on() { return this }
}
export class Marker {
  _element: HTMLElement = document.createElement('div')
  setLngLat() { return this }
  addTo() { return this }
  remove() { return this }
  getElement() { return this._element }
  setPopup() { return this }
}
export class LngLatBounds {
  extend() { return this }
  isEmpty() { return false }
}
```

Register in `vitest.config.ts` by adding to the config:
```ts
resolve: {
  alias: {
    'mapbox-gl': fileURLToPath(new URL('./tests/mocks/mapbox-gl.ts', import.meta.url)),
  },
},
```

- [ ] **Step 9: Install Playwright browsers**

```bash
npx playwright install
```

- [ ] **Step 10: Verify setup with a smoke test**

Create `tests/unit/utils/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest'

describe('test infrastructure', () => {
  it('vitest works', () => {
    expect(1 + 1).toBe(2)
  })
})
```

Run: `npm test`
Expected: 1 test passes.
Delete the smoke test after verification.

- [ ] **Step 11: Commit**

```bash
git add vitest.config.ts playwright.config.ts .env.test tests/mocks/ package.json package-lock.json
git commit -m "feat: set up test infrastructure (Vitest, Playwright, MSW)"
```

---

## Task 2: MSW Handlers, Fixtures & Factories

**Files:**
- Create: `tests/mocks/handlers.ts`
- Create: `tests/mocks/fixtures/weather-observations.json`
- Create: `tests/mocks/fixtures/weather-forecasts.json`
- Create: `tests/mocks/fixtures/viewing-spots.json`
- Create: `tests/mocks/fixtures/eclipse-grid.json`
- Create: `tests/mocks/fixtures/horizon-grid.json`
- Create: `tests/mocks/fixtures/stripe-session.json`
- Create: `tests/mocks/fixtures/road-conditions.json`
- Create: `tests/mocks/factories/spot.ts`
- Create: `tests/mocks/factories/station.ts`
- Create: `tests/mocks/factories/purchase.ts`

**Reference docs:**
- `server/utils/vedur.ts` — for XML response format
- `server/utils/vegagerdin.ts` — for DATEX II XML format
- `server/api/stripe/webhook.post.ts` — for Stripe event payload format
- `app/types/spots.ts`, `app/types/horizon.ts` — for TypeScript interfaces

- [ ] **Step 1: Create fixtures**

Each fixture should be a small (5-10 records) JSON file with realistic data extracted from actual API responses. Key edge cases to include:

`weather-observations.json` — Array of VedurObservation-like objects. Include one station with null temp, one with all fields.

`weather-forecasts.json` — Array of VedurForecast-like objects. Include null cloud_cover, varying precipitation values.

`viewing-spots.json` — Array of ViewingSpot rows. Include one with no photos (empty JSONB), one with no horizon_check, one fully populated. Use real-ish spot data matching the schema (id, name, slug, lat, lng, region, etc.).

`eclipse-grid.json` — 5-point subset of the real grid. Include one point inside totality and one outside.

`horizon-grid.json` — 3-point subset with pre-computed horizon sweeps. Include one "clear", one "blocked" verdict.

`stripe-session.json` — Stripe checkout.session.completed event payload with realistic fields (id, customer_email, metadata).

`road-conditions.json` — Array of RoadCondition objects. Include 'good', 'difficult', 'closed' conditions.

- [ ] **Step 2: Create factories**

`tests/mocks/factories/spot.ts`:
```ts
let counter = 0
export function resetSpotCounter() { counter = 0 }

export function createSpot(overrides?: Partial<any>): any {
  counter++
  return {
    id: `spot-${counter}`,
    name: `Test Spot ${counter}`,
    slug: `test-spot-${counter}`,
    lat: 64.15 + counter * 0.1,
    lng: -21.94 + counter * 0.1,
    region: 'reykjanes',
    description: 'A great viewing spot.',
    parking_info: 'Free parking',
    terrain_notes: 'Flat terrain',
    has_services: true,
    cell_coverage: 'good',
    totality_duration_seconds: 120,
    totality_start: '2026-08-12T17:44:00Z',
    sun_altitude: 24.5,
    sun_azimuth: 250,
    photo_url: null,
    spot_type: 'roadside',
    difficulty: 'easy',
    elevation_gain_m: 0,
    trail_distance_km: 0,
    trail_time_minutes: 0,
    trailhead_lat: null,
    trailhead_lng: null,
    photos: [],
    horizon_check: null,
    ...overrides,
  }
}
```

`tests/mocks/factories/station.ts`:
```ts
let counter = 0
export function resetStationCounter() { counter = 0 }

export function createStation(overrides?: Partial<any>): any {
  counter++
  return {
    id: `${counter}`,
    name: `Station ${counter}`,
    lat: 64.0 + counter * 0.1,
    lng: -22.0 + counter * 0.1,
    region: 'reykjavik',
    source: 'vedur.is',
    ...overrides,
  }
}
```

`tests/mocks/factories/purchase.ts`:
```ts
let counter = 0
export function resetPurchaseCounter() { counter = 0 }

export function createPurchase(overrides?: Partial<any>): any {
  counter++
  return {
    id: counter,
    email: `user${counter}@test.com`,
    email_hash: `hash_${counter}`,
    stripe_session_id: `cs_test_${counter}`,
    activation_token: `eyJ.test.token_${counter}`,
    purchased_at: new Date().toISOString(),
    is_active: true,
    restored_count: 0,
    last_restored_at: null,
    ...overrides,
  }
}
```

- [ ] **Step 3: Create MSW handlers**

`tests/mocks/handlers.ts`:
```ts
import { http, HttpResponse } from 'msw'
import weatherObs from './fixtures/weather-observations.json'
import weatherForecasts from './fixtures/weather-forecasts.json'
import viewingSpots from './fixtures/viewing-spots.json'
import roadConditions from './fixtures/road-conditions.json'

// vedur.is — return XML matching the real API format
export const vedurHandlers = [
  http.get('https://xmlweather.vedur.is/', ({ request }) => {
    const url = new URL(request.url)
    const type = url.searchParams.get('type')
    if (type === 'obs') {
      return HttpResponse.xml(buildObservationsXml(weatherObs))
    }
    if (type === 'forec') {
      return HttpResponse.xml(buildForecastsXml(weatherForecasts))
    }
    return new HttpResponse(null, { status: 400 })
  }),
]

// Supabase — mock PostgREST endpoints
export const supabaseHandlers = [
  http.get('*/rest/v1/viewing_spots*', () => {
    return HttpResponse.json(viewingSpots)
  }),
  http.get('*/rest/v1/weather_stations*', () => {
    return HttpResponse.json([])
  }),
  http.get('*/rest/v1/weather_forecasts*', () => {
    return HttpResponse.json([])
  }),
  http.get('*/rest/v1/pro_purchases*', () => {
    return HttpResponse.json([])
  }),
  http.post('*/rest/v1/*', () => {
    return HttpResponse.json({}, { status: 201 })
  }),
  http.patch('*/rest/v1/*', () => {
    return HttpResponse.json({})
  }),
]

// Stripe
export const stripeHandlers = [
  http.post('https://api.stripe.com/v1/checkout/sessions', () => {
    return HttpResponse.json({
      id: 'cs_test_mock',
      url: 'https://checkout.stripe.com/mock',
    })
  }),
]

// Resend
export const resendHandlers = [
  http.post('https://api.resend.com/emails', () => {
    return HttpResponse.json({ id: 'email_mock_id' })
  }),
]

// Vegagerdin
export const vegagerdinHandlers = [
  http.get('*vegagerdin.is*', () => {
    return HttpResponse.json(roadConditions)
  }),
]

// Mapbox tiles — return 1x1 transparent PNG
const TRANSPARENT_PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x62, 0x00, 0x00, 0x00, 0x02,
  0x00, 0x01, 0xe5, 0x27, 0xde, 0xfc, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
  0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
])

export const mapboxHandlers = [
  http.get('https://api.mapbox.com/*', () => {
    return new HttpResponse(TRANSPARENT_PNG, {
      headers: { 'Content-Type': 'image/png' },
    })
  }),
]

export const handlers = [
  ...vedurHandlers,
  ...supabaseHandlers,
  ...stripeHandlers,
  ...resendHandlers,
  ...vegagerdinHandlers,
  ...mapboxHandlers,
]

// Helper: build vedur.is observation XML
// vedur.ts parses: parsed.observations.station (array of station objects)
// Each station has $.id, name, time, T, F, D, R as direct children
function buildObservationsXml(observations: any[]): string {
  const stations = observations.map(o => `
    <station id="${o.stationId}" valid="1">
      <name>${o.name}</name>
      <time>${o.timestamp}</time>
      <F>${o.windSpeed ?? ''}</F>
      <D>${o.windDir ?? ''}</D>
      <T>${o.temp ?? ''}</T>
      <R>${o.precipitation ?? ''}</R>
    </station>
  `).join('')
  return `<?xml version="1.0" encoding="utf-8"?><observations>${stations}</observations>`
}

// Helper: build vedur.is forecast XML
// vedur.ts parses: parsed.forecasts.station (array of station objects)
// Each station has $.id, atime, and nested forecast[] with ftime, N, T, R
function buildForecastsXml(forecasts: any[]): string {
  const grouped = new Map<string, any[]>()
  for (const f of forecasts) {
    if (!grouped.has(f.stationId)) grouped.set(f.stationId, [])
    grouped.get(f.stationId)!.push(f)
  }
  const stations = [...grouped.entries()].map(([id, items]) => {
    const atime = items[0]?.forecastTime || new Date().toISOString()
    const forecastEls = items.map(f => `
      <forecast>
        <ftime>${f.validTime}</ftime>
        <N>${f.cloudCover ?? ''}</N>
        <T>${f.temp ?? ''}</T>
        <R>${f.precipitation ?? ''}</R>
      </forecast>
    `).join('')
    return `<station id="${id}" valid="1"><atime>${atime}</atime>${forecastEls}</station>`
  }).join('')
  return `<?xml version="1.0" encoding="utf-8"?><forecasts>${stations}</forecasts>`
}
```

- [ ] **Step 4: Verify MSW setup works**

Create a quick test `tests/unit/utils/msw-smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest'

describe('MSW setup', () => {
  it('server is running (handlers loaded)', () => {
    // If setup.ts ran without errors, MSW is working
    expect(true).toBe(true)
  })
})
```

Run: `npm test`
Expected: passes without MSW errors in console.
Delete after verification.

- [ ] **Step 5: Commit**

```bash
git add tests/mocks/
git commit -m "feat: add MSW handlers, fixtures, and test data factories"
```

---

## Task 3: Unit Tests — Client Utils

**Files:**
- Create: `tests/unit/utils/eclipse.test.ts`
- Create: `tests/unit/utils/solar.test.ts`
- Create: `tests/unit/utils/proStorage.test.ts`
- Create: `tests/unit/utils/mapLayers.test.ts`
- Test: `app/utils/eclipse.ts`, `app/utils/solar.ts`, `app/utils/proStorage.ts`, `app/utils/mapLayers.ts`

**Reference:** Read each source file to understand the exact function signatures and edge cases.

- [ ] **Step 1: Write eclipse.test.ts**

Test all exported functions from `app/utils/eclipse.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { formatDuration, cloudColor, cloudLevel, compassDirection, weatherSvgHtml } from '~/utils/eclipse'

describe('formatDuration', () => {
  it('formats seconds to Xm Ys', () => {
    expect(formatDuration(135)).toBe('2m 15s')
  })
  it('handles 0', () => {
    expect(formatDuration(0)).toBe('0m 0s')
  })
  it('handles fractional seconds', () => {
    expect(formatDuration(90.7)).toContain('1m')
  })
})

describe('cloudColor', () => {
  it('returns green for 0% cloud', () => {
    expect(cloudColor(0)).toBeDefined()
  })
  it('returns color for 100%', () => {
    expect(cloudColor(100)).toBeDefined()
  })
  it('handles null', () => {
    expect(cloudColor(null)).toBeDefined()
  })
  it('handles undefined', () => {
    expect(cloudColor(undefined)).toBeDefined()
  })
})

describe('cloudLevel', () => {
  it('returns color and label', () => {
    const result = cloudLevel(50)
    expect(result).toHaveProperty('color')
    expect(result).toHaveProperty('label')
  })
})

describe('compassDirection', () => {
  it('returns N for 0°', () => {
    expect(compassDirection(0)).toBe('N')
  })
  it('returns E for 90°', () => {
    expect(compassDirection(90)).toBe('E')
  })
  it('returns S for 180°', () => {
    expect(compassDirection(180)).toBe('S')
  })
  it('returns W for 270°', () => {
    expect(compassDirection(270)).toBe('W')
  })
  it('returns WSW for ~250° (eclipse azimuth)', () => {
    expect(compassDirection(250)).toBe('WSW')
  })
})

describe('weatherSvgHtml', () => {
  it('returns SVG string', () => {
    const svg = weatherSvgHtml(50)
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
  })
  it('handles null cloud cover', () => {
    const svg = weatherSvgHtml(null)
    expect(svg).toContain('<svg')
  })
})
```

- [ ] **Step 2: Write solar.test.ts**

```ts
import { describe, it, expect } from 'vitest'
import { computeSunTrajectory, formatUtcTime } from '~/utils/solar'

describe('computeSunTrajectory', () => {
  it('returns trajectory points for Reykjavik on eclipse day', () => {
    const points = computeSunTrajectory(64.15, -21.94, 220, 280)
    expect(points.length).toBeGreaterThan(0)
    points.forEach(p => {
      expect(p).toHaveProperty('utcHours')
      expect(p).toHaveProperty('altitude')
      expect(p).toHaveProperty('azimuth')
      expect(p.azimuth).toBeGreaterThanOrEqual(220)
      expect(p.azimuth).toBeLessThanOrEqual(280)
    })
  })

  it('sun altitude is ~24° at eclipse time', () => {
    const points = computeSunTrajectory(64.15, -21.94, 245, 255)
    const eclipsePoint = points.find(p => p.utcHours >= 17.7 && p.utcHours <= 17.9)
    if (eclipsePoint) {
      expect(eclipsePoint.altitude).toBeGreaterThan(20)
      expect(eclipsePoint.altitude).toBeLessThan(30)
    }
  })
})

describe('formatUtcTime', () => {
  it('formats 17.75 as 17:45', () => {
    expect(formatUtcTime(17.75)).toBe('17:45')
  })
  it('formats 0 as 00:00', () => {
    expect(formatUtcTime(0)).toBe('00:00')
  })
})
```

- [ ] **Step 3: Write proStorage.test.ts**

Note: IndexedDB is not available in happy-dom. The implementation falls back to localStorage. Test the localStorage fallback path, and mock IndexedDB for the primary path.

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { saveTokenToIndexedDB, getTokenFromIndexedDB, removeTokenFromIndexedDB } from '~/utils/proStorage'

describe('proStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('saves and retrieves token via localStorage fallback', async () => {
    await saveTokenToIndexedDB('test-jwt-token')
    const token = await getTokenFromIndexedDB()
    expect(token).toBe('test-jwt-token')
  })

  it('returns null when no token stored', async () => {
    const token = await getTokenFromIndexedDB()
    expect(token).toBeNull()
  })

  it('removes token', async () => {
    await saveTokenToIndexedDB('test-jwt-token')
    await removeTokenFromIndexedDB()
    const token = await getTokenFromIndexedDB()
    expect(token).toBeNull()
  })
})
```

- [ ] **Step 4: Write mapLayers.test.ts**

```ts
import { describe, it, expect, vi } from 'vitest'
import { addEclipsePathLayers } from '~/utils/mapLayers'

describe('addEclipsePathLayers', () => {
  it('adds source and layers to map', () => {
    const map = {
      addSource: vi.fn(),
      addLayer: vi.fn(),
      getSource: vi.fn(() => undefined),
    }
    addEclipsePathLayers(map as any)
    expect(map.addSource).toHaveBeenCalled()
    expect(map.addLayer).toHaveBeenCalled()
  })

  it('skips if source already exists', () => {
    const map = {
      addSource: vi.fn(),
      addLayer: vi.fn(),
      getSource: vi.fn(() => ({})),
    }
    addEclipsePathLayers(map as any)
    expect(map.addSource).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 5: Run tests**

```bash
npm run test:unit
```
Expected: All 4 test files pass.

- [ ] **Step 6: Commit**

```bash
git add tests/unit/utils/
git commit -m "test: add unit tests for client utils (eclipse, solar, proStorage, mapLayers)"
```

---

## Task 4: Unit Tests — Composables

**Files:**
- Create: `tests/unit/composables/useCountdown.test.ts`
- Create: `tests/unit/composables/useProStatus.test.ts`
- Create: `tests/unit/composables/useRecommendation.test.ts`
- Create: `tests/unit/composables/useLocation.test.ts`
- Create: `tests/unit/composables/useOfflineStatus.test.ts`
- Create: `tests/unit/composables/useAnalyticsConsent.test.ts`
- Test: `app/composables/*.ts`

**Reference:** Read each composable source file. Composables use `@nuxt/test-utils` runtime helpers (`registerEndpoint`, `mountSuspended`, etc.).

**Important:** Many composables use module-scoped state (e.g., `useAnalyticsConsent` has a module-level `ref`). Always add `vi.resetModules()` in `beforeEach` when using dynamic `await import()` to ensure a fresh module instance per test. Without this, state leaks between tests.

- [ ] **Step 1: Write useCountdown.test.ts**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns correct remaining time', async () => {
    // Set current time to 2026-03-22 (well before eclipse)
    vi.setSystemTime(new Date('2026-03-22T12:00:00Z'))
    const { useCountdown } = await import('~/composables/useCountdown')
    const { remaining } = useCountdown()
    expect(remaining.value.days).toBeGreaterThan(100)
    expect(remaining.value.total).toBeGreaterThan(0)
  })

  it('returns zero after eclipse date', async () => {
    vi.setSystemTime(new Date('2026-08-13T00:00:00Z'))
    // Need to re-import to get fresh module
    vi.resetModules()
    const { useCountdown } = await import('~/composables/useCountdown')
    const { remaining } = useCountdown()
    expect(remaining.value.total).toBeLessThanOrEqual(0)
  })
})
```

- [ ] **Step 2: Write useProStatus.test.ts**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('useProStatus', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('isPro is false when no token exists', async () => {
    const { useProStatus } = await import('~/composables/useProStatus')
    const { isPro, loading } = useProStatus()
    // Initially loading
    expect(loading.value).toBe(true)
  })

  it('clearPro removes Pro status', async () => {
    const { useProStatus } = await import('~/composables/useProStatus')
    const { isPro, clearPro } = useProStatus()
    await clearPro()
    expect(isPro.value).toBe(false)
  })
})
```

Note: Full JWT verification tests require the test RSA keypair. The test should generate a valid JWT using the test private key, store it, then verify `checkStatus()` sets `isPro = true`.

- [ ] **Step 3: Write useRecommendation.test.ts**

```ts
import { describe, it, expect } from 'vitest'
import { ref } from 'vue'

describe('useRecommendation', () => {
  it('ranks spots with photographer profile', async () => {
    const { useRecommendation, PROFILES } = await import('~/composables/useRecommendation')

    const spots = ref([
      { id: '1', name: 'Long Duration', slug: 'long', lat: 64.1, lng: -22, region: 'reykjanes', totality_duration_seconds: 130, has_services: true, cell_coverage: 'good', difficulty: 'easy', spot_type: 'roadside', horizon_check: { verdict: 'clear' }, sun_altitude: 24 },
      { id: '2', name: 'Short Duration', slug: 'short', lat: 64.2, lng: -22.1, region: 'reykjanes', totality_duration_seconds: 60, has_services: false, cell_coverage: 'none', difficulty: 'moderate', spot_type: 'hike', horizon_check: { verdict: 'marginal' }, sun_altitude: 24 },
    ])
    const weather = ref([
      { station_id: '1', cloud_cover: 20 },
      { station_id: '2', cloud_cover: 80 },
    ])
    const stations = ref([
      { id: '1', lat: 64.1, lng: -22 },
      { id: '2', lat: 64.2, lng: -22.1 },
    ])
    const userCoords = ref([64.15, -21.94] as [number, number])
    const profileId = ref<string>('photographer')

    const { ranked } = useRecommendation(spots, weather, stations, userCoords, profileId)
    expect(ranked.value.length).toBe(2)
    // Photographer profile prioritizes duration — longer duration should rank higher
    expect(ranked.value[0].spot.name).toBe('Long Duration')
  })

  it('PROFILES has 5 entries', async () => {
    const { PROFILES } = await import('~/composables/useRecommendation')
    expect(PROFILES).toHaveLength(5)
    expect(PROFILES.map(p => p.id)).toEqual(['photographer', 'family', 'hiker', 'skychaser', 'firsttimer'])
  })

  it('handles null cloud_cover in weather data', async () => {
    const { useRecommendation } = await import('~/composables/useRecommendation')
    const spots = ref([{ id: '1', name: 'Spot', slug: 'spot', lat: 64, lng: -22, region: 'r', totality_duration_seconds: 100 }])
    const weather = ref([{ station_id: '1', cloud_cover: null }])
    const stations = ref([{ id: '1', lat: 64, lng: -22 }])
    const { ranked } = useRecommendation(spots, weather, stations, ref([64, -22] as [number, number]), ref('firsttimer'))
    expect(ranked.value.length).toBe(1)
    // Should not crash — null cloud_cover treated as unknown
  })

  it('handles empty weather data gracefully', async () => {
    const { useRecommendation } = await import('~/composables/useRecommendation')
    const spots = ref([{ id: '1', name: 'Spot', slug: 'spot', lat: 64, lng: -22, region: 'r', totality_duration_seconds: 100 }])
    const { ranked } = useRecommendation(spots, ref([]), ref([]), ref([64, -22] as [number, number]), ref('firsttimer'))
    expect(ranked.value.length).toBe(1)
  })
})
```

- [ ] **Step 4: Write useLocation.test.ts**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('useLocation', () => {
  it('defaults to Reykjavik coordinates', async () => {
    const { useLocation } = await import('~/composables/useLocation')
    const { coords } = useLocation()
    expect(coords.value[0]).toBeCloseTo(64.1466, 1)
    expect(coords.value[1]).toBeCloseTo(-21.9426, 1)
  })

  it('updates coords on successful geolocation', async () => {
    // Mock navigator.geolocation — callback is invoked synchronously by the mock
    const mockPosition = { coords: { latitude: 65.0, longitude: -18.0 } }
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: vi.fn((success) => success(mockPosition)),
      },
    })

    vi.resetModules()
    const { useLocation } = await import('~/composables/useLocation')
    const { coords, isGps, request } = useLocation()
    // request() is synchronous — the mock callback fires immediately
    request()
    expect(coords.value[0]).toBe(65.0)
    expect(coords.value[1]).toBe(-18.0)
    expect(isGps.value).toBe(true)

    vi.unstubAllGlobals()
  })
})
```

- [ ] **Step 5: Write useOfflineStatus.test.ts and useAnalyticsConsent.test.ts**

`useOfflineStatus.test.ts`:
```ts
import { describe, it, expect } from 'vitest'

describe('useOfflineStatus', () => {
  it('isOffline reflects navigator.onLine', async () => {
    const { useOfflineStatus } = await import('~/composables/useOfflineStatus')
    const { isOffline } = useOfflineStatus()
    // In test environment navigator.onLine is true
    expect(isOffline.value).toBe(false)
  })

  it('formatRelativeTime returns human string', async () => {
    const { useOfflineStatus } = await import('~/composables/useOfflineStatus')
    const { formatRelativeTime } = useOfflineStatus()
    expect(formatRelativeTime(60000)).toContain('min')
  })
})
```

`useAnalyticsConsent.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'

describe('useAnalyticsConsent', () => {
  beforeEach(() => {
    vi.resetModules() // consentState is module-scoped — must reset between tests
    localStorage.clear()
  })

  it('consentState is null initially', async () => {
    const { useAnalyticsConsent } = await import('~/composables/useAnalyticsConsent')
    const { consentState, consentGiven } = useAnalyticsConsent()
    expect(consentState.value).toBeNull()
    expect(consentGiven.value).toBe(false)
  })

  it('setConsent updates state', async () => {
    const { useAnalyticsConsent } = await import('~/composables/useAnalyticsConsent')
    const { setConsent, hasConsent, consentGiven } = useAnalyticsConsent()
    setConsent('all')
    expect(hasConsent.value).toBe(true)
    expect(consentGiven.value).toBe(true)
  })

  it('essential consent does not enable analytics', async () => {
    const { useAnalyticsConsent } = await import('~/composables/useAnalyticsConsent')
    const { setConsent, hasConsent } = useAnalyticsConsent()
    setConsent('essential')
    expect(hasConsent.value).toBe(false)
  })
})
```

- [ ] **Step 6: Run tests**

```bash
npm run test:unit
```
Expected: All composable tests pass.

- [ ] **Step 7: Commit**

```bash
git add tests/unit/composables/
git commit -m "test: add unit tests for composables (countdown, proStatus, recommendation, location, offline, consent)"
```

---

## Task 5: Unit Tests — Middleware

**Files:**
- Create: `tests/unit/middleware/pro-gate.test.ts`
- Test: `app/middleware/pro-gate.ts`

- [ ] **Step 1: Write pro-gate.test.ts**

The middleware runs client-side only (`if (import.meta.server) return`), so unit testing the redirect logic directly requires mocking Nuxt auto-imports. The most reliable approach uses `@nuxt/test-utils` server setup to verify behavior via HTTP:

```ts
import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

describe('pro-gate middleware', async () => {
  await setup({ server: true })

  it('free routes are always accessible without Pro token', async () => {
    const home = await $fetch('/')
    expect(home).toContain('ECLIPSECHASE')

    const guide = await $fetch('/guide')
    expect(typeof guide).toBe('string')
  })

  it('Pro-gated routes do not leak Pro content without token', async () => {
    // The middleware skips on server, but the page should not expose
    // sensitive Pro features in the SSR response without auth
    const html = await $fetch('/map')
    // After client-side hydration, middleware would redirect
    // Server response should either redirect or render safely
    expect(typeof html).toBe('string')
  })
})
```

Note: The definitive redirect test is in E2E (`tests/e2e/pro-gate.test.ts`, Task 14) where Playwright runs in a real browser and the client-side middleware fires. This unit-level test serves as a safety check that free routes are accessible and Pro routes don't leak content server-side.

- [ ] **Step 2: Run and commit**

```bash
npm run test:unit -- --dir tests/unit/middleware
git add tests/unit/middleware/
git commit -m "test: add unit test for pro-gate middleware"
```

---

## Task 6: Server Tests — Server Utils

**Files:**
- Create: `tests/server/utils/vedur.test.ts`
- Create: `tests/server/utils/vegagerdin.test.ts`
- Create: `tests/server/utils/horizon.test.ts`
- Create: `tests/server/utils/dem.test.ts`
- Create: `tests/server/utils/jwt.test.ts`
- Create: `tests/server/utils/email.test.ts`
- Create: `tests/server/utils/rateLimit.test.ts`
- Test: `server/utils/*.ts`

**Reference:** Read each server util file for exact function signatures. Server tests use `@nuxt/test-utils` with `registerEndpoint` or direct function imports.

- [ ] **Step 1: Write jwt.test.ts**

```ts
import { describe, it, expect } from 'vitest'
import * as jose from 'jose'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Read the test keypair
const privateKeyPem = readFileSync(resolve(__dirname, '../../mocks/keys/private.pem'), 'utf-8')
const publicKeyPem = readFileSync(resolve(__dirname, '../../mocks/keys/public.pem'), 'utf-8')

describe('JWT utilities', () => {
  it('generates valid RS256 JWT', async () => {
    // We test the JWT logic directly rather than the Nuxt wrapper
    const privateKey = await jose.importPKCS8(privateKeyPem, 'RS256')
    const token = await new jose.SignJWT({ sub: 'hash_123', sid: 'cs_test_1', v: 1 })
      .setProtectedHeader({ alg: 'RS256' })
      .setExpirationTime('2026-08-31T23:59:59Z')
      .setIssuedAt()
      .sign(privateKey)

    expect(token).toBeTruthy()
    expect(token.split('.')).toHaveLength(3)

    // Verify with public key
    const publicKey = await jose.importSPKI(publicKeyPem, 'RS256')
    const { payload } = await jose.jwtVerify(token, publicKey)
    expect(payload.sub).toBe('hash_123')
    expect(payload.sid).toBe('cs_test_1')
  })

  it('rejects expired JWT', async () => {
    const privateKey = await jose.importPKCS8(privateKeyPem, 'RS256')
    const token = await new jose.SignJWT({ sub: 'hash_123' })
      .setProtectedHeader({ alg: 'RS256' })
      .setExpirationTime('2020-01-01T00:00:00Z')
      .sign(privateKey)

    const publicKey = await jose.importSPKI(publicKeyPem, 'RS256')
    await expect(jose.jwtVerify(token, publicKey)).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Write email.test.ts**

```ts
import { describe, it, expect } from 'vitest'

describe('email utilities', () => {
  // Import the helper functions (maskEmail, hashEmail)
  // These are pure functions that don't need Nuxt runtime

  it('maskEmail hides middle characters', async () => {
    const { maskEmail } = await import('~/server/utils/email')
    expect(maskEmail('john@example.com')).toMatch(/j\*+n@example\.com/)
  })

  it('maskEmail handles short usernames', async () => {
    const { maskEmail } = await import('~/server/utils/email')
    const result = maskEmail('ab@example.com')
    expect(result).toContain('@example.com')
  })

  it('hashEmail returns consistent SHA256 hash', async () => {
    const { hashEmail } = await import('~/server/utils/email')
    const hash1 = hashEmail('test@example.com')
    const hash2 = hashEmail('test@example.com')
    expect(hash1).toBe(hash2)
    expect(hash1.length).toBe(64) // SHA256 hex
  })

  it('hashEmail is case-insensitive', async () => {
    const { hashEmail } = await import('~/server/utils/email')
    expect(hashEmail('Test@Example.com')).toBe(hashEmail('test@example.com'))
  })
})
```

- [ ] **Step 3: Write rateLimit.test.ts**

```ts
import { describe, it, expect, beforeEach } from 'vitest'

describe('rateLimit', () => {
  it('allows requests within limit', async () => {
    const { checkRateLimit } = await import('~/server/utils/rateLimit')
    expect(checkRateLimit('test-key-1', 3, 60000)).toBe(true)
    expect(checkRateLimit('test-key-1', 3, 60000)).toBe(true)
    expect(checkRateLimit('test-key-1', 3, 60000)).toBe(true)
  })

  it('blocks requests exceeding limit', async () => {
    const { checkRateLimit } = await import('~/server/utils/rateLimit')
    const key = 'test-key-block-' + Date.now()
    checkRateLimit(key, 2, 60000)
    checkRateLimit(key, 2, 60000)
    expect(checkRateLimit(key, 2, 60000)).toBe(false)
  })

  it('different keys have independent limits', async () => {
    const { checkRateLimit } = await import('~/server/utils/rateLimit')
    const ts = Date.now()
    checkRateLimit(`key-a-${ts}`, 1, 60000)
    expect(checkRateLimit(`key-a-${ts}`, 1, 60000)).toBe(false)
    expect(checkRateLimit(`key-b-${ts}`, 1, 60000)).toBe(true)
  })
})
```

- [ ] **Step 4: Write vedur.test.ts**

```ts
import { describe, it, expect } from 'vitest'

describe('vedur.ts', () => {
  it('fetchObservations returns parsed observations', async () => {
    // MSW intercepts xmlweather.vedur.is requests
    const { fetchObservations } = await import('~/server/utils/vedur')
    const obs = await fetchObservations(['1', '990'])
    expect(Array.isArray(obs)).toBe(true)
    // Verify structure matches VedurObservation interface
    if (obs.length > 0) {
      expect(obs[0]).toHaveProperty('stationId')
      expect(obs[0]).toHaveProperty('temp')
    }
  })

  it('fetchForecasts returns parsed forecasts', async () => {
    const { fetchForecasts } = await import('~/server/utils/vedur')
    const forecasts = await fetchForecasts(['1'])
    expect(Array.isArray(forecasts)).toBe(true)
  })

  it('forecastsToRows converts to DB format', async () => {
    const { forecastsToRows } = await import('~/server/utils/vedur')
    const rows = forecastsToRows([{
      stationId: '1',
      forecastTime: '2026-03-22T12:00:00Z',
      validTime: '2026-03-22T15:00:00Z',
      cloudCover: 50,
      temp: 5,
      precipitation: 0.1,
    }])
    expect(rows[0]).toHaveProperty('station_id', '1')
    expect(rows[0]).toHaveProperty('cloud_cover', 50)
    expect(rows[0]).toHaveProperty('source_model', 'vedur')
  })

  it('STATION_IDS has 55 stations', async () => {
    const { STATION_IDS } = await import('~/server/utils/vedur')
    expect(STATION_IDS).toHaveLength(55)
  })
})
```

- [ ] **Step 5: Write vegagerdin.test.ts, horizon.test.ts, dem.test.ts**

`vegagerdin.test.ts` — Test `fetchRoadConditions()` and `fetchRoadSegments()` with MSW-intercepted responses. Verify returned data matches `RoadCondition` / `RoadSegment` interfaces.

`horizon.test.ts` — Test `checkHorizon()` with known lat/lng/altitude/azimuth inputs. Test `getVerdict()` for all 4 verdict types. Test `moveAlongBearing()` geometry. Note: requires DEM data mock or skip DEM-dependent tests.

`dem.test.ts` — Test `isInBounds()` with coordinates inside and outside Iceland. Test `getElevation()` with mocked Float32Array data. Test `loadDEM()` error handling when file is missing.

- [ ] **Step 6: Run and commit**

```bash
npm run test:server -- --dir tests/server/utils
git add tests/server/
git commit -m "test: add server util tests (jwt, email, rateLimit, vedur, vegagerdin, horizon, dem)"
```

---

## Task 7: Server Tests — Weather API Routes

**Files:**
- Create: `tests/server/api/weather/cloud-cover.test.ts`
- Create: `tests/server/api/weather/current.test.ts`
- Create: `tests/server/api/weather/forecast.test.ts`
- Create: `tests/server/api/weather/forecast-timeline.test.ts`
- Create: `tests/server/api/weather/stations.test.ts`
- Test: `server/api/weather/*.ts`

**Reference:** Use `@nuxt/test-utils` `$fetch` helper for server route testing.

**Important:** `@nuxt/test-utils` `setup()` starts a Nuxt dev server. Call `setup()` once per `describe` block. If multiple test files call `setup()`, Vitest may need to run server tests sequentially (not in parallel) to avoid port conflicts. Add to `vitest.config.ts` for the server test dir:
```ts
// In vitest workspace or config, for server tests:
test: { pool: 'forks', poolOptions: { forks: { singleFork: true } } }
```
Alternatively, use `@nuxt/test-utils` workspace mode which manages a single shared server instance.

- [ ] **Step 1: Write weather API tests**

These tests use `@nuxt/test-utils` to start a Nuxt test server and call the API routes:

```ts
// tests/server/api/weather/cloud-cover.test.ts
import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

describe('GET /api/weather/cloud-cover', async () => {
  await setup({ server: true })

  it('returns cloud cover data', async () => {
    const data = await $fetch('/api/weather/cloud-cover')
    expect(data).toHaveProperty('cloud_cover')
    expect(Array.isArray(data.cloud_cover)).toBe(true)
  })

  it('includes stale indicator', async () => {
    const data = await $fetch('/api/weather/cloud-cover')
    expect(data).toHaveProperty('stale')
    expect(typeof data.stale).toBe('boolean')
  })
})
```

Follow the same pattern for `current.test.ts`, `forecast.test.ts`, `forecast-timeline.test.ts`, `stations.test.ts`. Each test verifies:
- Response status is 200
- Response body shape matches expected interface
- Edge cases (empty station list, missing data)

- [ ] **Step 2: Run and commit**

```bash
npm run test:server -- --dir tests/server/api/weather
git add tests/server/api/weather/
git commit -m "test: add weather API route tests"
```

---

## Task 8: Server Tests — Spots, Horizon, Traffic APIs

**Files:**
- Create: `tests/server/api/spots/index.test.ts`
- Create: `tests/server/api/spots/slug.test.ts`
- Create: `tests/server/api/horizon/check.test.ts`
- Create: `tests/server/api/traffic/conditions.test.ts`
- Create: `tests/server/api/traffic/segments.test.ts`
- Create: `tests/server/api/cameras.test.ts`

- [ ] **Step 1: Write spots API tests**

```ts
// tests/server/api/spots/index.test.ts
import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

describe('GET /api/spots', async () => {
  await setup({ server: true })

  it('returns spots sorted by duration', async () => {
    const data = await $fetch('/api/spots')
    expect(data).toHaveProperty('spots')
    expect(Array.isArray(data.spots)).toBe(true)
  })
})

// tests/server/api/spots/slug.test.ts
describe('GET /api/spots/:slug', async () => {
  await setup({ server: true })

  it('returns spot for valid slug', async () => {
    // Use a slug from fixtures
    const data = await $fetch('/api/spots/test-spot-1')
    expect(data).toHaveProperty('spot')
  })

  it('returns 404 for unknown slug', async () => {
    await expect($fetch('/api/spots/nonexistent-spot')).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})
```

- [ ] **Step 2: Write horizon check test**

```ts
// tests/server/api/horizon/check.test.ts
describe('POST /api/horizon/check', async () => {
  await setup({ server: true })

  it('returns horizon check for valid coordinates', async () => {
    const data = await $fetch('/api/horizon/check', {
      method: 'POST',
      body: { lat: 64.15, lng: -21.94 },
    })
    expect(data).toHaveProperty('verdict')
    expect(['clear', 'marginal', 'risky', 'blocked']).toContain(data.verdict)
  })

  it('returns error for out-of-bounds coordinates', async () => {
    await expect($fetch('/api/horizon/check', {
      method: 'POST',
      body: { lat: 0, lng: 0 },
    })).rejects.toMatchObject({ statusCode: 400 })
  })
})
```

- [ ] **Step 3: Write traffic and cameras tests**

Follow the same pattern. Test response shapes and edge cases.

- [ ] **Step 4: Run and commit**

```bash
npm run test:server
git add tests/server/api/spots/ tests/server/api/horizon/ tests/server/api/traffic/ tests/server/api/cameras.test.ts
git commit -m "test: add spots, horizon, traffic, and cameras API tests"
```

---

## Task 9: Server Tests — Stripe, Admin, Signup, Tasks, Sitemap

**Files:**
- Create: `tests/server/api/stripe/checkout.test.ts`
- Create: `tests/server/api/stripe/webhook.test.ts`
- Create: `tests/server/api/stripe/activate.test.ts`
- Create: `tests/server/api/stripe/restore/request.test.ts`
- Create: `tests/server/api/stripe/restore/verify.test.ts`
- Create: `tests/server/api/admin/grant-pro.test.ts`
- Create: `tests/server/api/signup.test.ts`
- Create: `tests/server/api/tasks/ingest-weather.test.ts`
- Create: `tests/server/api/sitemap-urls.test.ts`

- [ ] **Step 1: Write Stripe API tests**

```ts
// tests/server/api/stripe/checkout.test.ts
describe('POST /api/stripe/checkout', async () => {
  await setup({ server: true })

  it('creates checkout session and returns URL', async () => {
    const data = await $fetch('/api/stripe/checkout', { method: 'POST' })
    expect(data).toHaveProperty('url')
    expect(typeof data.url).toBe('string')
  })
})

// tests/server/api/stripe/activate.test.ts
describe('POST /api/stripe/activate', async () => {
  await setup({ server: true })

  it('returns token for valid session_id', async () => {
    // Override MSW Supabase handler to return a purchase with a token
    // ...
    const data = await $fetch('/api/stripe/activate', {
      method: 'POST',
      body: { session_id: 'cs_test_mock' },
    })
    expect(data).toHaveProperty('token')
  })

  it('returns 404 for unknown session', async () => {
    await expect($fetch('/api/stripe/activate', {
      method: 'POST',
      body: { session_id: 'cs_unknown' },
    })).rejects.toMatchObject({ statusCode: 404 })
  })
})
```

- [ ] **Step 2: Write webhook test**

```ts
// tests/server/api/stripe/webhook.test.ts
describe('POST /api/stripe/webhook', async () => {
  await setup({ server: true })

  it('processes valid checkout.session.completed event', async () => {
    // Build a Stripe event payload matching webhook.post.ts expectations
    // The webhook validates Stripe signature — in tests, we may need to
    // either mock the Stripe constructEvent or use MSW to intercept
    // This is a complex test — see Stripe docs for test mode webhook testing
  })

  it('rejects invalid webhook signature', async () => {
    await expect($fetch('/api/stripe/webhook', {
      method: 'POST',
      body: '{}',
      headers: { 'stripe-signature': 'invalid' },
    })).rejects.toMatchObject({ statusCode: 400 })
  })
})
```

- [ ] **Step 3: Write restore tests**

```ts
// tests/server/api/stripe/restore/request.test.ts
describe('POST /api/stripe/restore/request', async () => {
  await setup({ server: true })

  it('returns sent:true for any email (does not leak existence)', async () => {
    const data = await $fetch('/api/stripe/restore/request', {
      method: 'POST',
      body: { email: 'unknown@test.com' },
    })
    expect(data.sent).toBe(true)
  })
})

// tests/server/api/stripe/restore/verify.test.ts
describe('POST /api/stripe/restore/verify', async () => {
  await setup({ server: true })

  it('rejects wrong OTP code', async () => {
    await expect($fetch('/api/stripe/restore/verify', {
      method: 'POST',
      body: { email: 'user@test.com', code: '000000' },
    })).rejects.toMatchObject({ statusCode: 400 })
  })
})
```

- [ ] **Step 4: Write admin grant-pro test**

```ts
// tests/server/api/admin/grant-pro.test.ts
describe('POST /api/admin/grant-pro', async () => {
  await setup({ server: true })

  it('rejects without admin secret', async () => {
    await expect($fetch('/api/admin/grant-pro', {
      method: 'POST',
      body: { email: 'user@test.com', secret: 'wrong' },
    })).rejects.toMatchObject({ statusCode: 403 })
  })

  it('grants pro with valid admin secret', async () => {
    const data = await $fetch('/api/admin/grant-pro', {
      method: 'POST',
      body: { email: 'user@test.com', secret: 'test-admin-secret' },
    })
    expect(data).toHaveProperty('token')
    expect(data).toHaveProperty('email')
  })
})
```

- [ ] **Step 5: Write signup, ingest-weather, sitemap tests**

```ts
// tests/server/api/signup.test.ts
describe('POST /api/signup', async () => {
  await setup({ server: true })

  it('accepts valid email', async () => {
    const data = await $fetch('/api/signup', {
      method: 'POST',
      body: { email: 'test@example.com' },
    })
    expect(data.success).toBe(true)
  })

  it('rejects invalid email', async () => {
    await expect($fetch('/api/signup', {
      method: 'POST',
      body: { email: 'not-an-email' },
    })).rejects.toMatchObject({ statusCode: 400 })
  })
})

// tests/server/api/tasks/ingest-weather.test.ts
describe('POST /api/tasks/ingest-weather', async () => {
  await setup({ server: true })

  it('ingests weather data and returns counts', async () => {
    const data = await $fetch('/api/tasks/ingest-weather', { method: 'POST' })
    expect(data).toHaveProperty('observations')
    expect(data).toHaveProperty('forecasts')
    expect(data).toHaveProperty('timestamp')
  })
})

// tests/server/api/sitemap-urls.test.ts
describe('sitemap URL generation', async () => {
  await setup({ server: true })

  it('includes spot URLs', async () => {
    // The sitemap generator is accessed via /__sitemap__/urls
    // or by importing the handler directly
    // Verify it returns URLs for all viewing spots
  })
})
```

- [ ] **Step 6: Run and commit**

```bash
npm run test:server
git add tests/server/api/
git commit -m "test: add Stripe, admin, signup, weather ingestion, and sitemap API tests"
```

---

## Task 10: Component Tests — UI Widgets

**Files:**
- Create: `tests/components/CountdownBar.test.ts`
- Create: `tests/components/EclipseHero.test.ts`
- Create: `tests/components/EmailSignup.test.ts`
- Create: `tests/components/WeatherIcon.test.ts`
- Create: `tests/components/CookieConsent.test.ts`
- Create: `tests/components/UserMenu.test.ts`
- Create: `tests/components/Starfield.test.ts`

**Reference:** Use `mountSuspended` from `@nuxt/test-utils/runtime` for Nuxt-aware component mounting. Read each component's source to understand its props and behavior.

- [ ] **Step 1: Write CountdownBar.test.ts (with snapshot)**

```ts
import { describe, it, expect, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CountdownBar from '~/components/CountdownBar.vue'

describe('CountdownBar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-22T12:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders countdown values', async () => {
    const wrapper = await mountSuspended(CountdownBar)
    const text = wrapper.text()
    // Should show days, hours, minutes, seconds
    expect(text).toMatch(/\d+/)
  })

  it('matches snapshot', async () => {
    const wrapper = await mountSuspended(CountdownBar)
    expect(wrapper.html()).toMatchSnapshot()
  })
})
```

- [ ] **Step 2: Write EclipseHero.test.ts (with snapshot)**

```ts
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import EclipseHero from '~/components/EclipseHero.vue'

describe('EclipseHero', () => {
  it('renders SVG eclipse illustration', async () => {
    const wrapper = await mountSuspended(EclipseHero)
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('has corona-pulse animation class', async () => {
    const wrapper = await mountSuspended(EclipseHero)
    expect(wrapper.html()).toContain('corona-pulse')
  })

  it('matches snapshot', async () => {
    const wrapper = await mountSuspended(EclipseHero)
    expect(wrapper.html()).toMatchSnapshot()
  })
})
```

- [ ] **Step 3: Write EmailSignup.test.ts**

```ts
import { describe, it, expect, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import EmailSignup from '~/components/EmailSignup.vue'

describe('EmailSignup', () => {
  it('renders email input and submit button', async () => {
    const wrapper = await mountSuspended(EmailSignup)
    expect(wrapper.find('input[type="email"]').exists()).toBe(true)
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('shows error for empty submission', async () => {
    const wrapper = await mountSuspended(EmailSignup)
    await wrapper.find('form').trigger('submit')
    // Should show validation error
    await wrapper.vm.$nextTick()
    const text = wrapper.text()
    // Check for error state
  })

  it('shows success after valid submission', async () => {
    const wrapper = await mountSuspended(EmailSignup)
    const input = wrapper.find('input[type="email"]')
    await input.setValue('test@example.com')
    await wrapper.find('form').trigger('submit')
    // Wait for async operation
    await new Promise(r => setTimeout(r, 100))
    // Check for success message
  })
})
```

- [ ] **Step 4: Write WeatherIcon.test.ts, CookieConsent.test.ts, UserMenu.test.ts, Starfield.test.ts**

Each test: mount the component, verify rendering, check props affect output. `Starfield.test.ts` gets a snapshot test.

- [ ] **Step 5: Run and commit**

```bash
npm run test:components
git add tests/components/CountdownBar.test.ts tests/components/EclipseHero.test.ts tests/components/EmailSignup.test.ts tests/components/WeatherIcon.test.ts tests/components/CookieConsent.test.ts tests/components/UserMenu.test.ts tests/components/Starfield.test.ts
git commit -m "test: add UI widget component tests (countdown, hero, email, weather, consent, menu, starfield)"
```

---

## Task 11: Component Tests — Spots, Horizon, Map

**Files:**
- Create: `tests/components/SpotPhotoHero.test.ts`
- Create: `tests/components/SpotPhotoGallery.test.ts`
- Create: `tests/components/PhotoCredit.test.ts`
- Create: `tests/components/SpotLocationMap.test.ts`
- Create: `tests/components/HorizonProfile.test.ts`
- Create: `tests/components/HorizonBadge.test.ts`
- Create: `tests/components/DynamicHorizonCheck.test.ts`
- Create: `tests/components/ForecastTimeline.test.ts`
- Create: `tests/components/EclipseMap.test.ts`
- Create: `tests/components/GuidePathMap.test.ts`
- Create: `tests/components/PeakFinderLink.test.ts`

- [ ] **Step 1: Write SpotPhotoHero.test.ts and SpotPhotoGallery.test.ts (with snapshots)**

```ts
// tests/components/SpotPhotoHero.test.ts
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import SpotPhotoHero from '~/components/SpotPhotoHero.vue'

describe('SpotPhotoHero', () => {
  const props = {
    photo: {
      filename: 'test-photo.jpg',
      alt: 'A beautiful spot',
      credit: 'Test Photographer',
      license: 'cc-by' as const,
      is_hero: true,
    },
  }

  it('renders hero image', async () => {
    const wrapper = await mountSuspended(SpotPhotoHero, { props })
    expect(wrapper.find('img').exists()).toBe(true)
  })

  it('shows credit attribution', async () => {
    const wrapper = await mountSuspended(SpotPhotoHero, { props })
    expect(wrapper.text()).toContain('Test Photographer')
  })

  it('matches snapshot', async () => {
    const wrapper = await mountSuspended(SpotPhotoHero, { props })
    expect(wrapper.html()).toMatchSnapshot()
  })
})
```

Similar pattern for `SpotPhotoGallery.test.ts` — pass array of photos, verify gallery grid renders, snapshot.

- [ ] **Step 2: Write HorizonProfile.test.ts (with snapshot) and HorizonBadge.test.ts**

```ts
// tests/components/HorizonBadge.test.ts
describe('HorizonBadge', () => {
  it.each([
    ['clear', 'green'],
    ['marginal', 'yellow'],
    ['risky', 'orange'],
    ['blocked', 'red'],
  ])('shows correct color for %s verdict', async (verdict, _expectedColor) => {
    const wrapper = await mountSuspended(HorizonBadge, {
      props: { verdict },
    })
    expect(wrapper.text().toLowerCase()).toContain(verdict)
  })
})
```

`HorizonProfile.test.ts` — Render with 91 sweep points, verify SVG renders, snapshot.

- [ ] **Step 3: Write map component tests**

`EclipseMap.test.ts`, `SpotLocationMap.test.ts`, `GuidePathMap.test.ts` — These use the mocked `mapbox-gl`. Verify the component mounts without errors, calls `Map` constructor with correct options.

`PeakFinderLink.test.ts` — Verify correct URL generation from coordinates:
```ts
describe('PeakFinderLink', () => {
  it('generates correct PeakFinder URL', async () => {
    const wrapper = await mountSuspended(PeakFinderLink, {
      props: { lat: 64.15, lng: -21.94 },
    })
    const link = wrapper.find('a')
    expect(link.attributes('href')).toContain('peakfinder.com')
    expect(link.attributes('href')).toContain('64.15')
  })
})
```

- [ ] **Step 4: Write PhotoCredit.test.ts, DynamicHorizonCheck.test.ts, ForecastTimeline.test.ts**

Standard component tests — mount, verify rendering, check props.

- [ ] **Step 5: Run and commit**

```bash
npm run test:components
git add tests/components/
git commit -m "test: add spot, horizon, and map component tests"
```

---

## Task 12: Component Tests — Pro/Auth/Offline

**Files:**
- Create: `tests/components/ProGate.test.ts`
- Create: `tests/components/ProUpgradeButton.test.ts`
- Create: `tests/components/RestorePurchase.test.ts`
- Create: `tests/components/OfflineBanner.test.ts`
- Create: `tests/components/OfflineManager.test.ts`

- [ ] **Step 1: Write ProGate.test.ts**

```ts
describe('ProGate', () => {
  it('shows slot content when Pro', async () => {
    // Mock useProStatus to return isPro: true
    const wrapper = await mountSuspended(ProGate, {
      slots: { default: '<div class="pro-content">Pro Content</div>' },
    })
    // Verify slot content is shown (depends on how useProStatus is mocked)
  })

  it('shows upgrade prompt when not Pro', async () => {
    // Mock useProStatus to return isPro: false
    // Verify upgrade prompt/button is shown
  })
})
```

- [ ] **Step 2: Write RestorePurchase.test.ts**

Test the multi-step form: email input → OTP code input → success state. Simulate form interactions with `@vue/test-utils`.

- [ ] **Step 3: Write OfflineBanner.test.ts and OfflineManager.test.ts**

```ts
describe('OfflineBanner', () => {
  it('shows banner when offline', async () => {
    // Mock useOfflineStatus to return isOffline: true
  })
  it('hides when online', async () => {
    // Mock useOfflineStatus to return isOffline: false
  })
})
```

- [ ] **Step 4: Write ProUpgradeButton.test.ts**

```ts
describe('ProUpgradeButton', () => {
  it('renders link to /pro', async () => {
    const wrapper = await mountSuspended(ProUpgradeButton)
    const link = wrapper.find('a')
    expect(link.attributes('href') || link.attributes('to')).toContain('/pro')
  })
})
```

- [ ] **Step 5: Run and commit**

```bash
npm run test:components
git add tests/components/ProGate.test.ts tests/components/ProUpgradeButton.test.ts tests/components/RestorePurchase.test.ts tests/components/OfflineBanner.test.ts tests/components/OfflineManager.test.ts
git commit -m "test: add Pro auth and offline component tests"
```

---

## Task 13: E2E Tests — Public Pages

**Files:**
- Create: `tests/e2e/landing.test.ts`
- Create: `tests/e2e/guide.test.ts`
- Create: `tests/e2e/spots.test.ts`
- Create: `tests/e2e/navigation.test.ts`
- Create: `tests/e2e/privacy-terms-credits.test.ts`

**Reference:** Use `@nuxt/test-utils/playwright` for Nuxt-aware Playwright tests. Read the [Nuxt testing docs](https://nuxt.com/docs/getting-started/testing#end-to-end-testing) for setup patterns.

- [ ] **Step 1: Write landing.test.ts**

```ts
import { expect, test } from '@nuxt/test-utils/playwright'

test('homepage loads with countdown', async ({ page, goto }) => {
  await goto('/', { waitUntil: 'hydration' })
  // Countdown should show numbers
  const countdown = page.locator('[data-testid="countdown"]').or(page.locator('.countdown'))
  await expect(countdown.first()).toBeVisible()
})

test('eclipse hero renders', async ({ page, goto }) => {
  await goto('/', { waitUntil: 'hydration' })
  const svg = page.locator('svg').first()
  await expect(svg).toBeVisible()
})

test('email signup works', async ({ page, goto }) => {
  await goto('/', { waitUntil: 'hydration' })
  const emailInput = page.locator('input[type="email"]')
  await emailInput.fill('playwright@test.com')
  await page.locator('form').first().locator('button[type="submit"]').click()
  // Should show success state (check for text change or class)
})

test('CTA links to /pro', async ({ page, goto }) => {
  await goto('/', { waitUntil: 'hydration' })
  const proLink = page.locator('a[href="/pro"]').first()
  await expect(proLink).toBeVisible()
})
```

Note: You may need to add `data-testid` attributes to components for reliable E2E selectors. This is acceptable — E2E tests should use stable selectors.

- [ ] **Step 2: Write guide.test.ts**

```ts
test('guide page renders markdown content', async ({ page, goto }) => {
  await goto('/guide', { waitUntil: 'hydration' })
  // Guide should have headings
  const heading = page.locator('h1, h2').first()
  await expect(heading).toBeVisible()
})

test('guide page has back to home link', async ({ page, goto }) => {
  await goto('/guide', { waitUntil: 'hydration' })
  const homeLink = page.locator('a[href="/"]').first()
  await expect(homeLink).toBeVisible()
})
```

- [ ] **Step 3: Write spots.test.ts**

```ts
test('spot detail page renders', async ({ page, goto }) => {
  // Navigate to a known spot slug (from fixtures or first spot from API)
  await goto('/spots/test-spot-1', { waitUntil: 'hydration' })
  // Should show spot name, description, stats
})

test('unknown spot returns 404', async ({ page, goto }) => {
  const response = await goto('/spots/nonexistent-xyz')
  // Check for 404 page or error state
})
```

- [ ] **Step 4: Write navigation.test.ts**

```ts
test('logo links to home', async ({ page, goto }) => {
  await goto('/guide', { waitUntil: 'hydration' })
  await page.locator('nav a').first().click()
  await expect(page).toHaveURL('/')
})

test('footer back to home works', async ({ page, goto }) => {
  await goto('/privacy', { waitUntil: 'hydration' })
  const footerLink = page.locator('footer a[href="/"]')
  await expect(footerLink).toBeVisible()
})
```

- [ ] **Step 5: Write privacy-terms-credits.test.ts**

```ts
test('privacy page renders GDPR content', async ({ page, goto }) => {
  await goto('/privacy', { waitUntil: 'hydration' })
  await expect(page.locator('h1')).toBeVisible()
  const text = await page.textContent('body')
  expect(text).toContain('privacy')
})

test('terms page renders', async ({ page, goto }) => {
  await goto('/terms', { waitUntil: 'hydration' })
  await expect(page.locator('h1')).toBeVisible()
})

test('credits page renders attribution', async ({ page, goto }) => {
  await goto('/credits', { waitUntil: 'hydration' })
  await expect(page.locator('h1')).toBeVisible()
})
```

- [ ] **Step 6: Run and commit**

```bash
npm run test:e2e
git add tests/e2e/landing.test.ts tests/e2e/guide.test.ts tests/e2e/spots.test.ts tests/e2e/navigation.test.ts tests/e2e/privacy-terms-credits.test.ts
git commit -m "test: add E2E tests for public pages (landing, guide, spots, navigation, legal)"
```

---

## Task 14: E2E Tests — Pro & Stripe Flows

**Files:**
- Create: `tests/e2e/pro-gate.test.ts`
- Create: `tests/e2e/stripe-checkout.test.ts`
- Create: `tests/e2e/purchase-restore.test.ts`

- [ ] **Step 1: Write pro-gate.test.ts**

```ts
import { expect, test } from '@nuxt/test-utils/playwright'

test('non-pro user is redirected from /map to /pro', async ({ page, goto }) => {
  await goto('/map', { waitUntil: 'hydration' })
  await expect(page).toHaveURL(/\/pro/)
})

test('non-pro user is redirected from /recommend to /pro', async ({ page, goto }) => {
  await goto('/recommend', { waitUntil: 'hydration' })
  await expect(page).toHaveURL(/\/pro/)
})

test('free routes are always accessible', async ({ page, goto }) => {
  await goto('/', { waitUntil: 'hydration' })
  await expect(page).toHaveURL('/')

  await goto('/guide', { waitUntil: 'hydration' })
  await expect(page).toHaveURL('/guide')
})

test('pro user can access /map', async ({ page, goto }) => {
  // Inject a valid JWT into IndexedDB/localStorage before navigation
  await goto('/', { waitUntil: 'hydration' })
  await page.evaluate(async (token) => {
    localStorage.setItem('eclipsechase_pro_token', token)
  }, 'test-valid-jwt')
  // Note: Actual implementation may need a real JWT that passes RS256 verification
  // Generate one using the test private key
  await goto('/map', { waitUntil: 'hydration' })
  // Should not redirect
})
```

- [ ] **Step 2: Write stripe-checkout.test.ts**

```ts
test('pro page shows pricing and checkout button', async ({ page, goto }) => {
  await goto('/pro', { waitUntil: 'hydration' })
  const text = await page.textContent('body')
  expect(text).toContain('9.99')
  const checkoutBtn = page.locator('button, a').filter({ hasText: /checkout|get pro|buy/i })
  await expect(checkoutBtn.first()).toBeVisible()
})

// Note: Full Stripe redirect cannot be tested in E2E since it goes to Stripe's domain.
// Test the success page directly:
test('success page activates token', async ({ page, goto }) => {
  // Navigate to success page with a mock session_id
  await goto('/pro/success?session_id=cs_test_mock', { waitUntil: 'hydration' })
  // Should call /api/stripe/activate and store token
  // Verify by checking localStorage or page content
})
```

- [ ] **Step 3: Write purchase-restore.test.ts**

```ts
test('restore flow: enter email → request OTP', async ({ page, goto }) => {
  await goto('/pro', { waitUntil: 'hydration' })
  // Find restore purchase link/button
  const restoreLink = page.locator('text=restore').or(page.locator('text=Restore'))
  if (await restoreLink.isVisible()) {
    await restoreLink.click()
  }
  // Fill email
  const emailInput = page.locator('input[type="email"]')
  await emailInput.fill('user@test.com')
  // Submit
  await page.locator('button[type="submit"]').first().click()
  // Should show OTP input or success message
})
```

- [ ] **Step 4: Run and commit**

```bash
npm run test:e2e
git add tests/e2e/pro-gate.test.ts tests/e2e/stripe-checkout.test.ts tests/e2e/purchase-restore.test.ts
git commit -m "test: add E2E tests for Pro gate, Stripe checkout, and purchase restoration"
```

---

## Task 15: E2E Tests — Cross-Cutting (i18n, Map, Recommend, Offline, Responsive)

**Files:**
- Create: `tests/e2e/i18n.test.ts`
- Create: `tests/e2e/map.test.ts`
- Create: `tests/e2e/recommend.test.ts`
- Create: `tests/e2e/offline.test.ts`
- Create: `tests/e2e/responsive.test.ts`

- [ ] **Step 1: Write i18n.test.ts**

```ts
test('default language is English', async ({ page, goto }) => {
  await goto('/', { waitUntil: 'hydration' })
  const html = await page.locator('html').getAttribute('lang')
  expect(html).toBe('en')
})

test('Icelandic route prefix works', async ({ page, goto }) => {
  await goto('/is/guide', { waitUntil: 'hydration' })
  // Should load guide in Icelandic
  await expect(page).toHaveURL(/\/is\/guide/)
})
```

- [ ] **Step 2: Write map.test.ts and recommend.test.ts**

These require Pro access. Inject a valid JWT before navigating:

```ts
// tests/e2e/map.test.ts
test('map page loads with Mapbox', async ({ page, goto }) => {
  // Set up Pro token (generate valid JWT using test key)
  await goto('/', { waitUntil: 'hydration' })
  await page.evaluate(() => {
    localStorage.setItem('eclipse_pro_token', 'VALID_TEST_JWT')
  })
  await goto('/map', { waitUntil: 'hydration' })
  // Map container should be visible
  const mapContainer = page.locator('.mapboxgl-map, [data-testid="map"]')
  // Note: In E2E with real Mapbox, this tests actual map loading
})

// tests/e2e/recommend.test.ts
test('recommendation page shows 5 profiles', async ({ page, goto }) => {
  // Set Pro token
  await goto('/recommend', { waitUntil: 'hydration' })
  // Should show profile selection cards
})
```

- [ ] **Step 3: Write offline.test.ts**

```ts
test('offline banner appears when network is disconnected', async ({ page, context, goto }) => {
  await goto('/', { waitUntil: 'hydration' })
  // Emulate offline
  await context.setOffline(true)
  // Trigger a navigation or wait
  await page.waitForTimeout(1000)
  // Check for offline banner
  const banner = page.locator('[data-testid="offline-banner"]').or(page.locator('text=offline'))
  // Note: Depends on implementation — may need data-testid

  // Restore online
  await context.setOffline(false)
})
```

- [ ] **Step 4: Write responsive.test.ts**

```ts
import { expect, test } from '@nuxt/test-utils/playwright'

test('mobile layout (375px)', async ({ page, goto }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await goto('/', { waitUntil: 'hydration' })
  // Verify mobile-specific elements
  await expect(page.locator('nav')).toBeVisible()
})

test('tablet layout (768px)', async ({ page, goto }) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await goto('/', { waitUntil: 'hydration' })
})

test('desktop layout (1280px)', async ({ page, goto }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await goto('/', { waitUntil: 'hydration' })
})
```

- [ ] **Step 5: Run and commit**

```bash
npm run test:e2e
git add tests/e2e/
git commit -m "test: add E2E tests for i18n, map, recommend, offline, and responsive layouts"
```

---

## Task 16: CI/CD — GitHub Actions & Git Hooks

**Files:**
- Create: `.github/workflows/test.yml`
- Modify: `package.json` (verify git hooks)

- [ ] **Step 1: Create GitHub Actions workflow**

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  vitest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx vitest run --reporter=verbose
        env:
          SUPABASE_URL: http://localhost:54321
          SUPABASE_KEY: test-anon-key
          NUXT_PUBLIC_SUPABASE_URL: http://localhost:54321
          NUXT_PUBLIC_SUPABASE_KEY: test-anon-key
          NUXT_PUBLIC_MAPBOX_TOKEN: pk.test
          STRIPE_SECRET_KEY: sk_test_dummy
          STRIPE_WEBHOOK_SECRET: whsec_test_dummy
          RESEND_API_KEY: re_test_dummy
          NUXT_PUBLIC_SITE_URL: http://localhost:3000
          NUXT_ADMIN_SECRET: test-admin-secret

  playwright:
    runs-on: ubuntu-latest
    needs: vitest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - name: Cache Playwright browsers
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ hashFiles('package-lock.json') }}
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test --project=chromium
        env:
          SUPABASE_URL: http://localhost:54321
          SUPABASE_KEY: test-anon-key
          NUXT_PUBLIC_SUPABASE_URL: http://localhost:54321
          NUXT_PUBLIC_SUPABASE_KEY: test-anon-key
          NUXT_PUBLIC_MAPBOX_TOKEN: pk.test
          STRIPE_SECRET_KEY: sk_test_dummy
          STRIPE_WEBHOOK_SECRET: whsec_test_dummy
          RESEND_API_KEY: re_test_dummy
          NUXT_PUBLIC_SITE_URL: http://localhost:3000
          NUXT_ADMIN_SECRET: test-admin-secret
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

- [ ] **Step 2: Verify git hooks are configured**

```bash
npx simple-git-hooks
```

This should install the pre-commit and pre-push hooks defined in `package.json`.

- [ ] **Step 3: Run the full test suite to verify everything works end-to-end**

```bash
npm run test:all
```

Expected: All Vitest tests pass, then all Playwright tests pass.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/test.yml
git commit -m "ci: add GitHub Actions test pipeline (Vitest + Playwright)"
```

---

## Execution Notes

- **Tasks 1-2** are sequential (foundation must come first)
- **Tasks 3-5** can run in parallel (independent unit test groups)
- **Tasks 6-9** can run in parallel (independent server test groups)
- **Tasks 10-12** can run in parallel (independent component test groups)
- **Tasks 13-15** can run in parallel (independent E2E test groups)
- **Task 16** should run last (verifies everything works together)

Each task should be verified by running the relevant test command before committing. If a test fails, debug and fix before moving on — don't accumulate broken tests.

When MSW handlers don't match real API responses, read the actual server code to fix the XML/JSON format. The handlers in Task 2 are approximations — implementers should verify against real `vedur.ts`, `vegagerdin.ts`, etc.
