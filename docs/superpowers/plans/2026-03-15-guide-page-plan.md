# Guide Page Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an SEO-optimized long-form guide page at `/guide` using Nuxt Content v3, rendering Markdown with embedded Vue components (map, countdown, signup form).

**Architecture:** Install `@nuxt/content` module, create a `content/guide.md` Markdown file with MDC component syntax, wrap it in `app/pages/guide.vue` with SEO head tags and scoped `:deep()` styles. A new `GuidePathMap.vue` component provides a static eclipse path map. Existing `CountdownBar` and `EmailSignup` components are reused via MDC embedding.

**Tech Stack:** Nuxt 4, @nuxt/content v3 (MDC syntax), Mapbox GL JS, TailwindCSS, i18n

**Spec:** `docs/superpowers/specs/2026-03-15-guide-page-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `content/guide.md` | Article body — 9 sections with MDC components |
| Create | `app/pages/guide.vue` | Page wrapper — nav, SEO head, `<ContentDoc>`, footer, scoped styles |
| Create | `app/components/GuidePathMap.vue` | Static non-interactive Mapbox map showing eclipse path with region labels |
| Modify | `nuxt.config.ts:6-10` | Add `@nuxt/content` to modules array |
| Modify | `i18n/en.json` | Add `guide.title` and `guide.description` keys |
| Modify | `i18n/is.json` | Add `guide.title` and `guide.description` keys (Icelandic) |

---

## Chunk 1: Foundation — Module Setup + Page Wrapper

### Task 1: Install @nuxt/content and register module

**Files:**
- Modify: `package.json`
- Modify: `nuxt.config.ts:6-10`

- [ ] **Step 1: Install @nuxt/content**

Run:
```bash
cd D:/Projects/eclipsechase/eclipse-chaser && npm install @nuxt/content
```

Expected: Package added to `dependencies` in `package.json`.

- [ ] **Step 2: Register the module in nuxt.config.ts**

In `nuxt.config.ts`, add `'@nuxt/content'` to the `modules` array. The array currently looks like:

```ts
modules: [
  '@nuxtjs/tailwindcss',
  '@nuxtjs/i18n',
  '@nuxtjs/supabase',
],
```

Change it to:

```ts
modules: [
  '@nuxtjs/tailwindcss',
  '@nuxtjs/i18n',
  '@nuxtjs/supabase',
  '@nuxt/content',
],
```

- [ ] **Step 3: Create empty content directory with placeholder**

Create `content/guide.md` with minimal content to verify the module works:

```markdown
---
title: Guide
---

# Guide Page

Placeholder — full content in Task 5 (Chunk 3).
```

- [ ] **Step 4: Verify dev server starts**

Run:
```bash
cd D:/Projects/eclipsechase/eclipse-chaser && npm run dev
```

Expected: Server starts without errors. No crashes related to `@nuxt/content`.

Press Ctrl+C to stop.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json nuxt.config.ts content/guide.md
git commit -m "feat(guide): install @nuxt/content module and register in config"
```

---

### Task 2: Add i18n keys for guide page

**Files:**
- Modify: `i18n/en.json`
- Modify: `i18n/is.json`

- [ ] **Step 1: Add English guide keys**

Add this to the top level of `i18n/en.json` (after the `"footer"` block):

```json
"guide": {
  "title": "Complete Guide to the 2026 Total Solar Eclipse in Iceland",
  "description": "Everything you need to plan your trip to see the August 12, 2026 total solar eclipse in Iceland — path of totality, best viewing spots, weather, and what to bring."
}
```

- [ ] **Step 2: Add Icelandic guide keys**

Add this to the top level of `i18n/is.json` (after the `"footer"` block):

```json
"guide": {
  "title": "Heildarleiðbeiningar um sólmyrkvann 2026 á Íslandi",
  "description": "Allt sem þú þarft til að skipuleggja ferðina þína til að sjá algjöra sólmyrkvann 12. ágúst 2026 á Íslandi."
}
```

- [ ] **Step 3: Verify JSON is valid**

Run:
```bash
cd D:/Projects/eclipsechase/eclipse-chaser && node -e "JSON.parse(require('fs').readFileSync('i18n/en.json')); JSON.parse(require('fs').readFileSync('i18n/is.json')); console.log('OK')"
```

