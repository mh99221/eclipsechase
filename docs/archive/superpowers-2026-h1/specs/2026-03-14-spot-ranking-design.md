# Spot Expansion & Personalized Ranking System

**Date:** 2026-03-14
**Status:** Review
**Scope:** Expand viewing spots to 25-30, add hiking trail spots, build a profile-based recommendation engine with ranked results page and map integration.

---

## Problem

EclipseChase.is has 11 curated viewing spots sorted by totality duration. Users have no way to find the best spot for *their* situation — a family with kids has very different needs from a photographer chasing max duration, or a hiker seeking a remote ridge. There are also no hiking trail spots, and the totality path has coverage gaps (e.g. no spots in Flateyri, Ólafsvík, Akranes).

## Solution

1. Expand to 25-30 curated spots including hiking trail locations
2. Five user profiles with one-tap selection
3. Weighted scoring algorithm with hard floor constraints
4. Dedicated recommendation page + map integration showing ranked results

---

## 1. Data Model

### 1.1 New Columns on `viewing_spots`

```sql
ALTER TABLE viewing_spots ADD COLUMN spot_type TEXT DEFAULT 'drive-up';
  -- values: 'drive-up', 'short-walk', 'moderate-hike', 'serious-hike'

ALTER TABLE viewing_spots ADD COLUMN trail_distance_km DOUBLE PRECISION;
  -- one-way distance in km, NULL for drive-up

ALTER TABLE viewing_spots ADD COLUMN trail_time_minutes INTEGER;
  -- estimated one-way time, NULL for drive-up

ALTER TABLE viewing_spots ADD COLUMN difficulty TEXT;
  -- 'easy', 'moderate', 'challenging', NULL for drive-up

ALTER TABLE viewing_spots ADD COLUMN elevation_gain_m INTEGER;
  -- meters gained, NULL for drive-up

ALTER TABLE viewing_spots ADD COLUMN trailhead_lat DOUBLE PRECISION;
  -- where the hike starts, NULL for drive-up

ALTER TABLE viewing_spots ADD COLUMN trailhead_lng DOUBLE PRECISION;
```

Existing 11 spots receive `spot_type = 'drive-up'` with all hiking fields NULL.

### 1.2 No New Tables

Profiles and weights are static frontend constants, not database entities. No user accounts or preference storage needed.

---

## 2. Spot Expansion

### 2.1 Target: 25-30 Total Spots

**Existing (11):** Ísafjörður, Dynjandi, Þingeyri, Patreksfjörður, Rif, Arnarstapi, Stykkishólmur, Borgarnes, Grótta, Reykjanestá, Keflavík

**New drive-up spots (~8-10):** Fill coverage gaps — candidates include Flateyri, Ólafsvík, Hellissandur, Akranes, Sandgerði, and stops along Route 1 between regions.

**New hiking spots (~6-8):**
- **Short walks (<30 min):** e.g. Kirkjufell viewpoint, Látrabjarg cliffs
- **Moderate hikes (30 min–2 hours):** e.g. Glymur waterfall trail, Snæfellsjökull lower slopes, Hornstrandir coast path
- **Serious hikes (2+ hours):** e.g. Snæfellsjökull summit area, Hornbjarg cliffs

Exact spots to be researched and curated during implementation with accurate coordinates, trail data, and totality durations.

### 2.2 Spot Data Requirements

Every spot (drive-up or hiking) must have:
- Coordinates (lat/lng), region, name, slug, description
- Parking info, terrain notes, has_services, cell_coverage
- Totality duration, sun altitude, sun azimuth

Hiking spots additionally require all trail fields (distance, time, difficulty, elevation gain, trailhead coordinates).

---

## 3. User Profiles

### 3.1 Five Profiles

| Profile | Description |
|---------|-------------|
| **Photographer** | Max totality + clear skies, doesn't need services |
| **Family** | Easy access, services, cell coverage, safe terrain |
| **Hiker** | Remote/scenic trails, willing to commit hours |
| **Sky Chaser** | Weather above all, mobile on eclipse day, will drive anywhere |
| **First-Timer** | Balanced "safe bet", decent everything |

