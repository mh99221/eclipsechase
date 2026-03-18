# Horizon Obstruction Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add terrain-based horizon obstruction checking to all curated viewing spots and as a dynamic Pro feature, so users know whether mountains block the eclipse sun at any given location.

**Architecture:** Python pre-computation script using rasterio reads ÍslandsDEM 10m GeoTIFF to generate horizon check data for all curated spots. TypeScript server endpoint uses a downsampled 30m binary DEM for on-demand Pro user checks. Frontend renders an SVG terrain profile from sweep data and shows verdict badges throughout the UI.

**Tech Stack:** Python (rasterio, numpy) for DEM processing; TypeScript/Nuxt 4 server routes for dynamic API; Vue 3 components for HorizonBadge, HorizonProfile SVG, PeakFinderLink; Supabase JSONB storage.

**Spec:** `docs/superpowers/specs/2026-03-18-horizon-check-design-v2.md`

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `app/types/horizon.ts` | TypeScript types: HorizonVerdict, HorizonSweepPoint, HorizonCheck, HorizonProfileData, HorizonCheckRequest, HorizonCheckResponse |
| `app/components/HorizonBadge.vue` | Verdict badge (compact/full modes) with colored dot and clearance text |
| `app/components/HorizonProfile.vue` | SVG terrain silhouette with sun marker, blocked overlay, compass labels, tooltips |
| `app/components/PeakFinderLink.vue` | External link button to PeakFinder oriented at sun azimuth |
| `app/components/DynamicHorizonCheck.vue` | Map tap-to-check panel for Pro users with loading state and upgrade prompt |
| `server/api/horizon/check.post.ts` | Dynamic horizon check endpoint (Pro only, rate-limited) |
| `server/utils/dem.ts` | DEM loading, elevation lookup, bilinear interpolation from binary Float32 file |
| `server/utils/horizon.ts` | Horizon check algorithm: single ray check + azimuth sweep, shared with API endpoint |
| `scripts/compute-horizon-checks.py` | Pre-computation: reads 10m GeoTIFF, runs algorithm for all curated spots, outputs JSON |
| `scripts/prepare-dem-binary.py` | One-time: crops ÍslandsDEM to western Iceland, downsamples to 30m, exports Float32 binary + metadata |
| `scripts/seed-horizon-checks.sql` | Seeds pre-computed horizon_check JSONB into viewing_spots table |
| `server/data/dem/west-iceland-30m.bin` | Downsampled 30m DEM binary (committed to repo) |
| `server/data/dem/west-iceland-30m.meta.json` | DEM metadata: bounding box, dimensions, cell sizes, row order |

### Modified Files
| File | Changes |
|------|---------|
| `app/composables/useRecommendation.ts` | Add `horizon` weight (0.25) to Profile interface + all profiles, add horizonBlocked floor, add computeHorizonScore function, redistribute existing weights ×0.75 |
| `app/pages/spots/[slug].vue` | Add HorizonBadge to stats grid, add "Horizon View" section with HorizonProfile + PeakFinderLink, add blocked warning banner |
| `app/components/EclipseMap.vue` | Add horizon_check to spots prop type, color spot marker rings by verdict, integrate DynamicHorizonCheck |
| `app/components/SpotCard.vue` | Add HorizonBadge in compact mode to card layout |
| `server/api/spots/index.get.ts` | Add `horizon_check` to SELECT columns |
| `nuxt.config.ts` | Add Nitro `serverAssets` config to include DEM binary in deployment bundle |
| `i18n/en.json` | Add horizon verdict labels, descriptions, section headers, compass directions; update score_explanation |
| `i18n/is.json` | Add Icelandic translations for horizon keys; update score_explanation |

---

## Task Dependency Graph

```
Task 1 (Types) ──────────────────────────────┐
Task 2 (i18n) ───────────────────────────────┤
                                              ├── Task 3 (HorizonBadge)
                                              ├── Task 4 (HorizonProfile)
                                              ├── Task 5 (PeakFinderLink)
Task 6 (DEM utils) ─── Task 7 (Horizon algo) ─── Task 8 (API endpoint)
Task 9 (Python scripts) ── Task 10 (Seed data)
Task 3 + Task 4 + Task 5 ─── Task 11 (Spot detail page)
Task 3 ─── Task 12 (Recommendation engine)
Task 3 + Task 8 ─── Task 13 (EclipseMap + DynamicHorizonCheck)
```

Tasks 1, 2, 6, 9 can start in parallel. Most frontend work (3-5, 11-13) depends on types.

---

### Task 1: TypeScript Types

**Files:**
- Create: `app/types/horizon.ts`

- [ ] **Step 1: Create the types file**

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
  observer_elevation_m: number  // DEM elevation + 1.7m eye height
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

- [ ] **Step 2: Verify the file is importable**

Run: `cd D:/Projects/eclipsechase/eclipse-chaser && npx nuxi typecheck 2>&1 | head -5`
Expected: No errors related to horizon.ts

- [ ] **Step 3: Commit**

```bash
git add app/types/horizon.ts
git commit -m "feat: add TypeScript types for horizon obstruction check"
```

---

### Task 2: i18n Keys

**Files:**
- Modify: `i18n/en.json`
- Modify: `i18n/is.json`

- [ ] **Step 1: Add English i18n keys**

Add a `"horizon"` section to `i18n/en.json` at the top level:

```json
"horizon": {
  "section_title": "Horizon View",
  "sun_position": "The sun will be at {altitude}° above the horizon, looking {direction}.",
  "verdict_clear": "Sun well above terrain — {clearance}° clearance",
  "verdict_marginal": "Sun clears terrain by only {clearance}°",
  "verdict_risky": "Sun barely visible — {clearance}° above terrain",
  "verdict_blocked": "Terrain blocks sun by {clearance}°",
  "label_clear": "Clear",
  "label_marginal": "Marginal",
  "label_risky": "Risky",
  "label_blocked": "Blocked",
  "blocked_warning": "The sun will NOT be visible from this location during totality. A {height}m obstacle {distance}m to the west blocks the view.",
  "nearest_clear": "Nearest clear spot: {name} ({distance} km, {time} drive)",
  "peakfinder_link": "View full mountain panorama on PeakFinder",
  "peakfinder_subtitle": "External site — shows labeled mountain names and distances",
  "dynamic_loading": "Checking horizon...",
  "dynamic_offline": "Connect to internet for horizon checking",
  "upgrade_prompt": "Unlock horizon checking for any location — Eclipse Pro €9.99",
  "attribution": "Elevation data: ÍslandsDEM v1.0 © National Land Survey of Iceland (CC BY 4.0)",
  "tooltip_terrain": "Terrain at {azimuth}°: {angle}° high, {distance}m away",
  "tooltip_sun": "Sun at totality: {altitude}° altitude, {azimuth}° {direction}",
  "tooltip_blocked": "Terrain blocks the sun here by {degrees}°",
  "outside_path": "This location is outside the path of totality.",
  "navigate_here": "Navigate here",
  "upgrade_button": "Upgrade to Pro"
}
```

Also update the existing `recommend.score_explanation` key in `en.json` to mention horizon:
```json
"score_explanation": "Score combines weather, totality duration, distance, accessibility, services, and horizon visibility."
```

- [ ] **Step 2: Add Icelandic i18n keys**

Add the same `"horizon"` section to `i18n/is.json` with Icelandic translations. Use placeholder translations for now — these can be refined later. Also update the `recommend.score_explanation` key similarly:

