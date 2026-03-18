# Horizon Obstruction Check — Design Spec v2

## Problem

The sun during totality on August 12, 2026 will be at approximately **24° altitude** at an azimuth that varies per spot (stored in `viewing_spots.sun_azimuth`, computed via Skyfield) across western Iceland. Many curated viewing spots — especially in the Westfjords — sit inside deep fjords surrounded by 400–700m flat-topped basalt mountains. A mountain at 600m height blocks a 24° sun if it's within ~1,350m of the observer.

Without a horizon check, we risk sending users to spots where they physically cannot see the eclipse because mountains are in the way. No other eclipse resource currently validates viewing spots against terrain obstruction.

---

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Implementation approach | Python pre-compute + TypeScript server port | Python/rasterio for DEM work, TS port for dynamic checks. Keeps Pro upsell feature |
| DEM source | ÍslandsDEM 10m (primary), ViewfinderPanoramas 90m (fallback) | 10m for pre-compute accuracy, downsampled 30m for server |
| DEM storage | Committed to repo directly | ~50-80MB binary files. Simple, no external dependencies. Accepted tradeoff: permanently inflates repo clone size. Git LFS is an alternative if this becomes a problem |
| Azimuth sweep | ±30° at 1° steps (61 points) | Rich terrain profile for SVG visualization. ~6,100 DEM lookups per check (61 rays × ~100 samples) — well under 500ms for in-memory Float32Array |
| SVG rendering | Client-side only (Vue component) | Single rendering path, sweep data is tiny, avoids maintaining Python SVG generation |
| Recommendation weight | 0.25 with uniform scale-down | All existing weights × 0.75, horizon gets 0.25 |
| Caching (dynamic checks) | None for MVP | <500ms computation, rate-limited, small Pro user base |
| PeakFinder | External link only | ToS prohibits commercial embedding |

---

## Data Pipeline

### DEM Preparation (one-time, manual)

1. Download ÍslandsDEM v1.0 10m GeoTIFF from LMI open data portal
2. Python script crops to western Iceland bounding box (63.8–66.2°N, -24.5 to -18.0°W)
3. Downsample to 30m resolution for server-side binary tiles
4. Export as raw Float32 row-major binary in **south-to-north** row order (row 0 = southernmost latitude) + metadata JSON (bounding box, dimensions, cell size)
5. Commit binary tiles to `server/data/dem/`

File structure:
```
server/
└── data/
    └── dem/
        ├── west-iceland-30m.bin       # ~50-80 MB Float32 array
        └── west-iceland-30m.meta.json # bounding box, width, height, cellSize
```

Metadata format:
```json
{
  "minLat": 63.8,
  "maxLat": 66.2,
  "minLng": -24.5,
  "maxLng": -18.0,
  "width": 3394,
  "height": 2960,
  "cellSizeLat": 0.00027,
  "cellSizeLng": 0.00027,
  "rowOrder": "south-to-north"
}
```

Note: At 65°N latitude, `cellSizeLng` of 0.00027° ≈ 12.7m (E-W) while `cellSizeLat` of 0.00027° ≈ 30m (N-S) due to meridian convergence. The "30m" label refers to the latitude resolution. Actual values are computed by the DEM preparation script.

### Pre-computation Script (`scripts/compute-horizon-checks.py`)

- **Dependencies**: rasterio, numpy, math
- Uses full 10m GeoTIFF via rasterio for maximum accuracy
- Reads curated spots (lat, lng, sun_altitude, sun_azimuth) from a JSON input file or Supabase
- For each spot:
  1. Get observer elevation from DEM + 1.7m eye height (ocean/nodata → 2m + 1.7m)
  2. Single ray check at sun_azimuth → verdict + clearance
  3. Azimuth sweep ±30° in 1° steps → 61 data points
  4. Store result as HorizonCheck JSON
  5. Print summary: `{spot_name}: {verdict} ({clearance}° clearance)`
- Outputs `horizon-checks.json`
- Separate SQL seed script updates `viewing_spots.horizon_check` JSONB

### Ray Sampling Strategy

