# EclipseChase.is — Project Context for Claude Code

## What This Is

A PWA (Progressive Web App) that helps visitors to Iceland find the best viewing position for the **total solar eclipse on August 12, 2026**. The core feature is a real-time weather + eclipse map with a recommendation engine that tells users where to go for the clearest skies on eclipse day.

Domain: **eclipsechase.is** (registered, deployed on Vercel with custom domain + SSL)

## Key Decisions Already Made

- **Platform**: PWA only (Nuxt 4) — no native app planned (see Monetization below)
- **Stack**: Nuxt 4.x + TypeScript + TailwindCSS + Supabase (same stack as my other project Poradie kníh)
- **Hosting**: Vercel (free tier)
- **Maps**: Mapbox GL JS (free tier — 50K map loads/mo)
- **Weather data**: vedur.is XML API directly (apis.is is dead — 502/expired SSL). No API key needed. 55 stations across 5 regions.
- **Eclipse computation**: Pre-computed grid from Python script using Skyfield, stored as JSON
- **Horizon checks**: Pre-computed from ÍslandsDEM v1.0 DEM data, stored as `horizon-grid.json` (91-point azimuth sweep per grid point)
- **Payments**: Stripe Checkout (€9.99 one-time "Eclipse Pro" tier)
- **Pro auth**: RS256 JWT stored in IndexedDB (no Supabase Auth — "purchase is the key")
- **Purchase restoration**: Email + 6-digit OTP code via Resend
- **Analytics**: Umami (privacy-friendly, cookie consent gated)
- **i18n**: English (primary), Icelandic (secondary). v0 redesign keys live under the `v0.*` namespace; Icelandic falls back to English for that namespace via Nuxt i18n's lazy fallback.
- **Design direction**: Mobile-first. Dark theme is default (astronomy convention) with a fully-implemented light "Dawn Horizon" theme switchable via `@nuxtjs/color-mode` (`ec-color-mode` localStorage key). v0 visual redesign was merged — all gated and content pages now use shared chrome (`PageShell` + `BrandBar` + `BottomNav`) instead of per-page inline `<nav>`. The marketing landing (`/`) intentionally remains full-bleed (no PageShell) for hero/Starfield/gradient orb effects, but uses semantic tokens throughout. The "Legacy chrome" section in Page Design Patterns is kept as historical reference only — no page uses it now.
- **Budget**: Under €5K total, mostly my own dev time (evenings/weekends)
- **Builder**: Solo developer, I'm an IT consultant

## Monetization Strategy (Free / Pro)

**Model**: Freemium — single PWA, page-level route gating via JWT + Stripe Checkout.

**Free tier** (public, SEO-indexed):
- `/` — Landing page with countdown, email signup
- `/guide` — Long-form SEO guide (Nuxt Content markdown)
- `/spots` — Spots list (browse all, profile pills visible but selecting one prompts upgrade)
- `/spots/[slug]` — Individual viewing spot detail (full DetailTabs: Overview / Sky / Weather / Plan)
- `/pro`, `/pro/success` — Upgrade page + post-checkout activation
- `/privacy`, `/terms`, `/credits` — Legal & attribution pages

**Pro tier** (€9.99 one-time, behind Stripe paywall):
- `/dashboard` — Countdown grid + "best region right now" + checklist + top-3 spots
- `/map` — Live weather map (cloud cover, station markers, eclipse path overlay, road conditions, camera feeds, dynamic horizon check, profile-ranked spot overlay)
- `/me` — Theme toggle, restore purchase, sign-out

The 5-profile recommendation engine (Photographer / Family / Hiker / Sky Chaser / First-Timer) is no longer a standalone `/recommend` route — it's embedded in `/map` (mobile chip stack + ranked overlay) and `/spots` (selection re-orders the list). Profile pills on `/spots` are visible to free users as a teaser; selecting one triggers the upgrade prompt.

**Why PWA-only (no native app)**:
- 5-month timeline for a single-event product doesn't justify native investment
- App Store friction kills conversion (redirect to download vs instant access)
- Apple/Google take 30% vs Stripe's ~2.9%
- PWA handles offline maps (Service Worker + Mapbox tile caching) and push notifications
- Solo dev can't maintain two codebases

**Pro auth flow**:
1. User clicks "Get Pro Access" → Stripe Checkout (Stripe collects email)
2. Webhook receives `checkout.session.completed` → generates RS256 JWT → stores in `pro_purchases`
3. Success page calls `/api/stripe/activate` with session_id → gets JWT
4. JWT stored in IndexedDB → works offline, in service workers
5. Client verifies JWT with embedded public key (no server roundtrip needed)
6. Restore: email → 6-digit OTP via Resend → verify → fresh JWT issued

**Gate implementation**: `pro-gate` middleware checks `useProStatus().isPro`. Non-Pro visitors hitting `/dashboard`, `/map`, or `/me` are redirected to `/pro`. In dev, the gate bypasses by default; set `NUXT_PUBLIC_BYPASS_PRO_GATE=0` in `.env` to test the real gate locally.

