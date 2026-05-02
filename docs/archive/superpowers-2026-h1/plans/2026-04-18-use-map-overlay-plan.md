# `useMapOverlay` Composable Refactor Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Must be run in an environment where a real browser can load `/map` end-to-end.** The preview sandbox used in the parent refactor session cannot render Mapbox tiles, so visual verification of marker rendering, popup interaction, camera lightbox, and road polylines is mandatory here — not optional.

**Goal:** Extract the traffic + camera overlay logic in `app/pages/map.vue` (~470 lines combined) into a reusable `useMapOverlay<T>()` composable, so each overlay's page-level code is a short call with fetch + build callbacks. Also move the camera lightbox out of 150 lines of inline popup HTML + two `window.*` globals into a real Vue component.

**Non-goal:** The horizon single-marker click handler (`handleMapClick` + `horizonMarker`) stays inline. It's a different pattern (single marker, no fetch, no zoom-visibility) and forcing it through the overlay composable would hurt clarity. See "Explicit decisions" below.

**Architecture:** A `useMapOverlay` composable owns: data fetch (lazy, cached), marker add/remove, zoom-handler lifecycle, and on/off watcher. Callers provide `fetch()`, `buildMarker()`, and pass the `show*` ref + map instance. The `CameraLightbox.vue` component replaces the `window.__camOpen` / `window.__camNav` global bridge with a normal Vue ref + single-instance overlay.

**Spec:** None — this is a direct extraction of existing behavior. No new features.

**Parent refactor session:** Round 6 of the 2026-04-18 codebase review (`/simplify` follow-up). Commits `6442cdd`..`58d937e`.

---

## Current state inventory

All line numbers reference `app/pages/map.vue` at commit `58d937e` (HEAD at plan-write time).

### Traffic overlay (~260 lines)

- `showTraffic` ref, `trafficData`, `segmentsData`, `roadsGeojson` state refs — lines 131–134
- `trafficMarkers`, `trafficZoomHandler` — lines 136–137
- `getTrafficColor`, `TRAFFIC_LABELS` — lines 139–163
- `addTrafficMarkers(map)` — lines 165–218 (includes 60-line popup template string)
- `buildEnrichedRoads()` — lines 222–258 (joins roads.geojson with segment conditions)
- `addRoadPolylines(map)` — lines 266–332 (adds map source + 2 layers + 3 event handlers)
- `removeRoadPolylines(map)` — lines 334–346
- `conditionPriority`, `removeTrafficMarkers` — lines 348–366
- `watch(showTraffic)` — lines 371–390

### Camera overlay (~200 lines)

- `window.__camNav` + `window.__camOpen` globals — lines 393–488 (the `__camOpen` block alone is 75 lines of lightbox DOM)
- `camCurrentIndex`, `camImageRegistry` state — lines 393–394
- `showCameras`, `cameraData`, `cameraMarkers`, `cameraZoomHandler` — lines 490–493
- `addCameraMarkers(map)` — lines 495–585 (includes carousel HTML with `onclick="window.__camNav(...)"`)
- `removeCameraMarkers` — lines 587–596
- `watch(showCameras)` — lines 598–610

### Shared plumbing already extracted (parent session, round 6)

- `app/utils/mapMarkers.ts` — `computeMinZooms`, `setMarkerVisibility`, `OVERLAY_BUCKETS`
- Both overlays already use the consolidated helpers via `overlayMinZooms()` and `applyOverlayVisibility()` thin wrappers.

### Horizon overlay (stays inline)

- `handleMapClick`, `horizonMarker`, `closeHorizonCheck` — lines 681–720. Single marker, no collection, no fetch, no zoom-visibility. Leave as-is.

---

## Design

### `useMapOverlay<T>()` signature