```json
"horizon": {
  "section_title": "Sjóndeildarhringur",
  "sun_position": "Sólin verður í {altitude}° hæð yfir sjóndeildarhring, í átt {direction}.",
  "verdict_clear": "Sól vel yfir landslagi — {clearance}° bil",
  "verdict_marginal": "Sól rétt yfir landslagi — aðeins {clearance}°",
  "verdict_risky": "Sól varla sýnileg — {clearance}° yfir landslagi",
  "verdict_blocked": "Landslagið lokar á sól um {clearance}°",
  "label_clear": "Greitt",
  "label_marginal": "Jaðar",
  "label_risky": "Áhættusamt",
  "label_blocked": "Lokað",
  "blocked_warning": "Sólin verður EKKI sýnileg frá þessum stað á meðan á myrkva stendur. {height}m hindrun {distance}m í vestur lokar á útsýnið.",
  "nearest_clear": "Næsti greitti staður: {name} ({distance} km, {time} akstur)",
  "peakfinder_link": "Skoða fjallapanorama á PeakFinder",
  "peakfinder_subtitle": "Ytri vefsíða — sýnir nöfn og fjarlægðir fjalla",
  "dynamic_loading": "Athuga sjóndeildarhring...",
  "dynamic_offline": "Tengdu við internet til að athuga sjóndeildarhring",
  "upgrade_prompt": "Opnaðu sjóndeildarhringsathugun — Eclipse Pro €9.99",
  "attribution": "Hæðargögn: ÍslandsDEM v1.0 © Landmælingar Íslands (CC BY 4.0)",
  "tooltip_terrain": "Landslagið við {azimuth}°: {angle}° hátt, {distance}m í burtu",
  "tooltip_sun": "Sól í myrkva: {altitude}° hæð, {azimuth}° {direction}",
  "tooltip_blocked": "Landslagið lokar á sól hér um {degrees}°",
  "outside_path": "Þessi staður er utan myrkvabálks.",
  "navigate_here": "Sigla hingað",
  "upgrade_button": "Uppfæra í Pro"
}
```

- [ ] **Step 3: Commit**

```bash
git add i18n/en.json i18n/is.json
git commit -m "feat: add i18n keys for horizon check feature"
```

---

### Task 3: HorizonBadge Component

**Files:**
- Create: `app/components/HorizonBadge.vue`
- Depends on: Task 1 (types), Task 2 (i18n)

- [ ] **Step 1: Create the HorizonBadge component**

```vue
<script setup lang="ts">
import type { HorizonVerdict } from '~/types/horizon'

const props = defineProps<{
  verdict: HorizonVerdict
  clearance: number
  compact?: boolean
}>()

const { t } = useI18n()

const config: Record<HorizonVerdict, { color: string; bg: string; border: string }> = {
  clear: { color: '#22c55e', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  marginal: { color: '#eab308', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  risky: { color: '#f97316', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  blocked: { color: '#ef4444', bg: 'bg-red-500/10', border: 'border-red-500/30' },
}

const style = computed(() => config[props.verdict])

const label = computed(() => t(`horizon.label_${props.verdict}`))

const description = computed(() =>
  t(`horizon.verdict_${props.verdict}`, { clearance: Math.abs(props.clearance).toFixed(1) }),
)
</script>

<template>
  <!-- Compact mode: colored dot + label -->
  <span v-if="compact" class="inline-flex items-center gap-1.5 font-mono text-xs">
    <span
      class="w-2 h-2 rounded-full flex-shrink-0"
      :style="{ backgroundColor: style.color }"
    />
    <span :style="{ color: style.color }">{{ label }}</span>
  </span>

  <!-- Full mode: badge with description -->
  <div
    v-else
    class="inline-flex items-start gap-2 px-3 py-2 rounded border text-sm"
    :class="[style.bg, style.border]"
  >
    <span
      class="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5"
      :style="{ backgroundColor: style.color }"
    />
    <span :style="{ color: style.color }">{{ description }}</span>
  </div>
</template>
```

- [ ] **Step 2: Verify component renders**

Open dev server, confirm no import/type errors: `npx nuxi dev`

- [ ] **Step 3: Commit**

```bash
git add app/components/HorizonBadge.vue
git commit -m "feat: add HorizonBadge component with compact and full modes"
```

---

### Task 4: HorizonProfile SVG Component

**Files:**
- Create: `app/components/HorizonProfile.vue`
- Depends on: Task 1 (types), Task 2 (i18n)

This is the largest frontend component. It renders a 60° panoramic SVG terrain silhouette with sun marker.

- [ ] **Step 1: Create the HorizonProfile component**