Expected: `OK` with no parse errors.

- [ ] **Step 4: Commit**

```bash
git add i18n/en.json i18n/is.json
git commit -m "feat(guide): add i18n keys for guide page title and description"
```

---

### Task 3: Create guide.vue page wrapper

**Files:**
- Create: `app/pages/guide.vue`

This page renders the Markdown content via `<ContentDoc>`, sets SEO head tags with JSON-LD Article schema, and provides navigation. Follow the patterns from `app/pages/index.vue` (useHead with JSON-LD) and `app/pages/recommend.vue` (nav with logo + MAP link).

- [ ] **Step 1: Create the page file**

Create `app/pages/guide.vue` with this content:

```vue
<script setup lang="ts">
const { t } = useI18n()
const siteUrl = useRuntimeConfig().public.siteUrl as string

useHead(() => ({
  title: t('guide.title'),
  meta: [
    { name: 'description', content: t('guide.description') },
    // Open Graph overrides for article type
    { property: 'og:type', content: 'article' },
    { property: 'og:url', content: `${siteUrl}/guide` },
    { property: 'og:title', content: t('guide.title') },
    { property: 'og:description', content: t('guide.description') },
  ],
  link: [
    { rel: 'canonical', href: `${siteUrl}/guide` },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        'headline': 'Complete Guide to the 2026 Total Solar Eclipse in Iceland',
        'datePublished': '2026-03-15',
        'author': { '@type': 'Organization', 'name': 'EclipseChase.is', 'url': siteUrl },
        'publisher': { '@type': 'Organization', 'name': 'EclipseChase.is' },
        'description': 'Everything you need to plan your trip to see the August 12, 2026 total solar eclipse in Iceland — path of totality, best viewing spots, weather, and what to bring.',
        'image': `${siteUrl}/og-image.jpg`,
        'url': `${siteUrl}/guide`,
      }),
    },
  ],
}))
</script>

<template>
  <div class="min-h-screen bg-void text-slate-300">
    <!-- Nav -->
    <nav class="fixed top-0 inset-x-0 z-50 border-b border-void-border bg-void/80 backdrop-blur-md">
      <div class="section-container flex items-center justify-between h-14">
        <NuxtLink to="/" class="font-display font-bold text-white tracking-tight text-lg">
          EclipseChase<span class="text-corona">.is</span>
        </NuxtLink>
        <NuxtLink
          to="/map"
          class="font-mono text-xs tracking-widest uppercase text-slate-400 hover:text-corona transition-colors"
        >
          Map
        </NuxtLink>
      </div>
    </nav>

    <!-- Article -->
    <main class="pt-24 pb-20">
      <article class="section-container max-w-2xl guide-content">
        <ContentDoc path="/guide" />
      </article>
    </main>

    <!-- Footer -->
    <footer class="border-t border-void-border py-12">
      <div class="section-container max-w-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500 font-mono">
        <div class="flex gap-6">
          <NuxtLink to="/map" class="hover:text-corona transition-colors">
            Map
          </NuxtLink>
          <NuxtLink to="/recommend" class="hover:text-corona transition-colors">
            Find Your Spot
          </NuxtLink>
          <NuxtLink to="/" class="hover:text-corona transition-colors">
            Home
          </NuxtLink>
        </div>
        <span class="text-slate-600">
          EclipseChase.is
        </span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* --- Markdown content styles via :deep() --- */

.guide-content :deep(h2) {
  font-family: 'Syne', system-ui, sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: #f1f5f9;
  margin-top: 3rem;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(26, 37, 64, 0.6);
}

.guide-content :deep(h2:first-child) {
  margin-top: 0;
}

.guide-content :deep(h3) {
  font-family: 'Syne', system-ui, sans-serif;
  font-size: 1.125rem;
  font-weight: 600;
  color: #cbd5e1;
  margin-top: 2rem;
  margin-bottom: 0.75rem;
}

.guide-content :deep(p) {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.75;
  color: #94a3b8;
  margin-bottom: 1rem;
}

@media (min-width: 640px) {
  .guide-content :deep(p) {
    font-size: 1rem;
  }
}

.guide-content :deep(a) {
  color: #f59e0b;
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: color 0.2s;
}

.guide-content :deep(a:hover) {
  color: #fbbf24;
}

.guide-content :deep(strong) {
  color: #e2e8f0;
  font-weight: 600;
}

.guide-content :deep(ul),
.guide-content :deep(ol) {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.75;
  color: #94a3b8;
  margin-bottom: 1rem;
  padding-left: 1.5rem;
}

@media (min-width: 640px) {
  .guide-content :deep(ul),
  .guide-content :deep(ol) {
    font-size: 1rem;
  }
}

.guide-content :deep(ul) {
  list-style-type: disc;
}

.guide-content :deep(ol) {
  list-style-type: decimal;
}

.guide-content :deep(li) {
  margin-bottom: 0.25rem;
}

.guide-content :deep(li::marker) {
  color: #475569;
}

/* Table styling */
.guide-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1.5rem;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.8125rem;
}

.guide-content :deep(thead th) {
  text-align: left;
  padding: 0.625rem 0.75rem;
  font-weight: 600;
  color: #f59e0b;
  border-bottom: 1px solid #1a2540;
  background: rgba(10, 16, 32, 0.6);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.guide-content :deep(tbody td) {
  padding: 0.5rem 0.75rem;
  color: #94a3b8;
  border-bottom: 1px solid rgba(26, 37, 64, 0.4);
}

.guide-content :deep(tbody tr:hover) {
  background: rgba(10, 16, 32, 0.4);
}

/* FAQ details/summary styling */
.guide-content :deep(details) {
  background: rgba(10, 16, 32, 0.5);
  border: 1px solid #1a2540;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  overflow: hidden;
}

.guide-content :deep(summary) {
  padding: 0.75rem 1rem;
  cursor: pointer;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.875rem;
  color: #f59e0b;
  font-weight: 500;
  transition: background 0.2s;
}

.guide-content :deep(summary:hover) {
  background: rgba(245, 158, 11, 0.05);
}

.guide-content :deep(details[open] summary) {
  border-bottom: 1px solid #1a2540;
}

.guide-content :deep(details > p),
.guide-content :deep(details > :not(summary)) {
  padding: 0.75rem 1rem;
}

/* Inline code */
.guide-content :deep(code) {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.8125rem;
  background: rgba(10, 16, 32, 0.6);
  padding: 0.125rem 0.375rem;
  border-radius: 2px;
  color: #cbd5e1;
}

/* Horizontal rule */
.guide-content :deep(hr) {
  border: none;
  height: 1px;
  background: linear-gradient(to right, transparent, #1a2540, transparent);
  margin: 2.5rem 0;
}

/* TOC list at top (first ul) — style as nav links */
.guide-content :deep(> ul:first-of-type) {
  list-style: none;
  padding-left: 0;
  border: 1px solid #1a2540;
  border-radius: 4px;
  padding: 1rem 1.25rem;
  background: rgba(10, 16, 32, 0.4);
}

.guide-content :deep(> ul:first-of-type li) {
  margin-bottom: 0.375rem;
}

.guide-content :deep(> ul:first-of-type a) {
  text-decoration: none;
  color: #94a3b8;
}

.guide-content :deep(> ul:first-of-type a:hover) {
  color: #f59e0b;
}
</style>
```