### 3.2 Selection UX

One-tap profile selection on the `/recommend` page. No sliders, no quiz, no configuration. Tap a profile pill → spots re-rank instantly.

---

## 4. Ranking Algorithm

### 4.1 Scoring Factors

Each factor is normalized to a 0–1 scale:

| Factor | Source | Normalization |
|--------|--------|---------------|
| `weather` | Cloud cover forecast from nearest weather station | `1 - (cloud_cover / 100)`. If no weather data available (API down, stale >6 hours, or no forecast exists), default to 0.5 (neutral — neither helps nor hurts). |
| `duration` | `totality_duration_seconds` | `value / max_value` across **all** spots (before floor filtering, so the scale is stable regardless of profile). |
| `services` | `has_services` + `cell_coverage` | `has_services`: true=1.0, false=0.0. `cell_coverage`: good=1.0, limited=0.5, none=0.0. Factor = average of both values. |
| `accessibility` | `spot_type` + `difficulty` | drive-up=1.0, short-walk=0.8, moderate-hike=0.5, serious-hike=0.2 |
| `distance` | Haversine from user GPS or Reykjavík default | `1 - (km / cap)` where `cap = 300km`, clamped to [0, 1]. Fixed cap avoids a single outlier spot compressing all other distances. |

### 4.2 Weather-to-Spot Mapping

Each spot is assigned weather from the nearest weather station by haversine distance. With 15 stations and 25-30 spots in western Iceland, max station distance is ~20-30km — acceptable for cloud cover granularity.

**Weather staleness:** Forecasts older than 6 hours are treated as unavailable. Observations older than 3 hours are treated as unavailable. When weather is unavailable for a spot, its weather factor defaults to 0.5 (neutral). If weather is unavailable for *all* spots, the weather factor is excluded from scoring entirely and weights are redistributed proportionally among remaining factors.

### 4.3 Profile Weights

```
Photographer:  { weather: 0.35, duration: 0.35, services: 0.05, accessibility: 0.10, distance: 0.15 }
Family:        { weather: 0.25, duration: 0.10, services: 0.30, accessibility: 0.25, distance: 0.10 }
Hiker:         { weather: 0.25, duration: 0.20, services: 0.05, accessibility: 0.35, distance: 0.15 }
Sky Chaser:    { weather: 0.50, duration: 0.15, services: 0.05, accessibility: 0.05, distance: 0.25 }
First-Timer:   { weather: 0.30, duration: 0.15, services: 0.20, accessibility: 0.20, distance: 0.15 }
```

All profiles sum to 1.0. The Hiker profile's high accessibility weight (0.35) combined with an **inverted** accessibility scale naturally rewards hiking spots: for Hikers, the accessibility factor is computed as `1 - normalAccessibility` (i.e. serious-hike=0.8, moderate=0.5, short-walk=0.2, drive-up=0.0). This inversion only applies to the Hiker profile.

### 4.4 Hard Floors (Disqualification Rules)

```
Photographer:  (none)
Family:        has_services=true, cell_coverage≠'none', difficulty≠'challenging'
Hiker:         spot_type≠'drive-up'
Sky Chaser:    (none)
First-Timer:   difficulty≠'challenging'
```

Spots failing any floor for the active profile receive `score = 0` and are shown as dimmed/filtered on the map.

**Thin results handling:** If fewer than 3 spots pass floors, show a banner: "Only N spots match your profile — consider switching to [First-Timer] for more options." The dimmed spots are always visible (never hidden) so the user can still tap them and see why they were filtered.

### 4.5 Score Computation

```
1. Normalize all factors across the full spot set (before floor filtering)
2. For each spot:
   a. Check floors → if any fail, score = 0, mark as "filtered"
   b. Compute each factor (0–1)
   c. For Hiker profile: invert accessibility (serious-hike=0.8, drive-up=0.0)
   d. score = Σ(weight × factor), clamped to [0, 1]
   e. Display as integer 0–100 (multiply by 100, round)
3. Sort descending (filtered spots always at bottom)
4. Top 3 non-filtered spots highlighted as "Top picks"
```

### 4.6 Implementation Location

Client-side composable: `app/composables/useRecommendation.ts`

