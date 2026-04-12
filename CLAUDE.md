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
- **i18n**: English (primary), Icelandic (secondary)
- **Design direction**: Dark theme (astronomy convention), mobile-first
- **Budget**: Under €5K total, mostly my own dev time (evenings/weekends)
- **Builder**: Solo developer, I'm an IT consultant

## Monetization Strategy (Free / Pro)

**Model**: Freemium — single PWA, page-level route gating via JWT + Stripe Checkout.

**Free tier** (public, SEO-indexed):
- `/` — Landing page with countdown, email signup
- `/guide` — Long-form SEO guide (Nuxt Content markdown)
- `/spots/[slug]` — Individual viewing spot pages
- `/privacy`, `/terms`, `/credits` — Legal & attribution pages

**Pro tier** (€9.99 one-time, behind Stripe paywall):
- `/map` — Live weather map with cloud cover, station markers, eclipse path overlay, road conditions, cameras
- `/recommend` — Personalized "where should I go?" recommendation engine

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

**Gate implementation**: `pro-gate` middleware checks `useProStatus().isPro`. Non-Pro visitors hitting `/map` or `/recommend` are redirected to `/pro`.

## File Structure (Actual)

```
eclipse-chaser/
├── nuxt.config.ts
├── app.vue
├── app/
│   ├── pages/
│   │   ├── index.vue                # Landing page (hero, countdown, features, email signup)
│   │   ├── guide.vue                # Nuxt Content renderer for guide.md
│   │   ├── map.vue                  # Live weather map (Pro-gated)
│   │   ├── map-proto.vue            # Map prototype (legacy)
│   │   ├── recommend.vue            # Spot recommendation engine (Pro-gated)
│   │   ├── pro.vue                  # Pro upgrade page (pricing, waiver, Stripe checkout)
│   │   ├── pro/success.vue          # Post-checkout activation + token display
│   │   ├── spots/[slug].vue         # Individual viewing spot detail pages
│   │   ├── privacy.vue              # Privacy policy (GDPR-compliant)
│   │   ├── terms.vue                # Terms of service
│   │   └── credits.vue              # Photo/data attribution
│   ├── components/
│   │   ├── CountdownBar.vue         # Eclipse countdown widget
│   │   ├── EclipseHero.vue          # SVG eclipse illustration with corona animation
│   │   ├── EclipseMap.vue           # Mapbox GL wrapper (weather, spots, roads, cameras)
│   │   ├── EmailSignup.vue          # Landing page email form
│   │   ├── Starfield.vue            # Animated background starfield
│   │   ├── WeatherIcon.vue          # SVG cloud cover icons
│   │   ├── ForecastTimeline.vue     # Hourly weather forecast chart
│   │   ├── SpotLocationMap.vue      # Focused map for spot detail page
│   │   ├── SpotPhotoHero.vue        # Full-width hero photo
│   │   ├── SpotPhotoGallery.vue     # Photo grid with captions/credits
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
│   │   ├── UserMenu.vue             # User dropdown menu
│   │   ├── content/GuidePathMap.vue # Eclipse path map embedded in guide.md
│   │   └── OgImage/OgImageDefault.satori.vue  # Satori-based OG image generation
│   ├── composables/
│   │   ├── useProStatus.ts          # JWT-based Pro status (IndexedDB + RS256 verify)
│   │   ├── useRecommendation.ts     # Spot scoring engine (5 profiles, weighted factors)
│   │   ├── useLocation.ts           # GPS geolocation (defaults to Reykjavik)
│   │   ├── useCountdown.ts          # Real-time countdown to eclipse
│   │   ├── useOfflineStatus.ts      # Online/offline state + SW cache ages
│   │   └── useAnalyticsConsent.ts   # Cookie consent state + Umami script loader
│   ├── utils/
│   │   ├── eclipse.ts               # Shared helpers (formatDuration, cloudColor, compassDirection, etc.)
│   │   ├── mapLayers.ts             # Mapbox GL layer definitions
│   │   ├── proStorage.ts            # IndexedDB token storage (save/get/remove)
│   │   └── solar.ts                 # Solar calculations
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
│   │   │   ├── current.get.ts       # Current observations from vedur.is
│   │   │   ├── forecast.get.ts      # Full forecast data
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
│   │   │   └── ingest-weather.ts    # Cron: 15-min weather data pull from vedur.is
│   │   └── __sitemap__/urls.ts      # Dynamic sitemap generation
│   ├── utils/
│   │   ├── vedur.ts                 # vedur.is XML API (55 stations, observations, forecasts)
│   │   ├── vegagerdin.ts            # Road conditions API (DATEX II)
│   │   ├── horizon.ts              # Horizon computation (pre-computed grid lookup)
│   │   ├── dem.ts                   # Digital elevation model utilities
│   │   ├── jwt.ts                   # RS256 JWT generation (cached private key)
│   │   ├── email.ts                 # Resend email (welcome, restore code) + maskEmail/hashEmail helpers
│   │   └── rateLimit.ts            # In-memory rate limiter (resets on deploy)
│   └── data/dem/                    # DEM binary (ÍslandsDEM v1.0, gitignored)
├── content/
│   └── guide.md                     # Long-form eclipse guide (Nuxt Content)
├── public/
│   ├── manifest.json                # PWA manifest
│   ├── sw.js                        # Service Worker (cache strategies, offline support)
│   ├── favicon.svg                  # Eclipse icon
│   └── eclipse-data/
│       ├── path.geojson             # Eclipse totality path polygon
│       ├── grid.json                # ~500 pre-computed eclipse points (135 KB)
│       ├── horizon-grid.json        # Pre-computed horizon data (6.2 MB)
│       └── roads.geojson            # Icelandic road network (1 MB)
├── scripts/
│   ├── schema.sql                   # Full Supabase schema (source of truth)
│   ├── migrations/
│   │   └── 003-pro-purchases.sql    # Migration: pro_users → pro_purchases + restore_codes
│   ├── compute-eclipse-grid.py      # Skyfield: generate eclipse geometry
│   ├── generate-grid-fast.py        # Optimized grid generation
│   ├── precompute-horizon-grid.ts   # DEM → horizon-grid.json (91-point sweep)
│   ├── compute-horizon-checks.py    # Alternative horizon computation
│   ├── compute-horizon-node.mjs     # Node.js horizon computation
│   ├── prepare-dem-binary.py        # Prepare ÍslandsDEM binary
│   ├── seed-weather-stations.sql    # 55 weather stations
│   ├── seed-viewing-spots.sql       # Curated viewing spots
│   ├── seed-viewing-spots-v2.sql    # Updated spots data
│   ├── seed-spot-photos.sql         # Photo metadata for spots
│   ├── seed-horizon-checks.sql      # Horizon check data
│   ├── generate-roads-geojson.mjs   # Road network GeoJSON
│   ├── fetch-stations.mjs           # Fetch station list from vedur.is
│   ├── process-spot-photos.sh       # Image processing + thumbnails
│   ├── generate-offline-tiles.sh    # Mapbox offline tile download
│   └── migrate-*.sql               # Individual migration files
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

-- Real-time weather observations (ingested every 15 min from vedur.is)
CREATE TABLE weather_observations (
  id BIGSERIAL PRIMARY KEY,
  station_id TEXT REFERENCES weather_stations(id),
  timestamp TIMESTAMPTZ NOT NULL,
  cloud_cover INTEGER, -- percentage 0-100
  temp DOUBLE PRECISION, -- celsius
  wind_speed DOUBLE PRECISION, -- m/s
  wind_dir TEXT,
  visibility DOUBLE PRECISION, -- km
  precipitation DOUBLE PRECISION, -- mm
  UNIQUE(station_id, timestamp)
);

-- Weather forecasts per station (ingested from vedur.is)
CREATE TABLE weather_forecasts (
  id BIGSERIAL PRIMARY KEY,
  station_id TEXT REFERENCES weather_stations(id),
  forecast_time TIMESTAMPTZ NOT NULL,
  valid_time TIMESTAMPTZ NOT NULL,
  cloud_cover INTEGER,
  precipitation_prob DOUBLE PRECISION,
  source_model TEXT DEFAULT 'vedur',
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
-- horizon_check (JSONB)
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

## Design Tokens (Dark Astronomy Theme)

Defined in `tailwind.config.ts`:

```
Colors:
  void:        #050810 (near-black)       void-deep:    #030508
  void-surface: #0a1020 (cards)           void-border:  #1a2540
  corona:      #f59e0b (amber accent)     corona-bright: #fbbf24
  corona-pale: #fef3c7                    corona-dim:   #b45309
  ice:         #7dd3fc (sky blue)         ice-dim:      #38bdf8