```typescript
// app/composables/useMapOverlay.ts

export interface OverlayMarkerEntry {
  marker: mapboxgl.Marker
  minZoom: number
}

export interface UseMapOverlayOptions<T> {
  /** Reactive toggle — show/hide the overlay. */
  active: Ref<boolean>
  /** The shared EclipseMap component ref exposing `.map`. */
  mapRef: Ref<{ map: mapboxgl.Map | null } | null>
  /** Called once on first activation; result is cached in the composable. */
  fetchData: () => Promise<T[]>
  /** Builds a marker for a single item. Composable wires it into the
   *  map and tracks its minZoom for zoom-visibility. Return `null` to
   *  skip an item. */
  buildMarker: (item: T, ctx: { map: mapboxgl.Map; minZoom: number }) => mapboxgl.Marker | null
  /** Optional one-time side-effect on activation, after markers are
   *  added — e.g. adding a map source/layer. Paired with `onDeactivate`
   *  for cleanup. */
  onActivate?: (map: mapboxgl.Map, data: T[]) => void | Promise<void>
  onDeactivate?: (map: mapboxgl.Map) => void
}

export function useMapOverlay<T extends { lat: number; lng: number }>(
  opts: UseMapOverlayOptions<T>,
): {
  data: Ref<T[] | null>
  markers: Ref<OverlayMarkerEntry[]>
}
```

### What the composable owns

1. **Fetch caching** — calls `fetchData()` on first activation, caches the result in `data` ref for subsequent toggles.
2. **Marker lifecycle** — computes `OVERLAY_BUCKETS` minZooms, calls `buildMarker` per item, tracks the returned marker + minZoom in `markers`, `.remove()`s them on deactivate.
3. **Zoom-visibility** — registers a `map.on('zoom', ...)` handler that runs `setMarkerVisibility(markers.value, zoom)`; removes it on deactivate.
4. **Hook pairs** — fires `onActivate(map, data)` after markers are added and `onDeactivate(map)` before markers are removed, so callers can add map sources/layers/event handlers that live alongside the markers (traffic uses this for the road-polylines layer).
5. **Watcher + unmount cleanup** — `watch(opts.active)` toggles the lifecycle; `onScopeDispose` ensures cleanup if the caller unmounts while active.

### What callers still own