Along each azimuth bearing from observer position:
- Every 50m for first 1km (nearby cliffs)
- Every 200m from 1km to 5km (mid-range mountains)
- Every 500m from 5km to 20km (distant peaks)

For each sample point:
1. Get terrain elevation from DEM (bilinear interpolation)
2. Calculate horizontal distance from observer
3. Apparent elevation angle = `atan2(terrain_elev - observer_elev, distance)`

Maximum apparent elevation angle across all samples = "horizon angle" in that direction.

### Verdict Thresholds

| Clearance | Verdict | Color |
|-----------|---------|-------|
| > 5° | `clear` | #22c55e (green) |
| 2–5° | `marginal` | #eab308 (yellow) |
| 0–2° | `risky` | #f97316 (orange) |
| < 0° | `blocked` | #ef4444 (red) |

Clearance = sun_altitude - max_horizon_angle

---

## Schema Changes

Single column addition:

```sql
ALTER TABLE viewing_spots ADD COLUMN horizon_check JSONB;
```

No cache table — dynamic checks are computed on the fly.

---

## TypeScript Types

```typescript
// app/types/horizon.ts

export type HorizonVerdict = 'clear' | 'marginal' | 'risky' | 'blocked'

export interface HorizonSweepPoint {
  azimuth: number        // absolute compass bearing
  horizon_angle: number  // terrain elevation angle in degrees
  distance_m: number     // distance to highest terrain point on this bearing
}

export interface HorizonCheck {
  verdict: HorizonVerdict
  clearance_degrees: number
  max_horizon_angle: number
  blocking_distance_m: number | null
  blocking_elevation_m: number | null
  observer_elevation_m: number  // DEM elevation + 1.7m eye height; used by PeakFinderLink
  sun_altitude: number
  sun_azimuth: number
  checked_at: string
  sweep: HorizonSweepPoint[]  // 61 points, ±30°
}

// View-model subset of HorizonCheck, used as props for HorizonProfile component
export interface HorizonProfileData {
  sun_azimuth: number
  sun_altitude: number
  sweep: HorizonSweepPoint[]
  verdict: HorizonVerdict
  clearance_degrees: number
}

export interface HorizonCheckRequest {
  lat: number
  lng: number
}

export interface HorizonCheckResponse extends HorizonCheck {
  peakfinder_url: string
  totality_duration_seconds: number | null
  in_totality_path: boolean
}
```

---

## Server API — Dynamic Checks

### `POST /api/horizon/check`

- **Auth**: Pro users only (Supabase lookup via `useProStatus`)
- **Body**: `{ lat: number, lng: number }`
- **Response**: `HorizonCheckResponse`
- **Rate limit**: 10 req/min per IP (in-memory Map keyed by `x-forwarded-for`, resets on cold start)
- **Target**: < 500ms

**Implementation**:
1. Validate lat/lng within western Iceland bounding box
2. Check Pro status
3. Interpolate sun_altitude and sun_azimuth from `eclipse_grid` (nearest-neighbor)
4. If outside totality path: return `{ in_totality_path: false }`
5. Load DEM from `server/data/dem/west-iceland-30m.bin` (cached in module-level Float32Array)
6. Run horizon check algorithm (single ray + ±30° sweep)
7. Generate PeakFinder external URL
8. Return `HorizonCheckResponse`

**Error responses**:
- DEM fails to load: HTTP 503 `{ error: 'Horizon check temporarily unavailable' }`
- lat/lng outside bounding box: HTTP 422 `{ error: 'Location outside coverage area' }`
- Not Pro user: HTTP 403 `{ error: 'Pro subscription required' }`
- Rate limited: HTTP 429 `{ error: 'Too many requests, try again in a minute' }`

### DEM Loading (TypeScript)

Pure array index math on Float32Array — no rasterio dependency. Binary file uses south-to-north row order (row 0 = minLat), matching the index formula:

```typescript
// Pseudocode — south-to-north row order
const row = Math.floor((lat - minLat) / cellSizeLat)
const col = Math.floor((lng - minLng) / cellSizeLng)
const index = row * width + col
const elevation = demData[index]
```

**Important**: If the DEM export uses standard GeoTIFF north-to-south order instead, the row formula must be `Math.floor((maxLat - lat) / cellSizeLat)`. The `rowOrder` field in the metadata JSON specifies which convention is used.

