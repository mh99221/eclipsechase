# Spot Expansion & Ranking System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand viewing spots to 25-30 (including hiking trails), add a profile-based recommendation engine, and build a `/recommend` page with map integration.

**Architecture:** Client-side scoring composable (`useRecommendation`) computes weighted scores per profile using existing spots + weather APIs. No new server endpoints. GPS handled by `useLocation` composable with Reykjavík fallback. Profile selection carried between recommend and map pages via `?profile=` query param.

**Tech Stack:** Nuxt 4, TypeScript, Supabase (Postgres), Mapbox GL JS, TailwindCSS

**Spec:** `docs/superpowers/specs/2026-03-14-spot-ranking-design.md`

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `scripts/migrate-spots-add-hiking.sql` | ALTER TABLE migration adding hiking columns |
| `scripts/seed-viewing-spots-v2.sql` | Full seed with 25-30 spots including hiking |
| `app/composables/useLocation.ts` | Browser GPS with Reykjavík fallback |
| `app/composables/useRecommendation.ts` | Scoring engine: factors, weights, floors, ranking |
| `app/pages/recommend.vue` | Recommendation page with profile selector + ranked list |

### Modified Files
| File | Changes |
|------|---------|
| `server/api/spots/index.get.ts` | Return new columns (spot_type, trail fields) |
| `server/api/weather/cloud-cover.get.ts` | Add staleness filter (6h forecasts, 3h observations) |
| `app/pages/spots/[slug].vue` | Display trail info section for hiking spots |
| `app/components/EclipseMap.vue` | Rank badges on markers, dimmed filtered spots, score in popups |
| `app/pages/map.vue` | Read `?profile=` param, profile pill in header, pass ranking to EclipseMap |
| `i18n/en.json` | Add recommend page strings |
| `i18n/is.json` | Add recommend page strings (Icelandic) |
| `.gitignore` | Add `.superpowers/` |

---

## Chunk 1: Database & Data

### Task 1: Database Migration

**Files:**
- Create: `scripts/migrate-spots-add-hiking.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Migration: Add hiking trail columns to viewing_spots
ALTER TABLE viewing_spots ADD COLUMN IF NOT EXISTS spot_type TEXT DEFAULT 'drive-up';
ALTER TABLE viewing_spots ADD COLUMN IF NOT EXISTS trail_distance_km DOUBLE PRECISION;
ALTER TABLE viewing_spots ADD COLUMN IF NOT EXISTS trail_time_minutes INTEGER;
ALTER TABLE viewing_spots ADD COLUMN IF NOT EXISTS difficulty TEXT;
ALTER TABLE viewing_spots ADD COLUMN IF NOT EXISTS elevation_gain_m INTEGER;
ALTER TABLE viewing_spots ADD COLUMN IF NOT EXISTS trailhead_lat DOUBLE PRECISION;
ALTER TABLE viewing_spots ADD COLUMN IF NOT EXISTS trailhead_lng DOUBLE PRECISION;

-- Set existing spots as drive-up
UPDATE viewing_spots SET spot_type = 'drive-up' WHERE spot_type IS NULL;
```

- [ ] **Step 2: Commit**

```bash
git add scripts/migrate-spots-add-hiking.sql
git commit -m "feat: add migration for hiking trail columns on viewing_spots"
```

- [ ] **Step 3: Run migration in Supabase SQL Editor**

User runs the SQL manually in Supabase dashboard → SQL Editor.

---

### Task 2: Research & Seed New Spots

**Files:**
- Create: `scripts/seed-viewing-spots-v2.sql`

- [ ] **Step 1: Research new spot locations**

Use web search to find coordinates, trail data, and totality durations for ~15-18 new spots across western Iceland's totality path. Categories:
- **Drive-up (~8-10):** Flateyri, Ólafsvík, Hellissandur, Akranes, Sandgerði, plus Route 1 stops
- **Short walks (~2-3):** Kirkjufell viewpoint, Látrabjarg cliffs
- **Moderate hikes (~2-3):** Glymur waterfall, Snæfellsjökull lower slopes
- **Serious hikes (~2):** Snæfellsjökull summit area, Hornbjarg cliffs

