# Sun-Arc Map Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Design spec:** [docs/superpowers/specs/2026-04-19-sun-arc-design.md](../specs/2026-04-19-sun-arc-design.md) — read this first.
>
> **Manual browser verification note:** Final visual QA on `/map` and `/spots/[slug]` requires a real browser with Mapbox tiles. The preview sandbox in this session cannot render Mapbox. Unit tests cover the logic; the implementer's local browser covers the visual.

**Goal:** Add a sun-direction trajectory arc overlay to `/map`. Activates for (a) the currently-focused spot popup, (b) the horizon-check point. Only one arc visible at a time. The spot detail page keeps its existing sun-direction wedge unchanged.

**Architecture:** One new pure utility `attachSunArc(map, props) → detach()` owns a geojson line layer + HTML markers (sun disk, time ticks, callout). Three Vue call sites manage *when* to attach/detach. Server endpoint `/api/horizon/check` gains a `totality_start` field sourced from a new `eclipseGrid` loader.

**Tech Stack:** Nuxt 4, TypeScript, Mapbox GL JS 3.20, Vitest, existing `app/utils/solar.ts` trajectory calculator.

---

## File Structure

**New files:**
- `server/utils/eclipseGrid.ts` — load `public/eclipse-data/grid.json`, cache, nearest-point lookup.
- `app/utils/sunArc.ts` — `attachSunArc(map, props) → detach()`.
- `tests/unit/utils/sunArc.test.ts` — unit tests.
- `tests/unit/utils/solar.trajectory-by-time.test.ts` — unit tests for new trajectory function.

**Modified files:**
- `app/utils/solar.ts` — add `computeSunTrajectoryByTime` function.
- `app/types/horizon.ts` — add `totality_start?: string` to `HorizonCheckResponse`.
- `server/api/horizon/check.post.ts` — call `findNearestEclipsePoint` and include `totality_start` in response.
- `app/components/EclipseMap.vue` — hook spot-popup open/close to attach/detach arc. Expose arc-ownership API via `defineExpose`.
- `app/components/DynamicHorizonCheck.vue` — emit `@result` with the API response.
- `app/pages/map.vue` — receive `@result` emit, attach/detach arc for horizon-check.
- `tests/mocks/mapbox-gl.ts` — add `project`/`unproject` methods for sunArc tests.
- `CLAUDE.md` — add `sunArc.ts` and `eclipseGrid.ts` to utils lists (root + project file).

**Out of scope (intentional):** `app/components/SpotLocationMap.vue` keeps its existing sun-direction wedge. The new sun-arc is `/map`-only.

---

## Task 1: Add `computeSunTrajectoryByTime` to solar.ts

**Files:**
- Modify: `app/utils/solar.ts`
- Test: `tests/unit/utils/solar.trajectory-by-time.test.ts`

Rationale: existing `computeSunTrajectory(lat, lng, minAzimuth, maxAzimuth)` samples the entire day at 10-min resolution filtered by azimuth. The map arc needs a narrow 30-min window at 1-min resolution filtered by time.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/utils/solar.trajectory-by-time.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { computeSunTrajectoryByTime } from '../../../app/utils/solar'