```vue
<script setup lang="ts">
import type { HorizonProfileData, HorizonSweepPoint } from '~/types/horizon'

const props = withDefaults(defineProps<{
  data: HorizonProfileData
  width?: number
  height?: number
  interactive?: boolean
}>(), {
  width: 700,
  height: 280,
  interactive: true,
})

const { t } = useI18n()

// Unique ID for SVG gradient to avoid collision when multiple instances render
const uid = useId()
const gradientId = `horizon-sky-${uid}`

// Layout constants
const PADDING = { top: 20, bottom: 30, left: 45, right: 20 }
const MAX_ALT = 35 // degrees shown on chart

const plotWidth = computed(() => props.width - PADDING.left - PADDING.right)
const plotHeight = computed(() => props.height - PADDING.top - PADDING.bottom)

const sweepRange = computed(() => {
  const azimuths = props.data.sweep.map(p => p.azimuth)
  return { min: Math.min(...azimuths), max: Math.max(...azimuths) }
})

function azimuthToX(azimuth: number): number {
  const range = sweepRange.value.max - sweepRange.value.min
  if (range === 0) return PADDING.left
  return PADDING.left + ((azimuth - sweepRange.value.min) / range) * plotWidth.value
}

function altitudeToY(altitude: number): number {
  const clamped = Math.min(Math.max(altitude, 0), MAX_ALT)
  return PADDING.top + plotHeight.value * (1 - clamped / MAX_ALT)
}

// Terrain silhouette path
const terrainPath = computed(() => {
  const sweep = props.data.sweep
  if (!sweep.length) return ''
  const points = sweep.map(p => `${azimuthToX(p.azimuth).toFixed(1)},${altitudeToY(Math.max(p.horizon_angle, 0)).toFixed(1)}`)
  const bottomY = altitudeToY(0).toFixed(1)
  const startX = azimuthToX(sweep[0]!.azimuth).toFixed(1)
  const endX = azimuthToX(sweep[sweep.length - 1]!.azimuth).toFixed(1)
  return `M ${startX},${bottomY} L ${points.join(' L ')} L ${endX},${bottomY} Z`
})

// Blocked overlay path — terrain above sun line, clipped
const blockedPath = computed(() => {
  const sweep = props.data.sweep
  const sunAlt = props.data.sun_altitude
  if (!sweep.length) return ''
  const points = sweep.map((p) => {
    const x = azimuthToX(p.azimuth).toFixed(1)
    const y = p.horizon_angle > sunAlt
      ? altitudeToY(p.horizon_angle).toFixed(1)
      : altitudeToY(sunAlt).toFixed(1)
    return `${x},${y}`
  })
  const sunY = altitudeToY(sunAlt).toFixed(1)
  const startX = azimuthToX(sweep[0]!.azimuth).toFixed(1)
  const endX = azimuthToX(sweep[sweep.length - 1]!.azimuth).toFixed(1)
  return `M ${startX},${sunY} L ${points.join(' L ')} L ${endX},${sunY} Z`
})

// Sun position
const sunX = computed(() => azimuthToX(props.data.sun_azimuth))
const sunY = computed(() => altitudeToY(props.data.sun_altitude))

// Grid lines at 10° intervals (computed so they react to height prop changes)
const gridLines = computed(() => [10, 20, 30].map(alt => ({
  y: altitudeToY(alt),
  label: `${alt}°`,
})))

// Compass labels (show 3: left, center/sun, right)
const compassLabels = computed(() => {
  const center = props.data.sun_azimuth
  const offset = 25
  return [
    { azimuth: center - offset, label: `${Math.round(center - offset)}°` },
    { azimuth: center, label: `${Math.round(center)}° Sun`, highlight: true },
    { azimuth: center + offset, label: `${Math.round(center + offset)}°` },
  ]
})

// Verdict badge colors
const verdictColors: Record<string, string> = {
  clear: '#22c55e',
  marginal: '#eab308',
  risky: '#f97316',
  blocked: '#ef4444',
}

// Tooltip state
const tooltip = ref<{ x: number; y: number; text: string } | null>(null)

function onTerrainHover(event: MouseEvent) {
  if (!props.interactive) return
  const svg = (event.target as Element).closest('svg')
  if (!svg) return
  const rect = svg.getBoundingClientRect()
  const svgX = ((event.clientX - rect.left) / rect.width) * props.width
  // Find nearest sweep point
  const sweep = props.data.sweep
  let nearest: HorizonSweepPoint | null = null
  let nearestDist = Infinity
  for (const p of sweep) {
    const px = azimuthToX(p.azimuth)
    const d = Math.abs(px - svgX)
    if (d < nearestDist) {
      nearestDist = d
      nearest = p
    }
  }
  if (nearest) {
    tooltip.value = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top - 10,
      text: t('horizon.tooltip_terrain', {
        azimuth: nearest.azimuth.toFixed(0),
        angle: nearest.horizon_angle.toFixed(1),
        distance: Math.round(nearest.distance_m),
      }),
    }
  }
}

function clearTooltip() {
  tooltip.value = null
}

// Accessible description
const ariaLabel = computed(() => {
  const v = props.data.verdict
  const c = Math.abs(props.data.clearance_degrees).toFixed(1)
  if (v === 'clear') return `Horizon profile: clear view, sun is ${c} degrees above terrain`
  if (v === 'blocked') return `Horizon profile: view blocked, terrain is ${c} degrees above sun`
  return `Horizon profile: ${v} view, ${c} degrees clearance`
})
</script>

<template>
  <div class="relative w-full">
    <svg
      :viewBox="`0 0 ${width} ${height}`"
      class="w-full h-auto"
      :aria-label="ariaLabel"
      role="img"
      @mousemove="onTerrainHover"
      @mouseleave="clearTooltip"
    >
      <!-- Sky gradient -->
      <defs>
        <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#1e293b" />
        </linearGradient>
      </defs>
      <rect :width="width" :height="height" :fill="`url(#${gradientId})`" rx="4" />

      <!-- Grid lines -->
      <line
        v-for="g in gridLines"
        :key="g.label"
        :x1="PADDING.left"
        :y1="g.y"
        :x2="width - PADDING.right"
        :y2="g.y"
        stroke="#1e293b"
        stroke-width="0.5"
      />

      <!-- Altitude labels -->
      <text
        v-for="g in gridLines"
        :key="`label-${g.label}`"
        :x="PADDING.left - 5"
        :y="g.y + 4"
        fill="#64748b"
        font-size="10"
        text-anchor="end"
        font-family="'IBM Plex Mono', monospace"
      >{{ g.label }}</text>

      <!-- Sun altitude line (dashed) -->
      <line
        :x1="PADDING.left"
        :y1="sunY"
        :x2="width - PADDING.right"
        :y2="sunY"
        stroke="#f59e0b"
        stroke-width="1"
        stroke-dasharray="6 4"
        opacity="0.6"
      />

      <!-- Terrain silhouette -->
      <path :d="terrainPath" fill="#1a2232" stroke="#334155" stroke-width="1" />

      <!-- Blocked zone overlay -->
      <path :d="blockedPath" fill="#ef444430" />

      <!-- Sun marker -->
      <circle :cx="sunX" :cy="sunY" r="12" fill="#f59e0b" opacity="0.15" />
      <circle :cx="sunX" :cy="sunY" r="6" fill="#f59e0b" opacity="0.9" />

      <!-- Sun label -->
      <text
        :x="sunX"
        :y="sunY - 18"
        fill="#f59e0b"
        font-size="10"
        text-anchor="middle"
        font-family="'IBM Plex Mono', monospace"
      >{{ data.sun_altitude.toFixed(0) }}°</text>

      <!-- Compass labels -->
      <text
        v-for="c in compassLabels"
        :key="c.azimuth"
        :x="azimuthToX(c.azimuth)"
        :y="height - 8"
        :fill="c.highlight ? '#f59e0b' : '#64748b'"
        font-size="10"
        text-anchor="middle"
        font-family="'IBM Plex Mono', monospace"
      >{{ c.label }}</text>

      <!-- Verdict badge -->
      <rect
        :x="width - 110"
        y="8"
        width="100"
        height="22"
        rx="11"
        :fill="`${verdictColors[data.verdict]}20`"
        :stroke="verdictColors[data.verdict]"
        stroke-width="1"
      />
      <text
        :x="width - 60"
        y="23"
        :fill="verdictColors[data.verdict]"
        font-size="11"
        text-anchor="middle"
        font-family="'IBM Plex Mono', monospace"
        font-weight="bold"
      >{{ data.verdict.toUpperCase() }}</text>
    </svg>

    <!-- Tooltip -->
    <div
      v-if="tooltip && interactive"
      class="absolute pointer-events-none bg-void-surface border border-void-border/60 rounded px-2 py-1 text-xs font-mono text-slate-300 whitespace-nowrap z-10"
      :style="{ left: `${tooltip.x}px`, top: `${tooltip.y}px`, transform: 'translate(-50%, -100%)' }"
    >
      {{ tooltip.text }}
    </div>

    <!-- Attribution -->
    <p class="mt-2 text-[10px] font-mono text-slate-600 text-right">
      {{ t('horizon.attribution') }}
    </p>
  </div>
</template>
```

- [ ] **Step 2: Verify component renders with mock data**

Temporarily import into a dev page or check for type errors: `npx nuxi typecheck`

- [ ] **Step 3: Commit**

```bash
git add app/components/HorizonProfile.vue
git commit -m "feat: add HorizonProfile SVG terrain visualization component"
```

---

### Task 5: PeakFinderLink Component

**Files:**
- Create: `app/components/PeakFinderLink.vue`
- Depends on: Task 2 (i18n)

- [ ] **Step 1: Create the PeakFinderLink component**

```vue
<script setup lang="ts">
const props = defineProps<{
  lat: number
  lng: number
  elevation: number
  sunAzimuth: number
  spotName: string
}>()

const { t } = useI18n()

const url = computed(() =>
  `https://www.peakfinder.com/?lat=${props.lat}&lng=${props.lng}&name=${encodeURIComponent(props.spotName)}&ele=${Math.round(props.elevation)}&azi=${Math.round(props.sunAzimuth)}`,
)
</script>

<template>
  <div>
    <a
      :href="url"
      target="_blank"
      rel="noopener"
      class="inline-flex items-center gap-2 px-4 py-2.5 rounded border border-void-border/40 bg-void-surface text-sm text-slate-300 hover:text-white hover:border-corona/40 transition-colors"
    >
      <svg class="w-4 h-4 text-corona/70 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      {{ t('horizon.peakfinder_link') }}
      <svg class="w-3.5 h-3.5 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
    <p class="mt-1.5 text-[10px] font-mono text-slate-500">
      {{ t('horizon.peakfinder_subtitle') }}
    </p>
  </div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add app/components/PeakFinderLink.vue
git commit -m "feat: add PeakFinderLink external link component"
```

---

### Task 6: Server DEM Utilities

**Files:**
- Create: `server/utils/dem.ts`
- Create: `server/data/dem/west-iceland-30m.meta.json` (placeholder until real DEM is prepared)

This task creates the TypeScript DEM loading and elevation lookup utilities used by the dynamic horizon check endpoint. The actual binary DEM file is created separately by the Python script (Task 9).

- [ ] **Step 1: Create placeholder DEM metadata**

Create `server/data/dem/west-iceland-30m.meta.json` with the expected structure. Actual values will be filled in by the Python DEM preparation script:

```json
{
  "minLat": 63.8,
  "maxLat": 66.2,
  "minLng": -24.5,
  "maxLng": -18.0,
  "width": 0,
  "height": 0,
  "cellSizeLat": 0.00027,
  "cellSizeLng": 0.00027,
  "rowOrder": "south-to-north"
}
```

- [ ] **Step 2: Add Nitro serverAssets config to nuxt.config.ts**

Add to `nuxt.config.ts` inside the `defineNuxtConfig` object, so the DEM binary is included in Vercel deployment bundles:

```typescript
nitro: {
  serverAssets: [{
    baseName: 'dem',
    dir: './server/data/dem',
  }],
},
```

- [ ] **Step 3: Create the DEM utility module**

```typescript
// server/utils/dem.ts
// Uses Nitro's serverAssets (configured in nuxt.config.ts) to access DEM files.
// This works both in dev and on Vercel deployments.

export interface DEMMeta {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
  width: number
  height: number
  cellSizeLat: number
  cellSizeLng: number
  rowOrder: 'south-to-north' | 'north-to-south'
}

let demData: Float32Array | null = null
let demMeta: DEMMeta | null = null
let loadError: string | null = null

export async function loadDEM(): Promise<{ data: Float32Array; meta: DEMMeta } | { error: string }> {
  if (loadError) return { error: loadError }
  if (demData && demMeta) return { data: demData, meta: demMeta }

  try {
    const storage = useStorage('assets:dem')

    // Load metadata
    const metaRaw = await storage.getItem('west-iceland-30m.meta.json')
    if (!metaRaw) {
      loadError = 'DEM metadata not found'
      return { error: loadError }
    }
    demMeta = (typeof metaRaw === 'string' ? JSON.parse(metaRaw) : metaRaw) as DEMMeta

    // Load binary DEM
    const binBuffer = await storage.getItemRaw('west-iceland-30m.bin')
    if (!binBuffer) {
      loadError = 'DEM binary not found'
      return { error: loadError }
    }

    // Convert to Float32Array
    const arrayBuffer = binBuffer instanceof ArrayBuffer
      ? binBuffer
      : (binBuffer as Buffer).buffer.slice(
          (binBuffer as Buffer).byteOffset,
          (binBuffer as Buffer).byteOffset + (binBuffer as Buffer).byteLength,
        )
    demData = new Float32Array(arrayBuffer)

    if (demData.length !== demMeta.width * demMeta.height) {
      loadError = `DEM size mismatch: expected ${demMeta.width * demMeta.height}, got ${demData.length}`
      demData = null
      demMeta = null
      return { error: loadError }
    }

    return { data: demData, meta: demMeta }
  } catch (e) {
    loadError = `Failed to load DEM: ${e}`
    return { error: loadError }
  }
}

export function getElevation(lat: number, lng: number, data: Float32Array, meta: DEMMeta): number | null {
  if (lat < meta.minLat || lat > meta.maxLat || lng < meta.minLng || lng > meta.maxLng) {
    return null
  }

  // Compute fractional row/col
  const rowF = meta.rowOrder === 'south-to-north'
    ? (lat - meta.minLat) / meta.cellSizeLat
    : (meta.maxLat - lat) / meta.cellSizeLat
  const colF = (lng - meta.minLng) / meta.cellSizeLng

  // Bilinear interpolation
  const r0 = Math.floor(rowF)
  const c0 = Math.floor(colF)
  const r1 = Math.min(r0 + 1, meta.height - 1)
  const c1 = Math.min(c0 + 1, meta.width - 1)

  const fr = rowF - r0
  const fc = colF - c0

  const v00 = data[r0 * meta.width + c0] ?? 0
  const v01 = data[r0 * meta.width + c1] ?? 0
  const v10 = data[r1 * meta.width + c0] ?? 0
  const v11 = data[r1 * meta.width + c1] ?? 0

  // Treat nodata (NaN or very negative) as ocean = 0m
  const safe = (v: number) => (Number.isNaN(v) || v < -1000) ? 0 : v

  const elev = (1 - fr) * ((1 - fc) * safe(v00) + fc * safe(v01))
    + fr * ((1 - fc) * safe(v10) + fc * safe(v11))

  return elev
}

export function isInBounds(lat: number, lng: number, meta: DEMMeta): boolean {
  return lat >= meta.minLat && lat <= meta.maxLat && lng >= meta.minLng && lng <= meta.maxLng
}
```

- [ ] **Step 3: Commit**

```bash
git add server/utils/dem.ts server/data/dem/west-iceland-30m.meta.json nuxt.config.ts
git commit -m "feat: add DEM loading and elevation lookup utilities"
```

---

### Task 7: Server Horizon Algorithm

**Files:**
- Create: `server/utils/horizon.ts`
- Depends on: Task 6 (DEM utils)

This is the core horizon check algorithm ported to TypeScript for the server-side dynamic checks.

- [ ] **Step 1: Create the horizon algorithm module**

```typescript
// server/utils/horizon.ts
// Note: In Nuxt 4, server utils are auto-imported. The getElevation function
// from server/utils/dem.ts is available globally. Types are imported from app/types/
// which is aliased as ~/ in Nuxt 4.
import type { HorizonVerdict, HorizonSweepPoint, HorizonCheck } from '~/types/horizon'

const EYE_HEIGHT = 1.7 // meters
const EARTH_RADIUS = 6371000 // meters
const DEG_TO_RAD = Math.PI / 180

interface DEMAccessor {
  data: Float32Array
  meta: {
    minLat: number; maxLat: number; minLng: number; maxLng: number
    width: number; height: number; cellSizeLat: number; cellSizeLng: number
    rowOrder: 'south-to-north' | 'north-to-south'
  }
}

/**
 * Move from a lat/lng point along a compass bearing for a given distance in meters.
 * Returns [newLat, newLng].
 */
function moveAlongBearing(lat: number, lng: number, bearing: number, distanceM: number): [number, number] {
  const bearingRad = bearing * DEG_TO_RAD
  const latRad = lat * DEG_TO_RAD
  const delta = distanceM / EARTH_RADIUS

  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(delta) + Math.cos(latRad) * Math.sin(delta) * Math.cos(bearingRad),
  )
  const newLngRad = lng * DEG_TO_RAD + Math.atan2(
    Math.sin(bearingRad) * Math.sin(delta) * Math.cos(latRad),
    Math.cos(delta) - Math.sin(latRad) * Math.sin(newLatRad),
  )

  return [newLatRad / DEG_TO_RAD, newLngRad / DEG_TO_RAD]
}