**Forecast phase preview**: the spot detail Weather tab is phase-aware (climatology / subseasonal / extended / reliable / nowcast — see `app/composables/useForecastPhase.ts`). To QA non-current phases without waiting for the calendar, append `?asOf=YYYY-MM-DD` (or any `Date.parse`-able string) to any spot URL — the composable simulates being at that date and the right phase component renders. Always on in every environment; the page also auto-switches to the Weather tab when `?asOf=` is present. A striped amber `PreviewBadge` appears at the top of the Weather tab whenever the override is active. Canonical URLs strip query params so search engines don't index simulated phases as duplicate content.

## File Structure (Actual)

```
eclipse-chaser/
├── nuxt.config.ts
├── app.vue
├── app/
│   ├── pages/
│   │   ├── index.vue                # Landing page (hero, countdown, features, email signup)
│   │   ├── dashboard.vue            # v0 home redesign — countdown grid, checklist, top-3 spots
│   │   ├── guide.vue                # Nuxt Content renderer for guide.md (v0 typography pass + TOC chips)
│   │   ├── map.vue                  # Live weather map (Pro-gated; mobile chip stack + selected lightbox)
│   │   ├── me.vue                   # Pro user profile / settings (theme toggle, restore, sign-out)
│   │   ├── pro.vue                  # Pro upgrade page (pricing, waiver, Stripe checkout)
│   │   ├── pro/success.vue          # Post-checkout activation + token display
│   │   ├── spots/index.vue          # Spots list (hero photos, sort/filter, region groups)
│   │   ├── spots/[slug].vue         # Individual viewing spot detail (DetailTabs: Overview / Sky / Weather / Plan)
│   │   ├── privacy.vue              # Privacy policy (GDPR-compliant)
│   │   ├── terms.vue                # Terms of service
│   │   └── credits.vue              # Photo/data attribution
│   ├── components/
│   │   ├── PageShell.vue            # v0 chrome — page wrapper (width modes: reading/wide/full, top/bottom clearance)
│   │   ├── BrandBar.vue             # v0 chrome — top bar (60px), partial-eclipse logo + ECLIPSECHASE wordmark
│   │   ├── BrandLogo.vue            # SVG partial-eclipse glyph (clipPath crescent)
│   │   ├── BottomNav.vue            # v0 mobile TabBar (5 slots: Home/Spots/Map/Guide/Me; ME currently hidden)
│   │   ├── CountdownBar.vue         # Eclipse countdown widget (legacy index.vue)
│   │   ├── EclipseHero.vue          # SVG eclipse illustration with corona animation
│   │   ├── EclipseMap.vue           # Mapbox GL wrapper (weather, spots, roads, cameras, selected-pin)
│   │   ├── EmailSignup.vue          # Landing page email form
│   │   ├── Starfield.vue            # Animated background starfield
│   │   ├── WeatherIcon.vue          # SVG cloud cover icons
│   │   ├── ForecastTimeline.vue     # Hourly weather forecast chart
│   │   ├── SpotLocationMap.vue      # Focused map for spot detail page (totality path overlay)
│   │   ├── PhotoCredit.vue          # Attribution line (photographer, license)
│   │   ├── HorizonProfile.vue       # Horizon sweep visualization (91 azimuth points)
│   │   ├── HorizonBadge.vue         # Color-coded verdict badge (clear/marginal/risky/blocked)
│   │   ├── DynamicHorizonCheck.vue  # Interactive horizon checker (click map → check)
│   │   ├── PeakFinderLink.vue       # External PeakFinder.com link with coordinates
│   │   ├── ProGate.vue              # Slot wrapper: show content if Pro, else upgrade prompt
│   │   ├── ProUpgradeButton.vue     # Styled button linking to /pro
│   │   ├── RestorePurchase.vue      # Purchase restoration UI (email → OTP → token)
│   │   ├── OfflineBanner.vue        # Offline status + cache age display
│   │   ├── OfflineManager.vue       # Precache API endpoints + offline tile downloads
│   │   ├── CookieConsent.vue        # GDPR cookie consent banner (Umami analytics)
│   │   ├── CameraLightbox.vue       # Full-screen road camera viewer (keyboard nav + carousel)
│   │   ├── icons/                   # Nav-icon SFCs (one per BottomNav slot)
│   │   │   └── Icon{Home,Spots,Map,Guide,Me}.vue
│   │   ├── ui/                      # v0 shared primitives
│   │   │   ├── Card.vue             # Surface frame (bg surface/0.04, border/0.08, radius 12, padding 14)
│   │   │   ├── CardTitle.vue        # Mono 10px / tracking 0.14em / uppercase eyebrow
│   │   │   ├── AdvisoryCard.vue     # Severity-tinted advisory row (level/title/body)
│   │   │   ├── CloudBar.vue         # Inline cloud-percentage bar (status colours)
│   │   │   ├── Eyebrow.vue          # Reusable mono eyebrow label
│   │   │   ├── Pill.vue             # Pill chip (status/info/accent variants)
│   │   │   ├── Stat.vue             # Big-number stat (label + value + status colour)
│   │   │   └── StatusDot.vue        # Coloured status dot (good/marginal/bad)
│   │   ├── spot-detail/             # /spots/[slug] section components
│   │   │   ├── SpotHeroBlock.vue    # Hero photo + name + region kicker; meta-end slot for badge
│   │   │   ├── DetailTabs.vue       # Overview / Sky / Weather / Plan tab strip
│   │   │   ├── StatStrip.vue        # 3-stat strip (totality / sun alt / horizon verdict)
│   │   │   ├── ContactList.vue      # C1 / totality start / totality end / C4 timetable
│   │   │   ├── LogisticsRows.vue    # Parking / cell / terrain / services / hike rows
│   │   │   ├── HorizonDial.vue      # Sun-position dial (alt + az)
│   │   │   ├── CloudHistogram.vue   # Pre-computed historical cloud-cover bars
│   │   │   ├── AlternatesList.vue   # Nearby alternate spots ranked by totality + cloud
│   │   │   ├── AdvisoriesBadge.vue  # Severity-tinted pill in hero (count + chevron, aria-expanded)
│   │   │   └── AdvisoriesBlock.vue  # Expandable advisory list (mounts only when expanded)
│   │   ├── map/                     # /map section components
│   │   │   ├── MapChipStack.vue     # Mobile top chip stack (profile/weather/traffic/cameras toggles)
│   │   │   └── SelectedLightbox.vue # Mobile bottom card for selected spot (fixed, above nav)
│   │   ├── content/GuidePathMap.vue # Eclipse path map embedded in guide.md
│   │   └── OgImage/OgImageDefault.satori.vue  # Satori-based OG image generation
│   ├── composables/
│   │   ├── useMapOverlay.ts         # Fetch + marker + zoom lifecycle for /map traffic + camera overlays
│   │   ├── useProStatus.ts          # JWT-based Pro status (IndexedDB + RS256 verify)
│   │   ├── useRecommendation.ts     # Spot scoring engine (5 profiles, weighted factors)
│   │   ├── useLocation.ts           # GPS geolocation (defaults to Reykjavik)
│   │   ├── useCountdown.ts          # Real-time countdown to eclipse
│   │   ├── useOfflineStatus.ts      # Online/offline state + SW cache ages
│   │   ├── useAnalyticsConsent.ts   # Cookie consent state + Umami script loader
│   │   ├── useAdvisories.ts         # Normalises legacy string[] + migrated {level,title,body}[] shapes; exposes count/topLevel
│   │   ├── useNavItems.ts           # BottomNav tab list (NAV_ITEMS_HIDDEN currently masks ME)
│   │   └── useGoBack.ts             # Back-button helper for spot detail / guide chapter pages
│   ├── utils/
│   │   ├── eclipse.ts               # Shared helpers (formatDuration, cloudColor, compassDirection, regionLabel, parseJsonb)
│   │   ├── mapLayers.ts             # Mapbox GL layer definitions
│   │   ├── mapMarkers.ts            # Zoom-visibility buckets + min-zoom helpers for HTML markers
│   │   ├── proStorage.ts            # IndexedDB token storage (save/get/remove)
│   │   ├── solar.ts                 # Solar calculations
│   │   ├── theme.ts                 # Color-mode helpers (toggle, persist via ec-color-mode key)
│   │   ├── traffic.ts               # Road-condition colours, labels, priority
│   │   ├── v0.ts                    # v0 design utilities (cloudToStatus, etc.)
│   │   └── weather.ts               # Cloud-cover banding helpers (good/warn/bad thresholds)
│   ├── middleware/
│   │   └── pro-gate.ts              # Route guard: redirect non-Pro to /pro
│   └── types/
│       ├── database.types.ts        # Auto-generated Supabase types
│       ├── horizon.ts               # HorizonVerdict, HorizonCheck, HorizonSweepPoint
│       └── spots.ts                 # PhotoLicense, SpotPhoto
├── server/
│   ├── api/
│   │   ├── weather/
│   │   │   ├── cloud-cover.get.ts   # Cloud cover per station (stale-while-revalidate)
│   │   │   ├── forecast-timeline.get.ts  # Hourly forecast timeline (next 24h)
│   │   │   └── stations.get.ts      # List all 55 weather stations
│   │   ├── spots/
│   │   │   ├── index.get.ts         # All viewing spots with eclipse geometry
│   │   │   └── [slug].get.ts        # Single spot detail (photos, horizon, description)
│   │   ├── horizon/
│   │   │   └── check.post.ts        # Horizon check at lat/lng (uses pre-computed grid)
│   │   ├── traffic/
│   │   │   ├── conditions.get.ts    # Road conditions (Vegagerðin)
│   │   │   └── segments.get.ts      # Road segments with conditions
│   │   ├── stripe/
│   │   │   ├── checkout.post.ts     # Create Stripe Checkout session
│   │   │   ├── webhook.post.ts      # Stripe webhook → JWT generation → pro_purchases
│   │   │   ├── activate.post.ts     # Retrieve JWT by session_id (post-checkout)
│   │   │   └── restore/
│   │   │       ├── request.post.ts  # Send 6-digit OTP code via email
│   │   │       └── verify.post.ts   # Verify OTP → generate fresh JWT
│   │   ├── cameras.get.ts           # Road camera feeds (Vegagerðin)
│   │   ├── signup.post.ts           # Email signup handler
│   │   ├── tasks/
│   │   │   └── ingest-weather.ts    # Bearer-auth ingest (CRON_SECRET); GH Actions hits every 15 min, Vercel daily fallback
│   │   └── __sitemap__/urls.ts      # Dynamic sitemap generation
│   ├── utils/
│   │   ├── vedur.ts                 # vedur.is XML API (55 stations, forecast endpoint only)
│   │   ├── vegagerdin.ts            # Road conditions API (DATEX II)
│   │   ├── horizon.ts               # Horizon computation (pre-computed grid lookup)
│   │   ├── dem.ts                   # Digital elevation model utilities
│   │   ├── jwt.ts                   # RS256 JWT generation (cached private key)
│   │   ├── email.ts                 # Resend email (welcome, restore code) + maskEmail/hashEmail helpers
│   │   ├── eclipseGrid.ts           # Load + nearest-point lookup for eclipse-data/grid.json (totality_start, c1, c4)
│   │   └── rateLimit.ts             # In-memory rate limiter (resets on deploy)
│   └── data/dem/                    # DEM binary (ÍslandsDEM v1.0, gitignored)
├── content/
│   └── guide.md                     # Long-form eclipse guide (Nuxt Content)
├── public/
│   ├── manifest.json                # PWA manifest
│   ├── sw.js                        # Service Worker (cache strategies, offline support)
│   ├── favicon.svg                  # Eclipse icon
│   └── eclipse-data/
│       ├── path.geojson             # Eclipse totality path polygon
│       ├── grid.json                # ~500 pre-computed eclipse points incl. C1/C4 contact times
│       ├── horizon-grid.json        # Pre-computed horizon data (6.2 MB)
│       ├── historical-weather.json  # 10-year Aug-12 cloud-cover history per curated spot
│       └── roads.geojson            # Icelandic road network (1 MB)
├── scripts/
│   ├── schema.sql                   # Full Supabase schema (source of truth)
│   ├── migrations/
│   │   ├── 003-pro-purchases.sql    # Migration: pro_users → pro_purchases + restore_codes
│   │   ├── 004-advisories-shape.sql # Migrate viewing_spots.warnings: string[] → {level,title,body}[]
│   │   └── 005-advisories-levels.sql # Seed bad/warn levels per curated spot (uses CTE + jsonb_array_elements WITH ORDINALITY)
│   ├── compute-eclipse-grid.py      # Skyfield: generate eclipse geometry (incl. C1/C4 via bisect_contact, ~1s precision)
│   ├── fetch-historical-weather.mjs # Pre-compute Aug-12 cloud-cover history per spot → historical-weather.json
│   ├── precompute-horizon-grid.ts   # DEM → horizon-grid.json (91-point sweep)
│   ├── prepare-dem-binary.py        # Prepare ÍslandsDEM binary
│   ├── seed-weather-stations.sql    # 55 weather stations
│   ├── seed-viewing-spots.sql       # Curated viewing spots
│   ├── seed-viewing-spots-v2.sql    # Updated spots data
│   ├── seed-spot-photos.sql         # Photo metadata for spots
│   ├── generate-roads-geojson.mjs   # Road network GeoJSON
│   ├── fetch-stations.mjs           # Fetch station list from vedur.is
│   ├── process-spot-photos.sh       # Image processing + thumbnails
│   └── generate-offline-tiles.sh    # Mapbox offline tile download
├── i18n/
│   ├── en.json                      # English (~200+ keys)
│   └── is.json                      # Icelandic
├── assets/css/
│   └── main.css                     # Global styles, dark theme, noise texture
└── .env.example
    # SUPABASE_URL=
    # SUPABASE_KEY=
    # MAPBOX_TOKEN=
    # STRIPE_SECRET_KEY=
    # STRIPE_WEBHOOK_SECRET=
    # RESEND_API_KEY=
    # NUXT_PRO_JWT_PRIVATE_KEY=
    # UMAMI_HOST=
    # UMAMI_WEBSITE_ID=
```

