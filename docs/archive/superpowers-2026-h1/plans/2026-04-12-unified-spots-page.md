# Unified Spots Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the separate `/recommend` (Pro-only) page with a unified `/spots` listing that serves free users (browse all spots) and Pro users (profile-based ranking).

**Architecture:** A single `app/pages/spots/index.vue` page fetches spots and renders a photo grid sorted by totality duration. Pro users get an active profile selector that hooks into the existing `useRecommendation` composable to re-rank and filter. Free users see the profile buttons as locked with a Pro upsell prompt. The "For You" bottom nav tab is removed.

**Tech Stack:** Nuxt 4, Vue 3, TailwindCSS, existing composables (`useRecommendation`, `useProStatus`, `useLocation`)

**Spec:** `docs/superpowers/specs/2026-04-12-unified-spots-page-design.md`
**Prototype reference:** `app/pages/spots-proto.vue` (Layout A grid)

---

### Task 1: Create unified spots listing page (free tier)

**Files:**
- Create: `app/pages/spots/index.vue`

- [ ] **Step 1: Create the page with grid layout**

Create `app/pages/spots/index.vue` with the free-tier grid. This is based on the working prototype at `app/pages/spots-proto.vue` (Layout A), adapted to the final page structure:

```vue
<script setup lang="ts">
import { formatDuration, REGION_LABELS, SPOT_TYPE_LABELS } from '~/utils/eclipse'
import type { SpotPhoto } from '~/types/spots'

const { data } = await useFetch('/api/spots')

const spots = computed(() => {
  const list = data.value?.spots || []
  return [...list].sort((a: any, b: any) => (b.totality_duration_seconds || 0) - (a.totality_duration_seconds || 0))
})

function getHeroUrl(spot: any): string {
  const raw = spot.photos
  if (raw) {
    const photos = typeof raw === 'string' ? JSON.parse(raw) : Array.isArray(raw) ? raw : []
    const hero = photos.find((p: SpotPhoto) => p.is_hero) || photos[0]
    if (hero) return `/images/spots/${hero.filename}`
  }
  return `/images/spots/${spot.slug}-hero.webp`
}

function getThumbUrl(spot: any): string {
  return getHeroUrl(spot).replace(/\.webp$/, '-thumb.webp')
}

function getHorizonVerdict(spot: any): string | null {
  const raw = spot.horizon_check
  if (!raw) return null
  const hc = typeof raw === 'string' ? JSON.parse(raw) : raw
  return hc?.verdict || null
}

const verdictColor: Record<string, string> = {
  clear: 'text-green-400 border-green-400/30 bg-green-400/10',
  marginal: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  risky: 'text-orange-400 border-orange-400/30 bg-orange-400/10',
  blocked: 'text-red-400 border-red-400/30 bg-red-400/10',
}

useHead({
  title: 'Viewing Spots — EclipseChase',
  meta: [
    { name: 'description', content: 'Browse 28 curated eclipse viewing spots across western Iceland for the August 12, 2026 total solar eclipse.' },
  ],
})
</script>

<template>
  <div class="relative noise min-h-screen pt-[72px]">
    <div class="section-container max-w-5xl py-8 sm:py-12">
      <p class="font-mono text-xs tracking-[0.3em] text-corona/60 uppercase mb-3">Eclipse 2026</p>
      <h1 class="font-display text-3xl sm:text-4xl font-bold text-white mb-8">Viewing Spots</h1>

      <!-- Spot grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <NuxtLink
          v-for="spot in spots"
          :key="spot.id"
          :to="`/spots/${spot.slug}`"
          class="group bg-void-surface border border-void-border/40 rounded overflow-hidden hover:border-corona/30 transition-colors"
        >
          <div class="aspect-video bg-void-deep overflow-hidden">
            <img
              :src="getThumbUrl(spot)"
              :srcset="`${getThumbUrl(spot)} 600w, ${getHeroUrl(spot)} 1200w`"
              sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
              :alt="spot.name"
              loading="lazy"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
          <div class="px-4 py-3">
            <div class="flex items-center gap-2 mb-1.5">
              <span
                v-if="spot.spot_type"
                class="text-[9px] font-mono tracking-[0.15em] uppercase px-1.5 py-0.5 rounded border"
                :class="spot.spot_type === 'drive-up' ? 'text-green-400 border-green-400/30' : 'text-amber-400 border-amber-400/30'"
              >{{ SPOT_TYPE_LABELS[spot.spot_type] || spot.spot_type }}</span>
              <span
                v-if="getHorizonVerdict(spot)"
                class="text-[9px] font-mono tracking-[0.15em] uppercase px-1.5 py-0.5 rounded border"
                :class="verdictColor[getHorizonVerdict(spot)!]"
              >{{ getHorizonVerdict(spot) }}</span>
            </div>
            <h3 class="font-display text-base font-semibold text-white mb-1 group-hover:text-corona-bright transition-colors">{{ spot.name }}</h3>
            <div class="flex items-center justify-between">
              <span class="font-mono text-[10px] text-slate-500 uppercase tracking-wider">{{ REGION_LABELS[spot.region] || spot.region }}</span>
              <span class="font-display text-sm font-bold text-white">{{ formatDuration(spot.totality_duration_seconds) }}</span>
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>

    <footer class="border-t border-void-border/30 py-8">
      <div class="section-container text-center">
        <NuxtLink to="/" class="font-mono text-sm text-slate-500 hover:text-slate-300 transition-colors">
          &larr; Back to home
        </NuxtLink>
      </div>
    </footer>
  </div>
</template>
```

