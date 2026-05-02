# Weather Pictograms Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace colored dot markers with SVG weather pictograms using an "eclipse metaphor" where the sun is progressively occluded by clouds.

**Architecture:** A shared `weatherSvgHtml()` function in `eclipse.ts` generates SVG markup strings for 6 weather states. `WeatherIcon.vue` wraps it for Vue templates via `v-html`. `EclipseMap.vue` uses it via `el.innerHTML` for Mapbox markers. Thresholds change from 4 to 5 levels (20/40/60/80/100).

**Tech Stack:** Vue 3, inline SVG, Mapbox GL JS

**Spec:** `docs/superpowers/specs/2026-03-15-weather-pictograms-design.md`

---

## Chunk 1: Core utilities and component

### Task 1: Update cloud cover levels and add helper functions in eclipse.ts

**Files:**
- Modify: `app/utils/eclipse.ts`

- [ ] **Step 1: Update CLOUD_COVER_LEVELS to 5 entries**

In `app/utils/eclipse.ts`, replace the existing `CLOUD_COVER_LEVELS` array (lines 7-12) with:

```typescript
export const CLOUD_COVER_LEVELS = [
  { max: 20, color: '#22c55e', label: 'Clear' },
  { max: 40, color: '#f59e0b', label: 'Mostly clear' },
  { max: 60, color: '#f59e0b', label: 'Partly cloudy' },
  { max: 80, color: '#f97316', label: 'Mostly cloudy' },
  { max: 100, color: '#ef4444', label: 'Overcast' },
] as const
```

- [ ] **Step 2: Add cloudLevel() function**

After the existing `cloudColor()` function (line 22), add:

```typescript
export function cloudLevel(cover: number | null | undefined): { color: string; label: string } {
  if (cover == null) return CLOUD_COVER_NO_DATA
  for (const level of CLOUD_COVER_LEVELS) {
    if (cover <= level.max) return level
  }
  return CLOUD_COVER_LEVELS[CLOUD_COVER_LEVELS.length - 1]
}
```

- [ ] **Step 3: Add weatherSvgHtml() function**

After `cloudLevel()`, add the SVG rendering function. This is the core of the feature — it generates the inline SVG markup for each weather state. The SVG uses `viewBox="0 0 36 36"` and scales via `width`/`height` attributes.