- [ ] **Step 2: Verify the page renders**

Run:
```bash
cd D:/Projects/eclipsechase/eclipse-chaser && npm run dev
```

Navigate to `http://localhost:3000/guide`. Expected: The placeholder Markdown content renders inside the page wrapper with nav and footer. The title in the browser tab should show "Complete Guide to the 2026 Total Solar Eclipse in Iceland — EclipseChase.is".

Press Ctrl+C to stop.

- [ ] **Step 3: Commit**

```bash
git add app/pages/guide.vue
git commit -m "feat(guide): add guide.vue page wrapper with SEO head, nav, footer, and content styles"
```

---

## Chunk 2: GuidePathMap Component

### Task 4: Create GuidePathMap.vue

**Files:**
- Create: `app/components/GuidePathMap.vue`

A static, non-interactive Mapbox map showing the eclipse path with region labels. Uses the same `path.geojson` as `EclipseMap.vue` but with no controls, no interaction, and a fixed viewport. Wrapped in `<ClientOnly>` since Mapbox requires the browser.

**Reference:** `app/components/EclipseMap.vue` uses `mapboxgl.accessToken`, `dark-v11` style, and adds GeoJSON source from `/eclipse-data/path.geojson` with `totality-fill`, `totality-border`, and `centerline` layers.