For each spot gather: name, slug, lat, lng, region, description, parking_info, terrain_notes, has_services, cell_coverage, totality_duration_seconds, totality_start, sun_altitude (24°), sun_azimuth (249°), spot_type, and trail fields where applicable. Note: `totality_start` varies by location (~17:43-17:48 UTC) and must be researched per spot.

- [ ] **Step 2: Write the seed SQL**

Write `scripts/seed-viewing-spots-v2.sql` with INSERT ... ON CONFLICT (id) DO UPDATE for all 25-30 spots (existing 11 updated with `spot_type='drive-up'`, plus ~15-18 new spots).

Each hiking spot must include all trail fields. Include `totality_start` for all spots:
```sql
INSERT INTO viewing_spots (id, name, slug, lat, lng, region, description, parking_info, terrain_notes,
  has_services, cell_coverage, totality_duration_seconds, totality_start, sun_altitude, sun_azimuth,
  spot_type, trail_distance_km, trail_time_minutes, difficulty, elevation_gain_m, trailhead_lat, trailhead_lng)
VALUES (
  'kirkjufell', 'Kirkjufell Viewpoint', 'kirkjufell', 64.9426, -23.3075, 'snaefellsnes',
  'Short walk to the iconic Kirkjufell mountain viewpoint...', 'Parking lot at Kirkjufellsfoss...', 'Well-maintained path...',
  false, 'limited', 105, '2026-08-12T17:45:00Z', 24, 249,
  'short-walk', 0.8, 15, 'easy', 30, 64.9410, -23.3100
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, slug = EXCLUDED.slug, lat = EXCLUDED.lat, lng = EXCLUDED.lng,
  region = EXCLUDED.region, description = EXCLUDED.description, parking_info = EXCLUDED.parking_info,
  terrain_notes = EXCLUDED.terrain_notes, has_services = EXCLUDED.has_services,
  cell_coverage = EXCLUDED.cell_coverage, totality_duration_seconds = EXCLUDED.totality_duration_seconds,
  totality_start = EXCLUDED.totality_start,
  sun_altitude = EXCLUDED.sun_altitude, sun_azimuth = EXCLUDED.sun_azimuth,
  spot_type = EXCLUDED.spot_type, trail_distance_km = EXCLUDED.trail_distance_km,
  trail_time_minutes = EXCLUDED.trail_time_minutes, difficulty = EXCLUDED.difficulty,
  elevation_gain_m = EXCLUDED.elevation_gain_m, trailhead_lat = EXCLUDED.trailhead_lat,
  trailhead_lng = EXCLUDED.trailhead_lng;
```

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-viewing-spots-v2.sql
git commit -m "feat: seed 25-30 viewing spots including hiking trail locations"
```

- [ ] **Step 4: Run seed in Supabase SQL Editor**

User runs the SQL manually in Supabase dashboard.

---

### Task 3: Update Spots API

**Files:**
- Modify: `server/api/spots/index.get.ts`

- [ ] **Step 1: Add new columns to the select query**

Update the `select` string to include `spot_type, trail_distance_km, trail_time_minutes, difficulty, elevation_gain_m, trailhead_lat, trailhead_lng`.

- [ ] **Step 2: Add weather staleness filtering to cloud-cover API**

Modify `server/api/weather/cloud-cover.get.ts` to exclude forecasts older than 6 hours and observations older than 3 hours. Add a WHERE clause: `valid_time > NOW() - INTERVAL '6 hours'` (for forecasts) or `timestamp > NOW() - INTERVAL '3 hours'` (for observations). This ensures the client-side composable always receives fresh data or no data (which triggers the 0.5 neutral fallback).

- [ ] **Step 3: Verify by running dev server**

Run: `npm run dev`
Visit: `http://localhost:3000/api/spots`
Expected: JSON response includes `spot_type` and trail fields for each spot. `[slug].get.ts` already uses `select('*')` so no change needed there.

- [ ] **Step 4: Commit**

```bash
git add server/api/spots/index.get.ts server/api/weather/cloud-cover.get.ts
git commit -m "feat: return hiking trail columns from spots API, add weather staleness filter"
```