```typescript
export function weatherSvgHtml(cloudCover: number | null | undefined, size: number = 36): string {
  const level = cloudLevel(cloudCover)
  const c = level.color
  const w = size
  const h = size

  if (cloudCover == null) {
    // No data: dashed circle with ?
    return `<svg width="${w}" height="${h}" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <circle cx="18" cy="18" r="13" stroke="${c}" stroke-width="1" stroke-dasharray="3 2" fill="none" opacity="0.4"/>
      <text x="18" y="22" text-anchor="middle" fill="${c}" font-family="monospace" font-size="14" opacity="0.5">?</text>
    </svg>`
  }

  if (cloudCover <= 20) {
    // Clear: full sun with rays and radial glow
    return `<svg width="${w}" height="${h}" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <defs><radialGradient id="sg-${size}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${c}" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="${c}" stop-opacity="0"/>
      </radialGradient></defs>
      <circle cx="18" cy="18" r="17" fill="url(#sg-${size})"/>
      <circle cx="18" cy="18" r="7.5" fill="${c}" fill-opacity="0.15" stroke="${c}" stroke-width="1.2"/>
      <line x1="18" y1="3" x2="18" y2="7" stroke="${c}" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>
      <line x1="18" y1="29" x2="18" y2="33" stroke="${c}" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>
      <line x1="3" y1="18" x2="7" y2="18" stroke="${c}" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>
      <line x1="29" y1="18" x2="33" y2="18" stroke="${c}" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>
      <line x1="7.4" y1="7.4" x2="10.2" y2="10.2" stroke="${c}" stroke-width="1" stroke-linecap="round" opacity="0.4"/>
      <line x1="25.8" y1="25.8" x2="28.6" y2="28.6" stroke="${c}" stroke-width="1" stroke-linecap="round" opacity="0.4"/>
      <line x1="7.4" y1="28.6" x2="10.2" y2="25.8" stroke="${c}" stroke-width="1" stroke-linecap="round" opacity="0.4"/>
      <line x1="25.8" y1="10.2" x2="28.6" y2="7.4" stroke="${c}" stroke-width="1" stroke-linecap="round" opacity="0.4"/>
    </svg>`
  }

  if (cloudCover <= 40) {
    // Mostly clear: sun with small cloud wisps bottom-right
    return `<svg width="${w}" height="${h}" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <defs><radialGradient id="sg2-${size}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${c}" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="${c}" stop-opacity="0"/>
      </radialGradient></defs>
      <circle cx="16" cy="16" r="15" fill="url(#sg2-${size})"/>
      <circle cx="16" cy="16" r="7" fill="${c}" fill-opacity="0.12" stroke="${c}" stroke-width="1.2"/>
      <line x1="16" y1="2" x2="16" y2="6" stroke="${c}" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/>
      <line x1="2" y1="16" x2="6" y2="16" stroke="${c}" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/>
      <line x1="6.1" y1="6.1" x2="8.9" y2="8.9" stroke="${c}" stroke-width="1" stroke-linecap="round" opacity="0.35"/>
      <ellipse cx="27" cy="28" rx="8" ry="5" fill="#0a1020" stroke="${c}" stroke-width="1" opacity="0.7"/>
      <ellipse cx="24" cy="26" rx="4" ry="3.5" fill="#0a1020" stroke="${c}" stroke-width="1" opacity="0.7"/>
    </svg>`
  }

  if (cloudCover <= 60) {
    // Partly cloudy: sun peeking above cloud bank
    return `<svg width="${w}" height="${h}" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <defs><radialGradient id="sg3-${size}" cx="40%" cy="35%" r="40%">
        <stop offset="0%" stop-color="${c}" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="${c}" stop-opacity="0"/>
      </radialGradient></defs>
      <circle cx="14" cy="13" r="13" fill="url(#sg3-${size})"/>
      <circle cx="14" cy="13" r="6" fill="${c}" fill-opacity="0.1" stroke="${c}" stroke-width="1.2"/>
      <line x1="14" y1="1" x2="14" y2="4.5" stroke="${c}" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
      <line x1="2" y1="13" x2="5.5" y2="13" stroke="${c}" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
      <line x1="5.5" y1="4.5" x2="7.8" y2="6.8" stroke="${c}" stroke-width="0.8" stroke-linecap="round" opacity="0.3"/>
      <ellipse cx="20" cy="27" rx="12" ry="6.5" fill="#0a1020" stroke="${c}" stroke-width="1.2"/>
      <ellipse cx="15" cy="23" rx="6" ry="5" fill="#0a1020" stroke="${c}" stroke-width="1.2"/>
      <ellipse cx="24" cy="24" rx="5" ry="4.5" fill="#0a1020" stroke="${c}" stroke-width="1.2"/>
      <ellipse cx="20" cy="27" rx="11" ry="5.5" fill="#0a1020"/>
    </svg>`
  }

  if (cloudCover <= 80) {
    // Mostly cloudy: faint sun behind dominant clouds
    return `<svg width="${w}" height="${h}" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <circle cx="12" cy="10" r="4" fill="${c}" fill-opacity="0.08" stroke="${c}" stroke-width="0.8" opacity="0.4"/>
      <ellipse cx="19" cy="25" rx="14" ry="7.5" fill="#0a1020" stroke="${c}" stroke-width="1.2"/>
      <ellipse cx="13" cy="19" rx="7" ry="6" fill="#0a1020" stroke="${c}" stroke-width="1.2"/>
      <ellipse cx="24" cy="20" rx="6" ry="5.5" fill="#0a1020" stroke="${c}" stroke-width="1.2"/>
      <ellipse cx="19" cy="24" rx="13" ry="6.5" fill="#0a1020"/>
      <ellipse cx="18" cy="22" rx="10" ry="5" fill="#0a1020"/>
    </svg>`
  }

  // Overcast: dense clouds with rain wisps
  return `<svg width="${w}" height="${h}" viewBox="0 0 36 36" fill="none" aria-hidden="true">
    <ellipse cx="20" cy="16" rx="10" ry="6" fill="#0a1020" stroke="${c}" stroke-width="0.8" opacity="0.4"/>
    <ellipse cx="18" cy="24" rx="14" ry="7" fill="#0a1020" stroke="${c}" stroke-width="1.2"/>
    <ellipse cx="11" cy="19" rx="7" ry="6" fill="#0a1020" stroke="${c}" stroke-width="1.2"/>
    <ellipse cx="24" cy="19.5" rx="6.5" ry="5.5" fill="#0a1020" stroke="${c}" stroke-width="1.2"/>
    <ellipse cx="18" cy="23" rx="13" ry="6" fill="#0a1020"/>
    <ellipse cx="17" cy="21" rx="10" ry="5" fill="#0a1020"/>
    <line x1="13" y1="30" x2="12" y2="34" stroke="${c}" stroke-width="0.8" stroke-linecap="round" opacity="0.3"/>
    <line x1="18" y1="31" x2="17" y2="34.5" stroke="${c}" stroke-width="0.8" stroke-linecap="round" opacity="0.3"/>
    <line x1="23" y1="30" x2="22" y2="34" stroke="${c}" stroke-width="0.8" stroke-linecap="round" opacity="0.3"/>
  </svg>`
}
```