/**
 * Generate sample distances along a ray: 50m intervals to 1km, 200m to 5km, 500m to 20km.
 */
function sampleDistances(): number[] {
  const distances: number[] = []
  for (let d = 50; d <= 1000; d += 50) distances.push(d)
  for (let d = 1200; d <= 5000; d += 200) distances.push(d)
  for (let d = 5500; d <= 20000; d += 500) distances.push(d)
  return distances
}

const DISTANCES = sampleDistances()

/**
 * Cast a single ray along a bearing and find the maximum horizon angle.
 */
function singleRayCheck(
  observerLat: number,
  observerLng: number,
  observerElev: number,
  bearing: number,
  dem: DEMAccessor,
): { horizonAngle: number; blockingDistanceM: number; blockingElevationM: number } {
  let maxAngle = -90
  let blockingDist = 0
  let blockingElev = 0

  for (const dist of DISTANCES) {
    const [sampleLat, sampleLng] = moveAlongBearing(observerLat, observerLng, bearing, dist)
    const terrainElev = getElevation(sampleLat, sampleLng, dem.data, dem.meta)
    if (terrainElev === null) continue

    const elevDiff = terrainElev - observerElev
    const angle = Math.atan2(elevDiff, dist) / DEG_TO_RAD

    if (angle > maxAngle) {
      maxAngle = angle
      blockingDist = dist
      blockingElev = terrainElev
    }
  }

  return { horizonAngle: maxAngle, blockingDistanceM: blockingDist, blockingElevationM: blockingElev }
}

function getVerdict(clearance: number): HorizonVerdict {
  if (clearance > 5) return 'clear'
  if (clearance >= 2) return 'marginal'
  if (clearance >= 0) return 'risky'
  return 'blocked'
}

/**
 * Run full horizon check: single ray at sun azimuth + ±30° sweep.
 */
