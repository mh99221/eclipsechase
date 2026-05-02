# Test Infrastructure Design — EclipseChase.is

**Date:** 2026-03-22
**Status:** Approved
**Scope:** Full test suite covering all implemented features

## Overview

Greenfield test infrastructure for the EclipseChase PWA. No testing existed prior — this spec establishes the complete testing pyramid from unit tests through E2E browser tests.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Unit/component runner | Vitest | Nuxt-native via `@nuxt/test-utils`, fast, ESM-first |
| E2E runner | Playwright | Cross-browser, Nuxt integration, trace/screenshot artifacts |
| HTTP mocking | MSW 2.x | Intercepts at network level — real code runs, only external calls are stubbed |
| Component testing | @vue/test-utils + happy-dom | Lightweight DOM, fast component mounting |
| Snapshot testing | Yes, 6 key components | EclipseHero, CountdownBar, SpotPhotoHero, SpotPhotoGallery, HorizonProfile, Starfield |
| Test organization | Layer-based (`tests/` directory) | Clear separation: unit, server, components, e2e, mocks |
| Git hooks | simple-git-hooks | Pre-commit: unit tests. Pre-push: full suite |
| CI | GitHub Actions | Vitest → Playwright pipeline with cached browsers |

## Dependencies to Add

```json
{
  "devDependencies": {
    "vitest": "^3.x",
    "@nuxt/test-utils": "^3.x",
    "@vue/test-utils": "^2.x",
    "@playwright/test": "^1.x",
    "msw": "^2.x",
    "happy-dom": "^17.x",
    "simple-git-hooks": "^2.x"
  }
}
```

## Directory Structure

```
tests/
├── unit/
│   ├── utils/
│   │   ├── eclipse.test.ts
│   │   ├── solar.test.ts
│   │   ├── proStorage.test.ts
│   │   └── mapLayers.test.ts
│   ├── composables/
│   │   ├── useProStatus.test.ts
│   │   ├── useRecommendation.test.ts
│   │   ├── useCountdown.test.ts
│   │   ├── useLocation.test.ts
│   │   ├── useOfflineStatus.test.ts
│   │   └── useAnalyticsConsent.test.ts
│   └── middleware/
│       └── pro-gate.test.ts
│
├── server/
│   ├── api/
│   │   ├── weather/
│   │   │   ├── cloud-cover.test.ts
│   │   │   ├── current.test.ts
│   │   │   ├── forecast.test.ts
│   │   │   ├── forecast-timeline.test.ts
│   │   │   └── stations.test.ts
│   │   ├── spots/
│   │   │   ├── index.test.ts
│   │   │   └── slug.test.ts
│   │   ├── horizon/
│   │   │   └── check.test.ts
│   │   ├── traffic/
│   │   │   ├── conditions.test.ts
│   │   │   └── segments.test.ts
│   │   ├── stripe/
│   │   │   ├── checkout.test.ts
│   │   │   ├── webhook.test.ts
│   │   │   ├── activate.test.ts
│   │   │   └── restore/
│   │   │       ├── request.test.ts
│   │   │       └── verify.test.ts
│   │   ├── admin/
│   │   │   └── grant-pro.test.ts
│   │   ├── tasks/
│   │   │   └── ingest-weather.test.ts
│   │   ├── cameras.test.ts
│   │   ├── signup.test.ts
│   │   └── sitemap-urls.test.ts
│   └── utils/
│       ├── vedur.test.ts
│       ├── vegagerdin.test.ts
│       ├── horizon.test.ts
│       ├── dem.test.ts
│       ├── jwt.test.ts
│       ├── email.test.ts
│       └── rateLimit.test.ts
│
├── components/
│   ├── CountdownBar.test.ts
│   ├── EclipseHero.test.ts
│   ├── EclipseMap.test.ts
│   ├── EmailSignup.test.ts
│   ├── WeatherIcon.test.ts
│   ├── ForecastTimeline.test.ts
│   ├── SpotLocationMap.test.ts
│   ├── SpotPhotoHero.test.ts
│   ├── SpotPhotoGallery.test.ts
│   ├── PhotoCredit.test.ts
│   ├── HorizonProfile.test.ts
│   ├── HorizonBadge.test.ts
│   ├── DynamicHorizonCheck.test.ts
│   ├── ProGate.test.ts
│   ├── ProUpgradeButton.test.ts
│   ├── RestorePurchase.test.ts
│   ├── OfflineBanner.test.ts
│   ├── OfflineManager.test.ts
│   ├── CookieConsent.test.ts
│   ├── UserMenu.test.ts
│   ├── Starfield.test.ts
│   ├── GuidePathMap.test.ts
│   └── PeakFinderLink.test.ts
│
├── e2e/
│   ├── landing.test.ts
│   ├── guide.test.ts
│   ├── spots.test.ts
│   ├── map.test.ts
│   ├── recommend.test.ts
│   ├── pro-gate.test.ts
│   ├── stripe-checkout.test.ts
│   ├── purchase-restore.test.ts
│   ├── offline.test.ts
│   ├── i18n.test.ts
│   ├── navigation.test.ts
│   ├── privacy-terms-credits.test.ts
│   └── responsive.test.ts
│
└── mocks/
    ├── handlers.ts
    ├── fixtures/
    │   ├── weather-observations.json
    │   ├── weather-forecasts.json
    │   ├── viewing-spots.json
    │   ├── eclipse-grid.json
    │   ├── horizon-grid.json
    │   ├── stripe-session.json
    │   └── road-conditions.json
    ├── factories/
    │   ├── spot.ts
    │   ├── station.ts
    │   └── purchase.ts
    └── setup.ts
```

