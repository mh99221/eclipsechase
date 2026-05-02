# Dashboard Page Design

**Date:** 2026-03-26
**Status:** Approved
**Route:** `/dashboard`

## Overview

Pro home page — the central hub for returning Pro users. Accessible via the "Home" tab in the bottom navigation bar. Four full-width sections stacked vertically in a clean stack layout: hero countdown, weather snapshot, news updates, eclipse-day checklist.

## Sections (top to bottom)

### 1. Hero Countdown

- Reuses existing `CountdownBar` component (same large number styling as landing page)
- Page label above: `ECLIPSE 2026` in `font-mono text-xs tracking-[0.3em] text-corona/60`
- No changes needed to the component

### 2. Weather Snapshot

- Single card showing the region with lowest average cloud cover right now
- **Region aggregation:** Average cloud cover across all stations in each region, then pick the region with the lowest average. Stations with `null` cloud cover are excluded from the average.
- Data: `useFetch('/api/weather/cloud-cover')` + `useFetch('/api/weather/stations')`
- Display: region name, cloud cover percentage, color-coded via existing `cloudColor()` / `cloudLevel()` from `utils/eclipse.ts`
- "View full map" link to `/map`
- **Loading state:** Show a pulsing skeleton card matching `bg-void-surface` dimensions while data loads
- **Fallback:** "No weather data available" when offline, stale, or both APIs return empty
- Card styling: `bg-void-surface border border-void-border/40 rounded px-4 py-4`

### 3. News / Updates Feed

- Nuxt Content markdown files in `content/updates/` directory
- Each file has frontmatter: `title`, `date`, `summary`
- Rendered as a list of cards, newest first, max 5 shown
- Query: `queryContent('updates').sort({ date: -1 }).limit(5).find()`
- Each entry shows: date (mono label) + title + summary text
- In v1, titles are rendered as plain text (no link). The `/updates/[slug]` detail page is deferred to a future iteration.
- **Empty state:** If no update files exist, hide the updates section entirely.
- **Loading state:** Show a pulsing skeleton card while `queryContent` resolves.

### 4. Eclipse Day Checklist

- Static checklist with localStorage persistence for check state
- Items:
  - Eclipse glasses (ISO 12312-2 certified)
  - Check weather forecast morning of eclipse day
  - Arrive at viewing spot 2 hours before totality
  - Fully charged phone & camera
  - Warm layers (Iceland weather is unpredictable)
  - Snacks & water
- Checkbox state saved to `localStorage` key `eclipse-checklist` as JSON object `{ [index]: boolean }`
- **SSR handling:** Checklist state must be read inside `onMounted()` to avoid `ReferenceError` on the server. Initialize with all unchecked, hydrate from localStorage on mount.
- Checkboxes styled to match dark theme (corona accent when checked)

## Route & Auth

- Route: `/dashboard`
- Pro-gated: `definePageMeta({ middleware: ['pro-gate'] })`
- Follows standard page design patterns:
  - `div.relative.noise.min-h-screen` wrapper
  - Flowing nav (not fixed) with SVG eclipse logo + "ECLIPSECHASE" wordmark
  - `section-container max-w-3xl py-8 sm:py-16` content area
  - Standard footer with back-to-home link

## New Files

| File | Purpose |
|------|---------|
| `app/pages/dashboard.vue` | The dashboard page |
| `content/updates/2026-03-25-new-spots.md` | Seed example update |

## No New Components

- `CountdownBar` — reused as-is
- Weather snapshot, updates list, and checklist are small enough to live inline in the page template

## Data Dependencies

| Data | Source | Existing? |
|------|--------|-----------|
| Countdown | `useCountdown()` composable | Yes |
| Cloud cover | `/api/weather/cloud-cover` | Yes |
| Stations | `/api/weather/stations` | Yes |
| Updates | `queryContent('updates')` | New content directory |
| Checklist state | `localStorage` | New (client-only) |

## Notes

- **i18n:** v1 is English-only. i18n keys for section headings and checklist items to be added in a later pass.
- **SEO:** Page is Pro-gated and not indexed. Set `useHead({ title: 'Dashboard' })` for browser tab clarity.
- **BottomNav integration:** Already handled — `BottomNav.vue` links to `/dashboard` and only renders for Pro users.

## Design Tokens

All existing — no new colors, fonts, or animations needed. Uses:
- `void-surface`, `void-border/40` for cards
- `corona/60` for labels
- `cloudColor()` for weather color coding
- `font-mono` for labels/metadata, `font-display` for values
- `rounded` (4px) for card borders