## Supabase Schema

```sql
-- Weather stations in western Iceland (55 across 5 regions)
CREATE TABLE weather_stations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  region TEXT, -- 'westfjords', 'snaefellsnes', 'reykjanes', 'reykjavik', 'borgarfjordur'
  source TEXT DEFAULT 'vedur.is'
);

-- Weather forecasts per station (ingested from vedur.is).
-- forecast_time = vedur's `atime` (when they issued the batch).
-- fetched_at    = when our cron last upserted (used for staleness, since
--                 forecast_time only changes when vedur publishes new
--                 batches every few hours).
CREATE TABLE weather_forecasts (
  id BIGSERIAL PRIMARY KEY,
  station_id TEXT REFERENCES weather_stations(id),
  forecast_time TIMESTAMPTZ NOT NULL,
  valid_time TIMESTAMPTZ NOT NULL,
  cloud_cover INTEGER,
  precipitation_prob DOUBLE PRECISION,
  source_model TEXT DEFAULT 'vedur',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(station_id, forecast_time, valid_time)
);

-- Pre-computed eclipse geometry for ~500 points across western Iceland
CREATE TABLE eclipse_grid (
  id SERIAL PRIMARY KEY,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  totality_start TIMESTAMPTZ,
  totality_end TIMESTAMPTZ,
  duration_seconds DOUBLE PRECISION,
  sun_altitude DOUBLE PRECISION,
  sun_azimuth DOUBLE PRECISION
);

-- Curated viewing spots with human-written descriptions
-- Additional columns added via migrations: spot_type, difficulty, elevation_gain_m,
-- trail_distance_km, trail_time_minutes, trailhead_lat/lng, photos (JSONB),
-- horizon_check (JSONB), warnings (JSONB — see below).
--
-- C1 (partial begins) and C4 (partial ends) are NOT stored on viewing_spots.
-- They're enriched at request time by server/api/spots/[slug].get.ts via
-- nearestGridPoint() against public/eclipse-data/grid.json — the grid is the
-- source of truth for eclipse geometry (Skyfield bisection, ~1s precision).
--
-- warnings is JSONB with two historical shapes: legacy string[] (raw labels)
-- and migrated {level: 'info'|'warn'|'bad', title, body}[]. Migration 004
-- converted shape; 005 seeded severity levels per spot. Client normalises
-- both shapes via useAdvisories() so rollouts stay safe.
CREATE TABLE viewing_spots (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  region TEXT NOT NULL,
  description TEXT,
  parking_info TEXT,
  terrain_notes TEXT,
  has_services BOOLEAN DEFAULT FALSE,
  cell_coverage TEXT, -- 'good', 'limited', 'none'
  totality_duration_seconds DOUBLE PRECISION,
  totality_start TIMESTAMPTZ,
  sun_altitude DOUBLE PRECISION,
  sun_azimuth DOUBLE PRECISION,
  photo_url TEXT
);

-- Email signups from landing page
CREATE TABLE email_signups (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'landing_page',
  locale TEXT DEFAULT 'en'
);

-- Pro tier purchases (JWT-based, no Supabase Auth)
CREATE TABLE pro_purchases (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  email_hash TEXT NOT NULL,
  stripe_session_id TEXT UNIQUE NOT NULL,
  activation_token TEXT NOT NULL, -- RS256 JWT
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  restored_count INTEGER DEFAULT 0,
  last_restored_at TIMESTAMPTZ
);

-- Restore codes (short-lived, 15-min TTL)
CREATE TABLE restore_codes (
  id BIGSERIAL PRIMARY KEY,
  email_hash TEXT NOT NULL,
  code TEXT NOT NULL, -- 6-digit OTP
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE
);
```