- [ ] **Step 4: Verify the dev server starts**

Run: `npx nuxt dev`
Expected: Server starts without errors.

- [ ] **Step 5: Commit**

```bash
git add app/utils/eclipse.ts
git commit -m "feat: add 5-level cloud cover thresholds and weatherSvgHtml() renderer"
```

---

### Task 2: Create WeatherIcon.vue component

**Files:**
- Create: `app/components/WeatherIcon.vue`

- [ ] **Step 1: Create the component**

Create `app/components/WeatherIcon.vue`:

```vue
<script setup lang="ts">
import { weatherSvgHtml } from '~/utils/eclipse'

const props = withDefaults(defineProps<{
  cloudCover: number | null
  size?: number
}>(), {
  size: 36,
})

const svgMarkup = computed(() => weatherSvgHtml(props.cloudCover, props.size))
</script>

<template>
  <span v-html="svgMarkup" />
</template>
```

- [ ] **Step 2: Verify the dev server starts**

Run: `npx nuxt dev`
Expected: Server starts without errors. Component is auto-imported by Nuxt.

- [ ] **Step 3: Commit**

```bash
git add app/components/WeatherIcon.vue
git commit -m "feat: add WeatherIcon.vue component"
```

---

### Task 3: Update useRecommendation.ts to use cloudLevel()

**Files:**
- Modify: `app/composables/useRecommendation.ts`

- [ ] **Step 1: Replace duplicated threshold logic**

In `app/composables/useRecommendation.ts`, add the import at the top (line 1):

```typescript
import { cloudLevel } from '~/utils/eclipse'
```

Then replace the weather status block (lines 203-209):

```typescript
      // Weather status label
      let weatherStatus: string | null = null
      if (cloudCover != null) {
        if (cloudCover <= 25) weatherStatus = 'Clear'
        else if (cloudCover <= 50) weatherStatus = 'Partly cloudy'
        else if (cloudCover <= 75) weatherStatus = 'Mostly cloudy'
        else weatherStatus = 'Overcast'
      }
```

With:

```typescript
      // Weather status label
      const weatherStatus = cloudCover != null ? cloudLevel(cloudCover).label : null
```

- [ ] **Step 2: Add cloudCover to RankedSpot result**

The recommend page needs the raw `cloudCover` number to pass to `WeatherIcon`. In the same file, add `cloudCover` to the `RankedSpot` interface (line 112):

```typescript
export interface RankedSpot {
  spot: any
  score: number
  filtered: boolean
  factors: { weather: number; duration: number; services: number; accessibility: number; distance: number }
  distanceKm: number
  weatherStatus: string | null
  cloudCover: number | null
}
```

Then update the two return statements that create `RankedSpot` objects:

1. The no-profile path (line 136) — add `cloudCover: null`:
```typescript
.map(spot => ({ spot, score: -1, filtered: false, factors: { ...emptyFactors }, distanceKm: 0, weatherStatus: null, cloudCover: null }))
```

2. The filtered path (line 162) — add `cloudCover: null`:
```typescript
return { spot, score: 0, filtered: true, factors: { ...emptyFactors }, distanceKm: 0, weatherStatus: null, cloudCover: null }
```

3. The scored path (line 211) — add `cloudCover`:
```typescript
return { spot, score, filtered: false, factors, distanceKm: Math.round(distKm), weatherStatus, cloudCover }
```

- [ ] **Step 3: Verify the dev server starts**

Run: `npx nuxt dev`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add app/composables/useRecommendation.ts
git commit -m "refactor: use cloudLevel() for weather status, expose cloudCover in RankedSpot"
```

---

## Chunk 2: Integration into map and recommend pages

### Task 4: Replace colored dots in EclipseMap.vue markers

**Files:**
- Modify: `app/components/EclipseMap.vue`

- [ ] **Step 1: Update import**

In `app/components/EclipseMap.vue` line 3, add `weatherSvgHtml` to the import:

```typescript
import { cloudColor, formatDuration, weatherSvgHtml } from '~/utils/eclipse'
```

- [ ] **Step 2: Replace marker element creation**

Replace the marker element creation block (lines 105-117):

```typescript
    const el = document.createElement('div')
    el.className = 'station-marker'
    el.setAttribute('role', 'button')
    el.setAttribute('aria-label', `${station.name} weather station${station.cloud_cover != null ? `, ${station.cloud_cover}% cloud cover` : ''}`)
    el.style.cssText = `
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: ${color};
      border: 2px solid rgba(5, 8, 16, 0.8);
      box-shadow: 0 0 8px ${color}66;
      cursor: pointer;
    `