- [ ] **Step 1: Create the component**

Create `app/components/GuidePathMap.vue`:

```vue
<script setup lang="ts">
import mapboxgl from 'mapbox-gl'

const config = useRuntimeConfig()
const mapContainer = ref<HTMLElement | null>(null)
let map: mapboxgl.Map | null = null

const REGION_MARKERS = [
  { label: 'Westfjords', lng: -22.8, lat: 65.8 },
  { label: 'Snæfellsnes', lng: -23.5, lat: 64.85 },
  { label: 'Borgarfjörður', lng: -21.5, lat: 64.7 },
  { label: 'Reykjanes', lng: -22.2, lat: 63.95 },
  { label: 'Reykjavík', lng: -21.9, lat: 64.15 },
]

onMounted(() => {
  if (!mapContainer.value) return

  mapboxgl.accessToken = config.public.mapboxToken as string

  map = new mapboxgl.Map({
    container: mapContainer.value,
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [-22.5, 65.0],
    zoom: 5.5,
    interactive: false,
    attributionControl: false,
  })

  map.on('load', () => {
    if (!map) return

    // Eclipse path GeoJSON (same source as EclipseMap)
    map.addSource('eclipse-path', {
      type: 'geojson',
      data: '/eclipse-data/path.geojson',
    })

    // Totality fill
    map.addLayer({
      id: 'totality-fill',
      type: 'fill',
      source: 'eclipse-path',
      filter: ['==', ['get', 'type'], 'totality_path'],
      paint: {
        'fill-color': '#f59e0b',
        'fill-opacity': 0.08,
      },
    })

    // Totality border
    map.addLayer({
      id: 'totality-border',
      type: 'line',
      source: 'eclipse-path',
      filter: ['==', ['get', 'type'], 'totality_path'],
      paint: {
        'line-color': '#f59e0b',
        'line-opacity': 0.4,
        'line-width': 1,
        'line-dasharray': [4, 3],
      },
    })

    // Centerline
    map.addLayer({
      id: 'centerline',
      type: 'line',
      source: 'eclipse-path',
      filter: ['==', ['get', 'type'], 'centerline'],
      paint: {
        'line-color': '#fbbf24',
        'line-width': 2,
        'line-opacity': 0.8,
      },
    })

    // Region labels as markers
    for (const region of REGION_MARKERS) {
      const el = document.createElement('div')
      el.className = 'guide-map-label'
      el.textContent = region.label

      new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([region.lng, region.lat])
        .addTo(map)
    }
  })
})

onUnmounted(() => {
  map?.remove()
  map = null
})
</script>

<template>
  <ClientOnly>
    <div
      ref="mapContainer"
      class="w-full rounded border border-void-border"
      style="height: 400px;"
    />
    <template #fallback>
      <div
        class="w-full rounded border border-void-border bg-void-surface flex items-center justify-center text-slate-500 font-mono text-sm"
        style="height: 400px;"
      >
        Loading map…
      </div>
    </template>
  </ClientOnly>
</template>

<style scoped>
:deep(.guide-map-label) {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  color: #94a3b8;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8), 0 0 2px rgba(0, 0, 0, 0.6);
  pointer-events: none;
  white-space: nowrap;
  letter-spacing: 0.04em;
}
</style>
```

- [ ] **Step 2: Verify component renders**

Run:
```bash
cd D:/Projects/eclipsechase/eclipse-chaser && npm run dev
```

Temporarily add `<GuidePathMap />` to the placeholder `content/guide.md` using MDC syntax:

```markdown
---
title: Guide
---

# Guide Page

::guide-path-map
::
```

Navigate to `http://localhost:3000/guide`. Expected: A 400px dark map appears with the eclipse path overlay (amber fill + dashed border + centerline) and 5 region labels. The map should not be scrollable/zoomable/draggable.

