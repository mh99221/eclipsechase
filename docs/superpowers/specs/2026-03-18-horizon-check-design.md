# Horizon Obstruction Check — Design Spec

## Problem

The sun during totality (Aug 12, 2026) sits at ~24° altitude, ~250° azimuth (WSW) across western Iceland (per Skyfield computation; exact values vary per spot and are stored in `viewing_spots.sun_azimuth`). Many curated spots — especially in the Westfjords — sit in deep fjords surrounded by 400–700m mountains. A 600m mountain blocks a 24° sun if it's within ~1,350m. Without a horizon check, we risk recommending spots where the eclipse is physically invisible.

## Solution

Two complementary systems:

1. **Pre-computed horizon check** — Offline DEM-based pass/fail for all curated spots, stored as JSONB in `viewing_spots`.
2. **Dynamic horizon check** — Server-side on-demand check for Pro users tapping arbitrary map points.

Plus frontend components: verdict badge, SVG terrain silhouette with sun marker, and PeakFinder iframe panorama.

---

## DEM Data Source

**Primary**: ViewfinderPanoramas 90m resolution (~50MB for Iceland). Sufficient for detecting 400–700m mountains at 1–20km range (~11 samples per km).

**Upgrade path**: ÍslandsDEM 10m (CC-BY 4.0) if 90m proves insufficient for close obstructions. Code is resolution-agnostic — data swap only, no code changes.

**Important**: Standard SRTM does NOT cover Iceland (max 60°N; Iceland is 63–66°N).

---

## Algorithm

### Single Ray Check

Observer elevation is sampled from the DEM at the observer's lat/lng, plus 1.7m for eye height. If the DEM cell is ocean/nodata, default to 2m ASL + 1.7m.

From the observer position, sample terrain elevation along the sun azimuth bearing at cumulative ground distances:

- Every 50m for first 1km (catches nearby cliffs)
- Every 200m from 1–5km (mid-range mountains)
- Every 500m from 5–20km (distant peaks)

For each sample: compute apparent elevation angle = `atan2(terrain_elev - observer_elev, ground_distance)` where both arguments are in meters. `ground_distance` is the cumulative distance along the bearing from the observer. The maximum angle across all samples is the "horizon angle" in the sun's direction.

**Clearance** = sun_altitude - max_horizon_angle