## Design Tokens

Two layers coexist in `tailwind.config.ts`, both pointing at CSS
variables defined in `app/assets/css/main.css` (dark is default; light
"Dawn Horizon" is activated via `html.light` from `@nuxtjs/color-mode`,
storage key `ec-color-mode`). Light theme is fully implemented per
`CLAUDE_CODE_LIGHT_THEME_SPEC.md` — cream #F4EEDD bg, deep navy
ink #11141C, burnt amber #B8651A accent, deep moss totality, forest /
ochre / brick weather palette.

### Semantic tokens (preferred — theme-aware)

Use these for any new code so styling follows light/dark mode
automatically. Dark → cream swap is real.

```
Surfaces:  bg / bg-elevated / surface / surface-raised / border-subtle
Text:      ink-1 (headlines) / ink-2 (body) / ink-3 (meta)
Accent:    accent / accent-strong / accent-soft / accent-ink
Glass:     glass / glass-strong / glass-chip   (intentional dark scrims; do not invert)
Status:    text-status-green / text-status-amber / text-status-red / good / warn / bad / totality
```

`accent-ink` is the readable text colour on the burnt-amber CTA — flips
to cream in light theme so labels stay legible on amber. The `glass*`
tokens stay dark in both themes by spec — they layer over the dark
Mapbox map style.

