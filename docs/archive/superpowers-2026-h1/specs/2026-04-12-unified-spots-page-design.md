# Unified Spots Page — Design Spec

**Date**: 2026-04-12
**Status**: Approved
**Replaces**: Separate `/recommend` (Pro) and spots listing (nonexistent)

## Problem

The app has two disconnected paths: `/recommend` (Pro-only, profile-based ranking) and `/spots/[slug]` (free, detail pages). There's no free spots listing page — free users can only discover spots via the guide or direct links. The bottom nav has both a "For You" and "Spots" tab, which is redundant.

## Solution

A single `/spots` listing page that serves both free and Pro users:

- **Free users**: browse all 28 spots in a photo grid, sorted by totality duration
- **Pro users**: unlock profile selector that re-ranks and filters the list using the existing scoring engine

Remove the "For You" bottom nav tab. The "Spots" tab becomes the unified entry point.

## Page Layout

### Route
`/spots/index.vue` — new file, replaces `/recommend.vue`

### Grid Layout (Layout A)
- Responsive grid: 1 col mobile, 2 col `sm:`, 3 col `lg:`
- Cards with hero photo (aspect-video), info below
- Sorted by totality duration (longest first) as default

### Card Contents
Each card shows:
- **Hero photo** (slug-based convention: `/images/spots/{slug}-hero.webp`, with thumb srcset)
- **Spot type badge** (drive-up = green, walk/hike = amber)
- **Horizon verdict badge** (clear/marginal/risky/blocked, color-coded)
- **Spot name** (font-display, semibold, white)
- **Region label** (font-mono, tiny, slate-500)
- **Totality duration** (font-display, bold, white, right-aligned)
- **Pro only**: Score badge (when profile selected), weather icon from nearest station

### Profile Selector

Positioned above the grid, below the page title.

**Free users**: All 5 profile buttons visible but styled as disabled (opacity-50, cursor-not-allowed). Each shows a small lock icon. Clicking any profile button opens a Pro upgrade prompt (inline banner or modal linking to `/pro`).

**Pro users**: Active profile buttons — Photographer, Family, Hiker, Sky Chaser, First-Timer. Selecting a profile:
1. Re-sorts cards by computed score (highest first)
2. Adds score badge to each card
3. Shows live weather data (cloud cover icon) on each card
4. Filtered-out spots (floor constraints) fade to 50% opacity and move to bottom
5. A "Clear" button appears to reset to default duration sort

### Data Flow

**Free (no profile selected)**:
- Single API call: `GET /api/spots` → sort by `totality_duration_seconds` desc
- No weather data needed

**Pro (profile selected)**:
- Three parallel API calls: `/api/spots`, `/api/weather/stations`, `/api/weather/cloud-cover`
- GPS location via `useLocation()` (for distance scoring)
- `useRecommendation()` composable computes scores
- Re-sort by score

## Navigation Changes

### Bottom Nav
- Remove "For You" (`/recommend`) tab
- "Spots" tab points to `/spots` (the new listing page)

### Top Nav
- No changes needed (VIEW ON MAP link already removed)

## Files Changed

### New
- `app/pages/spots/index.vue` — unified listing page

### Modified
- Bottom nav component — remove "For You" tab, update "Spots" route if needed

### Removed
- `app/pages/recommend.vue` — replaced by unified spots page
- `pro-gate` middleware reference for `/recommend` route (if hardcoded)

### Unchanged
- `app/pages/spots/[slug].vue` — detail pages stay free, no changes
- `app/composables/useRecommendation.ts` — scoring engine reused as-is
- `app/composables/useLocation.ts` — reused for Pro distance scoring
- All server API endpoints — no changes
- `app/pages/spots-proto.vue` — prototype, can be deleted after implementation

## Pro Gate Strategy

No route-level middleware. The page itself handles the distinction:
- `useProStatus()` determines if profile buttons are active or locked
- Free users see the full spot list — no redirect, no paywall for browsing
- Only the scoring/filtering feature is gated

## Edge Cases

- **No weather data**: When profile is selected but weather APIs fail, redistribute weights (existing logic in `useRecommendation.ts`)
- **No horizon data**: Same redistribution logic already exists
- **Thin results**: If < 3 spots pass floor constraints for a profile, show warning (existing logic)
- **Offline**: `OfflineBanner` shows stale data warning (reuse from recommend page)