- [ ] **Step 2: Verify in browser**

Run: visit `http://localhost:3000/spots` in the dev server
Expected: Grid of 28 spots with photos, sorted by totality duration (Dynjandi first at 2m 18s), responsive grid (1/2/3 columns). Cards link to `/spots/[slug]`.

- [ ] **Step 3: Commit**

```bash
git add app/pages/spots/index.vue
git commit -m "feat: add unified spots listing page with photo grid"
```

---

### Task 2: Add Pro profile selector

**Files:**
- Modify: `app/pages/spots/index.vue`

- [ ] **Step 1: Add profile selector and Pro scoring integration**

Add the profile selector UI and wire up the recommendation engine. Add these imports and logic to the `<script setup>` section after the existing code, before `useHead`:

```typescript
import { PROFILES, useRecommendation } from '~/composables/useRecommendation'
import type { ProfileId, RankedSpot } from '~/composables/useRecommendation'

const { isPro } = useProStatus()

const selectedProfile = ref<ProfileId | null>(null)
const showProPrompt = ref(false)

// Weather data — only fetched when Pro user selects a profile
const { data: stationsData } = await useFetch('/api/weather/stations')
const { data: weatherData } = await useFetch('/api/weather/cloud-cover', {
  lazy: true,
  server: false,
})
const { coords } = useLocation()

const stations = computed(() => stationsData.value?.stations || null)
const cloudCover = computed(() => weatherData.value?.stations || null)

const { ranked, thinResults } = useRecommendation(
  computed(() => data.value?.spots || []),
  cloudCover,
  stations,
  coords,
  selectedProfile,
)
```

Replace the existing `spots` computed with this version that uses scoring when a profile is active:

```typescript
const spots = computed(() => {
  if (selectedProfile.value && isPro.value) {
    return ranked.value
  }
  const list = data.value?.spots || []
  return [...list]
    .sort((a: any, b: any) => (b.totality_duration_seconds || 0) - (a.totality_duration_seconds || 0))
    .map((spot: any) => ({ spot, score: -1, filtered: false, weatherStatus: null, cloudCover: null }) as RankedSpot)
})

function selectProfile(id: ProfileId) {
  if (!isPro.value) {
    showProPrompt.value = true
    return
  }
  selectedProfile.value = selectedProfile.value === id ? null : id
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-400'
  if (score >= 50) return 'text-amber-400'
  return 'text-red-400'
}
```

- [ ] **Step 2: Add profile selector and Pro prompt to template**

Insert this block between the `<h1>` and the spot grid `<div>`:

```vue
      <!-- Profile selector -->
      <div class="mb-6">
        <div class="flex flex-wrap gap-2 mb-3">
          <button
            v-for="profile in PROFILES"
            :key="profile.id"
            class="px-3 py-1.5 rounded text-xs font-mono tracking-wider transition-all"
            :class="[
              selectedProfile === profile.id
                ? 'border-2 border-corona text-corona-bright bg-corona/10'
                : isPro
                  ? 'border border-void-border/50 text-slate-400 hover:border-corona/40 hover:text-white'
                  : 'border border-void-border/30 text-slate-600 opacity-50 cursor-not-allowed',
            ]"
            @click="selectProfile(profile.id)"
          >
            <span v-if="!isPro" class="mr-1 opacity-60">&#128274;</span>
            {{ profile.label }}
          </button>
          <button
            v-if="selectedProfile"
            class="px-3 py-1.5 rounded text-xs font-mono tracking-wider border border-void-border/50 text-slate-500 hover:text-white transition-colors"
            @click="selectedProfile = null"
          >
            Clear
          </button>
        </div>

        <!-- Thin results warning -->
        <div v-if="thinResults && selectedProfile" class="px-3 py-2.5 rounded bg-amber-900/15 border border-amber-700/20 text-xs font-mono text-amber-400/80 mb-4">
          Few spots match this profile. Try a different one for more options.
        </div>

        <!-- Pro upgrade prompt -->
        <div v-if="showProPrompt" class="px-4 py-3 rounded bg-void-surface border border-corona/30 mb-4 flex items-center justify-between">
          <p class="text-sm text-slate-300">
            <span class="text-corona font-semibold">Pro</span> — unlock personalized spot rankings based on your travel style.
          </p>
          <div class="flex items-center gap-3 ml-4 flex-shrink-0">
            <button class="text-xs text-slate-500 hover:text-slate-300" @click="showProPrompt = false">Dismiss</button>
            <NuxtLink to="/pro" class="px-3 py-1.5 rounded bg-corona text-void text-xs font-semibold hover:bg-corona-bright transition-colors">
              Get Pro
            </NuxtLink>
          </div>
        </div>
      </div>
```

- [ ] **Step 3: Update card template to show scores and weather**

Update the card's `NuxtLink` to use `item` from `spots` (which are now `RankedSpot` objects). Replace the grid section:

```vue
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <NuxtLink
          v-for="item in spots"
          :key="item.spot.id"
          :to="`/spots/${item.spot.slug}`"
          class="group bg-void-surface border border-void-border/40 rounded overflow-hidden hover:border-corona/30 transition-colors"
          :class="{ 'opacity-50': item.filtered }"
        >
          <div class="aspect-video bg-void-deep overflow-hidden relative">
            <img
              :src="getThumbUrl(item.spot)"
              :srcset="`${getThumbUrl(item.spot)} 600w, ${getHeroUrl(item.spot)} 1200w`"
              sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
              :alt="item.spot.name"
              loading="lazy"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <!-- Score badge (Pro only) -->
            <div v-if="item.score >= 0" class="absolute top-2 right-2 px-2 py-1 rounded bg-void/80 backdrop-blur-sm">
              <span class="font-display text-sm font-bold" :class="scoreColor(item.score)">{{ item.score }}</span>
            </div>
          </div>
          <div class="px-4 py-3">
            <div class="flex items-center gap-2 mb-1.5">
              <span
                v-if="item.spot.spot_type"
                class="text-[9px] font-mono tracking-[0.15em] uppercase px-1.5 py-0.5 rounded border"
                :class="item.spot.spot_type === 'drive-up' ? 'text-green-400 border-green-400/30' : 'text-amber-400 border-amber-400/30'"
              >{{ SPOT_TYPE_LABELS[item.spot.spot_type] || item.spot.spot_type }}</span>
              <span
                v-if="getHorizonVerdict(item.spot)"
                class="text-[9px] font-mono tracking-[0.15em] uppercase px-1.5 py-0.5 rounded border"
                :class="verdictColor[getHorizonVerdict(item.spot)!]"
              >{{ getHorizonVerdict(item.spot) }}</span>
              <!-- Weather (Pro only) -->
              <template v-if="item.weatherStatus">
                <WeatherIcon :cloud-cover="item.cloudCover ?? 0" :size="16" class="inline-block ml-auto" />
              </template>
            </div>
            <h3 class="font-display text-base font-semibold text-white mb-1 group-hover:text-corona-bright transition-colors">{{ item.spot.name }}</h3>
            <div class="flex items-center justify-between">
              <span class="font-mono text-[10px] text-slate-500 uppercase tracking-wider">{{ REGION_LABELS[item.spot.region] || item.spot.region }}</span>
              <span class="font-display text-sm font-bold text-white">{{ formatDuration(item.spot.totality_duration_seconds) }}</span>
            </div>
          </div>
        </NuxtLink>
      </div>
```

- [ ] **Step 4: Verify in browser**