### Utility classes (defined in main.css)

```
Banners:  .ec-banner-warn / .ec-banner-error / .ec-banner-info
Chips:    .ec-chip-green / .ec-chip-yellow / .ec-chip-orange /
          .ec-chip-red  / .ec-chip-amber  / .ec-chip-blue
```

Each chip bundles colour + border + soft background; add the
structural classes yourself (`font-mono text-xs tracking-wider px-2.5
py-1.5 rounded border`).

### Typography

```
v0 redesign:
  Display:  Inter Tight (400-700) — body / headings / stat values
  Mono:     JetBrains Mono (400-600) — eyebrows, labels, data, CTAs

Legacy (still on /pro, /privacy, /terms, /credits):
  Display:  Manrope (400-800)
  Mono:     IBM Plex Mono (400-600)
```

The v0 wordmark in `BrandLogo.vue` is Inter Tight 13px / weight 600 /
letter-spacing 2px (per the v0.jsx prototype, NOT mono — earlier spec
drafts said JetBrains Mono but the prototype implementation wins).

### Animations

```
corona-pulse (4s), drift-slow (60s), fade-in-up (0.8s), fade-in (1s)
```

## Page Design Patterns

The v0 visual redesign was merged in PR #4. New / refactored pages
should use the v0 chrome (`PageShell` + `BrandBar` + `BottomNav`).
Legacy patterns below the v0 section are still in place on /pro,
/privacy, /terms, /credits, /index — keep them consistent if you
edit those files; otherwise prefer v0.