**Total: ~72 test files**

## Configuration Files

### vitest.config.ts

Uses `defineVitestConfig` from `@nuxt/test-utils/config`. Configures:
- `happy-dom` as test environment
- `tests/mocks/setup.ts` as global setup (starts MSW server)
- Coverage reporting via v8
- Path aliases matching Nuxt (`~/`, `#imports`, etc.)

### playwright.config.ts

Configures:
- Nuxt dev server as web server (auto-start)
- Chromium, Firefox, WebKit projects
- Screenshot + trace on failure
- `.env.test` for dummy environment variables

### .env.test

Dummy environment variables for test runs (no real keys):

```env
SUPABASE_URL=http://localhost:54321
SUPABASE_KEY=test-anon-key
NUXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NUXT_PUBLIC_SUPABASE_KEY=test-anon-key
NUXT_PUBLIC_MAPBOX_TOKEN=pk.test_mapbox_token
STRIPE_SECRET_KEY=sk_test_dummy
STRIPE_WEBHOOK_SECRET=whsec_test_dummy
RESEND_API_KEY=re_test_dummy
NUXT_PRO_JWT_PRIVATE_KEY=<test RSA private key, generated once and committed to tests/mocks/keys/>
NUXT_PUBLIC_SITE_URL=http://localhost:3000
UMAMI_HOST=
UMAMI_WEBSITE_ID=
```

A test RSA keypair (2048-bit) is generated once and stored in `tests/mocks/keys/` for deterministic JWT testing.

### tests/mocks/setup.ts

Global Vitest setup file:
- Starts MSW server with default handlers before all tests
- Resets handlers after each test (clean state)
- Closes MSW server after all tests

### Mapbox GL Mocking Strategy

`mapbox-gl` requires WebGL which is unavailable in happy-dom. For component tests (`EclipseMap.test.ts`, `SpotLocationMap.test.ts`, `GuidePathMap.test.ts`):