```

With:

```typescript
    const el = document.createElement('div')
    el.className = 'station-marker'
    el.setAttribute('role', 'button')
    el.setAttribute('aria-label', `${station.name} weather station${station.cloud_cover != null ? `, ${station.cloud_cover}% cloud cover` : ''}`)
    el.style.cssText = 'cursor: pointer; line-height: 0;'
    el.innerHTML = weatherSvgHtml(station.cloud_cover, 18)
```

- [ ] **Step 3: Verify in browser**

Open `http://localhost:3000/map`
Expected: Weather station markers show SVG pictogram icons instead of colored circles. Popups still work when clicking markers.

- [ ] **Step 4: Commit**

```bash
git add app/components/EclipseMap.vue
git commit -m "feat: replace colored dot markers with weather pictogram SVGs"
```

---

### Task 5: Replace legend dots in map.vue

**Files:**
- Modify: `app/pages/map.vue`

- [ ] **Step 1: Update legend items to include cloud cover values**

In `app/pages/map.vue`, replace the `legendItems` computed (lines 113-116):

```typescript
const legendItems = [
  ...CLOUD_COVER_LEVELS.map(l => ({ label: l.label, color: l.color })),
  { label: CLOUD_COVER_NO_DATA.label, color: CLOUD_COVER_NO_DATA.color },
]
```

With:

```typescript
const legendItems = [
  ...CLOUD_COVER_LEVELS.map(l => ({ label: l.label, cloudCover: l.max })),
  { label: CLOUD_COVER_NO_DATA.label, cloudCover: null as number | null },
]
```

- [ ] **Step 2: Replace colored dot span with WeatherIcon in template**

Replace the legend dot rendering (lines 213-218):

```html
          <span
            class="w-2.5 h-2.5 rounded-full shrink-0"
            :style="{ background: item.color, boxShadow: `0 0 6px ${item.color}44` }"
            aria-hidden="true"
          />
          <span class="text-xs font-mono text-slate-400">{{ item.label }}</span>
```

With:

```html
          <WeatherIcon :cloud-cover="item.cloudCover" :size="20" class="shrink-0" />
          <span class="text-xs font-mono text-slate-400">{{ item.label }}</span>
```

- [ ] **Step 3: Remove unused import**

The `CLOUD_COVER_NO_DATA` import is still needed for the legend (it provides the label). However, `CLOUD_COVER_LEVELS` is still imported for the legend items. Check if the `color` property is still used anywhere in map.vue — if not, the code is fine as-is since we're only accessing `label` and `max` now.

- [ ] **Step 4: Verify in browser**

Open `http://localhost:3000/map`
Expected: Legend panel shows SVG weather icons next to each label instead of colored dots. All 6 states visible (5 cloud levels + "No data").

- [ ] **Step 5: Commit**

```bash
git add app/pages/map.vue
git commit -m "feat: replace legend dots with WeatherIcon pictograms"
```

---

### Task 6: Add WeatherIcon to recommend.vue spot cards

**Files:**
- Modify: `app/pages/recommend.vue`

- [ ] **Step 1: Replace weather status text with icon + text**

In `app/pages/recommend.vue`, replace the weather status template fragment (line 218):

```html
                <template v-if="item.weatherStatus"> · {{ item.weatherStatus }}</template>
```

With:

```html
                <template v-if="item.weatherStatus">
                  · <WeatherIcon :cloud-cover="item.cloudCover" :size="20" class="inline-block align-middle" />
                  {{ item.weatherStatus }}
                </template>
```

- [ ] **Step 2: Verify in browser**

Open `http://localhost:3000/recommend`
Expected: Spot cards show the weather pictogram icon inline next to the weather status text (e.g., [sun icon] Clear). The icon is 20px and aligns with the text baseline.

- [ ] **Step 3: Commit**

```bash
git add app/pages/recommend.vue
git commit -m "feat: add weather pictogram icons to recommend page spot cards"
```

---

### Task 7: Verify and push

**Files:** None modified — verification only.

- [ ] **Step 1: Open the map page**

Navigate to `http://localhost:3000/map`
Expected: Station markers show weather pictograms. Legend shows matching icons. Clicking markers opens popups with cloud cover data.

- [ ] **Step 2: Open the recommend page**

Navigate to `http://localhost:3000/recommend`
Expected: Spot cards show weather icon + text label inline.

- [ ] **Step 3: Test with different cloud cover values**

Check that different stations show different icons (clear vs cloudy vs overcast). If all stations have similar cloud cover, the icons will look similar — that's expected.

- [ ] **Step 4: Test null/no-data state**

If any station has no cloud cover data, it should show the dashed circle with `?`.

- [ ] **Step 5: Push**

```bash
git push
```