### v0 chrome (current — use for new work)

**Page wrapper:** wrap page bodies in `<PageShell>` from
`app/components/PageShell.vue`. Props: `screen` (analytics id),
`width: 'reading' | 'wide' | 'full'` (caps content at 768 / 1120 / no
limit on tablet+), `noTop` / `noBottom` to drop the BrandBar /
BottomNav clearance for full-bleed pages.

```vue
<PageShell screen="spot-detail" width="reading">
  <!-- page content -->
</PageShell>
```

`PageShell` calculates top padding as
`calc(60px + max(14px, env(safe-area-inset-top)) + 14px)` so content
sits flush below the BrandBar without a dark gap, even on notched
phones. Bottom padding is 90 px on mobile (clears the TabBar) and
32 px on tablet+ where the TabBar is hidden.

**Top chrome (BrandBar):** rendered in `app.vue`, fixed at top, 60 px.
Capped at 768 px inner-row width on desktop. Renders `BrandLogo` +
"ECLIPSECHASE" wordmark.

**Bottom chrome (BottomNav):** mobile only (`md:hidden`), `position:
fixed; inset: auto 0 0 0`. Five tabs (Home / Spots / Map / Guide / Me),
ME currently hidden via `useNavItems().NAV_ITEMS_HIDDEN`. Items
provided by `useNavItems()`; icons in `app/components/icons/`.

**Width tokens** on tablet+:
- `reading` (768 px) — long-scroll editorial pages (guide, spot detail, dashboard).
- `wide` (1120 px) — grid pages (spots list).
- `full` — edge-to-edge (live map).

### Legacy chrome (historical reference — no longer in use)

The pattern below is the pre-v0 baseline. As of `b1d667c`, no page
uses it: /pro, /privacy, /terms, /credits all migrated to PageShell;
/index dropped the `noise` class and switched its remaining
`from-corona`/`text-void-border` palette refs to semantic tokens
while staying full-bleed (no PageShell — its 92vh hero needs to flow
edge-to-edge). Kept here so the design vocabulary is decipherable if
you ever encounter it in old branches or seed data.

```html
<div class="relative noise min-h-screen">
```
Legacy pages used the `noise` class for the grain texture overlay
and `relative` positioning. Never use `bg-void` as the wrapper — the
noise class provided the background.

```html
<nav class="flex items-center justify-between px-6 sm:px-10 py-5">
  <NuxtLink to="/" class="flex items-center gap-3 group">
    <svg class="w-8 h-8" viewBox="0 0 128 128" fill="none" aria-hidden="true">
      <circle cx="64" cy="64" r="36" fill="#050810" />
      <circle cx="64" cy="64" r="36" stroke="#f59e0b" stroke-width="3" opacity="0.8" />
      <circle cx="96" cy="48" r="4" fill="#f59e0b" />
    </svg>
    <span class="font-display font-semibold text-base tracking-wide text-slate-300 group-hover:text-white transition-colors">
      ECLIPSECHASE
    </span>
  </NuxtLink>
  <NuxtLink to="/map" class="text-xs font-mono text-slate-400 hover:text-corona transition-colors tracking-wider">
    VIEW ON MAP
  </NuxtLink>
</nav>
```
- SVG eclipse logo + "ECLIPSECHASE" wordmark, always
- **Not** fixed, **not** bordered — flows with the page
- Right side: optional context-appropriate link in uppercase mono

