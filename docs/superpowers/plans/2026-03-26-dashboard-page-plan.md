# Dashboard Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/dashboard` Pro home page with hero countdown, weather snapshot, news feed, and eclipse-day checklist.

**Architecture:** Single page component (`dashboard.vue`) with inline sections. Weather data from existing APIs, news from Nuxt Content markdown files in `content/updates/`, checklist persisted in localStorage. A pure utility function `bestRegion()` extracted to `app/utils/weather.ts` handles region aggregation logic (testable without Vue).

**Tech Stack:** Nuxt 4, Vue 3, TailwindCSS, Nuxt Content, Vitest

**Spec:** `docs/superpowers/specs/2026-03-26-dashboard-page-design.md`

---

### Task 1: Create seed update markdown file

**Files:**
- Create: `content/updates/2026-03-25-new-spots.md`

- [ ] **Step 1: Create the seed update file**

```markdown
---
title: 'New viewing spots added: Ólafsvík & Arnarstapi'
date: 2026-03-25
summary: 'Two new curated spots on the Snæfellsnes peninsula with excellent horizon clearance and easy road access.'
---
```

- [ ] **Step 2: Commit**

```bash
git add content/updates/2026-03-25-new-spots.md
git commit -m "content: add seed update for dashboard news feed"
```

---

### Task 2: Extract `bestRegion()` utility + tests

**Files:**
- Create: `app/utils/weather.ts`
- Create: `tests/unit/utils/weather.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/unit/utils/weather.test.ts
import { describe, it, expect } from 'vitest'
import { bestRegion } from '../../../app/utils/weather'

// Types matching API responses
type Station = { id: string; name: string; lat: number; lng: number; region: string }
type CloudEntry = { station_id: string; cloud_cover: number | null }

describe('bestRegion', () => {
  const stations: Station[] = [
    { id: '1', name: 'S1', lat: 64, lng: -22, region: 'snaefellsnes' },
    { id: '2', name: 'S2', lat: 64, lng: -22.5, region: 'snaefellsnes' },
    { id: '3', name: 'S3', lat: 65, lng: -23, region: 'westfjords' },
    { id: '4', name: 'S4', lat: 65, lng: -23.5, region: 'westfjords' },
    { id: '5', name: 'S5', lat: 64, lng: -22, region: 'reykjavik' },
  ]

  it('picks the region with lowest average cloud cover', () => {
    const cloud: CloudEntry[] = [
      { station_id: '1', cloud_cover: 10 },
      { station_id: '2', cloud_cover: 20 },
      { station_id: '3', cloud_cover: 50 },
      { station_id: '4', cloud_cover: 60 },
      { station_id: '5', cloud_cover: 40 },
    ]
    const result = bestRegion(stations, cloud)
    expect(result).not.toBeNull()
    expect(result!.region).toBe('snaefellsnes')
    expect(result!.avgCloudCover).toBe(15)
  })

  it('excludes stations with null cloud cover from averages', () => {
    const cloud: CloudEntry[] = [
      { station_id: '1', cloud_cover: null },
      { station_id: '2', cloud_cover: 30 },
      { station_id: '3', cloud_cover: 20 },
      { station_id: '4', cloud_cover: 20 },
      { station_id: '5', cloud_cover: 50 },
    ]
    const result = bestRegion(stations, cloud)
    expect(result!.region).toBe('westfjords')
    expect(result!.avgCloudCover).toBe(20)
  })

  it('returns null when cloud data is empty', () => {
    expect(bestRegion(stations, [])).toBeNull()
  })

  it('returns null when stations is empty', () => {
    const cloud: CloudEntry[] = [{ station_id: '1', cloud_cover: 10 }]
    expect(bestRegion([], cloud)).toBeNull()
  })

  it('skips regions where all stations have null cloud cover', () => {
    const cloud: CloudEntry[] = [
      { station_id: '1', cloud_cover: null },
      { station_id: '2', cloud_cover: null },
      { station_id: '3', cloud_cover: 30 },
      { station_id: '4', cloud_cover: 40 },
      { station_id: '5', cloud_cover: 50 },
    ]
    const result = bestRegion(stations, cloud)
    expect(result!.region).toBe('westfjords')
  })

  it('rounds avgCloudCover to nearest integer', () => {
    const cloud: CloudEntry[] = [
      { station_id: '1', cloud_cover: 10 },
      { station_id: '2', cloud_cover: 11 },
      { station_id: '3', cloud_cover: 90 },
      { station_id: '4', cloud_cover: 90 },
      { station_id: '5', cloud_cover: 90 },
    ]
    const result = bestRegion(stations, cloud)
    expect(result!.avgCloudCover).toBe(11) // 10.5 rounds to 11
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/utils/weather.test.ts`
Expected: FAIL — `weather.ts` does not exist yet