**Verdicts**:
| Clearance | Verdict | Color |
|-----------|---------|-------|
| > 5° | `clear` | green (#22c55e) |
| 2–5° | `marginal` | yellow (#eab308) |
| 0–2° | `risky` | orange (#f97316) |
| < 0° | `blocked` | red (#ef4444) |

### Azimuth Sweep

±15° sweep at 3° steps (11 rays total) around the sun azimuth. Produces a horizon profile showing terrain angle at each bearing. This data powers the HorizonSilhouette visualization and can suggest "move 500m north for clear view" if the direct azimuth is blocked but nearby azimuths are clear.

---

## Schema Changes

```sql
ALTER TABLE viewing_spots ADD COLUMN horizon_check JSONB;
```

```sql
CREATE TABLE horizon_cache (
  id BIGSERIAL PRIMARY KEY,
  lat_rounded DOUBLE PRECISION NOT NULL,
  lng_rounded DOUBLE PRECISION NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lat_rounded, lng_rounded)
);
```

### TypeScript Types (`types/horizon.ts`)

```typescript
export type HorizonVerdict = 'clear' | 'marginal' | 'risky' | 'blocked'

export interface HorizonSweepPoint {
  azimuth: number
  horizon_angle: number
  clearance: number
}

export interface HorizonCheck {
  verdict: HorizonVerdict
  clearance_degrees: number
  max_horizon_angle: number
  observer_elevation_m: number
  blocking_distance_m: number | null
  blocking_elevation_m: number | null
  sun_altitude: number
  sun_azimuth: number
  checked_at: string
  sweep?: HorizonSweepPoint[]
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

## Pre-compute Pipeline

**Script**: `scripts/compute-horizon-checks.py`

- Loads ViewfinderPanoramas 90m DEM (GeoTIFF via rasterio)
- Reads all curated spots from Supabase (lat, lng, sun_altitude, sun_azimuth)
- For each spot: runs single ray + azimuth sweep
- Writes results back to `viewing_spots.horizon_check` JSONB
- One-time offline run during data preparation

---

## Server API — Dynamic Checks

**Endpoint**: `POST /api/horizon/check`

- **Auth**: Pro users only (check Stripe purchase status)
- **Body**: `{ lat: number, lng: number }`
- **Response**: `HorizonCheckResponse`
- **Rate limit**: 10 req/min per IP (simple in-memory map in handler, keyed by `x-forwarded-for`; resets on cold start, acceptable for MVP)
- **Target**: < 500ms

**Implementation**:
1. Validate lat/lng within western Iceland bounding box (63.8–66.2°N, lng -24.5 to -18.0)
2. Check `horizon_cache` table for existing result (lat/lng rounded to 4 decimal places)
3. If cache miss: interpolate sun_altitude/sun_azimuth from eclipse_grid (nearest-neighbor)
4. If outside totality path: return `{ in_totality_path: false }`
5. Load DEM from `public/eclipse-data/dem-west-iceland.bin` (cached in module-level variable)
6. Run horizon check algorithm (single ray + sweep)
7. Generate PeakFinder iframe URL
8. Store result in `horizon_cache`
9. Return `HorizonCheckResponse`

**DEM tile format**: Single binary Float32 array (row-major) with companion `dem-west-iceland.meta.json`. The bounding box is cropped to the totality path region to keep file size manageable:

```json
{
  "minLat": 63.8,
  "maxLat": 66.2,
  "minLng": -24.5,
  "maxLng": -18.0
}
```

At 90m resolution: ~2.4° lat × ~111km/° ÷ 0.09km ≈ 2960 rows. ~6.5° lng × ~47km/° at 65°N ÷ 0.09km ≈ 3394 cols. Total: ~10M Float32 values ≈ ~40MB. The actual `width`, `height`, and `cellSize` values are computed by the DEM preparation script and written to the metadata file.

Pure TypeScript array index math — no rasterio dependency on server. If DEM fails to load, return HTTP 503 with `{ error: 'Horizon check temporarily unavailable' }`.

---

## Frontend Components

### HorizonBadge (`components/HorizonBadge.vue`)

Small verdict indicator. Two modes:

**Compact** (SpotCard, map popups): Colored dot + verdict text (e.g. green dot + "Clear")

**Full** (spot detail page): Icon + verdict + clearance detail:
- clear: "Sun well above terrain — 8.2° clearance"
- marginal: "Sun clears terrain by only 3.1°"
- risky: "Sun barely visible — 0.8° above terrain"
- blocked: "Terrain blocks sun by 8.3°"

**Props**: `verdict: HorizonVerdict`, `clearance: number`, `compact: boolean`

### HorizonSilhouette (`components/HorizonSilhouette.vue`)

Primary visualization — SVG terrain profile with sun marker. Built from sweep data.

- Width: 100% of container
- Height: 200px mobile / 280px desktop
- Terrain: filled silhouette path (dark slate against deep navy sky)
- Sun: amber dot at correct (azimuth, altitude) position with subtle glow
- Sun altitude line: horizontal dashed amber line across full width
- Blocked zones: terrain above sun line filled red
- Clear zones: gap between terrain and sun line tinted green
- X-axis: compass direction labels (WSW, W, WNW)
- Y-axis: faint degree markers (0°, 10°, 20°, 30°)
- Pure static SVG, no charting library

### HorizonPanorama (`components/HorizonPanorama.vue`)

PeakFinder iframe embed — enhancement below the silhouette.

- iframe mode only (no Canvas JS API)
- Lazy-loaded via IntersectionObserver
- URL template: `https://www.peakfinder.com/embed/?lat={lat}&lng={lng}&name={spotName}&ele={elevation}&azi={sunAzimuth}&zoom=4&bgcolor=%230a0e17`
- Dark theme: `bgcolor=%230a0e17`
- Oriented toward sun azimuth, zoom=4
- Height: 300px mobile / 400px desktop
- 10s load timeout → fallback message with verdict badge
- "Powered by PeakFinder" attribution link
- Section label: "3D Mountain Panorama"

### DynamicHorizonCheck (`components/DynamicHorizonCheck.vue`)

Map tap-to-check for Pro users.

- Long-press/tap on map → loading indicator → call `POST /api/horizon/check`
- Result shown as map popup: verdict badge, clearance, "View panorama" button
- "View panorama" opens slide-up panel with HorizonSilhouette + PeakFinder iframe
- Free users: upgrade prompt "Unlock horizon checking — Eclipse Pro €9.99"
- Gated by `useProStatus` composable

---

## Integration with Existing Features

### Recommendation Engine (`useRecommendation.ts`)

Add `horizon` scoring factor with weight 0.2. Redistribute by multiplying all existing profile weights by 0.8, then adding `horizon: 0.2`. This uniformly reduces each existing factor by 20%.

```
computeHorizonScore(check):
  null    → 0.5 (unknown, neutral)
  clear   → 1.0
  marginal → 0.7
  risky   → 0.3
  blocked → 0.0
```

**Hard filter**: Spots with `blocked` verdict are excluded via the existing `floors` system, applied to all profiles. This guarantees blocked spots never appear as top recommendations regardless of how well they score on other factors. They remain visible in the full spot list with a red warning.

### Map Markers (`EclipseMap.vue`)

Spot markers get a colored ring indicating horizon verdict:
- Green: clear
- Yellow: marginal
- Orange: risky
- Red with X: blocked
- Gray: no data

### Spot Detail Page (`pages/spots/[slug].vue`)

New sections after eclipse stats grid:
1. HorizonBadge (full mode) in stats area
2. "Horizon View" section: explanatory text + HorizonSilhouette
3. "3D Mountain Panorama" section: HorizonPanorama (PeakFinder iframe)

### SpotCard

HorizonBadge in compact mode added to card layout.

### i18n

New keys in `en.json` and `is.json` for verdict labels, section headers, explanatory text, compass directions, offline fallback messages.

---

## Offline Behavior

- **HorizonBadge**: Works (data in cached viewing_spots JSON)
- **HorizonSilhouette**: Works (sweep data in cached JSON)
- **HorizonPanorama**: "Panorama requires internet connection"
- **DynamicHorizonCheck**: "Connect to internet for horizon checking"

---

## Performance & Caching

**Pre-computed spots**: Results in Supabase JSONB, fetched with spot data. No extra queries.

**Dynamic checks**: Cached in `horizon_cache` table, keyed by lat/lng rounded to 4 decimal places (~11m precision). Indefinite TTL.

**PeakFinder iframe**: ~5–10MB per panorama. Lazy-loaded on scroll. Silhouette + badge shown immediately as lightweight fallback.

---

## PeakFinder Commercial Use

Before launch: email PeakFinder (Fabio Soldati) about commercial iframe embedding. If not permitted, remove iframe — the HorizonSilhouette + HorizonBadge are fully self-contained and independent of PeakFinder.

---

## Acceptance Criteria

- [ ] All curated viewing spots have pre-computed horizon check results
- [ ] Blocked spots flagged with red warning on map and in cards
- [ ] Spot detail page shows HorizonBadge with verdict and clearance
- [ ] Spot detail page shows HorizonSilhouette with terrain profile and sun marker
- [ ] Spot detail page shows PeakFinder panorama iframe oriented toward sun
- [ ] Recommendation engine penalizes blocked spots (score = 0)
- [ ] Pro users can tap any map point for dynamic horizon check
- [ ] Dynamic check returns in < 500ms
- [ ] Dynamic check includes PeakFinder URL
- [ ] Bildudalur harbour → "blocked" (known test case)
- [ ] Latrabjarg cliffs → "clear" (known test case — open ocean west)
- [ ] PeakFinder commercial terms verified and documented
- [ ] Offline mode: cached verdict/silhouette, graceful fallback for panorama

## Out of Scope

- 3D terrain rendering (PeakFinder handles this)
- Atmospheric refraction correction (negligible at 24°)
- Vegetation/building obstruction (bare earth DEM; Icelandic village buildings <10m vs 600m mountains)
- Real-time camera overlay
- Horizon checks for Spanish eclipse path