Inputs: spots array, weather data, user coordinates, selected profile.
Output: sorted array of spots with scores and per-factor breakdowns.

No new API endpoints. Uses existing `/api/spots` and `/api/weather/cloud-cover`.

---

## 5. Recommendation Page (`/recommend`)

### 5.1 Layout

1. **Header** — standard ECLIPSECHASE nav
2. **Profile selector** — row of 5 tappable profile pills, active profile highlighted in corona/amber
3. **Results list** — ranked spot cards, each showing:
   - Rank badge (#1, #2, #3...)
   - Spot name, region label
   - Score (0-100, color-coded: green 80+, amber 50-79, red <50)
   - Summary line: totality duration, spot type, weather status
   - Factor breakdown: weather %, duration %, distance
4. **"+ N more spots" expandable** — top 3 shown by default, rest behind "View all"
5. **Action buttons** — "View on Map" (navigates to `/map?profile=X`)

### 5.2 Data Flow

```
Page load → fetch spots + cloud cover (parallel, same as map.vue)
         → request GPS (non-blocking, uses Reykjavík immediately)
         → user taps profile
         → useRecommendation computes scores client-side (using Reykjavík or GPS if already resolved)
         → re-render ranked list (instant, no API call)
         → if GPS resolves later, re-compute and update rankings automatically
```

### 5.3 No Profile Selected State

Before a profile is tapped, show all spots sorted by totality duration (current behavior) with a prompt: "Pick your style to see personalized rankings."

---

## 6. Map Integration

### 6.1 Rank Badges on Markers

When `/map?profile=X` is set:
- Spot markers display rank number (small text label) instead of amber dot
- Top 3 markers are slightly larger (24px vs 20px) with brighter gold border
- Spots with score=0 (failed floors) render as dimmed gray markers (reduced opacity, gray border)
- At low zoom levels where markers overlap, Mapbox's built-in collision detection handles it — rank numbers are small enough that overlap is minimal at zoom 6+

### 6.2 Profile Pill in Map Header

Small text indicator in the top bar showing active profile name (e.g. "Photographer"). Tapping it opens a dropdown to switch profiles. No profile = current behavior (no ranking). Profile icons use text labels, not emoji (consistent cross-platform rendering).

### 6.3 Popup Score

Spot popups include the recommendation score alongside totality duration when a profile is active.

---

## 7. Location / Distance

### 7.1 GPS

- Browser Geolocation API, prompted once on `/recommend` page load
- Coordinates stay client-side only, never sent to server
- Used solely for haversine distance calculation in scoring

### 7.2 Fallback

- If GPS denied or unavailable: default to Reykjavík (64.1466, -21.9426)
- Display label: "from your location" or "from Reykjavík" next to distance values

### 7.3 Impact

Distance weight ranges from 0.10 (Family) to 0.25 (Sky Chaser). The Reykjavík fallback is acceptable — it won't dramatically skew results since most tourists start there.

---

## 8. Files to Create or Modify

### New Files
- `app/composables/useRecommendation.ts` — scoring engine
- `app/composables/useLocation.ts` — GPS wrapper with Reykjavík fallback
- `app/pages/recommend.vue` — recommendation page
- `scripts/seed-viewing-spots-v2.sql` — updated seed with 25-30 spots + new columns
- `scripts/migrate-spots-add-hiking.sql` — ALTER TABLE migration for new columns

### Modified Files
- `app/components/EclipseMap.vue` — rank badges, dimmed markers, profile-aware popups
- `app/pages/map.vue` — profile pill in header, read `?profile=` query param, pass to EclipseMap
- `server/api/spots/index.get.ts` — return new columns (spot_type, trail fields)
- `server/api/spots/[slug].get.ts` — already uses `select('*')`, no change needed
- `app/pages/spots/[slug].vue` — display trail info for hiking spots

---

## 9. Out of Scope

- User accounts or saved preferences (profiles are session-only, selected each visit)
- Custom weight sliders (may add later if users request)
- Traffic/road conditions integration
- Offline mode
- Pro tier / payment gating
- Share results functionality (can add later as a URL with `?profile=X`)