- [ ] **Step 3: Write the implementation**

```typescript
// app/utils/weather.ts

interface Station {
  id: string
  region: string
  [key: string]: unknown
}

interface CloudEntry {
  station_id: string
  cloud_cover: number | null
}

export interface BestRegionResult {
  region: string
  avgCloudCover: number
}

/**
 * Find the region with the lowest average cloud cover.
 * Stations with null cloud cover are excluded from averages.
 * Regions where all stations have null are skipped.
 */
export function bestRegion(
  stations: Station[],
  cloudData: CloudEntry[],
): BestRegionResult | null {
  if (!stations.length || !cloudData.length) return null

  // Build cloud cover lookup
  const coverMap = new Map<string, number | null>()
  for (const c of cloudData) {
    coverMap.set(c.station_id, c.cloud_cover)
  }

  // Group stations by region, compute averages
  const regionSums = new Map<string, { sum: number; count: number }>()

  for (const station of stations) {
    const cover = coverMap.get(station.id)
    if (cover == null) continue

    const entry = regionSums.get(station.region)
    if (entry) {
      entry.sum += cover
      entry.count++
    } else {
      regionSums.set(station.region, { sum: cover, count: 1 })
    }
  }

  if (regionSums.size === 0) return null

  let bestRegionKey = ''
  let bestAvg = Infinity

  for (const [region, { sum, count }] of regionSums) {
    const avg = sum / count
    if (avg < bestAvg) {
      bestAvg = avg
      bestRegionKey = region
    }
  }

  return {
    region: bestRegionKey,
    avgCloudCover: Math.round(bestAvg),
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/utils/weather.test.ts`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add app/utils/weather.ts tests/unit/utils/weather.test.ts
git commit -m "feat: add bestRegion() utility for weather snapshot aggregation"
```

---

### Task 3: Build the dashboard page

**Files:**
- Create: `app/pages/dashboard.vue`

**References:**
- Page design patterns: `CLAUDE.md` → "Page Design Patterns" section
- Existing page for pattern reference: `app/pages/recommend.vue` (Pro-gated page with data fetching)
- CountdownBar usage: `app/pages/index.vue`
- REGION_LABELS: `app/utils/eclipse.ts:117-123`
- cloudLevel/cloudColor: `app/utils/eclipse.ts:17-31`

- [ ] **Step 1: Create the dashboard page**

```vue
<script setup lang="ts">
import { bestRegion } from '~/utils/weather'
import { REGION_LABELS, cloudColor, cloudLevel } from '~/utils/eclipse'

definePageMeta({ middleware: ['pro-gate'] })

useHead({ title: 'Dashboard' })

const { remaining } = useCountdown()

// Weather data
const { data: cloudData, status: cloudStatus } = await useFetch('/api/weather/cloud-cover')
const { data: stationsData } = await useFetch('/api/weather/stations')

// Compute best region
const weatherBest = computed(() => {
  const stations = stationsData.value?.stations
  const cloud = cloudData.value?.cloud_cover
  if (!stations || !cloud) return null
  return bestRegion(stations, cloud)
})