Press Ctrl+C to stop.

- [ ] **Step 3: Commit**

```bash
git add app/components/GuidePathMap.vue
git commit -m "feat(guide): add GuidePathMap static eclipse path map component"
```

---

## Chunk 3: Markdown Content + Final Integration

### Task 5: Write the full guide.md content

**Files:**
- Modify: `content/guide.md` (replace placeholder)

The Markdown file contains 9 sections with `##` headings, a TOC at the top, tables, FAQ with `<details>`, and three MDC component embeds. All content data comes from the spec at `docs/superpowers/specs/2026-03-15-guide-page-design.md`.

**MDC syntax reference:**
- Block components: `::component-name` on its own line, closed with `::` on its own line
- Components in `app/components/` are auto-registered. Use kebab-case names.
- Available components: `guide-path-map`, `countdown-bar`, `email-signup`

- [ ] **Step 1: Write the full guide content**

Replace the contents of `content/guide.md` with:

```markdown
---
title: 'Complete Guide to the 2026 Total Solar Eclipse in Iceland'
description: 'Everything you need to plan your trip to see the August 12, 2026 total solar eclipse in Iceland.'
---

# Complete Guide to the 2026 Total Solar Eclipse in Iceland

Your practical planning reference for August 12, 2026 — the only total solar eclipse to cross Iceland for the next 170 years.

- [What's Happening](#whats-happening)
- [The Path of Totality](#the-path-of-totality)
- [Best Viewing Spots](#best-viewing-spots)
- [Weather & Cloud Cover](#weather--cloud-cover)
- [Getting There](#getting-there)
- [What to Bring](#what-to-bring)
- [Eclipse Day Timeline](#eclipse-day-timeline)
- [FAQ](#faq)
- [Sign Up](#sign-up)

---

## What's Happening

On **August 12, 2026**, a total solar eclipse will cross Iceland — the only easily accessible land in the path of totality. For roughly two minutes, the moon will completely block the sun, turning day into twilight and revealing the sun's corona with the naked eye.

This is a once-in-a-lifetime event for Iceland. The next total solar eclipse visible from the island won't occur until **2196** — 170 years from now. Western Iceland sits directly in the path, making it the prime destination for eclipse chasers worldwide.

## The Path of Totality

::guide-path-map
::

The path of totality enters Iceland from the northwest, crossing the **Westfjords** before sweeping across **Snæfellsnes peninsula** and **Borgarfjörður**. It then skirts the northern edge of **Reykjavík** and exits over the **Reykjanes peninsula** into the Atlantic.

The further northwest you go, the longer totality lasts — but the harder it is to reach.

| Region | Totality Duration | Totality Starts (UTC) |
|--------|------------------|-----------------------|
| Westfjords | ~2m 10–18s | ~17:43 |
| Snæfellsnes | ~1m 50–2m 10s | ~17:44 |
| Borgarfjörður | ~1m 30–50s | ~17:45 |
| Reykjanes | ~1m 10–40s | ~17:46 |
| Reykjavík | ~0–30s (edge) | ~17:46 |

## Best Viewing Spots

### Westfjords

The longest totality in Iceland — over 2 minutes. Remote, dramatic fjord landscapes, but requires a 4–5 hour drive from Reykjavík. Weather can be variable. Best for dedicated eclipse chasers willing to commit to the journey.

### Snæfellsnes

Excellent balance of duration (~2 minutes), scenery, and accessibility. About 2 hours from Reykjavík. The iconic Snæfellsjökull glacier provides a stunning backdrop. Moderate road access.

### Borgarfjörður

Easy drive from Reykjavík (under 1.5 hours), but shorter totality around 1.5 minutes. Good services and infrastructure. A solid choice if you want convenience without giving up too much eclipse time.

### Reykjanes

Closest to Keflavík Airport — only 45 minutes from Reykjavík. Shortest totality in the path (~1 minute), but the most accessible for last-minute decisions. Volcanic landscape adds character.

### Reykjavík

The capital only catches the **very edge** of the path. You'll see a deep partial eclipse, but totality will last seconds at best — or not at all depending on your exact position. Don't rely on seeing totality from Reykjavík.

[Find your perfect spot →](/recommend)

## Weather & Cloud Cover

Weather is the **single biggest variable** for eclipse viewing. A perfectly positioned spot means nothing under a blanket of clouds.

**Historical August cloud cover** for western Iceland runs **50–70%** on average. Coastal areas tend to be cloudier than inland valleys. The Westfjords are particularly unpredictable.

This is why real-time weather tracking on eclipse day matters far more than any forecast made days ahead. Cloud patterns in Iceland shift rapidly — a spot that's overcast at noon could be clear by afternoon.

**The strategy:** Have 2–3 candidate viewing spots in different microclimates, check conditions on the morning of August 12, and be ready to drive.

[Check live conditions →](/map)

## Getting There

### Flights

Keflavík International Airport (KEF) is the gateway. Major carriers from Europe and North America serve it year-round, with increased frequency in summer. **Book early** — eclipse tourism will spike demand.

### Car Rental

Essential for reaching viewing spots outside Reykjavík. Book as early as possible — rental fleets in Iceland are limited and will sell out. A standard 2WD car handles all main routes in August.

### Driving Times from Reykjavík

- **Reykjanes peninsula:** ~45 minutes
- **Borgarfjörður (Hvanneyri area):** ~1 hour
- **Snæfellsnes (Grundarfjörður):** ~2.5 hours
- **Westfjords (Patreksfjörður):** ~4–5 hours

### Road Conditions

August roads are generally good. Ring Road (Route 1) and main regional roads are paved. Some Westfjords roads are gravel — passable but slower.

**Fuel up** before leaving the Ring Road. Stations are scarce in remote Westfjords and western Snæfellsnes.

### Eclipse Day Traffic

Expect **heavy traffic** on routes toward the eclipse path on August 12. Leave early — ideally be at your viewing spot by noon. Return traffic after the eclipse will be significant.

## What to Bring

- **Eclipse glasses** (ISO 12312-2 certified) — mandatory for all partial phases. Without these, you cannot safely look at the sun before or after totality.
- **Camera gear:** tripod, solar filter for partial phases, remove filter only during totality. A remote shutter release avoids shake.
- **Warm layers:** August in Iceland averages 8–12°C. Wind chill makes it feel colder. Bring a waterproof jacket and wind-resistant outer layer.
- **Offline maps:** Cell coverage is limited in Westfjords and remote Snæfellsnes. Download offline maps before you leave Reykjavík.
- **Power bank** — keep your phone charged for weather checking and navigation.
- **Food and water** — remote spots have no services. Pack lunch and plenty of water.
- **Binoculars** (optional) — incredible for viewing the corona and prominences during totality. Do NOT use during partial phases without solar filters.

## Eclipse Day Timeline

::countdown-bar
::

Here's what happens and when (all times approximate, UTC):

| Time (UTC) | Phase | What to Do |
|------------|-------|-----------|
| ~16:48 | **First contact** — partial eclipse begins | Put on eclipse glasses. The moon starts crossing the sun's disk. |
| ~17:43–17:46 | **Second contact** — totality begins | **Glasses OFF.** Look with naked eyes. You'll see the corona, possibly Baily's beads and the diamond ring effect. |
| During totality | **Mid-eclipse** | Look around — notice the 360° sunset on the horizon, temperature drop, stars appearing. This is your 1–2 minutes. |
| ~17:45–17:48 | **Third contact** — totality ends | **Glasses back ON immediately.** The diamond ring reappears. |
| ~18:35 | **Fourth contact** — partial eclipse ends | The moon fully leaves the sun's disk. Eclipse is over. |

**Tips for totality:**
- Don't spend the whole time photographing — experience it with your eyes first
- Watch for the corona (the sun's outer atmosphere), Baily's beads (light through lunar valleys), and the diamond ring effect
- Notice the sudden temperature drop (can be 5–10°C)
- Look at the horizon for the 360° sunset effect
- Listen — birds and animals react to the sudden darkness

## FAQ

<details>
<summary>Is it safe to look at the eclipse?</summary>

During **totality only** (when the sun is completely covered), it is safe to look with naked eyes. During all partial phases before and after totality, you **must** use certified eclipse glasses (ISO 12312-2). Regular sunglasses are not sufficient.

</details>

<details>
<summary>Do I need special glasses?</summary>

Yes. Eclipse glasses with ISO 12312-2 certification are required for the partial phases. They block 99.997% of sunlight. Buy from reputable vendors — counterfeit glasses exist and can cause eye damage. You can remove them only during totality.

</details>

<details>
<summary>What if it's cloudy?</summary>

Clouds are the biggest risk. You'll still experience the darkness of totality even under clouds, but you won't see the corona. Your best strategy: pick 2–3 viewing spots in different areas, check weather conditions on the morning of eclipse day, and drive to the clearest location.

</details>

<details>
<summary>Can I photograph totality with my phone?</summary>

Yes, but manage expectations. Phone cameras can capture a bright blob where the corona is, but won't match what your eyes see. A DSLR with a telephoto lens (200mm+) on a tripod gives much better results. Most importantly — don't miss the visual experience by staring at your screen.

</details>

<details>
<summary>How early should I get to my spot?</summary>

Be at your chosen viewing location by **noon at the latest**. Traffic will be heavy, and you want time to set up, find parking, and settle in. The partial eclipse begins around 16:48 UTC, but parking and road access will be challenging if you arrive late.

</details>

<details>
<summary>Will there be crowds?</summary>

Yes. Expect tens of thousands of visitors concentrated in western Iceland. Popular spots like Snæfellsnes and Borgarfjörður will be busy. More remote Westfjords locations will have fewer people but limited infrastructure. Plan for parking congestion and potential road delays.

</details>

<details>
<summary>What's the weather usually like in August?</summary>

August in western Iceland averages 10–13°C with frequent cloud cover (50–70% historically). Rain is possible but not constant. Wind is common, especially on the coast. Dress in layers, bring waterproof gear, and be prepared for conditions to change rapidly.

</details>

<details>
<summary>Can I see the eclipse from Reykjavík?</summary>

Reykjavík sits at the **very edge** of the totality path. Depending on your exact location in the city, you might get a few seconds of totality or just a very deep partial eclipse. For a reliable totality experience, drive at least to Borgarfjörður or Reykjanes.

</details>

## Sign Up

Get notified when EclipseChase.is launches with live weather tracking for eclipse day.

::email-signup
::
```