```ts
// tests/mocks/mapbox-gl.ts — auto-mocked via vi.mock('mapbox-gl')
export class Map {
  constructor() {}
  on() { return this }
  addSource() {}
  addLayer() {}
  addControl() {}
  remove() {}
  getCanvas() { return { style: {} } }
  // ... minimal stub API
}
export class NavigationControl {}
export class GeolocateControl {}
export class Popup { setLngLat() { return this } setHTML() { return this } addTo() { return this } }
export class Marker { setLngLat() { return this } addTo() { return this } }
```

This is registered in `vitest.config.ts` via `resolve.alias` or `vi.mock('mapbox-gl')` in setup.

### Coverage Thresholds

Starting targets (to be raised over time):
- Server utils: 80%
- Composables: 70%
- API routes: 60%
- Components: 50%
- Overall: 50%

Configured in `vitest.config.ts` via `coverage.thresholds`.

## MSW Mock Layer

### Mocked Services

| Service | URLs intercepted | Mock response |
|---|---|---|
| vedur.is | `xmlweather.vedur.is/*` | Pre-built XML (observations + forecasts) |
| Vegagerdin | `vegagerdin.is/*` | DATEX II XML (road conditions) + camera JSON |
| Supabase | `*.supabase.co/rest/v1/*` | JSON matching table schemas |
| Stripe | `api.stripe.com/*` | Checkout session, webhook events |
| Resend | `api.resend.com/*` | Email send success/failure |
| Mapbox | `api.mapbox.com/*` | 1x1 transparent PNG tiles, minimal style JSON |

### Handler Organization

```ts
// tests/mocks/handlers.ts
export const vedurHandlers = [...]
export const supabaseHandlers = [...]
export const stripeHandlers = [...]
export const resendHandlers = [...]
export const vegagerdinHandlers = [...]
export const mapboxHandlers = [...]

export const handlers = [
  ...vedurHandlers,
  ...supabaseHandlers,
  ...stripeHandlers,
  ...resendHandlers,
  ...vegagerdinHandlers,
  ...mapboxHandlers,
]
```

Per-test overrides for error scenarios (500s, invalid signatures, empty results, expired tokens).

### Fixtures

JSON files with realistic sample data (5-10 records each). Cover edge cases:
- Null cloud cover, missing station
- Expired OTP, wrong OTP code
- Unknown Stripe session, invalid webhook signature
- Spot with no photos, spot with no horizon data

### Factories

```ts
// tests/mocks/factories/spot.ts
export function createSpot(overrides?: Partial<ViewingSpot>): ViewingSpot
// tests/mocks/factories/station.ts
export function createStation(overrides?: Partial<WeatherStation>): WeatherStation
// tests/mocks/factories/purchase.ts
export function createPurchase(overrides?: Partial<ProPurchase>): ProPurchase
```

## Test Coverage by Feature Area

### Revenue / Pro Auth

| Feature | Unit | Component | E2E |
|---|---|---|---|
| JWT generation | `jwt.test.ts` — sign, verify, expired, invalid key | — | — |
| Pro status | `useProStatus.test.ts` — isPro states, token expiry | `ProGate.test.ts` — slot vs prompt | `pro-gate.test.ts` — redirect/access |
| IndexedDB storage | `proStorage.test.ts` — save/get/remove (mocked IDB) | — | — |
| Stripe checkout | `checkout.test.ts` — session creation, params | — | `stripe-checkout.test.ts` — full purchase flow |
| Webhook | `webhook.test.ts` — valid sig → JWT, invalid → 400 | — | — |
| Activation | `activate.test.ts` — valid/unknown session | — | — |
| Purchase restore | `request.test.ts` — OTP send, rate limit; `verify.test.ts` — valid/expired/wrong | `RestorePurchase.test.ts` — form flow | `purchase-restore.test.ts` — full flow |
| Pro gate middleware | `pro-gate.test.ts` — redirect non-pro, pass pro, skip free | — | — |
| Admin grant-pro | `grant-pro.test.ts` — auth check (adminSecret), grants pro, rejects unauthorized | — | — |

### Weather & Data