---

## Chunk 2: Core Composables

### Task 4: useLocation Composable

**Files:**
- Create: `app/composables/useLocation.ts`

- [ ] **Step 1: Implement the composable**

```typescript
const REYKJAVIK: [number, number] = [64.1466, -21.9426]

export function useLocation() {
  const coords = ref<[number, number]>(REYKJAVIK)
  const isGps = ref(false)
  const error = ref<string | null>(null)

  function request() {
    if (!navigator.geolocation) {
      error.value = 'Geolocation not supported'
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        coords.value = [pos.coords.latitude, pos.coords.longitude]
        isGps.value = true
      },
      (err) => {
        error.value = err.message
        // Keep Reykjavík fallback
      },
      { timeout: 10000, maximumAge: 300000 }
    )
  }

  return { coords, isGps, error, request }
}
```

Key behavior:
- Returns Reykjavík immediately (no waiting)
- `request()` triggers GPS prompt, updates `coords` reactively when resolved
- Consumers re-compute automatically via Vue reactivity

- [ ] **Step 2: Commit**

```bash
git add app/composables/useLocation.ts
git commit -m "feat: add useLocation composable with GPS and Reykjavík fallback"
```

---

### Task 5: useRecommendation Composable

**Files:**
- Create: `app/composables/useRecommendation.ts`

This is the core scoring engine. Implement in these sub-steps:

- [ ] **Step 1: Define types and profile constants**

```typescript
export type ProfileId = 'photographer' | 'family' | 'hiker' | 'skychaser' | 'firsttimer'

export interface Profile {
  id: ProfileId
  name: string
  icon: string  // text label, not emoji
  weights: { weather: number; duration: number; services: number; accessibility: number; distance: number }
  floors: {
    hasServices?: boolean
    cellCoverageNot?: string
    difficultyNot?: string
    spotTypeNot?: string
  }
  invertAccessibility?: boolean
}

export const PROFILES: Profile[] = [
  {
    id: 'photographer', name: 'Photographer', icon: 'Photographer',
    weights: { weather: 0.35, duration: 0.35, services: 0.05, accessibility: 0.10, distance: 0.15 },
    floors: {},
  },
  {
    id: 'family', name: 'Family', icon: 'Family',
    weights: { weather: 0.25, duration: 0.10, services: 0.30, accessibility: 0.25, distance: 0.10 },
    floors: { hasServices: true, cellCoverageNot: 'none', difficultyNot: 'challenging' },
  },
  {
    id: 'hiker', name: 'Hiker', icon: 'Hiker',
    weights: { weather: 0.25, duration: 0.20, services: 0.05, accessibility: 0.35, distance: 0.15 },
    floors: { spotTypeNot: 'drive-up' },
    invertAccessibility: true,
  },
  {
    id: 'skychaser', name: 'Sky Chaser', icon: 'Sky Chaser',
    weights: { weather: 0.50, duration: 0.15, services: 0.05, accessibility: 0.05, distance: 0.25 },
    floors: {},
  },
  {
    id: 'firsttimer', name: 'First-Timer', icon: 'First-Timer',
    weights: { weather: 0.30, duration: 0.15, services: 0.20, accessibility: 0.20, distance: 0.15 },
    floors: { difficultyNot: 'challenging' },
  },
]
```

- [ ] **Step 2: Implement helper functions**

```typescript
// Haversine distance in km
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Find nearest weather station for a spot
function nearestStationWeather(
  spotLat: number, spotLng: number,
  weatherByStation: Map<string, number | null>,
  stations: Array<{ id: string; lat: number; lng: number }>
): number | null {
  let minDist = Infinity
  let nearest: number | null = null
  for (const s of stations) {
    const cc = weatherByStation.get(s.id)
    if (cc == null) continue
    const d = haversineKm(spotLat, spotLng, s.lat, s.lng)
    if (d < minDist) { minDist = d; nearest = cc }
  }
  return nearest
}

const ACCESSIBILITY_SCORES: Record<string, number> = {
  'drive-up': 1.0, 'short-walk': 0.8, 'moderate-hike': 0.5, 'serious-hike': 0.2,
}

const CELL_COVERAGE_SCORES: Record<string, number> = {
  good: 1.0, limited: 0.5, none: 0.0,
}
```