### Content area
```html
<div class="section-container max-w-3xl py-8 sm:py-16">
```
- `section-container` provides responsive horizontal padding
- `max-w-3xl` for content pages (guide, spots, pro, privacy)
- Vertical padding with responsive breakpoints

### Typography roles
- **Page label** (above h1): `font-mono text-xs tracking-[0.3em] text-accent/60 uppercase`
- **Page title** (h1): `font-display text-3xl sm:text-4xl md:text-5xl font-bold text-ink-1`
- **Section heading** (h2): `font-display text-xl font-semibold text-ink-1`
- **Body text**: default Manrope font, `text-base text-ink-2 leading-relaxed` — never use monospace for body prose
- **Metadata/labels**: `font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3`
- **Data values**: `font-display text-2xl font-bold text-ink-1`

### Cards
```html
<div class="bg-surface border border-border-subtle/40 rounded px-4 py-4">
```
Use `bg-surface` and semi-transparent borders. Use `rounded` (4px), not `rounded-lg` or `rounded-xl`.

### Stat cards (grid pattern from /spots)
```html
<div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
  <div class="bg-surface border border-border-subtle/40 px-4 py-4 rounded">
    <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3 mb-1.5">Label</p>
    <p class="font-display text-2xl font-bold text-ink-1">Value</p>
  </div>
</div>
```

### Warning/info banners
Use the utility classes in `main.css`:
```html
<div class="px-3 py-2.5 ec-banner-warn text-xs font-mono">...</div>
```
Variants: `ec-banner-warn`, `ec-banner-error`, `ec-banner-info`.

### Links
- Internal navigation: `text-accent hover:text-accent-strong transition-colors`
- Styled with subtle bottom border, not underline

### Footer
```html
<footer class="border-t border-border-subtle/30 py-8">
  <div class="section-container text-center">
    <NuxtLink to="/" class="font-mono text-sm text-ink-3 hover:text-ink-2 transition-colors">
      &larr; Back to home
    </NuxtLink>
  </div>
</footer>
```

### What NOT to do
- Never hardcode `text-white` / `text-slate-*` / specific Tailwind palette colors for theme-aware UI — use `text-ink-1/2/3`, `bg-surface`, etc. so light mode works
- Never use monospace (IBM Plex Mono) for body text/paragraphs — only for labels, metadata, code, and data
- Never use text-based logo ("EclipseChase.is") in chrome — always use the SVG eclipse icon + wordmark via `<BrandLogo>` (the marketing landing footer is the one exception, by design)
- Never use `rounded-xl` or `rounded-lg` on cards — use `rounded` (exception: price cards with special emphasis)
- Never use `pt-24` for content offset — `PageShell` already handles BrandBar clearance via its own padding calc

## External APIs Reference

### vedur.is Weather API (no key needed)
```
# apis.is is DEAD (502, expired SSL) — use vedur.is XML API directly

# Forecasts (XML) — includes cloud cover (N), temp (T), precipitation (R).
# Only the `forec` endpoint is used; vedur's automatic stations don't
# report cloud cover for observations, and we don't surface temp/wind.
GET https://xmlweather.vedur.is/?op_w=xml&type=forec&lang=en&view=xml&ids=1;990;178&params=N;T;R

# Station coordinates: https://en.vedur.is/wstations/wslinfo.js (JS object with all 269 stations)

# We track 55 stations across 5 regions (see server/utils/vedur.ts + scripts/seed-weather-stations.sql):
# Reykjavík (11), Reykjanes (12), Borgarfjörður (6), Snæfellsnes (7), Westfjords (19)
```

**vedur.is call volume (fair-use audit, closes spec §10 q3):**

| Source | Frequency | Calls/day |
|---|---|---|
| `/api/tasks/ingest-weather` cron (GitHub Actions, every 15 min) — one forecast batch | 96 runs × 1 call | **96** |
| `/api/weather/cloud-cover` | Pure Supabase read | **0** upstream |
| `/api/weather/forecast-timeline` | Pure Supabase read | **0** upstream |

**Total ~96 batched requests/day** (one every 15 min) at full traffic, well within any reasonable shared-API courtesy ceiling. Each request is a single XML payload with all 55 station IDs comma-joined — vedur.is serves these as one response, not 55.

### Vegagerðin Road Conditions
```
# Road conditions + road cameras from vegagerdin.is
# DATEX II standard for conditions
# Camera feeds proxied through /api/cameras
```

### Mapbox GL JS
```
# Map style: mapbox://styles/mapbox/dark-v11 (fits dark theme)
# Free tier: 50,000 map loads/month
# Offline: Service Worker caches tiles (max 5000 entries)
```

### Stripe
```
# Checkout mode: "payment" (one-time €9.99)
# Product metadata: product=eclipse_pro_2026
# Webhook: checkout.session.completed → JWT + pro_purchases
# Success URL: /pro/success?session_id={CHECKOUT_SESSION_ID}
```