Test both flows:
1. Free user (default): Grid shows all spots sorted by duration, profile buttons are greyed with lock icons, clicking one shows Pro prompt
2. Pro user: Profile buttons are active, selecting one re-sorts by score, adds score badges, shows weather icons, filtered spots fade

- [ ] **Step 5: Commit**

```bash
git add app/pages/spots/index.vue
git commit -m "feat: add Pro profile selector with scoring to spots page"
```

---

### Task 3: Remove "For You" from bottom nav

**Files:**
- Modify: `app/components/BottomNav.vue`

- [ ] **Step 1: Remove the "For You" tab**

In `app/components/BottomNav.vue`, remove the recommend item from the `items` array (line 8). Change:

```typescript
const items = [
  { to: '/map', label: 'Map', icon: 'map' },
  { to: '/recommend', label: 'For You', icon: 'recommend' },
  { to: '/dashboard', label: 'Home', icon: 'home' },
  { to: '/spots', label: 'Spots', icon: 'spots' },
  { to: '/guide', label: 'Guide', icon: 'guide' },
] as const
```

To:

```typescript
const items = [
  { to: '/map', label: 'Map', icon: 'map' },
  { to: '/dashboard', label: 'Home', icon: 'home' },
  { to: '/spots', label: 'Spots', icon: 'spots' },
  { to: '/guide', label: 'Guide', icon: 'guide' },
] as const
```

Also remove the SVG icon case for `recommend` in the template (the `v-else-if="item.icon === 'recommend'"` block and its SVG).

- [ ] **Step 2: Verify bottom nav**

Visit any Pro-accessible page. Confirm the bottom nav shows 4 tabs: Map, Home, Spots, Guide. No "For You" tab.

- [ ] **Step 3: Commit**

```bash
git add app/components/BottomNav.vue
git commit -m "fix: remove 'For You' tab from bottom nav"
```

---

### Task 4: Delete recommend page and update tests

**Files:**
- Delete: `app/pages/recommend.vue`
- Modify: `tests/e2e/recommend.test.ts`
- Modify: `tests/e2e/pro-gate.test.ts`

- [ ] **Step 1: Delete recommend.vue**

```bash
git rm app/pages/recommend.vue
```

- [ ] **Step 2: Update recommend E2E test**

Replace `tests/e2e/recommend.test.ts` to test the new unified spots page instead:

```typescript
import { expect, test } from './fixtures'

test.describe('Spots listing page', () => {
  test('spots page loads with grid of viewing spots', async ({ page, goto }) => {
    await goto('/spots', { waitUntil: 'hydration' })

    const h1 = page.locator('h1')
    await expect(h1).toHaveText('Viewing Spots')
  })

  test('spots page shows spot cards with names', async ({ page, goto }) => {
    await goto('/spots', { waitUntil: 'hydration' })

    // First spot by duration should be Dynjandi
    const firstCard = page.locator('a[href*="/spots/"]').first()
    await expect(firstCard).toBeVisible()
  })

  test('spot cards link to detail pages', async ({ page, goto }) => {
    await goto('/spots', { waitUntil: 'hydration' })

    const firstCard = page.locator('a[href*="/spots/"]').first()
    const href = await firstCard.getAttribute('href')
    expect(href).toMatch(/^\/spots\//)
  })
})
```

- [ ] **Step 3: Update pro-gate E2E test**

In `tests/e2e/pro-gate.test.ts`, remove the `/recommend` redirect test (lines 39-43). Delete this block:

```typescript
  test('/recommend redirects non-Pro user to /pro', async ({ page, goto }) => {
    await goto('/recommend', { waitUntil: 'hydration' })

    await expect(page).toHaveURL(/\/pro/)
  })
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run`
Expected: All tests pass. No references to `/recommend` route remain.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: replace recommend page with unified spots listing"
```

---

### Task 5: Clean up prototype

**Files:**
- Delete: `app/pages/spots-proto.vue`

- [ ] **Step 1: Delete the prototype page**

```bash
git rm app/pages/spots-proto.vue
```

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove spots layout prototype"
```

---

### Task 6: Final verification

- [ ] **Step 1: Verify all pages**

Check in browser:
1. `/spots` — grid loads with 28 spots, photos, sorted by duration
2. `/spots` — profile buttons are locked for free users, Pro prompt appears on click
3. `/spots/latrabjarg-cliffs` — detail page still works, unchanged
4. Bottom nav — 4 tabs, no "For You"
5. `/recommend` — returns 404 (page deleted)

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass.