- The popup HTML string (stays in the caller file; those are overlay-specific and don't benefit from abstraction).
- Any cross-overlay globals — which should be eliminated here, see "CameraLightbox extraction" below.

---

## Chunk 1: Preliminaries

Before touching overlay code, ship two low-risk companion changes the composable will depend on.

### Task 1.1: Pull the traffic-condition `getTrafficColor` + `TRAFFIC_LABELS` into `utils/traffic.ts`

**Rationale:** These will be used by both the traffic-marker builder and the road-polylines layer. Centralising them avoids re-imports once the overlay is extracted.

**Files:**
- Create: `app/utils/traffic.ts`
- Modify: `app/pages/map.vue`

- [ ] **Step 1:** Create `app/utils/traffic.ts` with `CONDITION_COLORS`, `CONDITION_LABELS`, and `conditionPriority`. Export as `const` so tree-shaking works.
- [ ] **Step 2:** Import from `map.vue`, delete the local copies.
- [ ] **Step 3:** Verify `/map` still renders with traffic toggled on (road polylines + hazard markers use the right colors).

### Task 1.2: Expose a clean `horizonMarker` slot in `map.vue`

**Rationale:** When the composable owns marker lifecycles, `onUnmounted` will stop calling `removeTrafficMarkers` / `removeCameraMarkers` — those move inside the composable's `onScopeDispose`. But the `horizonMarker` cleanup is intermixed in the same `onUnmounted` block (line 615). Pull it out first so the later diff is smaller and reviewable.

**Files:**
- Modify: `app/pages/map.vue`

- [ ] **Step 1:** Extract the horizon marker's own `onScopeDispose(() => horizonMarker?.remove())` right next to the `horizonMarker` declaration.
- [ ] **Step 2:** Delete the `if (horizonMarker) { horizonMarker.remove(); horizonMarker = null }` line from the old `onUnmounted` block.

---

## Chunk 2: Extract `CameraLightbox.vue`

The camera lightbox is the biggest code smell in map.vue — 75 lines of imperative DOM in a `window.__camOpen` global, plus a 20-line `window.__camNav` carousel. Replacing it with a proper Vue component removes both globals and makes the subsequent overlay extraction cleaner (the composable only sees markers + popups, not DOM side effects).

### Task 2.1: Create `CameraLightbox.vue`

**Files:**
- Create: `app/components/CameraLightbox.vue`

- [ ] **Step 1:** Component accepts a reactive `camera: { id, name, images: Array<{ url, description }> } | null` prop. When non-null, renders the current lightbox DOM (top bar, image, prev/next, dot indicator, counter) as a proper Vue template.
- [ ] **Step 2:** Use a local `currentIndex` ref for image navigation. Keyboard bindings (`Escape` / `ArrowLeft` / `ArrowRight`) live in `onMounted`/`onUnmounted` hooks.
- [ ] **Step 3:** Emit `close` when the overlay background is clicked, the close button is clicked, or `Escape` is pressed. Parent sets the prop to `null` on close.
- [ ] **Step 4:** Styling uses the semantic tokens from `main.css` (`bg-surface-raised`, `text-ink-1`, `text-accent`, etc.) — not hardcoded hex. Match the current visual exactly.

### Task 2.2: Wire the camera popup to a ref-based handoff

**Files:**
- Modify: `app/pages/map.vue`

- [ ] **Step 1:** Add `const activeLightboxCamera = ref<CameraData | null>(null)` at the top of the script section.
- [ ] **Step 2:** In the template, mount `<CameraLightbox :camera="activeLightboxCamera" @close="activeLightboxCamera = null" />` inside the map page wrapper so it z-indexes above everything.
- [ ] **Step 3:** In the popup HTML (still inside `addCameraMarkers`, temporarily — moves in Chunk 3), replace the `onclick="window.__camOpen('${uid}')"` attributes with `onclick="window.__openCam${cam.id}()"`. Register each camera's opener function on `window` tied to the page's reactive state — **temporary bridge** until Chunk 3 removes it.
  - Alternative: attach a single delegated click handler on the popup's `getElement()` in `popup.on('open', ...)` that reads `data-cam-id` and sets `activeLightboxCamera.value`. This is cleaner and lets Step 3 delete the `__camNav`/`__camOpen` globals outright.
  - Prefer the delegated-handler approach.
- [ ] **Step 4:** Do the same for `__camNav` — carousel nav inside the popup moves to a delegated handler that reads `data-cam-id`, `data-dir`, flips a local `indexByCamId: Map<string, number>` and re-renders the popup via `popup.setHTML(...)`.
- [ ] **Step 5:** Delete `window.__camNav` and `window.__camOpen` from the `if (import.meta.client)` block (lines 395–488). Delete the `camImageRegistry`, `camCurrentIndex` globals.

### Task 2.3: Verify camera flow end-to-end (manual)

- [ ] Open `/map` in a real browser. Toggle "Cams ON".
- [ ] Click a camera marker → popup opens with the carousel + dots + counter (single-image cameras have no nav).
- [ ] Click `‹` / `›` → carousel advances, dot highlights update, counter updates.
- [ ] Click the thumbnail → lightbox opens full-screen.
- [ ] Press `←` / `→` → lightbox advances. Press `Esc` → lightbox closes.
- [ ] Click overlay background → lightbox closes.
- [ ] Toggle "Cams OFF" → all markers disappear. Toggle back ON → popups still work (no stale state).

---

## Chunk 3: Create `useMapOverlay` + migrate cameras

Do cameras first (smaller, self-contained, no map source/layer side effects).

### Task 3.1: Create the composable

**Files:**
- Create: `app/composables/useMapOverlay.ts`

- [ ] **Step 1:** Implement the signature from the Design section above.
- [ ] **Step 2:** Use `overlayMinZooms` (from `utils/mapMarkers.ts`) to compute minZooms per item.
- [ ] **Step 3:** Register/deregister the `map.on('zoom', …)` handler via the lifecycle hooks.
- [ ] **Step 4:** `onScopeDispose` runs the deactivate path if the composable is disposed while `active === true`.
- [ ] **Step 5:** Short unit test in `tests/unit/composables/useMapOverlay.test.ts` that mocks `mapboxgl.Marker` / `mapboxgl.Map` and asserts: (a) first activation calls `fetchData` once, (b) subsequent re-activations don't re-fetch, (c) deactivate removes all markers and the zoom handler.

### Task 3.2: Migrate cameras to `useMapOverlay`

**Files:**
- Modify: `app/pages/map.vue`

- [ ] **Step 1:** Replace `addCameraMarkers` / `removeCameraMarkers` / `cameraMarkers` / `cameraZoomHandler` / `watch(showCameras)` with a single `useMapOverlay` call:

  ```ts
  useMapOverlay({
    active: showCameras,
    mapRef: eclipseMapRef,
    fetchData: () => $fetch<{ cameras: CameraData[] }>('/api/cameras').then(r => r.cameras),
    buildMarker: (cam, { map, minZoom }) => buildCameraMarker(cam, map),
  })
  ```

  where `buildCameraMarker(cam, map)` is a local helper that creates the DOM element + popup (now using the delegated click handler from Chunk 2) and returns the marker.
- [ ] **Step 2:** Move `cameraData` if there's any external reader; otherwise drop it.
- [ ] **Step 3:** Delete the redundant `removeCameraMarkers()` call from `onUnmounted` (composable handles it).

### Task 3.3: Verify cameras end-to-end (manual)

Repeat the Task 2.3 checklist. Plus:

- [ ] Toggle Cams ON → OFF → ON and confirm no duplicate markers appear.
- [ ] Verify `/api/cameras` is only fetched once across multiple toggles (Network panel).
- [ ] Zoom in/out: markers progressively appear per `OVERLAY_BUCKETS` (zoom 6–9).

---

## Chunk 4: Migrate traffic to `useMapOverlay`

Traffic is larger because it has an additional concern: the `road-conditions` map source + two layers + three event handlers live *alongside* the markers. The composable's `onActivate` / `onDeactivate` hook pair covers this.

### Task 4.1: Split the traffic code into marker + polylines halves

**Files:**
- Modify: `app/pages/map.vue`

- [ ] **Step 1:** Factor out `buildTrafficMarker(condition, map)` — takes one condition point, returns a `mapboxgl.Marker`. This is what the composable's `buildMarker` will call.
- [ ] **Step 2:** Keep `addRoadPolylines(map)` / `removeRoadPolylines(map)` as they are — they become the `onActivate` / `onDeactivate` hooks of the composable.
- [ ] **Step 3:** Keep `buildEnrichedRoads()`, `conditionPriority` — they're internals of `addRoadPolylines` already.

### Task 4.2: Replace traffic overlay with `useMapOverlay` call

**Files:**
- Modify: `app/pages/map.vue`

- [ ] **Step 1:** Replace `addTrafficMarkers` / `removeTrafficMarkers` / `trafficMarkers` / `trafficZoomHandler` / `watch(showTraffic)` with:

  ```ts
  useMapOverlay({
    active: showTraffic,
    mapRef: eclipseMapRef,
    fetchData: async () => {
      const [conditions, segments, geojson] = await Promise.all([
        $fetch<{ conditions: TrafficCondition[] }>('/api/traffic/conditions'),
        $fetch<{ segments: TrafficSegment[] }>('/api/traffic/segments'),
        $fetch('/eclipse-data/roads.geojson'),
      ])
      trafficSegmentsCache = segments
      trafficRoadsCache = geojson
      return conditions.conditions
    },
    buildMarker: (c, { map }) => buildTrafficMarker(c, map),
    onActivate: (map) => addRoadPolylines(map),
    onDeactivate: (map) => removeRoadPolylines(map),
  })
  ```

  `trafficSegmentsCache` + `trafficRoadsCache` are module-scoped caches in `map.vue` that `addRoadPolylines` reads. (Or pass them via a closure if that feels cleaner.)

### Task 4.3: Verify traffic end-to-end (manual)

- [ ] Toggle "Roads ON" → road polylines appear, hazard markers appear at zoom 6+.
- [ ] Click a road polyline → popup shows condition + road name.
- [ ] Click a hazard marker → popup shows description.
- [ ] Mouse over a road → cursor becomes pointer; off → cursor resets.
- [ ] Toggle OFF → all layers and markers disappear; no lingering event handlers (verify by clicking where roads were — no popup).
- [ ] Toggle ON / OFF / ON rapidly — no duplicate layers (inspect with `map.getStyle().layers`).

---

## Chunk 5: Cleanup + docs

### Task 5.1: Remove dead plumbing

- [ ] Delete `const overlayMinZooms` + `applyOverlayVisibility` wrappers in `map.vue` if no longer used outside the composable.
- [ ] Delete `OverlayMarker` interface in `map.vue` — moved into the composable.
- [ ] Delete the stale `removeTrafficMarkers` / `removeCameraMarkers` calls in `onUnmounted` (composable handles).

### Task 5.2: Update CLAUDE.md

- [ ] In the file-structure block, add:
  ```
  │   ├── composables/
  │   │   ├── useMapOverlay.ts        # Fetch+marker+zoom lifecycle for /map traffic + camera overlays
  ```
- [ ] In the Components block, add `CameraLightbox.vue`.

### Task 5.3: Measure the win

- [ ] Run `wc -l app/pages/map.vue`. Expect ≲800 lines (from 1184).
- [ ] Run `git log --stat` on the branch to confirm net deletion across `map.vue` + new files.

---

## Explicit decisions

**Why horizon stays inline.** `handleMapClick` + `horizonMarker` are a single-marker click-to-place workflow driven by a Pro gate. No fetch (horizon is an on-demand POST), no list, no zoom-visibility. Forcing it through the same composable would require threading optional flags (`singleInstance?`, `noFetch?`) that dilute the interface. A future `useClickPlacedMarker` composable could own it if a second single-marker use case appears.

**Why cameras first, traffic second.** Cameras have the bigger surface-level cleanup win (the two `window.*` globals), but the underlying structure is simpler — marker + popup, nothing else. Getting cameras green first de-risks the composable API before traffic's map-source-layer complication stresses it.

**Why no sub-agent parallelism.** Each chunk depends on the previous one's API. Running them in parallel would cause merge conflicts on `map.vue`. Sequential subagents (one per chunk) are fine if the executor is `superpowers:subagent-driven-development`.

**Why CameraLightbox uses delegated popup click handlers, not direct refs.** Mapbox popups are created imperatively and their inner HTML is rebuilt by `popup.setHTML()`. Attaching Vue event handlers to that DOM is fragile. Event delegation on the stable `popup.getElement()` container with `data-*` attributes is the canonical Mapbox pattern. See `app/components/EclipseMap.vue:wireSpotPopupNavigation` (commit `a7d980a`) for prior art on this.

---

## Risks + rollback

### Risk: regression in camera carousel or lightbox keyboard handling

- **Likelihood:** medium. Delegated click handlers + keyboard bindings are subtle; Mapbox popup re-render via `setHTML` can orphan event listeners.
- **Mitigation:** Chunk 2 ships the `CameraLightbox.vue` without touching the overlay logic. Verify it works through the temporary `window.*` bridge before Chunk 3 deletes the globals.
- **Rollback:** Chunks 2 and 3 are independent commits; revert Chunk 3 to keep the extracted component while rolling back the composable migration.

### Risk: road-polyline event handlers leaked across toggles

- **Likelihood:** medium. Traffic currently relies on `removeRoadPolylines` being paired with `addRoadPolylines`; if `onActivate` / `onDeactivate` is mis-wired, handlers accumulate.
- **Mitigation:** Task 4.3 explicitly verifies "toggle ON / OFF / ON rapidly — no duplicate layers."
- **Rollback:** Revert the single commit for Chunk 4.

### Risk: composable's `fetchData` re-runs on HMR

- **Likelihood:** low. Vue's HMR preserves composable state if the composable is stable.
- **Mitigation:** use a module-scoped `WeakMap<mapboxgl.Map, T[]>` as backup cache if needed. Defer to "if observed" — don't over-engineer upfront.

### Risk: the composable's return type is too narrow

- **Likelihood:** low. The current callers don't read the returned `data` or `markers` refs externally, but the composable still exposes them for future use (e.g. showing camera counts in the UI).
- **Mitigation:** exported interface makes this cheap to widen later.

---

## Definition of done

- [ ] `app/pages/map.vue` is ≲800 lines (≳400-line delta).
- [ ] `app/composables/useMapOverlay.ts` exists with a passing unit test in `tests/unit/composables/`.
- [ ] `app/components/CameraLightbox.vue` exists and is used via a standard Vue ref — no `window.__camOpen` / `window.__camNav` anywhere in the repo (`git grep window.__cam` returns empty).
- [ ] Manual QA in a real browser confirms all six overlay flows (camera marker, camera popup carousel, camera lightbox, traffic markers, road polyline click, toggle on/off/on) behave exactly as they did pre-refactor.
- [ ] No regression in map load time (cold + cached), measured via Chrome DevTools Performance panel on `/map`.
- [ ] Commit is pushed to `main` (or a branch, if the executor prefers a PR).