export function checkHorizon(
  lat: number,
  lng: number,
  sunAltitude: number,
  sunAzimuth: number,
  dem: DEMAccessor,
): HorizonCheck {
  // Observer elevation
  const demElev = getElevation(lat, lng, dem.data, dem.meta)
  const observerElev = (demElev != null && demElev >= 0 ? demElev : 2) + EYE_HEIGHT

  // Single ray at sun azimuth
  const mainRay = singleRayCheck(lat, lng, observerElev, sunAzimuth, dem)
  const clearance = sunAltitude - mainRay.horizonAngle
  const verdict = getVerdict(clearance)

  // Azimuth sweep ±30° in 1° steps
  const sweep: HorizonSweepPoint[] = []
  for (let offset = -30; offset <= 30; offset++) {
    const azi = sunAzimuth + offset
    const normalizedAzi = ((azi % 360) + 360) % 360
    const ray = singleRayCheck(lat, lng, observerElev, azi, dem)
    sweep.push({
      azimuth: normalizedAzi,
      horizon_angle: Math.max(ray.horizonAngle, 0),
      distance_m: ray.blockingDistanceM,
    })
  }

  return {
    verdict,
    clearance_degrees: Math.round(clearance * 10) / 10,
    max_horizon_angle: Math.round(mainRay.horizonAngle * 10) / 10,
    blocking_distance_m: verdict === 'clear' ? null : mainRay.blockingDistanceM,
    blocking_elevation_m: verdict === 'clear' ? null : mainRay.blockingElevationM,
    observer_elevation_m: Math.round(observerElev * 10) / 10,
    sun_altitude: sunAltitude,
    sun_azimuth: sunAzimuth,
    checked_at: new Date().toISOString(),
    sweep,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add server/utils/horizon.ts
git commit -m "feat: add horizon check algorithm with ray casting and azimuth sweep"
```

---

### Task 8: Dynamic Horizon Check API Endpoint

**Files:**
- Create: `server/api/horizon/check.post.ts`
- Depends on: Task 6 (DEM utils), Task 7 (horizon algorithm)

- [ ] **Step 1: Create the API endpoint**

```typescript
// server/api/horizon/check.post.ts
// Note: loadDEM, isInBounds, checkHorizon are auto-imported from server/utils/ in Nuxt 4.
// Types use the ~/ alias which resolves to app/ in Nuxt 4.
import { serverSupabaseServiceRole } from '#supabase/server'
import type { HorizonCheckResponse } from '~/types/horizon'

// Rate limiting: 10 req/min per IP
const rateLimits = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimits.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + 60_000 })
    return true
  }
  entry.count++
  return entry.count <= 10
}

export default defineEventHandler(async (event) => {
  // Rate limit
  const ip = getHeader(event, 'x-forwarded-for') || getHeader(event, 'x-real-ip') || 'unknown'
  if (!checkRateLimit(ip)) {
    throw createError({ statusCode: 429, message: 'Too many requests, try again in a minute' })
  }

  // Parse body
  const body = await readBody<{ lat: number; lng: number }>(event)
  if (body?.lat == null || body?.lng == null || typeof body.lat !== 'number' || typeof body.lng !== 'number') {
    throw createError({ statusCode: 400, message: 'lat and lng are required numbers' })
  }

  // Check Pro status
  const email = getHeader(event, 'x-pro-email')
  if (email) {
    const supabase = await serverSupabaseServiceRole(event)
    const { data: proUser } = await supabase
      .from('pro_users')
      .select('is_active')
      .eq('email', email)
      .single()

    if (!proUser?.is_active) {
      throw createError({ statusCode: 403, message: 'Pro subscription required' })
    }
  } else {
    throw createError({ statusCode: 403, message: 'Pro subscription required' })
  }

  // Load DEM
  const demResult = await loadDEM()
  if ('error' in demResult) {
    throw createError({ statusCode: 503, message: 'Horizon check temporarily unavailable' })
  }

  // Bounds check
  if (!isInBounds(body.lat, body.lng, demResult.meta)) {
    throw createError({ statusCode: 422, message: 'Location outside coverage area' })
  }

  // Get sun position from eclipse_grid (nearest neighbor)
  const supabase = await serverSupabaseServiceRole(event)
  const { data: gridPoints } = await supabase
    .from('eclipse_grid')
    .select('lat, lng, sun_altitude, sun_azimuth, duration_seconds')
    .not('totality_start', 'is', null)
    .order('lat', { ascending: true })

  if (!gridPoints?.length) {
    throw createError({ statusCode: 503, message: 'Eclipse data not available' })
  }

  // Find nearest grid point
  let nearest = gridPoints[0]!
  let minDist = Infinity
  for (const gp of gridPoints) {
    const d = (gp.sun_altitude != null && gp.sun_azimuth != null)
      ? Math.sqrt((body.lat - gp.lat) ** 2 + (body.lng - gp.lng) ** 2)
      : Infinity
    if (d < minDist) {
      minDist = d
      nearest = gp
    }
  }

  if (nearest.sun_altitude == null || nearest.sun_azimuth == null) {
    return { in_totality_path: false } as any
  }

  // Run horizon check
  const result = checkHorizon(body.lat, body.lng, nearest.sun_altitude, nearest.sun_azimuth, demResult)

  // Generate PeakFinder URL
  const peakfinderUrl = `https://www.peakfinder.com/?lat=${body.lat}&lng=${body.lng}&name=Custom%20Location&ele=${Math.round(result.observer_elevation_m)}&azi=${Math.round(nearest.sun_azimuth)}`

  const response: HorizonCheckResponse = {
    ...result,
    peakfinder_url: peakfinderUrl,
    totality_duration_seconds: nearest.duration_seconds ?? null,
    in_totality_path: true,
  }

  return response
})
```

- [ ] **Step 2: Commit**

```bash
git add server/api/horizon/check.post.ts
git commit -m "feat: add dynamic horizon check API endpoint for Pro users"
```

---

### Task 9: Python Pre-computation Scripts

**Files:**
- Create: `scripts/prepare-dem-binary.py`
- Create: `scripts/compute-horizon-checks.py`
- These are standalone Python scripts run manually during data preparation

- [ ] **Step 1: Create the DEM preparation script**

```python
#!/usr/bin/env python3
"""
Crop ÍslandsDEM to western Iceland and export as Float32 binary for server use.

Usage:
    python scripts/prepare-dem-binary.py path/to/IslandsDEM_10m.tif

Outputs:
    server/data/dem/west-iceland-30m.bin
    server/data/dem/west-iceland-30m.meta.json
"""
import sys
import json
import os
import numpy as np
import rasterio
from rasterio.transform import from_bounds
from rasterio.warp import reproject, Resampling

# Western Iceland bounding box
BBOX = {
    'minLat': 63.8,
    'maxLat': 66.2,
    'minLng': -24.5,
    'maxLng': -18.0,
}

TARGET_CELLSIZE = 0.00027  # ~30m in latitude


def main():
    if len(sys.argv) < 2:
        print("Usage: python prepare-dem-binary.py <input-geotiff>")
        sys.exit(1)

    input_path = sys.argv[1]
    output_dir = os.path.join(os.path.dirname(__file__), '..', 'server', 'data', 'dem')
    os.makedirs(output_dir, exist_ok=True)

    with rasterio.open(input_path) as src:
        # Calculate output dimensions
        height = int((BBOX['maxLat'] - BBOX['minLat']) / TARGET_CELLSIZE)
        width = int((BBOX['maxLng'] - BBOX['minLng']) / TARGET_CELLSIZE)

        # Create output transform (south-to-north: origin at bottom-left)
        # rasterio uses north-to-south by default, so we export and then flip
        transform = from_bounds(
            BBOX['minLng'], BBOX['minLat'], BBOX['maxLng'], BBOX['maxLat'],
            width, height,
        )

        dst_array = np.empty((height, width), dtype=np.float32)

        reproject(
            source=rasterio.band(src, 1),
            destination=dst_array,
            dst_transform=transform,
            dst_crs='EPSG:4326',
            resampling=Resampling.bilinear,
        )

        # rasterio reprojects in north-to-south order. Flip to south-to-north.
        dst_array = np.flipud(dst_array)

        # Replace NaN/nodata with 0 (ocean)
        dst_array = np.nan_to_num(dst_array, nan=0.0, posinf=0.0, neginf=0.0)

        # Write binary
        bin_path = os.path.join(output_dir, 'west-iceland-30m.bin')
        dst_array.tofile(bin_path)
        print(f"Wrote {bin_path} ({os.path.getsize(bin_path) / 1e6:.1f} MB)")

        # Write metadata
        meta = {
            'minLat': BBOX['minLat'],
            'maxLat': BBOX['maxLat'],
            'minLng': BBOX['minLng'],
            'maxLng': BBOX['maxLng'],
            'width': width,
            'height': height,
            'cellSizeLat': TARGET_CELLSIZE,
            'cellSizeLng': TARGET_CELLSIZE,
            'rowOrder': 'south-to-north',
        }
        meta_path = os.path.join(output_dir, 'west-iceland-30m.meta.json')
        with open(meta_path, 'w') as f:
            json.dump(meta, f, indent=2)
        print(f"Wrote {meta_path}")
        print(f"Grid: {width} x {height} = {width * height:,} cells")


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Create the horizon pre-computation script**