- [ ] **Step 3: Implement the main composable function**

```typescript
export interface RankedSpot {
  spot: any  // spot object from API
  score: number  // 0-100
  filtered: boolean  // failed a floor
  factors: { weather: number; duration: number; services: number; accessibility: number; distance: number }
  distanceKm: number
  weatherStatus: string | null  // 'clear', 'partly cloudy', etc.
}

export function useRecommendation(
  spots: Ref<any[]>,
  weatherData: Ref<Array<{ station_id: string; cloud_cover: number | null }> | null>,
  stations: Ref<Array<{ id: string; lat: number; lng: number }> | null>,
  userCoords: Ref<[number, number]>,
  profileId: Ref<ProfileId | null>,
) {
  const DISTANCE_CAP_KM = 300
  const WEATHER_STALE_NEUTRAL = 0.5

  const ranked = computed<RankedSpot[]>(() => {
    if (!spots.value?.length) return []

    const profile = PROFILES.find(p => p.id === profileId.value)
    // No profile selected: return all spots sorted by duration, no scores
    if (!profile) {
      return [...spots.value]
        .sort((a, b) => (b.totality_duration_seconds || 0) - (a.totality_duration_seconds || 0))
        .map(spot => ({ spot, score: -1, filtered: false, factors: { weather: 0, duration: 0, services: 0, accessibility: 0, distance: 0 }, distanceKm: 0, weatherStatus: null }))
    }

    const allSpots = spots.value
    const maxDuration = Math.max(...allSpots.map(s => s.totality_duration_seconds || 0))

    // Build weather lookup
    const weatherByStation = new Map<string, number | null>()
    if (weatherData.value) {
      for (const w of weatherData.value) {
        weatherByStation.set(w.station_id, w.cloud_cover)
      }
    }
    const stationList = stations.value || []
    const allWeatherMissing = stationList.length === 0 || weatherByStation.size === 0

    return allSpots.map((spot) => {
      // Floor checks
      const floors = profile.floors
      let filtered = false
      if (floors.hasServices && !spot.has_services) filtered = true
      if (floors.cellCoverageNot && spot.cell_coverage === floors.cellCoverageNot) filtered = true
      if (floors.difficultyNot && spot.difficulty === floors.difficultyNot) filtered = true
      if (floors.spotTypeNot && spot.spot_type === floors.spotTypeNot) filtered = true

      if (filtered) {
        return { spot, score: 0, filtered: true, factors: { weather: 0, duration: 0, services: 0, accessibility: 0, distance: 0 }, distanceKm: 0, weatherStatus: null }
      }

      // Compute factors
      const cloudCover = nearestStationWeather(spot.lat, spot.lng, weatherByStation, stationList)
      const weatherFactor = cloudCover != null ? 1 - cloudCover / 100 : WEATHER_STALE_NEUTRAL
      const durationFactor = maxDuration > 0 ? (spot.totality_duration_seconds || 0) / maxDuration : 0
      const servicesFactor = ((spot.has_services ? 1 : 0) + (CELL_COVERAGE_SCORES[spot.cell_coverage] ?? 0)) / 2
      let accessFactor = ACCESSIBILITY_SCORES[spot.spot_type] ?? 1.0
      if (profile.invertAccessibility) accessFactor = 1 - accessFactor
      const distKm = haversineKm(userCoords.value[0], userCoords.value[1], spot.lat, spot.lng)
      const distanceFactor = Math.max(0, Math.min(1, 1 - distKm / DISTANCE_CAP_KM))

      const factors = { weather: weatherFactor, duration: durationFactor, services: servicesFactor, accessibility: accessFactor, distance: distanceFactor }

      // Weighted sum (redistribute if all weather missing)
      let score: number
      if (allWeatherMissing) {
        const wTotal = 1 - profile.weights.weather
        score = (profile.weights.duration / wTotal) * durationFactor +
                (profile.weights.services / wTotal) * servicesFactor +
                (profile.weights.accessibility / wTotal) * accessFactor +
                (profile.weights.distance / wTotal) * distanceFactor
      } else {
        const w = profile.weights
        score = w.weather * weatherFactor + w.duration * durationFactor +
                w.services * servicesFactor + w.accessibility * accessFactor + w.distance * distanceFactor
      }

      score = Math.round(Math.min(1, Math.max(0, score)) * 100)

      // Weather status label
      let weatherStatus: string | null = null
      if (cloudCover != null) {
        if (cloudCover <= 25) weatherStatus = 'Clear'
        else if (cloudCover <= 50) weatherStatus = 'Partly cloudy'
        else if (cloudCover <= 75) weatherStatus = 'Mostly cloudy'
        else weatherStatus = 'Overcast'
      }

      return { spot, score, filtered: false, factors, distanceKm: Math.round(distKm), weatherStatus }
    })
    .sort((a, b) => {
      if (a.filtered !== b.filtered) return a.filtered ? 1 : -1
      return b.score - a.score
    })
  })

  const thinResults = computed(() => ranked.value.filter(r => !r.filtered).length < 3)

  return { ranked, thinResults }
}
```