Fonts:
  Display: Manrope (400-800)
  Mono: IBM Plex Mono (400-600)

Animations:
  corona-pulse (4s), drift-slow (60s), fade-in-up (0.8s), fade-in (0.6s)
```

## Page Design Patterns (MUST FOLLOW)

All pages share a consistent design system. When creating or modifying pages, follow these patterns exactly:

### Page wrapper
```html
<div class="relative noise min-h-screen">
```
Every page uses the `noise` class for the grain texture overlay and `relative` positioning. Never use `bg-void` as the wrapper — the noise class provides the background.

### Navigation
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
  <!-- Optional right-side link -->
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
- **Page label** (above h1): `font-mono text-xs tracking-[0.3em] text-corona/60 uppercase`
- **Page title** (h1): `font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white`
- **Section heading** (h2): `font-display text-xl font-semibold text-white`
- **Body text**: default Manrope font, `text-base text-slate-300 leading-relaxed` — never use monospace for body prose
- **Metadata/labels**: `font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500`
- **Data values**: `font-display text-2xl font-bold text-white`

### Cards
```html
<div class="bg-void-surface border border-void-border/40 rounded px-4 py-4">
```
Use `bg-void-surface` and semi-transparent borders. Use `rounded` (4px), not `rounded-lg` or `rounded-xl`.

### Stat cards (grid pattern from /spots)
```html
<div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
  <div class="bg-void-surface border border-void-border/40 px-4 py-4 rounded">
    <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1.5">Label</p>
    <p class="font-display text-2xl font-bold text-white">Value</p>
  </div>