const weatherLoading = computed(() => cloudStatus.value === 'pending')

// News updates from Nuxt Content
const { data: updates } = await useAsyncData('dashboard-updates', () =>
  queryContent('updates').sort({ date: -1 }).limit(5).find(),
)

// Checklist
const CHECKLIST_ITEMS = [
  'Eclipse glasses (ISO 12312-2 certified)',
  'Check weather forecast morning of eclipse day',
  'Arrive at viewing spot 2 hours before totality',
  'Fully charged phone & camera',
  'Warm layers (Iceland weather is unpredictable)',
  'Snacks & water',
]

const checkedItems = ref<Record<number, boolean>>({})

onMounted(() => {
  try {
    const saved = localStorage.getItem('eclipse-checklist')
    if (saved) checkedItems.value = JSON.parse(saved)
  } catch {}
})

function toggleItem(index: number) {
  checkedItems.value[index] = !checkedItems.value[index]
  localStorage.setItem('eclipse-checklist', JSON.stringify(checkedItems.value))
}

const checkedCount = computed(() =>
  Object.values(checkedItems.value).filter(Boolean).length,
)
</script>

<template>
  <div class="relative noise min-h-screen">
    <!-- Nav -->
    <nav class="flex items-center justify-between px-6 sm:px-10 py-5">
      <NuxtLink to="/" class="flex items-center gap-3 group">
        <svg class="w-8 h-8" viewBox="0 0 128 128" fill="none" aria-hidden="true">
          <circle cx="64" cy="64" r="36" fill="#050810" />
          <circle cx="64" cy="64" r="36" stroke="#f59e0b" stroke-width="3" opacity="0.8" />
          <circle cx="96" cy="48" r="4" fill="#f59e0b" />
        </svg>
        <span class="font-display font-semibold text-base tracking-wide text-slate-300 group-hover:text-white transition-colors">
          ECLIPSECHASE
        </span>
      </NuxtLink>
      <NuxtLink to="/map" class="text-xs font-mono text-slate-400 hover:text-corona transition-colors tracking-wider">
        OPEN MAP
      </NuxtLink>
    </nav>

    <div class="section-container max-w-3xl py-8 sm:py-16">
      <!-- 1. Hero Countdown -->
      <section class="text-center mb-12 sm:mb-16">
        <p class="font-mono text-xs tracking-[0.3em] text-corona/60 uppercase mb-4">Eclipse 2026</p>
        <CountdownBar />
      </section>

      <!-- 2. Weather Snapshot -->
      <section class="mb-8 sm:mb-12">
        <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-3">Best conditions now</p>

        <!-- Loading skeleton -->
        <div v-if="weatherLoading" class="bg-void-surface border border-void-border/40 rounded px-4 py-4 animate-pulse">
          <div class="h-5 bg-void-border/30 rounded w-1/3 mb-2" />
          <div class="h-4 bg-void-border/20 rounded w-1/4" />
        </div>

        <!-- Weather card -->
        <div v-else-if="weatherBest" class="bg-void-surface border border-void-border/40 rounded px-4 py-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-display text-lg font-semibold text-white">
                {{ REGION_LABELS[weatherBest.region] || weatherBest.region }}
              </p>
              <p class="text-sm mt-0.5" :style="{ color: cloudColor(weatherBest.avgCloudCover) }">
                {{ weatherBest.avgCloudCover }}% cloud cover &middot; {{ cloudLevel(weatherBest.avgCloudCover).label }}
              </p>
            </div>
            <NuxtLink
              to="/map"
              class="text-xs font-mono text-corona/70 hover:text-corona transition-colors tracking-wider"
            >
              VIEW MAP &rarr;
            </NuxtLink>
          </div>
        </div>

        <!-- Fallback -->
        <div v-else class="bg-void-surface border border-void-border/40 rounded px-4 py-4">
          <p class="text-sm text-slate-500">No weather data available</p>
        </div>
      </section>

      <!-- 3. News / Updates -->
      <section v-if="updates && updates.length" class="mb-8 sm:mb-12">
        <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-3">Latest updates</p>
        <div class="space-y-3">
          <div
            v-for="update in updates"
            :key="update._path"
            class="bg-void-surface border border-void-border/40 rounded px-4 py-3"
          >
            <p class="font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500 mb-1">
              {{ update.date }}
            </p>
            <p class="font-display text-sm font-semibold text-white">
              {{ update.title }}
            </p>
            <p v-if="update.summary" class="text-sm text-slate-400 mt-1 leading-relaxed">
              {{ update.summary }}
            </p>
          </div>
        </div>
      </section>

      <!-- 4. Eclipse Day Checklist -->
      <section class="mb-8 sm:mb-12">
        <div class="flex items-center justify-between mb-3">
          <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Eclipse day checklist</p>
          <p class="font-mono text-[10px] text-slate-500">
            {{ checkedCount }}/{{ CHECKLIST_ITEMS.length }}
          </p>
        </div>
        <div class="bg-void-surface border border-void-border/40 rounded px-4 py-3">
          <label
            v-for="(item, idx) in CHECKLIST_ITEMS"
            :key="idx"
            class="flex items-start gap-3 py-2 cursor-pointer group"
            :class="idx < CHECKLIST_ITEMS.length - 1 ? 'border-b border-void-border/20' : ''"
          >
            <input
              type="checkbox"
              :checked="checkedItems[idx]"
              class="checklist-checkbox mt-0.5 flex-shrink-0"
              @change="toggleItem(idx)"
            >
            <span
              class="text-sm leading-relaxed transition-colors"
              :class="checkedItems[idx] ? 'text-slate-500 line-through' : 'text-slate-300'"
            >
              {{ item }}
            </span>
          </label>
        </div>
      </section>
    </div>

    <!-- Footer -->
    <footer class="border-t border-void-border/30 py-8">
      <div class="section-container text-center">
        <NuxtLink to="/" class="font-mono text-sm text-slate-500 hover:text-slate-300 transition-colors">
          &larr; Back to home
        </NuxtLink>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.checklist-checkbox {
  appearance: none;
  width: 16px;
  height: 16px;
  border: 1.5px solid rgba(26, 37, 64, 0.6);
  border-radius: 3px;
  background: transparent;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
}