- [ ] **Step 4: Verify by importing in dev console**

Run: `npm run dev`
Check: No TypeScript errors in terminal. Import composable in a temporary script to verify it loads.

- [ ] **Step 5: Commit**

```bash
git add app/composables/useRecommendation.ts
git commit -m "feat: add useRecommendation composable with weighted scoring and floor constraints"
```

---

## Chunk 3: Recommendation Page

### Task 6: Build the /recommend Page

**Files:**
- Create: `app/pages/recommend.vue`
- Modify: `i18n/en.json`
- Modify: `i18n/is.json`

- [ ] **Step 1: Add i18n strings**

Add to `en.json` under a new `recommend` key:
```json
{
  "recommend": {
    "find_your_spot": "FIND YOUR SPOT",
    "title": "Where should I watch?",
    "subtitle": "Pick your style. We'll rank the best spots for you based on live weather.",
    "top_picks": "TOP PICKS FOR {profile}",
    "no_profile": "Pick your style to see personalized rankings.",
    "all_spots": "All spots sorted by totality duration",
    "view_all": "View all",
    "more_spots": "+ {count} more spots ranked below",
    "view_on_map": "View on Map",
    "from_location": "from your location",
    "from_reykjavik": "from Reykjavík",
    "thin_results": "Only {count} spots match — consider switching to First-Timer for more options.",
    "score": "SCORE",
    "filtered": "Doesn't match profile"
  }
}
```

Add equivalent Icelandic strings to `is.json`.

- [ ] **Step 2: Build the recommend page**

Create `app/pages/recommend.vue` with:
- Page head/meta
- Fetch spots, stations, and cloud cover in parallel (same pattern as `map.vue`)
- `useLocation()` — request GPS on mount
- `useRecommendation()` — reactive scoring
- Profile selector: row of tappable pills using `PROFILES` constant
- Results list: top 3 shown by default, "View all" expands
- Each spot card shows: rank badge, name, region, score (color-coded), summary line, factor breakdown
- "View on Map" button links to `/map?profile=X`
- Thin results banner when < 3 spots pass floors
- No profile state: show all spots by duration with prompt

Reference the wireframe mockup from brainstorming for layout and styling details. Use the same dark theme patterns as existing pages (Syne display font, IBM Plex Mono for data, void-deep/void-surface backgrounds, corona/amber accents).

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`
Visit: `http://localhost:3000/recommend`
Check:
- Profile pills render and are tappable
- Clicking a profile re-ranks spots instantly
- Score numbers appear and change per profile
- "View on Map" navigates to `/map?profile=X`
- Mobile layout works (test at 390px width)

- [ ] **Step 4: Commit**

```bash
git add app/pages/recommend.vue i18n/en.json i18n/is.json
git commit -m "feat: add recommendation page with profile-based spot ranking"
```

---

## Chunk 4: Map Integration

### Task 7: Rank Badges and Profile on Map