describe('computeSunTrajectoryByTime', () => {
  // Reykjavik coords, totality 17:46 UTC → window 17:31 to 18:01
  const REYKJAVIK = { lat: 64.15, lng: -21.94 }

  it('returns one point per step within the window', () => {
    const points = computeSunTrajectoryByTime(REYKJAVIK.lat, REYKJAVIK.lng, 17.5, 18.0, 5)
    // 17:30, 17:35, 17:40, 17:45, 17:50, 17:55, 18:00 → 7 points
    expect(points).toHaveLength(7)
  })

  it('produces monotonically increasing utcHours', () => {
    const points = computeSunTrajectoryByTime(REYKJAVIK.lat, REYKJAVIK.lng, 17.5, 18.0, 5)
    for (let i = 1; i < points.length; i++) {
      expect(points[i]!.utcHours).toBeGreaterThan(points[i - 1]!.utcHours)
    }
  })

  it('returns realistic Iceland totality-time azimuth (around 250° WSW)', () => {
    const points = computeSunTrajectoryByTime(REYKJAVIK.lat, REYKJAVIK.lng, 17.75, 17.78, 1)
    const mid = points[0]!
    expect(mid.azimuth).toBeGreaterThan(240)
    expect(mid.azimuth).toBeLessThan(260)
  })

  it('returns realistic Iceland totality-time altitude (20°–30°)', () => {
    const points = computeSunTrajectoryByTime(REYKJAVIK.lat, REYKJAVIK.lng, 17.75, 17.78, 1)
    expect(points[0]!.altitude).toBeGreaterThan(20)
    expect(points[0]!.altitude).toBeLessThan(30)
  })

  it('handles fractional step minutes', () => {
    const points = computeSunTrajectoryByTime(REYKJAVIK.lat, REYKJAVIK.lng, 17.75, 17.80, 1)
    // 17:45, 17:46, 17:47, 17:48 → 4 points (0.05h * 60 / 1 = 3, inclusive = 4)
    expect(points).toHaveLength(4)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/utils/solar.trajectory-by-time.test.ts --hookTimeout=60000`
Expected: FAIL — `computeSunTrajectoryByTime is not a function`.

- [ ] **Step 3: Implement the function**

Append to `app/utils/solar.ts` (after the existing `computeSunTrajectory` export):

```ts
/**
 * Compute sun trajectory at a location across a time window, at a given
 * per-minute step. Used by the map sun-arc overlay (±15 min around
 * totality). Unlike computeSunTrajectory, the output is not filtered
 * by azimuth — callers that want a narrow window get every point.
 *
 * @param lat Latitude in degrees
 * @param lng Longitude in degrees
 * @param minUtcHours Start of window in UTC hours (e.g. 17.5 = 17:30)
 * @param maxUtcHours End of window, inclusive
 * @param stepMinutes Sampling step in minutes (must divide the window evenly)
 */
export function computeSunTrajectoryByTime(
  lat: number,
  lng: number,
  minUtcHours: number,
  maxUtcHours: number,
  stepMinutes: number,
): SunTrajectoryPoint[] {
  const points: SunTrajectoryPoint[] = []
  const stepHours = stepMinutes / 60
  // Add a tiny epsilon so floating-point rounding doesn't drop the endpoint.
  const end = maxUtcHours + stepHours / 2
  for (let h = minUtcHours; h <= end; h += stepHours) {
    const pos = solarPosition(lat, lng, h)
    points.push({ utcHours: h, altitude: pos.altitude, azimuth: pos.azimuth })
  }
  return points
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/utils/solar.trajectory-by-time.test.ts --hookTimeout=60000`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add app/utils/solar.ts tests/unit/utils/solar.trajectory-by-time.test.ts
git commit -m "feat(solar): add computeSunTrajectoryByTime helper

Dense time-windowed trajectory sampler, complement to the existing
azimuth-filtered computeSunTrajectory. Used by the upcoming sun-arc
map overlay to produce ±15 min windows at 1-min resolution.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Create server-side `eclipseGrid` loader

**Files:**
- Create: `server/utils/eclipseGrid.ts`
- Test: `tests/server/utils/eclipseGrid.test.ts`

Rationale: `/api/horizon/check` needs `totality_start`, which lives in `public/eclipse-data/grid.json` (588 points, ~135 KB) — not in the horizon grid. Mirror the `horizonGrid.ts` load+cache pattern with a minimal nearest-point lookup.

- [ ] **Step 1: Write the failing test**

Create `tests/server/utils/eclipseGrid.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Load the real grid.json for the test — small enough (~135 KB)
const gridPath = join(process.cwd(), 'public', 'eclipse-data', 'grid.json')
const raw = JSON.parse(readFileSync(gridPath, 'utf-8'))

// Mock fs to return the real file so the loader finds it
vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs')
  return {
    ...actual,
    existsSync: () => true,
    readFileSync: (p: string, enc?: string) => actual.readFileSync(gridPath, enc ?? 'utf-8'),
  }
})

describe('eclipseGrid', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('findNearestEclipsePoint returns a point near Reykjavik', async () => {
    const { loadEclipseGrid, findNearestEclipsePoint } = await import(
      '../../../server/utils/eclipseGrid'
    )
    const grid = await loadEclipseGrid()
    const match = findNearestEclipsePoint(grid, 64.15, -21.94)
    expect(match).not.toBeNull()
    expect(match!.point.totality_start).toMatch(/^2026-08-12T17:/)
    expect(match!.point.lat).toBeGreaterThan(63)
    expect(match!.point.lat).toBeLessThan(65)
  })

  it('findNearestEclipsePoint returns null for coordinates far from Iceland', async () => {
    const { loadEclipseGrid, findNearestEclipsePoint } = await import(
      '../../../server/utils/eclipseGrid'
    )
    const grid = await loadEclipseGrid()
    const match = findNearestEclipsePoint(grid, 0, 0)
    expect(match).toBeNull()
  })

  it('caches the grid across calls', async () => {
    const { loadEclipseGrid } = await import('../../../server/utils/eclipseGrid')
    const g1 = await loadEclipseGrid()
    const g2 = await loadEclipseGrid()
    expect(g1).toBe(g2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/server/utils/eclipseGrid.test.ts --hookTimeout=60000`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the loader**

Create `server/utils/eclipseGrid.ts`:

```ts
/**
 * Eclipse-grid loader. The grid at public/eclipse-data/grid.json (~135 KB,
 * 588 points at 0.15° spacing) carries Skyfield-computed totality geometry
 * per point: totality_start/end, duration, sun altitude/azimuth. The
 * horizon-grid.json pipeline consumes sun altitude/azimuth from this grid
 * but drops the ISO timestamps, so the horizon-check API loads it
 * separately to return totality_start in responses.
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export interface EclipsePoint {
  lat: number
  lng: number
  sun_altitude: number
  sun_azimuth: number
  totality_start: string
  totality_end: string
  duration_seconds: number
}

export interface EclipseGrid {
  points: EclipsePoint[]
}

/** Max snap distance in degrees (~5 km at 65°N, wider than horizon grid's
 *  3 km because eclipse grid is coarser at 0.15° spacing). */
const MAX_SNAP_DIST_DEG = 0.12

let cached: EclipseGrid | null = null
let loading: Promise<EclipseGrid> | null = null

async function tryFileSystem(): Promise<EclipseGrid | null> {
  const path = join(process.cwd(), 'public', 'eclipse-data', 'grid.json')
  if (!existsSync(path)) return null
  const raw = JSON.parse(readFileSync(path, 'utf-8'))
  const pts: EclipsePoint[] = raw.points
    .filter((p: any) => p.totality_start && p.sun_altitude != null && p.sun_azimuth != null)
  return { points: pts }
}

async function tryNitroStorage(): Promise<EclipseGrid | null> {
  try {
    const data = await useStorage('assets:server:eclipse-data').getItem('grid.json')
    if (!data) return null
    const raw = typeof data === 'string' ? JSON.parse(data) : data as any
    const pts: EclipsePoint[] = raw.points
      .filter((p: any) => p.totality_start && p.sun_altitude != null && p.sun_azimuth != null)
    return { points: pts }
  } catch { return null }
}

export async function loadEclipseGrid(): Promise<EclipseGrid> {
  if (cached) return cached
  if (loading) return loading
  loading = (async () => {
    const fs = await tryFileSystem()
    if (fs) { cached = fs; return fs }
    const nitro = await tryNitroStorage()
    if (nitro) { cached = nitro; return nitro }
    throw new Error('eclipse grid unavailable')
  })()
  try { return await loading } finally { loading = null }
}

/**
 * Nearest-point lookup. Simple linear scan (N=588 is cheap). Returns null
 * if the nearest point is further than MAX_SNAP_DIST_DEG — we don't want
 * to attribute totality to points outside the path.
 */
export function findNearestEclipsePoint(
  grid: EclipseGrid,
  lat: number,
  lng: number,
): { point: EclipsePoint; distDeg: number } | null {
  let nearest: EclipsePoint | null = null
  let bestSq = Infinity
  for (const p of grid.points) {
    const d = (p.lat - lat) ** 2 + (p.lng - lng) ** 2
    if (d < bestSq) { bestSq = d; nearest = p }
  }
  if (!nearest) return null
  const distDeg = Math.sqrt(bestSq)
  if (distDeg > MAX_SNAP_DIST_DEG) return null
  return { point: nearest, distDeg }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/server/utils/eclipseGrid.test.ts --hookTimeout=60000`
Expected: PASS — all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add server/utils/eclipseGrid.ts tests/server/utils/eclipseGrid.test.ts
git commit -m "feat(server): add eclipse-grid loader with nearest-point lookup

Mirrors the horizonGrid.ts cache+load pattern but for the smaller
eclipse-data/grid.json, which carries totality_start timestamps the
horizon grid drops. Used by the horizon-check endpoint to surface
totality_start in its response (needed for the upcoming sun-arc
map overlay).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Extend horizon-check API with `totality_start`

**Files:**
- Modify: `app/types/horizon.ts`
- Modify: `server/api/horizon/check.post.ts`
- Test: `tests/server/api/horizon/check.test.ts` (modify or add assertion)

- [ ] **Step 1: Update the response type**

Find the `HorizonCheckResponse` interface in `app/types/horizon.ts`. Add one field:

```ts
export interface HorizonCheckResponse {
  // ... existing fields
  totality_start?: string  // ISO 8601. Absent when in_totality_path === false or grid miss.
}
```

- [ ] **Step 2: Update the handler**

Modify `server/api/horizon/check.post.ts`. At the top, add the import:

```ts
import { findNearestEclipsePoint, loadEclipseGrid } from '../../utils/eclipseGrid'
```

Inside the handler, AFTER the `findNearestGridPoint(grid, ...)` block that produces `point`, add:

```ts
// Look up totality_start from the eclipse grid (separate asset from the
// horizon grid, which doesn't carry ISO timestamps).
let totalityStart: string | undefined
try {
  const eclipseGrid = await loadEclipseGrid()
  const eMatch = findNearestEclipsePoint(eclipseGrid, body.lat, body.lng)
  totalityStart = eMatch?.point.totality_start
} catch (e) {
  console.warn('[Horizon] Eclipse grid unavailable, skipping totality_start:', e)
}
```

Then in the `response` object literal, add:

```ts
const response: HorizonCheckResponse = {
  // ... existing fields
  totality_start: totalityStart,
}
```

- [ ] **Step 3: Add/extend server test**

Locate an existing test in `tests/server/api/horizon/` (likely `check.post.test.ts` or similar). If one exists, add an assertion that the successful response includes `totality_start` as a string. If none exists, skip this step (the frontend integration tests cover the wiring).

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/server --hookTimeout=60000`
Expected: PASS — all server tests green.

- [ ] **Step 5: Commit**

```bash
git add app/types/horizon.ts server/api/horizon/check.post.ts tests/server/api/horizon/
git commit -m "feat(horizon): return totality_start in check response

Adds totality_start (ISO timestamp) to /api/horizon/check by looking
up the clicked point in the eclipse-grid alongside the existing
horizon-grid lookup. Enables the sun-arc map overlay to anchor its
trajectory around the right totality time for dynamic horizon check
points (spot markers already have the value from the DB).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Extend mapbox mock with project/unproject

**Files:**
- Modify: `tests/mocks/mapbox-gl.ts`

The `sunArc` unit test depends on `map.project(lngLat)` and `map.unproject([x, y])`. The current mock has neither.

- [ ] **Step 1: Add project/unproject to the Map mock**

Open `tests/mocks/mapbox-gl.ts`. Add to the `Map` class:

```ts
export class Map {
  // ... existing
  // Simple deterministic projection for tests: 1° = 100 pixels around
  // the current center. Good enough to verify arc geometry.
  project(lnglat: [number, number] | { lng: number; lat: number }) {
    const c = this.getCenter()
    const lng = Array.isArray(lnglat) ? lnglat[0] : lnglat.lng
    const lat = Array.isArray(lnglat) ? lnglat[1] : lnglat.lat
    return { x: (lng - c.lng) * 100, y: -(lat - c.lat) * 100 }
  }
  unproject(point: [number, number] | { x: number; y: number }) {
    const c = this.getCenter()
    const x = Array.isArray(point) ? point[0] : point.x
    const y = Array.isArray(point) ? point[1] : point.y
    return { lng: c.lng + x / 100, lat: c.lat - y / 100 }
  }
}
```

- [ ] **Step 2: Run all existing unit tests to verify no regression**

Run: `npx vitest run tests/unit --hookTimeout=60000`
Expected: PASS — all existing tests still green.

- [ ] **Step 3: Commit**

```bash
git add tests/mocks/mapbox-gl.ts
git commit -m "test: add project/unproject to mapbox-gl mock

Deterministic planar projection (1° = 100 px) so sunArc unit tests
can exercise the screen-space → geographic conversion path.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Implement `sunArc` utility

**Files:**
- Create: `app/utils/sunArc.ts`
- Test: `tests/unit/utils/sunArc.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/utils/sunArc.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { attachSunArc } from '../../../app/utils/sunArc'

function makeMap() {
  const layers: string[] = []
  const sources: string[] = []
  return {
    _zoom: 7,
    _zoomHandlers: [] as Array<() => void>,
    project(lnglat: any) {
      const lng = Array.isArray(lnglat) ? lnglat[0] : lnglat.lng
      const lat = Array.isArray(lnglat) ? lnglat[1] : lnglat.lat
      return { x: lng * 100, y: -lat * 100 }
    },
    unproject(point: any) {
      const x = Array.isArray(point) ? point[0] : point.x
      const y = Array.isArray(point) ? point[1] : point.y
      return { lng: x / 100, lat: -y / 100 }
    },
    getZoom() { return this._zoom },
    on(event: string, fn: () => void) {
      if (event === 'zoom') this._zoomHandlers.push(fn)
    },
    off: vi.fn(),
    addSource: vi.fn((id: string) => { sources.push(id) }),
    removeSource: vi.fn((id: string) => { sources.splice(sources.indexOf(id), 1) }),
    addLayer: vi.fn((spec: { id: string }) => { layers.push(spec.id) }),
    removeLayer: vi.fn((id: string) => { layers.splice(layers.indexOf(id), 1) }),
    getSource(id: string) { return sources.includes(id) ? { setData: vi.fn() } : undefined },
    getLayer(id: string) { return layers.includes(id) ? {} : undefined },
    fireZoom(newZoom: number) { this._zoom = newZoom; for (const h of this._zoomHandlers) h() },
  }
}

const VALID_PROPS = {
  lat: 64.15, lng: -21.94,
  sunAzimuth: 250, sunAltitude: 24,
  totalityStartIso: '2026-08-12T17:45:00Z',
  id: 'test-1',
}

describe('attachSunArc', () => {
  it('adds a geojson source and line layer with the expected ids', () => {
    const map = makeMap()
    attachSunArc(map as any, VALID_PROPS)
    expect(map.addSource).toHaveBeenCalledWith('sun-arc-test-1', expect.any(Object))
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({ id: 'sun-arc-line-test-1' }))
  })

  it('registers a zoom handler', () => {
    const map = makeMap()
    attachSunArc(map as any, VALID_PROPS)
    expect(map._zoomHandlers).toHaveLength(1)
  })

  it('detach() removes source, layer, and unregisters zoom handler', () => {
    const map = makeMap()
    const detach = attachSunArc(map as any, VALID_PROPS)
    detach()
    expect(map.removeLayer).toHaveBeenCalledWith('sun-arc-line-test-1')
    expect(map.removeSource).toHaveBeenCalledWith('sun-arc-test-1')
    expect(map.off).toHaveBeenCalledWith('zoom', expect.any(Function))
  })

  it('creates HTML markers for sun disk + 6 ticks + 1 callout (totality tick replaced by disk)', () => {
    const map = makeMap()
    attachSunArc(map as any, VALID_PROPS)
    // Markers append DOM elements to document.body via Mapbox (mocked).
    // Count the elements by class.
    const sun = document.querySelectorAll('.sun-arc-sun')
    const ticks = document.querySelectorAll('.sun-arc-tick')
    const callouts = document.querySelectorAll('.sun-arc-callout')
    expect(sun).toHaveLength(1)
    expect(ticks).toHaveLength(6)  // 17:30, 17:35, 17:40, 17:50, 17:55, 18:00
    expect(callouts).toHaveLength(1)
  })

  it('zoom event triggers geojson source reload via setData', () => {
    const map = makeMap()
    attachSunArc(map as any, VALID_PROPS)
    const source = map.getSource('sun-arc-test-1') as any
    map.fireZoom(9)
    expect(source.setData).toHaveBeenCalled()
  })

  it('noop detach() is safe to call twice', () => {
    const map = makeMap()
    const detach = attachSunArc(map as any, VALID_PROPS)
    detach()
    expect(() => detach()).not.toThrow()
  })
})
```

- [ ] **Step 2: Run tests — they should fail (no module)**

Run: `npx vitest run tests/unit/utils/sunArc.test.ts --hookTimeout=60000`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the utility**

Create `app/utils/sunArc.ts`:

```ts
/**
 * Attach a sun-direction trajectory arc to a Mapbox map.
 *
 * Owns one geojson line layer (the arc) + one sun-disk HTML marker
 * + one callout HTML marker + N tick HTML markers. The arc's visual
 * radius is fixed at ARC_RADIUS_PX screen pixels so it reads the same
 * at every zoom; on map zoom the source and all marker positions are
 * recomputed via project/unproject.
 *
 * Call sites (see design spec 2026-04-19-sun-arc-design.md):
 *   - /map focused spot      id = `spot-${slug}`
 *   - /map horizon-check     id = `horizon-check`
 *   - /spots/[slug] map      id = `spot-${slug}`
 */

import mapboxgl from 'mapbox-gl'
import type { Map as MapboxMap, Marker as MapboxMarker } from 'mapbox-gl'
import { computeSunTrajectoryByTime } from './solar'
import type { SunTrajectoryPoint } from './solar'

export interface SunArcProps {
  lat: number
  lng: number
  sunAzimuth: number
  sunAltitude: number
  totalityStartIso: string
  id: string
}

const ARC_RADIUS_PX = 120
const HALF_WINDOW_HOURS = 0.25  // ±15 min
const STEP_MINUTES = 1
const TICK_STEP_MINUTES = 5

function projectOffset(
  map: MapboxMap,
  lat: number, lng: number,
  azimuth: number,
): { lng: number; lat: number } {
  const origin = map.project([lng, lat] as any)
  const azRad = azimuth * Math.PI / 180
  const dx = Math.sin(azRad) * ARC_RADIUS_PX
  const dy = -Math.cos(azRad) * ARC_RADIUS_PX
  const ll = map.unproject([origin.x + dx, origin.y + dy] as any)
  return { lng: (ll as any).lng, lat: (ll as any).lat }
}

function trajectoryToLineFeature(
  map: MapboxMap,
  props: SunArcProps,
  trajectory: SunTrajectoryPoint[],
): GeoJSON.Feature<GeoJSON.LineString> {
  const coords: [number, number][] = trajectory.map(p => {
    const ll = projectOffset(map, props.lat, props.lng, p.azimuth)
    return [ll.lng, ll.lat]
  })
  return {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: coords },
    properties: {},
  }
}

function createSunMarker(): MapboxMarker {
  const el = document.createElement('div')
  el.className = 'sun-arc-sun'
  el.style.cssText = `
    width: 16px; height: 16px; border-radius: 50%;
    background: #f59e0b;
    box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.3);
    pointer-events: none;
  `
  return new mapboxgl.Marker({ element: el, anchor: 'center' })
}

function createCalloutMarker(text: string): MapboxMarker {
  const el = document.createElement('div')
  el.className = 'sun-arc-callout'
  el.style.cssText = `
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: rgb(var(--accent-strong));
    white-space: nowrap;
    pointer-events: none;
    transform: translateY(-22px);
  `
  el.textContent = text
  return new mapboxgl.Marker({ element: el, anchor: 'bottom' })
}

function createTickMarker(timeLabel: string | null): MapboxMarker {
  const el = document.createElement('div')
  el.className = 'sun-arc-tick'
  el.style.cssText = `
    width: 6px; height: 6px; border-radius: 50%;
    background: rgb(var(--accent-strong));
    opacity: 0.7;
    pointer-events: none;
    position: relative;
  `
  if (timeLabel) {
    const label = document.createElement('span')
    label.textContent = timeLabel
    label.style.cssText = `
      position: absolute; left: 10px; top: -4px;
      font-family: 'IBM Plex Mono', monospace;
      font-size: 8px; white-space: nowrap;
      color: rgb(var(--ink-3));
    `
    el.appendChild(label)
  }
  return new mapboxgl.Marker({ element: el, anchor: 'center' })
}

function formatUtc(utcHours: number): string {
  const h = Math.floor(utcHours)
  const m = Math.round((utcHours - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function attachSunArc(map: MapboxMap, props: SunArcProps): () => void {
  // Resolve totality utc hours from the ISO timestamp.
  const d = new Date(props.totalityStartIso)
  const totalityUtcHours = d.getUTCHours()
    + d.getUTCMinutes() / 60
    + d.getUTCSeconds() / 3600

  const trajectory = computeSunTrajectoryByTime(
    props.lat, props.lng,
    totalityUtcHours - HALF_WINDOW_HOURS,
    totalityUtcHours + HALF_WINDOW_HOURS,
    STEP_MINUTES,
  )

  const sourceId = `sun-arc-${props.id}`
  const layerId = `sun-arc-line-${props.id}`

  // --- Arc line (source + layer) ---
  map.addSource(sourceId, {
    type: 'geojson',
    data: trajectoryToLineFeature(map, props, trajectory),
  })
  map.addLayer({
    id: layerId,
    type: 'line',
    source: sourceId,
    paint: {
      'line-color': ['literal', 'rgb(var(--accent-strong))'] as any,
      'line-width': 1.2,
      'line-dasharray': [2, 2],
      'line-opacity': 0.55,
    },
    layout: { 'line-cap': 'round', 'line-join': 'round' },
  })

  // --- Sun disk (at totality midpoint) ---
  // Find the trajectory point closest to totalityUtcHours
  let sunIdx = 0
  let bestDiff = Infinity
  for (let i = 0; i < trajectory.length; i++) {
    const diff = Math.abs(trajectory[i]!.utcHours - totalityUtcHours)
    if (diff < bestDiff) { bestDiff = diff; sunIdx = i }
  }
  const sunPt = trajectory[sunIdx]!
  const sunLngLat = projectOffset(map, props.lat, props.lng, sunPt.azimuth)
  const sunMarker = createSunMarker().setLngLat([sunLngLat.lng, sunLngLat.lat]).addTo(map)

  // --- Callout (time + altitude) ---
  const calloutText = `${formatUtc(totalityUtcHours)} UTC · ${Math.round(props.sunAltitude)}°`
  const calloutMarker = createCalloutMarker(calloutText)
    .setLngLat([sunLngLat.lng, sunLngLat.lat])
    .addTo(map)

  // --- Tick markers at 5-min intervals, skipping the totality tick ---
  const tickMarkers: MapboxMarker[] = []
  for (let i = 0; i < trajectory.length; i++) {
    const pt = trajectory[i]!
    const minute = Math.round(pt.utcHours * 60)
    if (minute % TICK_STEP_MINUTES !== 0) continue
    if (i === sunIdx) continue  // Totality tick replaced by sun disk
    // Endpoints get labels, intermediates are dots only
    const isEndpoint = i === 0 || i === trajectory.length - 1
    const label = isEndpoint ? formatUtc(pt.utcHours) : null
    const tickLngLat = projectOffset(map, props.lat, props.lng, pt.azimuth)
    const marker = createTickMarker(label)
      .setLngLat([tickLngLat.lng, tickLngLat.lat])
      .addTo(map)
    tickMarkers.push(marker)
  }

  // --- Zoom handler: recompute everything at the new zoom ---
  const zoomHandler = () => {
    const src = map.getSource(sourceId) as any
    if (src?.setData) {
      src.setData(trajectoryToLineFeature(map, props, trajectory))
    }
    const sun = projectOffset(map, props.lat, props.lng, sunPt.azimuth)
    sunMarker.setLngLat([sun.lng, sun.lat])
    calloutMarker.setLngLat([sun.lng, sun.lat])
    let tickIdx = 0
    for (let i = 0; i < trajectory.length; i++) {
      const pt = trajectory[i]!
      const minute = Math.round(pt.utcHours * 60)
      if (minute % TICK_STEP_MINUTES !== 0) continue
      if (i === sunIdx) continue
      const ll = projectOffset(map, props.lat, props.lng, pt.azimuth)
      tickMarkers[tickIdx]!.setLngLat([ll.lng, ll.lat])
      tickIdx++
    }
  }
  map.on('zoom', zoomHandler)

  // --- Detach closure ---
  let detached = false
  return function detach() {
    if (detached) return
    detached = true
    map.off('zoom', zoomHandler)
    sunMarker.remove()
    calloutMarker.remove()
    for (const m of tickMarkers) m.remove()
    try {
      if (map.getLayer(layerId)) map.removeLayer(layerId)
      if (map.getSource(sourceId)) map.removeSource(sourceId)
    } catch { /* ignore */ }
  }
}
```

**Note on `line-color`:** Mapbox's paint-property parser accepts CSS color strings, but NOT `rgb(var(--…))` with custom properties. The `['literal', 'rgb(var(--accent-strong))']` expression is one attempt; if Mapbox rejects it at runtime during browser verification, fall back to two fixed hex values and select in theme swap: `'#fbbf24'` in dark, `'#9a3412'` in light, applied in the `colorMode` watcher in `EclipseMap.vue` via `setPaintProperty('sun-arc-line-{id}', 'line-color', ...)`. Flag this if it happens.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/utils/sunArc.test.ts --hookTimeout=60000`
Expected: PASS — 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add app/utils/sunArc.ts tests/unit/utils/sunArc.test.ts
git commit -m "feat(map): sunArc utility — trajectory arc overlay

Pure attach/detach utility that adds a sun-direction trajectory
arc to a Mapbox map for one location. Owns a geojson line layer +
sun disk + callout + N tick markers. Recomputes on zoom to hold a
120-px visual radius at every zoom level. Called by EclipseMap
(focused spot), map.vue (horizon check), and SpotLocationMap.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Integrate into `EclipseMap` (focused spot on /map)

**Files:**
- Modify: `app/components/EclipseMap.vue`

Arc follows the currently-open spot popup: attach when a popup opens, detach when it closes. Only one arc at a time.

- [ ] **Step 1: Read current spot-popup lifecycle**

In `app/components/EclipseMap.vue`, find `updateSpotMarkers`. Each spot creates a `popup` and attaches via `.setPopup(popup)`. Mapbox popups emit `open` and `close` events when the marker is clicked. Confirm there's no existing listener on `popup.on('open'|'close')`.

- [ ] **Step 2: Add arc-ownership state + helpers**

Near the top of the `<script setup>` section (after the existing `spotMarkers`/`stationMarkers` Maps are declared), add:

```ts
import { attachSunArc } from '~/utils/sunArc'
import type { SunArcProps } from '~/utils/sunArc'

// The arc is a single-slot resource: only one visible at a time, owned
// either by the focused spot popup or by an external caller (the
// horizon-check flow in map.vue). attachArc() detaches any prior arc
// before attaching the new one.
let detachCurrentArc: (() => void) | null = null
let currentArcOwner: string | null = null  // 'spot:<slug>' or 'external:<id>'

function attachArc(owner: string, props: SunArcProps) {
  if (!map) return
  if (currentArcOwner === owner) return  // no-op if same owner
  detachCurrentArc?.()
  detachCurrentArc = attachSunArc(map, props)
  currentArcOwner = owner
}

function detachArc(owner: string) {
  if (currentArcOwner !== owner) return  // only the current owner can detach
  detachCurrentArc?.()
  detachCurrentArc = null
  currentArcOwner = null
}
```

- [ ] **Step 3: Wire popup open/close to attach/detach**

In `updateSpotMarkers`, inside the `if (!cached)` branch — **after** the popup is created but **before** `.addTo(map)` — add the listeners:

```ts
popup.on('open', () => {
  if (spot.sun_azimuth == null || spot.sun_altitude == null || !spot.totality_start) return
  attachArc(`spot:${spot.slug}`, {
    lat: spot.lat, lng: spot.lng,
    sunAzimuth: spot.sun_azimuth,
    sunAltitude: spot.sun_altitude,
    totalityStartIso: spot.totality_start,
    id: `spot-${spot.slug}`,
  })
})
popup.on('close', () => {
  detachArc(`spot:${spot.slug}`)
})
```

- [ ] **Step 4: Expose attach/detach via `defineExpose`**

Find the existing `defineExpose({ map: mapExposed })` block near the end of `<script setup>`. Expand it:

```ts
defineExpose({ map: mapExposed, attachArc, detachArc })
```

This lets `map.vue` drive the arc for horizon-check without reaching into internals.

- [ ] **Step 5: Clean up on theme swap**

In the `watch(() => colorMode.value, ...)` block that already tears down markers on style swap, add:

```ts
detachCurrentArc?.()
detachCurrentArc = null
currentArcOwner = null
```

Do this **before** the `map.setStyle(...)` call, so the arc doesn't leak into the torn-down layer set.

- [ ] **Step 6: Clean up on component unmount**

In the existing `onUnmounted` that removes markers, add:

```ts
detachCurrentArc?.()
```

- [ ] **Step 7: Run unit tests — no regressions**

Run: `npx vitest run tests/unit --hookTimeout=60000`
Expected: PASS.

- [ ] **Step 8: Manual browser check (ask the user)**

Tell the user: "Please open `/map` in your browser, click a spot marker to open its popup, and confirm the sun arc appears pointing WSW from the spot. Close the popup and confirm the arc disappears. Open a different spot — the arc should swap. Also verify it survives a theme swap (dark ↔ light). Reply 'looks good' or describe any issue."

**Wait for user confirmation before proceeding.**

- [ ] **Step 9: Commit**

```bash
git add app/components/EclipseMap.vue
git commit -m "feat(map): sun-direction arc follows focused spot popup

Attach SunArc when a spot popup opens, detach on close. Exposes
attachArc/detachArc via defineExpose so external callers (the
horizon-check flow in map.vue) can drive the arc through the same
single-slot ownership mechanism. Cleanup wired into theme swap +
unmount.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Wire horizon-check arc in `map.vue`

**Files:**
- Modify: `app/components/DynamicHorizonCheck.vue`
- Modify: `app/pages/map.vue`

Horizon-check arc is driven by the API response. `DynamicHorizonCheck` already fetches the data — needs to emit the response upward.

- [ ] **Step 1: Emit `@result` from DynamicHorizonCheck**

Open `app/components/DynamicHorizonCheck.vue`. Find the existing `defineEmits`. Add `result` to the emits list:

```ts
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'result', data: HorizonCheckResponse): void
}>()
```

Find the `$fetch<HorizonCheckResponse>('/api/horizon/check', ...)` call near line 37 of the file. Immediately after `result.value = data` (the next line), add:

```ts
emit('result', data)
```

- [ ] **Step 2: Listen for `@result` in map.vue and drive the arc**

Open `app/pages/map.vue`. Find the `<DynamicHorizonCheck>` usage in the template:

```html
<DynamicHorizonCheck
  :key="`${horizonCheckCoords.lat},${horizonCheckCoords.lng}`"
  :lat="horizonCheckCoords.lat"
  :lng="horizonCheckCoords.lng"
  @close="closeHorizonCheck"
/>
```

Add `@result="onHorizonResult"`:

```html
<DynamicHorizonCheck
  :key="`${horizonCheckCoords.lat},${horizonCheckCoords.lng}`"
  :lat="horizonCheckCoords.lat"
  :lng="horizonCheckCoords.lng"
  @close="closeHorizonCheck"
  @result="onHorizonResult"
/>
```

In the `<script setup>` section, add the handler. Place it next to `closeHorizonCheck`:

```ts
import type { HorizonCheckResponse } from '~/types/horizon'

function onHorizonResult(data: HorizonCheckResponse) {
  if (!data.in_totality_path || data.sun_altitude == null || data.sun_azimuth == null || !data.totality_start) return
  if (!horizonCheckCoords.value) return
  const mapComponent = eclipseMapRef.value
  if (!mapComponent?.attachArc) return
  mapComponent.attachArc('external:horizon-check', {
    lat: horizonCheckCoords.value.lat,
    lng: horizonCheckCoords.value.lng,
    sunAzimuth: data.sun_azimuth,
    sunAltitude: data.sun_altitude,
    totalityStartIso: data.totality_start,
    id: 'horizon-check',
  })
}
```

- [ ] **Step 3: Detach arc on horizon-check close**

Still in `map.vue`, find `closeHorizonCheck`. Add at the start:

```ts
function closeHorizonCheck() {
  eclipseMapRef.value?.detachArc?.('external:horizon-check')
  horizonCheckCoords.value = null
  if (horizonMarker) {
    horizonMarker.remove()
    horizonMarker = null
  }
}
```

- [ ] **Step 4: Run unit tests — no regressions**

Run: `npx vitest run tests/unit --hookTimeout=60000`
Expected: PASS.

- [ ] **Step 5: Manual browser check (ask the user)**

Tell the user: "Please open `/map`, click anywhere on land inside the totality path to trigger horizon-check. Confirm the sun arc appears pointing WSW from the crosshair. Close the horizon panel — arc should disappear. Click a spot marker while horizon-check is active — the arc should swap to the spot. Reply 'looks good' or describe any issue."

**Wait for user confirmation before proceeding.**

- [ ] **Step 6: Commit**

```bash
git add app/components/DynamicHorizonCheck.vue app/pages/map.vue
git commit -m "feat(map): sun-direction arc for horizon-check clicks

DynamicHorizonCheck now emits its API response via @result; map.vue
receives it and drives the shared arc slot on EclipseMap through
the exposed attachArc / detachArc methods. Single-slot ownership:
clicking a spot marker while horizon-check is active swaps the arc
to that spot; closing the horizon panel detaches cleanly.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Documentation sync

**Files:**
- Modify: `CLAUDE.md` (both root `D:\Projects\eclipsechase\CLAUDE.md` and project `D:\Projects\eclipsechase\eclipse-chaser\CLAUDE.md`)

- [ ] **Step 1: Read current utils + server-utils sections**

Locate in both CLAUDE.md files the `app/utils/` block and the `server/utils/` block.

- [ ] **Step 2: Add new entries**

In `app/utils/` add:

```
│   │   ├── sunArc.ts                # Attach sun-direction trajectory arc to a Mapbox map
```

(Preserve alphabetical order — insert between `solar.ts` and `traffic.ts`, or just before `traffic.ts`.)

In `server/utils/` add:

```
│   │   ├── eclipseGrid.ts           # Load + nearest-point lookup for eclipse-data/grid.json (totality_start)
```

Apply the same change to both the root and project-local CLAUDE.md.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add sunArc + eclipseGrid to CLAUDE.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Final verification + push

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run tests/unit tests/server --hookTimeout=60000`
Expected: all green, no regressions against pre-feature counts.

- [ ] **Step 2: Confirm with the user that both /map flows work**

Ask: "All unit/server tests pass. Can you confirm end-to-end in the browser?

1. Clicking a spot marker on /map attaches the arc pointing WSW; closing the popup detaches.
2. Clicking the map (Pro-gated) triggers horizon-check + arc; closing the panel detaches.
3. Opening a spot popup while horizon-check is active swaps the arc; closing the spot popup detaches.
4. Theme swap (light ↔ dark) preserves the arc.
5. Zooming in/out keeps the arc at roughly the same screen size.
6. The spot detail page still shows its existing sun-direction wedge unchanged (no regression).

Reply 'all good' or list what's broken."

**Wait for user confirmation.**

- [ ] **Step 3: Push**

```bash
git push origin main
```

---

## Risks & things to verify during implementation

- **`line-color` CSS-var parsing in Mapbox paint:** Task 5 uses `['literal', 'rgb(var(--accent-strong))']`. Mapbox GL has historically not resolved CSS custom properties in paint values. If browser verification shows a grey/black line instead of amber, switch to a hex string (`'#fbbf24'` in dark, `'#9a3412'` in light) and set it via `setPaintProperty('sun-arc-line-<id>', 'line-color', ...)` inside the component's `colorMode` watcher. Flag this in the Task 5 step "Manual browser check" callback.
- **Line layer ordering:** `map.addLayer({...})` without a `beforeId` appends above all existing layers, which is fine — the arc line should render above the eclipse-path fill but below HTML markers (which are DOM-overlaid anyway). If a visual issue surfaces, pass `map.getLayer('spot-marker-layer')?.id` as the second argument (no such layer exists today — HTML markers are not layers — so the argument should stay omitted).
- **Zoom event firing during theme swap:** `map.setStyle` may fire spurious zoom events during reflow. The detach path in Task 6 explicitly detaches before `setStyle` — this is intentional.
- **`totality_start` absent for points just inside the totality path:** the eclipse grid has 0.15° spacing (~17 km at 65°N); points just inside the path may snap to an eclipse grid point outside the path with no totality. Task 2's nearest-point function rejects snaps past `MAX_SNAP_DIST_DEG`; affected clicks won't have an arc, which is correct.

## Self-review notes (already applied)

- Marker repositioning on zoom is explicit in Task 5's `zoomHandler` — not just the geojson source.
- Tick count is 6 (not 7), because the 17:45 totality tick is replaced by the sun disk.
- Unique-id convention documented in Task 5's header comment + matched by call sites in Tasks 6 and 7.
- `DynamicHorizonCheck` emits `@result` — Task 7 Step 1.
- Scope narrowed from three to two call sites: `SpotLocationMap.vue` already renders a sun-direction wedge + Mapbox symbol label; overlaying the new arc there would duplicate. Spot detail page is untouched.