.checklist-checkbox:checked {
  border-color: var(--corona);
  background: rgba(245, 158, 11, 0.15);
}

.checklist-checkbox:checked::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 5px;
  height: 9px;
  border: solid var(--corona);
  border-width: 0 1.5px 1.5px 0;
  transform: rotate(45deg);
}
</style>
```

- [ ] **Step 2: Verify the page renders**

Run: `npx nuxi dev`
Navigate to `/dashboard` (must have Pro status or temporarily disable `pro-gate` middleware).
Expected: Page renders with countdown, weather card (or fallback), updates section, and checklist.

- [ ] **Step 3: Commit**

```bash
git add app/pages/dashboard.vue
git commit -m "feat: add /dashboard Pro home page with countdown, weather, updates, checklist"
```

---

### Task 4: Run full test suite and verify

**Files:** None (verification only)

- [ ] **Step 1: Run unit tests**

Run: `npx vitest run`
Expected: All tests pass, including the new `weather.test.ts`

- [ ] **Step 2: Run dev server and verify all sections**

Run: `npx nuxi dev`
Check:
- `/dashboard` loads with hero countdown ticking
- Weather snapshot shows a region or fallback message
- Updates section shows the seed update
- Checklist items can be checked/unchecked, persist after page reload
- Bottom nav highlights "Home" tab when on `/dashboard`
- Bottom nav hides on landing page (`/`)

- [ ] **Step 3: Commit any fixes if needed**