```python
#!/usr/bin/env python3
"""
Pre-compute horizon checks for all curated viewing spots.

Usage:
    python scripts/compute-horizon-checks.py path/to/IslandsDEM_10m.tif spots.json

Input spots.json format:
    [{"id": "arnarstapi", "name": "Arnarstapi", "lat": 64.77, "lng": -23.63,
      "sun_altitude": 24.2, "sun_azimuth": 265}, ...]

Outputs:
    scripts/output/horizon-checks.json
"""
import sys
import json
import os
import math
import numpy as np
import rasterio

EYE_HEIGHT = 1.7
EARTH_RADIUS = 6371000


def move_along_bearing(lat, lng, bearing_deg, distance_m):
    bearing = math.radians(bearing_deg)
    lat_rad = math.radians(lat)
    delta = distance_m / EARTH_RADIUS

    new_lat = math.asin(
        math.sin(lat_rad) * math.cos(delta)
        + math.cos(lat_rad) * math.sin(delta) * math.cos(bearing)
    )
    new_lng = math.radians(lng) + math.atan2(
        math.sin(bearing) * math.sin(delta) * math.cos(lat_rad),
        math.cos(delta) - math.sin(lat_rad) * math.sin(new_lat),
    )
    return math.degrees(new_lat), math.degrees(new_lng)


def sample_distances():
    dists = []
    for d in range(50, 1001, 50):
        dists.append(d)
    for d in range(1200, 5001, 200):
        dists.append(d)
    for d in range(5500, 20001, 500):
        dists.append(d)
    return dists


DISTANCES = sample_distances()


def get_elevation(lat, lng, dataset, band):
    """Get elevation from rasterio dataset using bilinear interpolation."""
    try:
        row, col = dataset.index(lng, lat)
        if 0 <= row < dataset.height and 0 <= col < dataset.width:
            val = band[row, col]
            if val is None or np.isnan(val) or val < -1000:
                return 0.0
            return float(val)
    except Exception:
        pass
    return 0.0


def single_ray(observer_lat, observer_lng, observer_elev, bearing, dataset, band):
    max_angle = -90.0
    blocking_dist = 0
    blocking_elev = 0

    for dist in DISTANCES:
        s_lat, s_lng = move_along_bearing(observer_lat, observer_lng, bearing, dist)
        terrain_elev = get_elevation(s_lat, s_lng, dataset, band)
        elev_diff = terrain_elev - observer_elev
        angle = math.degrees(math.atan2(elev_diff, dist))

        if angle > max_angle:
            max_angle = angle
            blocking_dist = dist
            blocking_elev = terrain_elev

    return max_angle, blocking_dist, blocking_elev


def get_verdict(clearance):
    if clearance > 5:
        return 'clear'
    elif clearance >= 2:
        return 'marginal'
    elif clearance >= 0:
        return 'risky'
    else:
        return 'blocked'


def check_spot(spot, dataset, band):
    lat, lng = spot['lat'], spot['lng']
    sun_alt = spot['sun_altitude']
    sun_azi = spot['sun_azimuth']

    # Observer elevation
    dem_elev = get_elevation(lat, lng, dataset, band)
    observer_elev = (dem_elev if dem_elev > 0 else 2.0) + EYE_HEIGHT

    # Main ray
    max_angle, block_dist, block_elev = single_ray(lat, lng, observer_elev, sun_azi, dataset, band)
    clearance = sun_alt - max_angle
    verdict = get_verdict(clearance)

    # Sweep ±30°
    sweep = []
    for offset in range(-30, 31):
        azi = sun_azi + offset
        normalized_azi = azi % 360
        angle, dist, _ = single_ray(lat, lng, observer_elev, azi, dataset, band)
        sweep.append({
            'azimuth': round(normalized_azi, 1),
            'horizon_angle': round(max(angle, 0), 2),
            'distance_m': round(dist),
        })

    return {
        'spot_id': spot['id'],
        'verdict': verdict,
        'clearance_degrees': round(clearance, 1),
        'max_horizon_angle': round(max_angle, 1),
        'blocking_distance_m': None if verdict == 'clear' else round(block_dist),
        'blocking_elevation_m': None if verdict == 'clear' else round(block_elev),
        'observer_elevation_m': round(observer_elev, 1),
        'sun_altitude': sun_alt,
        'sun_azimuth': sun_azi,
        'checked_at': '2026-04-01T00:00:00Z',
        'sweep': sweep,
    }


def main():
    if len(sys.argv) < 3:
        print("Usage: python compute-horizon-checks.py <dem-geotiff> <spots-json>")
        sys.exit(1)

    dem_path = sys.argv[1]
    spots_path = sys.argv[2]

    with open(spots_path) as f:
        spots = json.load(f)

    output_dir = os.path.join(os.path.dirname(__file__), 'output')
    os.makedirs(output_dir, exist_ok=True)

    results = []

    with rasterio.open(dem_path) as dataset:
        band = dataset.read(1)
        print(f"Loaded DEM: {dataset.width}x{dataset.height}")

        for spot in spots:
            result = check_spot(spot, dataset, band)
            results.append(result)
            print(f"  {spot['name']}: {result['verdict']} ({result['clearance_degrees']}° clearance)")

    output_path = os.path.join(output_dir, 'horizon-checks.json')
    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\nWrote {len(results)} results to {output_path}")


if __name__ == '__main__':
    main()
```

- [ ] **Step 3: Commit**

```bash
git add scripts/prepare-dem-binary.py scripts/compute-horizon-checks.py
git commit -m "feat: add Python scripts for DEM preparation and horizon pre-computation"
```

---

### Task 10: Seed Horizon Check Data

**Files:**
- Create: `scripts/seed-horizon-checks.sql`
- Modify: `scripts/schema.sql` (if it exists — add migration)

This task creates the SQL to apply the schema change and seed pre-computed horizon data. The actual seeding happens after the Python script runs and produces `horizon-checks.json`.

- [ ] **Step 1: Create the migration SQL**

```sql
-- scripts/migrate-add-horizon-check.sql
-- Add horizon_check JSONB column to viewing_spots

ALTER TABLE viewing_spots ADD COLUMN IF NOT EXISTS horizon_check JSONB;

COMMENT ON COLUMN viewing_spots.horizon_check IS 'Pre-computed horizon obstruction check data (verdict, clearance, sweep)';
```

- [ ] **Step 2: Create the seed SQL template**

Create `scripts/seed-horizon-checks.sql` as a template. After running `compute-horizon-checks.py`, the output JSON is used to generate UPDATE statements:

```sql
-- scripts/seed-horizon-checks.sql
-- Generated from scripts/output/horizon-checks.json
-- Run after compute-horizon-checks.py produces the data

-- Example (will be filled with actual data):
-- UPDATE viewing_spots SET horizon_check = '{"verdict":"clear","clearance_degrees":23.5,...}'::jsonb WHERE id = 'latrabjarg';
-- UPDATE viewing_spots SET horizon_check = '{"verdict":"risky","clearance_degrees":1.2,...}'::jsonb WHERE id = 'bildudalur-harbour';
```

- [ ] **Step 3: Update spots API to include horizon_check**

Modify `server/api/spots/index.get.ts` to include `horizon_check` in the SELECT:

In `server/api/spots/index.get.ts`, add `horizon_check` to the select string:

```typescript
// Before:
.select('id, name, slug, lat, lng, region, has_services, cell_coverage, totality_duration_seconds, spot_type, trail_distance_km, trail_time_minutes, difficulty, elevation_gain_m, trailhead_lat, trailhead_lng')

// After:
.select('id, name, slug, lat, lng, region, has_services, cell_coverage, totality_duration_seconds, spot_type, trail_distance_km, trail_time_minutes, difficulty, elevation_gain_m, trailhead_lat, trailhead_lng, horizon_check')
```

The `[slug].get.ts` endpoint already uses `select('*')`, so it will include `horizon_check` automatically.

- [ ] **Step 4: Commit**

```bash
git add scripts/migrate-add-horizon-check.sql scripts/seed-horizon-checks.sql server/api/spots/index.get.ts
git commit -m "feat: add horizon_check schema migration and update spots API"
```