| Feature | Unit | Server | E2E |
|---|---|---|---|
| vedur.is parsing | `vedur.test.ts` — XML → data, missing fields, malformed | — | — |
| Cloud cover | — | `cloud-cover.test.ts` — per-station %, caching | `map.test.ts` — markers show % |
| Observations | — | `current.test.ts` — temp, wind, visibility | — |
| Forecasts | — | `forecast.test.ts`, `forecast-timeline.test.ts` | — |
| Stations | — | `stations.test.ts` — 55 stations with coords | — |
| Weather ingestion | — | `ingest-weather.test.ts` — cron parses XML, handles partial failures, writes to DB | — |
| DEM utilities | `dem.test.ts` — elevation lookup, boundary handling | — | — |

### Eclipse & Horizon

| Feature | Unit | Server | Component | E2E |
|---|---|---|---|---|
| Eclipse utils | `eclipse.test.ts` — formatDuration, cloudColor, compassDirection | — | — | — |
| Solar calc | `solar.test.ts` — altitude/azimuth for known inputs | — | — | — |
| Horizon check | `horizon.test.ts` — grid lookup, interpolation, edge | `check.test.ts` — POST → verdict | `HorizonProfile.test.ts` + snapshot; `HorizonBadge.test.ts` | — |
| Recommendation | `useRecommendation.test.ts` — 5 profiles, edge cases | — | — | `recommend.test.ts` — profile → ranked spots |

### Spots & Content

| Feature | Server | Component | E2E |
|---|---|---|---|
| Spot listing | `index.test.ts` — all spots with geometry | — | `spots.test.ts` — listing → detail |
| Spot detail | `slug.test.ts` — photos, horizon, description; 404 | `SpotPhotoHero.test.ts`, `SpotPhotoGallery.test.ts`, `PhotoCredit.test.ts` + snapshots | — |
| Guide page | — | `GuidePathMap.test.ts` — renders map with eclipse path | `guide.test.ts` — markdown renders, map embeds |
| PeakFinder link | — | `PeakFinderLink.test.ts` — generates correct URL from coords | — |
| Sitemap | `sitemap-urls.test.ts` — dynamic URLs include all spots + pages | — | — |

### Map & Traffic

| Feature | Server | Component | E2E |
|---|---|---|---|
| Map | — | `EclipseMap.test.ts` — init with mocked Mapbox | `map.test.ts` — load, toggle layers, weather overlay |
| Road conditions | `conditions.test.ts`, `segments.test.ts` | — | `map.test.ts` — road overlay |
| Cameras | `cameras.test.ts` — camera list | — | — |

### UI & Cross-Cutting

| Feature | Component | E2E |
|---|---|---|
| Countdown | `CountdownBar.test.ts` + snapshot | `landing.test.ts` — visible |
| Email signup | `EmailSignup.test.ts` — validate, submit, success/error | `landing.test.ts` — signup flow |
| Cookie consent | `CookieConsent.test.ts` — banner, accept/decline | — |
| Offline | `OfflineBanner.test.ts`, `OfflineManager.test.ts` | `offline.test.ts` — offline → banner → cached data |
| i18n | — | `i18n.test.ts` — switch en↔is |
| Navigation | — | `navigation.test.ts` — all links work |
| Responsive | — | `responsive.test.ts` — mobile/tablet/desktop |
| Legal pages | — | `privacy-terms-credits.test.ts` — render, contain required content (incl. /credits attribution) |

### Snapshot Components

These 6 components get HTML snapshot tests for visual regression:
1. `EclipseHero` — SVG corona animation
2. `CountdownBar` — countdown display
3. `SpotPhotoHero` — full-width hero image
4. `SpotPhotoGallery` — photo grid layout
5. `HorizonProfile` — SVG sweep visualization
6. `Starfield` — canvas animation markup

### Excluded from Testing