Bilinear interpolation for sub-cell accuracy. Module-level variable caches the loaded array across requests.

---

## Frontend Components

### HorizonBadge (`components/HorizonBadge.vue`)

Small verdict indicator with two modes.

**Props**: `verdict: HorizonVerdict`, `clearance: number`, `compact: boolean`

**Compact mode** (SpotCard, map popups):
- Colored dot + verdict word (e.g., green dot + "Clear")

**Full mode** (spot detail page):
- clear: "Sun well above terrain — {clearance}° clearance"
- marginal: "Sun clears terrain by only {clearance}°"
- risky: "Sun barely visible — {clearance}° above terrain"
- blocked: "Terrain blocks sun by {abs(clearance)}°"

**Colors**: clear=#22c55e, marginal=#eab308, risky=#f97316, blocked=#ef4444

### HorizonProfile (`components/HorizonProfile.vue`)

SVG terrain profile with sun marker. Always client-side rendered from sweep data.

**Props**:
- `data: HorizonProfileData` (required)
- `width: number` (default: 700)
- `height: number` (default: 280)
- `interactive: boolean` (default: true)

**Visual elements**:
- Sky gradient background (#0f172a top → #1e293b bottom)
- Terrain silhouette: filled path (var(--bg-card) / #1a2232, stroke #334155)
- Sun altitude line: horizontal dashed amber line
- Sun marker: amber circle with subtle glow at correct (azimuth, altitude)
- Blocked overlay: terrain above sun line filled red at 25% opacity
- X-axis: compass labels (azimuth values + cardinal directions)
- Y-axis: altitude markers at 10°, 20°, 30°
- Verdict badge: colored pill in top-right corner

**Coordinate mapping**:
- `azimuthToX()`: maps bearing to SVG x within padded plot area
- `altitudeToY()`: maps elevation angle to SVG y (inverted, 0° bottom, 35° top)
- `terrainPath()`: generates SVG path string from sweep data

**Interactive behavior**:
- Hover/tap terrain: tooltip "Mountain at {azimuth}°, {horizon_angle}° high, {distance}m away"
- Hover/tap sun: tooltip "Sun at totality: {altitude}° altitude, {azimuth}° {compass}"
- Hover/tap red zone: tooltip "Terrain blocks the sun here by {degrees}°"

**Responsive**:
- Mobile: height 200px, fewer axis labels, larger touch targets
- Desktop: height 280px, full labels
- viewBox-based scaling to container width

**Accessible**: `aria-label` describing verdict in text form.

### PeakFinderLink (`components/PeakFinderLink.vue`)

External link to PeakFinder — no embedding.

**Props**: `lat`, `lng`, `elevation`, `sunAzimuth`, `spotName`

**URL**: `https://www.peakfinder.com/?lat={lat}&lng={lng}&name={spotName}&ele={elevation}&azi={sunAzimuth}`

**Styled as**: secondary outline button, `target="_blank" rel="noopener"`
**Subtitle**: "External site — shows labeled mountain names and distances"

### DynamicHorizonCheck (`components/DynamicHorizonCheck.vue`)

Map tap-to-check for Pro users, integrated with EclipseMap.

**Behavior**:
1. Long-press/tap a point on the map
2. Loading indicator at tapped point
3. `POST /api/horizon/check { lat, lng }`
4. Result shown as slide-up panel: HorizonBadge + HorizonProfile + PeakFinderLink + "Navigate here" (opens Google Maps directions to the tapped coordinates)
5. Free users who try: upgrade prompt "Unlock horizon checking — Eclipse Pro €9.99"

Gated by `useProStatus` composable.

---

## Integration with Existing Features

### Recommendation Engine (`useRecommendation.ts`)

Add `horizon` as 6th scoring factor.

**Type change**: Add `horizon: number` to `Profile.weights` interface. All profile definitions updated.

Weight redistribution:
- All existing profile weights × 0.75
- Horizon weight = 0.25 for all profiles
- Example (photographer): weather 0.2625, duration 0.2625, services 0.0375, accessibility 0.075, distance 0.1125, horizon 0.25

Horizon scoring:
```
clear    → 1.0
marginal → 0.7
risky    → 0.3
blocked  → 0.0
null     → 0.5 (unknown, neutral)
```

**Hard filter**: All profiles exclude blocked spots. Add `horizonBlocked?: boolean` to `Profile.floors`. The floor check reads into the JSONB-parsed field: `spot.horizon_check?.verdict === 'blocked'`. This is different from the existing flat-field floor checks — the implementation must access the nested `horizon_check` object.

**Missing data**: When all spots lack horizon data, redistribute horizon weight across other factors (same pattern as existing weather-missing logic).

### Spot Detail Page (`pages/spots/[slug].vue`)

- HorizonBadge (full mode) in the stats grid area
- New "Horizon View" section after stats:
  - Explanatory text: "The sun will be at {altitude}° above the horizon, looking {compass_direction}."
  - HorizonProfile SVG
  - PeakFinderLink
- **Blocked spots**: prominent red warning banner with blocking mountain details + nearest clear spot suggestion

### Map Markers (`EclipseMap.vue`)

Spot markers get colored ring based on horizon verdict:
- Green ring: clear
- Yellow ring: marginal
- Orange ring: risky
- Red ring + diagonal strike-through: blocked
- Gray ring: no data (current default)

### SpotCard

HorizonBadge in compact mode added to card layout.

### Offline Behavior

- HorizonBadge: works (verdict in cached spot JSON)
- HorizonProfile SVG: works (sweep data in cached spot JSON)
- PeakFinderLink: requires internet (opens browser)
- Dynamic horizon check: shows "Connect to internet for horizon checking"

---

## i18n

New keys needed in `en.json` and `is.json`:
- Verdict labels: "Clear", "Marginal", "Risky", "Blocked"
- Full verdict descriptions (4 strings with `{clearance}` interpolation)
- Section headers: "Horizon View", "View on PeakFinder"
- Explanatory text: "The sun will be at {altitude}° above the horizon, looking {direction}."
- Compass directions: "W", "WNW", "WSW", "NW", etc.
- Offline fallback messages
- Error messages for dynamic check
- Upgrade prompt text

---

## Attribution

ÍslandsDEM data requires CC-BY 4.0 attribution. Display on credits page and as small note below each horizon profile:

> Elevation data: ÍslandsDEM v1.0 © National Land Survey of Iceland (CC BY 4.0)

---

## Acceptance Criteria

- [ ] All ~30–50 curated spots have pre-computed horizon check results in Supabase
- [ ] Spots with "blocked" verdict show red warning on map markers and SpotCard
- [ ] Spot detail page shows HorizonBadge with verdict and clearance
- [ ] Spot detail page shows HorizonProfile SVG with terrain silhouette + sun position
- [ ] Blocked zone is visually distinct (red overlay) in the SVG
- [ ] Each spot has a "View on PeakFinder" external link (opens new tab)
- [ ] Recommendation engine gives blocked spots score = 0 (hard filter)
- [ ] Recommendation engine includes horizon factor with 0.25 weight
- [ ] Pro users can tap any map point for dynamic horizon check (< 500ms)
- [ ] Dynamic check returns sweep data + PeakFinder URL
- [ ] Bíldudalur harbour correctly shows "blocked" (known test case)
- [ ] Látrabjarg cliffs correctly shows "clear" (known test case — open ocean)
- [ ] HorizonProfile SVG works in dark theme, is responsive, renders offline
- [ ] ÍslandsDEM CC-BY 4.0 attribution displayed
- [ ] PeakFinder NOT embedded (external link only — ToS compliance)
- [ ] Rate limiting on dynamic check endpoint (10 req/min per IP)

## Out of Scope

- PeakFinder embedding (ToS prohibits commercial use)
- Pre-rendered static SVG files (client-side rendering only)
- Horizon cache table (no caching for MVP)
- 3D terrain rendering
- Atmospheric refraction correction (negligible at 24°)
- Building/vegetation obstruction (DEM is bare earth; irrelevant for rural Iceland)
- Horizon checks for Spanish eclipse path (future feature)
- User-uploaded horizon photos
- Camera overlay / AR features