---

### Task 11: Spot Detail Page Integration

**Files:**
- Modify: `app/pages/spots/[slug].vue`
- Depends on: Task 3 (HorizonBadge), Task 4 (HorizonProfile), Task 5 (PeakFinderLink)

- [ ] **Step 1: Add horizon data parsing to script setup**

In `app/pages/spots/[slug].vue`, add after the `spotPhotos`/`heroPhoto` computed properties:

```typescript
import type { HorizonCheck, HorizonProfileData } from '~/types/horizon'

// Parse horizon_check JSONB
const horizonCheck = computed<HorizonCheck | null>(() => {
  const raw = spot.value.horizon_check
  if (!raw) return null
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return null }
  }
  return raw as HorizonCheck
})

const horizonProfileData = computed<HorizonProfileData | null>(() => {
  const hc = horizonCheck.value
  if (!hc?.sweep?.length) return null
  return {
    sun_azimuth: hc.sun_azimuth,
    sun_altitude: hc.sun_altitude,
    sweep: hc.sweep,
    verdict: hc.verdict,
    clearance_degrees: hc.clearance_degrees,
  }
})

// Compass direction from azimuth
function compassDirection(azimuth: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const index = Math.round(azimuth / 22.5) % 16
  return dirs[index]!
}
```

- [ ] **Step 2: Add HorizonBadge to the stats grid**

In the template, add a 5th stat card to the grid (after the cell coverage card). Change `grid-cols-2 sm:grid-cols-4` to `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` if desired, or add the badge below the grid:

After the closing `</div>` of the stats grid (line ~171), add:

```html
<!-- Horizon Check Badge -->
<div v-if="horizonCheck" class="mb-12">
  <HorizonBadge
    :verdict="horizonCheck.verdict"
    :clearance="horizonCheck.clearance_degrees"
  />
</div>
```

- [ ] **Step 3: Add Horizon View section**

After the stats grid / horizon badge and before the "Details" section (`<div class="space-y-8">`), add:

```html
<!-- Horizon View -->
<section v-if="horizonProfileData" class="mb-12">
  <h2 class="font-display text-xl font-semibold text-white mb-3 flex items-center gap-2">
    <svg class="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 15l5.12-5.12A3 3 0 0110.24 9H13a2 2 0 012 2v.76a3 3 0 01-.88 2.12L9 19" />
    </svg>
    {{ t('horizon.section_title') }}
  </h2>
  <p class="text-sm text-slate-400 mb-4">
    {{ t('horizon.sun_position', { altitude: horizonCheck!.sun_altitude.toFixed(0), direction: compassDirection(horizonCheck!.sun_azimuth) }) }}
  </p>

  <!-- Blocked warning banner -->
  <div
    v-if="horizonCheck!.verdict === 'blocked'"
    class="mb-4 px-4 py-3 rounded bg-red-900/20 border border-red-700/30 text-sm text-red-400"
  >
    {{ t('horizon.blocked_warning', {
      height: horizonCheck!.blocking_elevation_m ?? '?',
      distance: horizonCheck!.blocking_distance_m ?? '?',
    }) }}
  </div>

  <HorizonProfile :data="horizonProfileData" />

  <div class="mt-4">
    <PeakFinderLink
      :lat="spot.lat"
      :lng="spot.lng"
      :elevation="horizonCheck!.observer_elevation_m"
      :sun-azimuth="horizonCheck!.sun_azimuth"
      :spot-name="spot.name"
    />
  </div>
</section>
```

- [ ] **Step 4: Verify the page renders**

Run: `npx nuxi dev`, navigate to a spot detail page. Without real horizon data it won't show the section (correctly gated by `v-if`).

- [ ] **Step 5: Commit**

```bash
git add app/pages/spots/[slug].vue
git commit -m "feat: add horizon view section to spot detail page"
```

---

### Task 12: Recommendation Engine Integration

**Files:**
- Modify: `app/composables/useRecommendation.ts`
- Depends on: Task 1 (types)

- [ ] **Step 1: Update the Profile interface and weights**

In `app/composables/useRecommendation.ts`:

Add `horizon: number` to the `weights` type in the `Profile` interface:

```typescript
weights: { weather: number; duration: number; services: number; accessibility: number; distance: number; horizon: number }
```

Add `horizonBlocked?: boolean` to the `floors` type:

```typescript
floors: {
  hasServices?: boolean
  cellCoverageNot?: string
  difficultyNot?: string
  spotTypeNot?: string
  horizonBlocked?: boolean
}
```

- [ ] **Step 2: Update all profile weight definitions**

Multiply all existing weights by 0.75 and add `horizon: 0.25`:

```typescript
export const PROFILES: Profile[] = [
  {
    id: 'photographer',
    name: 'Photographer',
    descriptionKey: 'recommend.profiles.photographer',
    weights: { weather: 0.2625, duration: 0.2625, services: 0.0375, accessibility: 0.075, distance: 0.1125, horizon: 0.25 },
    floors: { horizonBlocked: true },
  },
  {
    id: 'family',
    name: 'Family',
    descriptionKey: 'recommend.profiles.family',
    weights: { weather: 0.1875, duration: 0.075, services: 0.225, accessibility: 0.1875, distance: 0.075, horizon: 0.25 },
    floors: { hasServices: true, cellCoverageNot: 'none', difficultyNot: 'challenging', horizonBlocked: true },
  },
  {
    id: 'hiker',
    name: 'Hiker',
    descriptionKey: 'recommend.profiles.hiker',
    weights: { weather: 0.1875, duration: 0.15, services: 0.0375, accessibility: 0.2625, distance: 0.1125, horizon: 0.25 },
    floors: { spotTypeNot: 'drive-up', horizonBlocked: true },
    invertAccessibility: true,
  },
  {
    id: 'skychaser',
    name: 'Sky Chaser',
    descriptionKey: 'recommend.profiles.skychaser',
    weights: { weather: 0.375, duration: 0.1125, services: 0.0375, accessibility: 0.0375, distance: 0.1875, horizon: 0.25 },
    floors: { horizonBlocked: true },
  },
  {
    id: 'firsttimer',
    name: 'First-Timer',
    descriptionKey: 'recommend.profiles.firsttimer',
    weights: { weather: 0.225, duration: 0.1125, services: 0.15, accessibility: 0.15, distance: 0.1125, horizon: 0.25 },
    floors: { difficultyNot: 'challenging', horizonBlocked: true },
  },
]
```

- [ ] **Step 3: Add horizon scoring and floor check**

Add the `computeHorizonScore` helper after the existing helpers:

```typescript
function computeHorizonScore(horizonCheck: any): number {
  if (!horizonCheck?.verdict) return 0.5  // unknown, neutral
  switch (horizonCheck.verdict) {
    case 'clear': return 1.0
    case 'marginal': return 0.7
    case 'risky': return 0.3
    case 'blocked': return 0.0
    default: return 0.5
  }
}
```

In the floor checks section inside the `allSpots.map()` callback, add after the existing floor checks:

```typescript
if (floors.horizonBlocked && spot.horizon_check?.verdict === 'blocked') filtered = true
```

- [ ] **Step 4: Add horizon to the scoring computation**

Update the `factors` object to include horizon:

```typescript
const horizonFactor = computeHorizonScore(spot.horizon_check)

const factors = {
  weather: weatherFactor,
  duration: durationFactor,
  services: servicesFactor,
  accessibility: accessFactor,
  distance: distanceFactor,
  horizon: horizonFactor,
}
```

Add `allHorizonMissing` check after the existing `allWeatherMissing` check. Place this near where `allWeatherMissing` is computed (before the `allSpots.map()` call):

```typescript
const allHorizonMissing = allSpots.every(s => !s.horizon_check?.verdict)
```

Update the weighted sum to handle both missing-data cases:

```typescript
// Compute weight exclusions for missing data
let excludedWeight = 0
if (allWeatherMissing) excludedWeight += profile.weights.weather
if (allHorizonMissing) excludedWeight += profile.weights.horizon
const wScale = excludedWeight > 0 ? 1 / (1 - excludedWeight) : 1

if (allWeatherMissing || allHorizonMissing) {
  score = 0
  if (!allWeatherMissing) score += profile.weights.weather * wScale * weatherFactor
  score += profile.weights.duration * wScale * durationFactor
  score += profile.weights.services * wScale * servicesFactor
  score += profile.weights.accessibility * wScale * accessFactor
  score += profile.weights.distance * wScale * distanceFactor
  if (!allHorizonMissing) score += profile.weights.horizon * wScale * horizonFactor
}
else {
  const w = profile.weights
  score = w.weather * weatherFactor + w.duration * durationFactor
    + w.services * servicesFactor + w.accessibility * accessFactor
    + w.distance * distanceFactor + w.horizon * horizonFactor
}
```

Also update the `RankedSpot` interface and `emptyFactors` to include `horizon`:

```typescript
export interface RankedSpot {
  spot: any
  score: number
  filtered: boolean
  factors: { weather: number; duration: number; services: number; accessibility: number; distance: number; horizon: number }
  distanceKm: number
  weatherStatus: string | null
  cloudCover: number | null
}

const emptyFactors = { weather: 0, duration: 0, services: 0, accessibility: 0, distance: 0, horizon: 0 }
```

- [ ] **Step 5: Commit**

```bash
git add app/composables/useRecommendation.ts
git commit -m "feat: add horizon factor to recommendation engine with 0.25 weight"
```

---

### Task 13: Map Integration + DynamicHorizonCheck

**Files:**
- Create: `app/components/DynamicHorizonCheck.vue`
- Modify: `app/components/EclipseMap.vue`
- Depends on: Task 3 (HorizonBadge), Task 4 (HorizonProfile), Task 5 (PeakFinderLink), Task 8 (API)

- [ ] **Step 1: Add horizon_check to EclipseMap spots prop type**

In `app/components/EclipseMap.vue`, update the `spots` prop type to include `horizon_check`:

```typescript
spots?: Array<{
  id: string
  name: string
  slug: string
  lat: number
  lng: number
  region: string
  totality_duration_seconds: number
  has_services: boolean
  cell_coverage: string
  horizon_check?: { verdict: string } | null
}>
```

- [ ] **Step 2: Add verdict-colored rings to spot markers**

In the `updateSpotMarkers()` function, after the existing marker styling logic, add horizon verdict ring coloring. In the default amber dot branch (the `else` at ~line 223), replace the border color logic:

```typescript
// Horizon verdict ring color
const verdictColors: Record<string, string> = {
  clear: '#22c55e',
  marginal: '#eab308',
  risky: '#f97316',
  blocked: '#ef4444',
}
const verdict = spot.horizon_check?.verdict
const ringColor = verdict ? (verdictColors[verdict] || '#f59e0b') : '#f59e0b'
```

Use `ringColor` instead of the hardcoded `#f59e0b` for the border color in the non-ranked marker styles. For ranked markers, add a small colored indicator dot or adjust the ring. For blocked markers, add a visual strike-through.

The exact implementation involves modifying the `el.style.cssText` assignments to use `ringColor` as the border color. This affects the default dot style, the ranked style, and the filtered style.

- [ ] **Step 3: Create the DynamicHorizonCheck component**

```vue
<script setup lang="ts">
import type { HorizonCheckResponse, HorizonProfileData } from '~/types/horizon'

const props = defineProps<{
  lat: number
  lng: number
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()

const loading = ref(true)
const error = ref<string | null>(null)
const result = ref<HorizonCheckResponse | null>(null)

const profileData = computed<HorizonProfileData | null>(() => {
  const r = result.value
  if (!r?.sweep?.length) return null
  return {
    sun_azimuth: r.sun_azimuth,
    sun_altitude: r.sun_altitude,
    sweep: r.sweep,
    verdict: r.verdict,
    clearance_degrees: r.clearance_degrees,
  }
})

const navigateUrl = computed(() =>
  `https://www.google.com/maps/dir/?api=1&destination=${props.lat},${props.lng}`,
)

onMounted(async () => {
  try {
    const data = await $fetch<HorizonCheckResponse>('/api/horizon/check', {
      method: 'POST',
      body: { lat: props.lat, lng: props.lng },
    })
    result.value = data
  } catch (e: any) {
    if (e?.statusCode === 403) {
      error.value = 'pro_required'
    } else {
      error.value = e?.message || 'Failed to check horizon'
    }
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="bg-void-surface border border-void-border/40 rounded p-4 max-w-lg w-full">
    <!-- Close button -->
    <div class="flex justify-between items-center mb-3">
      <h3 class="font-display text-sm font-semibold text-white">{{ t('horizon.section_title') }}</h3>
      <button class="text-slate-500 hover:text-slate-300 transition-colors" @click="emit('close')">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center gap-2 text-sm text-slate-400 py-4">
      <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {{ t('horizon.dynamic_loading') }}
    </div>

    <!-- Pro upgrade prompt -->
    <div v-else-if="error === 'pro_required'" class="text-center py-4">
      <p class="text-sm text-slate-400 mb-3">{{ t('horizon.upgrade_prompt') }}</p>
      <NuxtLink to="/pro" class="inline-block px-4 py-2 bg-corona/20 border border-corona/40 rounded text-sm text-corona hover:bg-corona/30 transition-colors">
        {{ t('horizon.upgrade_button', 'Upgrade to Pro') }}
      </NuxtLink>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-sm text-red-400 py-4">
      {{ error }}
    </div>

    <!-- Result -->
    <div v-else-if="result">
      <div v-if="!result.in_totality_path" class="text-sm text-slate-400 py-2">
        {{ t('horizon.outside_path', 'This location is outside the path of totality.') }}
      </div>
      <template v-else>
        <HorizonBadge :verdict="result.verdict" :clearance="result.clearance_degrees" class="mb-3" />

        <HorizonProfile v-if="profileData" :data="profileData" :height="200" class="mb-3" />

        <div class="flex items-center gap-3 mt-3">
          <PeakFinderLink
            :lat="lat"
            :lng="lng"
            :elevation="result.observer_elevation_m"
            :sun-azimuth="result.sun_azimuth"
            spot-name="Custom Location"
          />
          <a
            :href="navigateUrl"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center gap-1.5 px-3 py-2 rounded border border-void-border/40 bg-void-surface text-sm text-slate-300 hover:text-white hover:border-corona/40 transition-colors"
          >
            {{ t('horizon.navigate_here', 'Navigate here') }}
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </template>
    </div>
  </div>
</template>
```

- [ ] **Step 4: Commit**

```bash
git add app/components/DynamicHorizonCheck.vue app/components/EclipseMap.vue
git commit -m "feat: add map horizon verdict rings and DynamicHorizonCheck panel"
```

---

### Task 14: SpotCard HorizonBadge Integration

**Files:**
- Modify: `app/components/SpotCard.vue`
- Depends on: Task 3 (HorizonBadge)

- [ ] **Step 1: Add HorizonBadge to SpotCard**

Read the existing `SpotCard.vue` component. Add the `HorizonBadge` in compact mode to the card layout, showing the horizon verdict if the spot has `horizon_check` data. Place it near the existing spot metadata (e.g., next to totality duration or cell coverage).

```html
<HorizonBadge
  v-if="spot.horizon_check?.verdict"
  :verdict="spot.horizon_check.verdict"
  :clearance="spot.horizon_check.clearance_degrees"
  compact
/>
```

Ensure the spot prop type includes `horizon_check` in SpotCard's props.

- [ ] **Step 2: Commit**

```bash
git add app/components/SpotCard.vue
git commit -m "feat: add compact HorizonBadge to SpotCard"
```

---

### Task 15: Final Verification

- [ ] **Step 1: Run type checking**

Run: `npx nuxi typecheck`
Expected: No errors related to horizon types or components

- [ ] **Step 2: Run dev server and verify pages**

Run: `npx nuxi dev`
- Check spot detail page renders correctly (horizon section hidden when no data)
- Check map page renders with updated marker logic
- Check recommend page still works with updated scoring

- [ ] **Step 3: Verify the Python scripts are syntactically correct**

Run: `python -c "import ast; ast.parse(open('scripts/compute-horizon-checks.py').read()); print('OK')"` and same for `prepare-dem-binary.py`

- [ ] **Step 4: Final commit with any fixes**

If any adjustments were needed, commit them.