- **`OgImage/OgImageDefault.satori.vue`** — Satori rendering is handled by `nuxt-og-image` module internals. Testing the OG image template would require Satori's Node rendering pipeline which is covered by the module's own tests. We verify OG meta tags exist in E2E tests instead.

## E2E Test Scenarios

### landing.test.ts
- Page loads with countdown (correct days/hours/minutes)
- Eclipse hero SVG has corona-pulse animation class
- Email signup: valid email → success
- Email signup: empty/invalid → error
- Email signup: duplicate → appropriate message
- "Get Pro Access" CTA links to /pro
- Feature cards render

### guide.test.ts
- Markdown content renders fully
- GuidePathMap component loads inside content
- Navigation back to home works
- Prerendered HTML contains content

### spots.test.ts
- Spot detail: name, description, stats grid
- Photo hero + gallery render
- Horizon profile + badge render
- Nearby stations show weather
- "View on Map" link works
- Unknown slug → 404

### map.test.ts (Pro-gated)
- With Pro token: map loads, Mapbox initializes
- Weather station markers with cloud cover colors
- Eclipse path overlay visible
- Road conditions layer toggleable
- Camera markers clickable
- Spot markers → popup

### recommend.test.ts (Pro-gated)
- 5 profile options shown
- "Photographer" → relevant ranking
- "Family" → different ranking
- Spot cards with scores
- Click spot → detail page

### pro-gate.test.ts
- No token: /map → /pro redirect
- No token: /recommend → /pro redirect
- Valid token: /map loads
- Expired token: → /pro redirect
- Free routes always accessible

### stripe-checkout.test.ts
- /pro page: pricing, features, CTA
- Click checkout → MSW Stripe → success page
- Success page activates token → stored in IndexedDB
- After activation: /map accessible

### purchase-restore.test.ts
- Email → OTP sent
- Correct OTP → JWT issued → Pro restored
- Wrong OTP → error
- Expired OTP → error
- Rate limiting → blocked

### offline.test.ts
- Go offline → banner appears
- Cached data still serves
- Go online → banner disappears, fresh data

### i18n.test.ts
- Default English
- Switch to Icelandic → labels change
- URL prefix /is/guide
- Switch back → revert

### navigation.test.ts
- Logo → home from every page
- Right nav link context-appropriate
- Footer back link works
- No broken internal links

### privacy-terms-credits.test.ts
- Privacy renders with GDPR content
- Terms renders with ToS content
- Credits renders with photo/data attribution
- Prerendered HTML check

### responsive.test.ts
- Mobile 375px: compact layout, single-column
- Tablet 768px: adjusted grids
- Desktop 1280px: full layout

## npm Scripts

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:unit": "vitest run --dir tests/unit",
  "test:server": "vitest run --dir tests/server",
  "test:components": "vitest run --dir tests/components",
  "test:e2e": "playwright test",
  "test:all": "vitest run && playwright test"
}
```

## Git Hooks

Via `simple-git-hooks` in package.json:

```json
{
  "simple-git-hooks": {
    "pre-commit": "npx vitest run --dir tests/unit",
    "pre-push": "npx vitest run && npx playwright test"
  }
}
```

- **Pre-commit:** Unit tests only (~5s)
- **Pre-push:** Full suite (unit + server + component + E2E)

## CI Pipeline

GitHub Actions (`.github/workflows/test.yml`):

```yaml
on: [push, pull_request]

jobs:
  vitest:
    runs-on: ubuntu-latest
    steps:
      - Checkout + Node 22 + npm ci (cached)
      - npx vitest run --reporter=verbose

  playwright:
    runs-on: ubuntu-latest
    needs: vitest
    steps:
      - Checkout + Node 22 + npm ci (cached)
      - Install Playwright browsers (cached)
      - npx playwright test
      - Upload screenshots + traces on failure
```

- Playwright only runs after Vitest passes
- Browser binaries cached between runs
- Failed E2E uploads screenshots + traces
- `.env.test` with dummy values (no real keys)
- MSW intercepts everything — zero external access needed