</div>
```

### Warning/info banners
```html
<div class="px-3 py-2.5 rounded bg-amber-900/15 border border-amber-700/20 text-xs font-mono text-amber-400/80">
```

### Links
- Internal navigation: `text-corona hover:text-corona-bright transition-colors`
- Styled with subtle bottom border, not underline: `border-bottom: 1px solid rgba(245, 158, 11, 0.3)`

### Footer
```html
<footer class="border-t border-void-border/30 py-8">
  <div class="section-container text-center">
    <NuxtLink to="/" class="font-mono text-sm text-slate-500 hover:text-slate-300 transition-colors">
      &larr; Back to home
    </NuxtLink>
  </div>
</footer>
```

### What NOT to do
- Never use a fixed/sticky nav with `bg-void/80 backdrop-blur-md border-b` — that's an old pattern
- Never use `bg-void` as the page wrapper — always use `noise`
- Never use monospace (IBM Plex Mono) for body text/paragraphs — only for labels, metadata, code, and data
- Never use text-based logo ("EclipseChase.is") — always use the SVG eclipse icon + wordmark
- Never use `rounded-xl` or `rounded-lg` on cards — use `rounded` (exception: price cards with special emphasis)
- Never use `pt-24` for content offset — nav is not fixed

## External APIs Reference

### vedur.is Weather API (no key needed)
```
# apis.is is DEAD (502, expired SSL) — use vedur.is XML API directly

# Current observations (XML)
GET https://xmlweather.vedur.is/?op_w=xml&type=obs&lang=en&view=xml&ids=1;990;178&params=F;D;T;R

# Forecasts (XML) — includes cloud cover (N), temp (T), precipitation (R)
GET https://xmlweather.vedur.is/?op_w=xml&type=forec&lang=en&view=xml&ids=1;990;178&params=N;T;R

# Station coordinates: https://en.vedur.is/wstations/wslinfo.js (JS object with all 269 stations)

# We track 55 stations across 5 regions (see server/utils/vedur.ts + scripts/seed-weather-stations.sql):
# Reykjavík (11), Reykjanes (12), Borgarfjörður (6), Snæfellsnes (7), Westfjords (19)
```

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
- Guide page (Nuxt Content markdown with embedded map component)
- Interactive map with weather stations, cloud cover, eclipse path overlay, road conditions, cameras, spot markers
- Recommendation engine with 5 viewer profiles (Photographer, Family, Hiker, Sky Chaser, First-Timer)
- Viewing spot detail pages with photos, horizon visualization, eclipse stats, nearby stations
- Horizon checking system (pre-computed grid, 91-point azimuth sweep, verdict badges)
- Pro tier with Stripe Checkout (€9.99 one-time payment)
- JWT-based Pro auth (RS256, IndexedDB, offline-capable)
- Purchase restoration (email → 6-digit OTP → fresh JWT)
- Service Worker with offline support (API caching, tile caching, precaching)
- Weather data ingestion from vedur.is (observations + forecasts)
- Road conditions + camera feeds from Vegagerðin
- Privacy policy, terms of service, credits pages
- Cookie consent (Umami analytics)
- OG image generation (Satori)
- Dynamic sitemap
- i18n (English + Icelandic)
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
