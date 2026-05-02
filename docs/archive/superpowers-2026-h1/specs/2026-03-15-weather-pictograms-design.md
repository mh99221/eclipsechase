# Weather Pictograms — Design Spec

## Goal

Replace colored dot markers with SVG weather pictograms using an "eclipse metaphor" — the sun disc is progressively occluded by clouds, echoing the eclipse theme. Icons are used on the map, map legend, and recommend page spot cards.

## Context

The existing codebase has:
- `app/utils/eclipse.ts` — `CLOUD_COVER_LEVELS` array (4 levels: 25/50/75/100) and `cloudColor()` function
- `app/components/EclipseMap.vue` — renders station markers as 14px colored `<div>` circles with glow
- `app/pages/map.vue` — legend renders colored dots from `CLOUD_COVER_LEVELS`
- `app/pages/recommend.vue` — spot cards show weather status as plain text
- `app/composables/useRecommendation.ts` — duplicates threshold logic to compute `weatherStatus` string

**Problem:** Colored dots require users to decode a color scale. Pictograms are instantly recognizable.

## Architecture

### New component: `WeatherIcon.vue`

A single Vue component that renders an inline SVG based on cloud cover percentage.

**Props:**
- `cloudCover: number | null` — percentage 0-100
- `size: number` — pixel size, default 36

**Output:** An inline `<svg>` element at the given size, with `viewBox="0 0 36 36"`, rendering one of 6 states.

### Icon states (Eclipse Metaphor)

Each icon uses the same color as its `CLOUD_COVER_LEVELS` entry. The sun disc progressively disappears behind cloud shapes.

| Range | Label | Color | Visual |
|---|---|---|---|
| 0–20% | Clear | `#22c55e` (green) | Full sun disc with 8 rays and radial glow |
| 21–40% | Mostly clear | `#f59e0b` (amber) | Sun with small cloud wisps bottom-right, partial rays visible |
| 41–60% | Partly cloudy | `#f59e0b` (amber) | Sun peeking above a cloud bank that covers the lower half |
| 61–80% | Mostly cloudy | `#f97316` (orange) | Faint, tiny sun remnant behind dominant cloud mass |
| 81–100% | Overcast | `#ef4444` (red) | Dense layered clouds filling the frame, rain wisps below, no sun |
| null | No data | `#94a3b8` (slate) | Dashed circle outline with `?` symbol |

### SVG design principles

- `viewBox="0 0 36 36"` for all icons — scales cleanly via `width`/`height`
- Stroke-based outlines at 1.2px weight for crisp rendering at small sizes
- Cloud shapes use `<ellipse>` elements with `fill="#0a1020"` (dark background) and colored stroke — this creates the "cutout" effect where clouds mask the sky/sun behind them
- Seam-filling ellipses (no stroke, just fill) cover overlap artifacts between cloud shapes
- Sun disc uses two concentric circles: outer with low fill-opacity, inner with higher fill-opacity
- Radial gradient glow behind sun for the "Clear" state
- Rain wisps on "Overcast" use short angled lines at low opacity
- `aria-hidden="true"` on the SVG — the label provides the accessible name

## Threshold change: 4 → 5 levels

Current `CLOUD_COVER_LEVELS` has 4 entries (max: 25, 50, 75, 100). The new design adds a 5th level: "Mostly clear" (21–40%).

New thresholds:
```typescript
export const CLOUD_COVER_LEVELS = [
  { max: 20, color: '#22c55e', label: 'Clear' },
  { max: 40, color: '#f59e0b', label: 'Mostly clear' },
  { max: 60, color: '#f59e0b', label: 'Partly cloudy' },
  { max: 80, color: '#f97316', label: 'Mostly cloudy' },
  { max: 100, color: '#ef4444', label: 'Overcast' },
] as const
```

Note: "Mostly clear" and "Partly cloudy" share the same amber color — they are distinguished by the icon shape, not color. This is intentional: at map-marker size the color provides quick good/bad scanning, while the icon shape provides nuance at card size.

**Behavioral change:** The old thresholds were 25/50/75/100. Stations at 21–25% cloud cover will shift from "Clear" to "Mostly clear". This is intentional — 25% cloud cover is not truly clear skies, and the finer granularity better serves eclipse chasers who need accurate conditions.

`CLOUD_COVER_NO_DATA` remains unchanged as a separate constant.

## Files to modify

- **Create: `app/components/WeatherIcon.vue`** — new component rendering the 6 SVG states based on `cloudCover` prop. Uses `cloudColor()` from eclipse.ts for color selection.
- **Modify: `app/utils/eclipse.ts`** — update `CLOUD_COVER_LEVELS` from 4 to 5 entries with new thresholds (20/40/60/80/100). Add `cloudLevel(cover: number | null): { color: string; label: string }` function that returns the matching level object, or `CLOUD_COVER_NO_DATA` for null. Add `weatherSvgHtml(cloudCover: number | null, size: number): string` function that returns the SVG markup as an HTML string for use in both Vue templates (via `v-html`) and raw DOM contexts (Mapbox markers).
- **Modify: `app/components/EclipseMap.vue`** — replace the colored `<div>` marker creation with rendering `WeatherIcon` SVG markup into the marker element. Size: 18px. Keep the popup content unchanged.
- **Modify: `app/pages/map.vue`** — replace colored dot spans in the legend with `<WeatherIcon>` at 20px size.
- **Modify: `app/pages/recommend.vue`** — add `<WeatherIcon>` inline next to the weather status text in spot cards. Size: 20px.
- **Modify: `app/composables/useRecommendation.ts`** — replace the duplicated threshold logic with a call to the new `cloudLevel()` function from eclipse.ts.

## Files unchanged

- `server/` — no backend changes
- `app/composables/useWeather.ts` — no changes needed
- `i18n/` — weather labels are not i18n'd currently; this spec doesn't change that

## Integration details

### Shared SVG rendering: `weatherSvgHtml()`

The SVG markup is generated by a plain function `weatherSvgHtml(cloudCover, size)` in `app/utils/eclipse.ts`. This function returns an HTML string containing the `<svg>` element. It is used by:

- **`WeatherIcon.vue`** — renders via `v-html` for Vue template contexts
- **`EclipseMap.vue`** — sets `el.innerHTML` on the marker `<div>` for Mapbox GL markers

This avoids needing to mount a Vue component into a raw DOM element. The content is entirely static (no user input), so `innerHTML` / `v-html` is safe.

### EclipseMap.vue marker creation

The current marker is a `document.createElement('div')` with inline styles (14px colored circle). Replace with:

```typescript
const el = document.createElement('div')
el.innerHTML = weatherSvgHtml(station.cloud_cover, 18)
```

Keep the popup content and click handler unchanged.

### Recommend page integration

The icon appears inline next to the weather status text. The current template fragment:
```html
<template v-if="item.weatherStatus"> · {{ item.weatherStatus }}</template>
```

Becomes:
```html
<template v-if="item.weatherStatus">
  · <WeatherIcon :cloud-cover="item.cloudCover" :size="20" class="inline-block align-middle" />
  {{ item.weatherStatus }}
</template>
```

## Testing

- Open `/map` — station markers should show pictogram icons instead of colored dots
- Open `/recommend` — spot cards should show icon + text for weather status
- Resize browser — icons should scale cleanly from 16px to 36px
- Check with null cloud_cover station — should show dashed circle with `?`
- Verify map legend matches the 5 new levels