**Files:**
- Modify: `app/components/EclipseMap.vue`
- Modify: `app/pages/map.vue`

- [ ] **Step 1: Update EclipseMap.vue props**

Add new props:
```typescript
rankedSpots?: Array<{
  slug: string
  rank: number
  score: number
  filtered: boolean
}>
activeProfile?: string | null
```

- [ ] **Step 2: Update spot marker rendering in EclipseMap.vue**

In `updateSpotMarkers()`, when `rankedSpots` prop is provided:
- Find each spot's ranking info by slug
- **Top 3 (non-filtered):** Render 24px marker with gold border, rank number as inner text
- **Other ranked:** Render 20px marker with rank number
- **Filtered (score=0):** Render 18px marker with gray border, 40% opacity
- **No ranking data:** Keep current amber dot (fallback)

Update popup HTML to include score when ranking is active.

- [ ] **Step 3: Update map.vue**

- Read `?profile=` query param
- Import `useRecommendation`, `useLocation`, `PROFILES`
- Fetch stations data (add to existing parallel fetch)
- Compute ranking when profile is set
- Pass `rankedSpots` and `activeProfile` to EclipseMap
- Add profile pill in the top bar (right side): small text showing active profile name with a dropdown/popover to switch profiles
- No profile = existing behavior (no ranking)

- [ ] **Step 4: Verify in browser**

Run: `npm run dev`
Visit: `http://localhost:3000/map?profile=photographer`
Check:
- Spot markers show rank numbers
- Top 3 have larger, highlighted markers
- Switching profile re-ranks markers
- No profile param = normal amber dots
- Popups show score

Visit: `http://localhost:3000/recommend` → click "View on Map"
Check: Profile carries over correctly

- [ ] **Step 5: Commit**

```bash
git add app/components/EclipseMap.vue app/pages/map.vue
git commit -m "feat: add rank badges and profile selector to map"
```

---

### Task 8: Spot Detail Page — Trail Info

**Files:**
- Modify: `app/pages/spots/[slug].vue`

- [ ] **Step 1: Add trail info section**

After the existing stats grid, add a new section for hiking spots (only rendered when `spot.spot_type !== 'drive-up'`):

- Show spot_type badge (e.g. "Moderate Hike")
- Trail stats: distance (km), estimated time, elevation gain, difficulty
- Trailhead coordinates with separate Google Maps link
- Note: "You need to be set up at the viewpoint well before totality (~17:45 UTC)"

- [ ] **Step 2: Update stats grid**

Add spot_type to the existing stats grid, replacing or augmenting the "Services" card for hiking spots with the difficulty level.

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`
Visit a hiking spot's detail page (e.g. `http://localhost:3000/spots/kirkjufell`)
Check: Trail info section appears with distance, time, elevation, difficulty
Visit a drive-up spot (e.g. `http://localhost:3000/spots/dynjandi`)
Check: No trail section shown

- [ ] **Step 4: Commit**

```bash
git add app/pages/spots/[slug].vue
git commit -m "feat: display trail info on hiking spot detail pages"
```

---

## Chunk 5: Cleanup & Polish

### Task 9: Gitignore and Final Cleanup

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add .superpowers/ to .gitignore**

Append `.superpowers/` to the `.gitignore` file.

- [ ] **Step 2: Add navigation link to /recommend**

Add a link to `/recommend` from the landing page (index.vue) and from the map page nav. This gives users a way to discover the recommendation feature.

- [ ] **Step 3: Final verification**

Run: `npm run dev`
Full flow test:
1. Landing page → click "Find Your Spot" → `/recommend`
2. Tap "Photographer" → spots re-rank → click top spot → spot detail
3. Spot detail → "VIEW ON MAP" → map shows rank badges
4. Map → switch profile in header → markers re-rank
5. Map → remove profile → back to normal amber dots
6. `/recommend` → tap "Family" → verify filtered spots shown dimmed
7. Mobile test (390px): all pages render correctly

- [ ] **Step 4: Commit and push**

```bash
git add .gitignore app/pages/index.vue app/pages/map.vue
git commit -m "feat: add navigation to recommend page and cleanup"
git push origin master
```