### Eclipse Data
```
# August 12, 2026 total solar eclipse
# Totality in Iceland: ~17:43-17:48 UTC (varies by location)
# Path of totality crosses: Westfjords → Snæfellsnes → Reykjavík edge → Reykjanes
# Maximum totality duration in Iceland: ~2m15s (computed via Skyfield, 5s resolution)
# Sun altitude at totality: ~24° (range 23.6-25.7° across path)
# Sun azimuth at totality: ~250° WSW (Skyfield-computed; earlier refs citing 285° were incorrect)
# C1 (partial begins) and C4 (partial ends) per grid point are computed via
#   bisection in scripts/compute-eclipse-grid.py with ~1s precision and stored
#   in grid.json. Loaded by server/utils/eclipseGrid.ts; spot detail API
#   enriches each spot's response with the nearest-point c1/c4.
# Next Iceland eclipse: 2196 (170 years away)
```

## Key Dependencies

```
nuxt 4.4.2, vue 3.5.30, vue-router 5.0.3
@nuxtjs/tailwindcss, @nuxtjs/i18n, @nuxtjs/supabase, @nuxt/content, @nuxtjs/sitemap
mapbox-gl 3.20.0              # Map rendering
stripe 20.4.1                 # Payment processing
jose 6.2.2                    # RS256 JWT sign/verify
resend 6.9.4                  # Transactional email
xml2js 0.6.2                  # vedur.is XML parsing
satori 0.25.0 + @resvg/resvg-js  # OG image generation
better-sqlite3 12.8.0         # Nuxt Content storage
nuxt-og-image 6.0.1           # Dynamic OG images
```

## What's Built (All Working)

- Landing page with countdown, email signup, feature showcase
- Dashboard (v0 home redesign) — countdown grid, prep checklist, top-3 spots
- Guide page (Nuxt Content markdown with embedded map; v0 typography pass + TOC chip strip)
- Spots list with hero photos, sort/filter, region groups (v0 redesign)
- Spot detail page with `DetailTabs` (Overview / Sky / Weather / Plan):
    - About card + Contact times (incl. high-precision C1/C4) + Logistics
    - Sun-position dial + 91-point horizon profile
    - 10-year historical cloud cover histogram (pre-computed)
    - Nearby alternates ranked by totality + cloud + map
    - Severity-graded advisories collapsed into a hero badge
- Interactive map with weather stations, cloud cover, eclipse path overlay, road conditions, cameras, spot markers
    - Mobile chip stack (profile / weather / traffic / cameras toggles)
    - Mobile selected-spot lightbox (fixed, anchored above the TabBar)
    - Selected pin in red, dynamic horizon-check overlay, hint dismissal on first tap
- Recommendation engine with 5 viewer profiles (Photographer, Family, Hiker, Sky Chaser, First-Timer)
- Horizon checking system (pre-computed grid, 91-point azimuth sweep, verdict badges)
- High-precision C1/C4 contact times via Skyfield bisection (~1s) in `grid.json`
- Pre-computed historical cloud cover (10 yrs of Aug-12 data per spot)
- v0 visual redesign across all gated pages (chrome: `PageShell` + `BrandBar` + `BottomNav`)
- Light "Dawn Horizon" theme — full implementation per `CLAUDE_CODE_LIGHT_THEME_SPEC.md`, color-mode toggle on /me
- Pro tier with Stripe Checkout (€9.99 one-time payment)
- JWT-based Pro auth (RS256, IndexedDB, offline-capable)
- Purchase restoration (email → 6-digit OTP → fresh JWT)
- Service Worker with offline support (API caching, tile caching, precaching)
- Weather data ingestion from vedur.is (forecasts) — driven by GitHub Actions every 15 min, Vercel Cron daily fallback
- Road conditions + camera feeds from Vegagerðin
- Privacy policy, terms of service, credits pages
- Cookie consent (Umami analytics)
- OG image generation (Satori)
- Dynamic sitemap
- i18n (English + Icelandic; v0 keys under `v0.*` namespace, Icelandic falls back to English)
- CI: vitest + playwright via `.github/workflows/test.yml`
- Deployed to Vercel with custom domain + SSL

## What To Build Next

- Polish and testing before July beta launch
- Marketing: SEO content, social media presence
- Email campaigns to signup list

## Timeline Pressure

The eclipse is on **August 12, 2026** — approximately 5 months away. The full app needs to be ready by mid-July for beta testing.

## Notes

- I'm based in Slovakia (Bratislava/Piešťany area)
- I run Elite Consulting, s.r.o. — an IT consulting company
- This is a side project built evenings/weekends
- I have experience with Nuxt 4, Supabase, TailwindCSS, TypeScript from building poradieknih.sk
- The .is domain is registered via ISNIC (Iceland's domain registry)