- [ ] **Step 2: Verify full content renders**

Run:
```bash
cd D:/Projects/eclipsechase/eclipse-chaser && npm run dev
```

Navigate to `http://localhost:3000/guide`. Check:

1. TOC links at the top are rendered as a styled nav box and anchor links work (clicking scrolls to the section)
2. The `GuidePathMap` renders as a 400px interactive-disabled map with eclipse path
3. Tables render with dark styling, amber headers
4. FAQ `<details>` elements are collapsible with corona-colored summaries
5. `CountdownBar` shows the countdown timer
6. `EmailSignup` shows the email form
7. Footer links work
8. Browser tab title shows "Complete Guide to the 2026 Total Solar Eclipse in Iceland — EclipseChase.is"
9. View page source — check that JSON-LD `Article` schema is present

Press Ctrl+C to stop.

- [ ] **Step 3: Commit**

```bash
git add content/guide.md
git commit -m "feat(guide): add full guide page content with 9 sections, map, countdown, and signup"
```

---

### Task 6: Build verification and final commit

- [ ] **Step 1: Run production build**

```bash
cd D:/Projects/eclipsechase/eclipse-chaser && npm run build
```

Expected: Build completes without errors. The guide page should be pre-rendered.

- [ ] **Step 2: Preview production build**

```bash
cd D:/Projects/eclipsechase/eclipse-chaser && npm run preview
```

Navigate to `http://localhost:3000/guide`. Verify the page loads correctly in production mode — all styles, components, and content visible. Check page source for SSR-rendered HTML content (important for SEO).

Press Ctrl+C to stop.

- [ ] **Step 3: Final commit (if any adjustments needed)**

If any fixes were required during build verification, stage only the affected files:

```bash
git add content/guide.md app/pages/guide.vue app/components/GuidePathMap.vue
git commit -m "fix(guide): production build adjustments"
```
