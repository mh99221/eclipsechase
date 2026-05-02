# Guide Page Design Spec

## Goal

Build an SEO-optimized long-form guide page at `/guide` that ranks for "2026 Iceland eclipse" searches and serves as a practical planning reference for travelers, driving signups and traffic to /map and /recommend.

## Architecture

### Approach: Nuxt Content Module

Use `@nuxt/content` to render a Markdown file with embedded Vue components. This provides:
- Easy content editing without touching Vue templates
- Auto-generated TOC from `##` headings
- Embedded Vue components for interactive elements (countdown, map, signup form)
- Static HTML at build time for SEO

### File Structure

```
content/
  guide.md                          # Article content with embedded Vue components
app/
  pages/guide.vue                   # Page wrapper: nav, SEO head, renders <ContentDoc>
  components/
    GuidePathMap.vue                 # Static eclipse path map (new)
    CountdownBar.vue                 # (existing) Reused in guide
    EmailSignup.vue                  # (existing) Reused in guide
```

### Dependencies

- Install `@nuxt/content` v3 (compatible with Nuxt 4): `npm install @nuxt/content`
- Add `'@nuxt/content'` to the `modules` array in `nuxt.config.ts`
- The `content/` directory lives at the **project root** (not inside `app/`), since Nuxt Content scans from the root
- No other new dependencies

### Nuxt Content Component Syntax (MDC)

Nuxt Content v3 uses **MDC syntax** to embed Vue components in Markdown — not raw `<Tag />` JSX. Components are referenced as:
- Block component: `::component-name` with `::` closing
- Inline component: `:component-name`

Components in `app/components/` are auto-registered and available in Markdown. Component names in MDC use kebab-case.

## Content Structure

The Markdown file contains 9 sections with `##` headings. A linked anchor list (TOC) at the top of the article provides navigation. No sticky sidebar — keeps layout simple and consistent.

### 1. What's Happening
- Date: August 12, 2026
- Type: Total solar eclipse
- Why Iceland: only easily accessible land in the path of totality
- Significance: next total eclipse in Iceland is 2196 (170 years away)
- One paragraph, punchy

### 2. The Path of Totality
- Embedded `::guide-path-map` MDC component (see Component Design below)
- Text: path enters from northwest, crosses Westfjords, Snæfellsnes, skirts Reykjavík, exits over Reykjanes
- Table of regions with approximate totality duration and time:

| Region | Totality Duration | Totality Starts (UTC) |
|--------|------------------|-----------------------|
| Westfjords | ~2m 10-18s | ~17:43 |
| Snæfellsnes | ~1m 50-2m 10s | ~17:44 |
| Borgarfjörður | ~1m 30-50s | ~17:45 |
| Reykjanes | ~1m 10-40s | ~17:46 |
| Reykjavík | ~0-30s (edge) | ~17:46 |

### 3. Best Viewing Spots
- Brief paragraph per region covering trade-offs (duration vs accessibility vs weather)
- Westfjords: longest totality, most remote, weather variable
- Snæfellsnes: great duration, scenic, moderate accessibility
- Borgarfjörður: easy drive from Reykjavík, shorter totality
- Reykjanes: closest to airport, shortest totality
- Reykjavík: only catches the edge — partial or seconds of totality
- CTA: link to /recommend ("Find your perfect spot →")

### 4. Weather & Cloud Cover
- Why weather is the single biggest variable for eclipse viewing
- Historical August cloud cover stats for western Iceland (typically 50-70%)
- Coastal vs inland patterns
- Why real-time tracking on eclipse day matters more than forecasts made days ahead
- CTA: link to /map ("Check live conditions →")

### 5. Getting There
- Flights: Keflavík International Airport (KEF), major European carriers
- Car rental: essential for reaching viewing spots outside Reykjavík
- Driving times from Reykjavík: Snæfellsnes ~2h, Westfjords ~4-5h, Reykjanes ~45min
- Road conditions in August: mostly good, some gravel roads in Westfjords
- Fuel: fill up before leaving Ring Road, limited stations in remote areas
- Important: expect heavy traffic on eclipse day, leave early

### 6. What to Bring
- Eclipse glasses (ISO 12312-2 certified) — mandatory for partial phases
- Camera gear: tripod, solar filter for partial phases, remove filter during totality
- Clothing: warm layers, waterproof jacket, wind protection (August avg 8-12°C)
- Offline maps: cell coverage limited in Westfjords and remote Snæfellsnes
- Power bank, food, water for remote spots
- Binoculars (optional, great for totality)

### 7. Eclipse Day Timeline
- Embedded `::countdown-bar` MDC component
- Timeline table with what happens at each phase:
  - ~16:48 UTC: First contact (partial eclipse begins) — put on eclipse glasses
  - ~17:43-17:46 UTC: Second contact (totality begins) — glasses OFF, look with naked eyes
  - ~17:45-17:48 UTC: Third contact (totality ends) — glasses back ON
  - ~18:35 UTC: Fourth contact (partial eclipse ends)
- Tips: what to watch for during totality (corona, Baily's beads, diamond ring, temperature drop, 360° sunset)

### 8. FAQ
- 6-8 collapsible questions using `<details><summary>` in Markdown:
  - Is it safe to look at the eclipse?
  - Do I need special glasses?
  - What if it's cloudy?
  - Can I photograph totality with my phone?
  - How early should I get to my spot?
  - Will there be crowds?
  - What's the weather usually like in August?
  - Can I see it from Reykjavík?

### 9. Sign Up
- Embedded `::email-signup` MDC component
- Short CTA: "Get notified when EclipseChase.is launches with live weather tracking for eclipse day."

## Component Design

### GuidePathMap.vue

A lightweight, non-interactive static map showing the eclipse path.

**Props:** None (self-contained)

**Behavior:**
- Renders a Mapbox GL map with no navigation controls, no scroll zoom, no interaction
- Loads `/eclipse-data/path.geojson` via Mapbox `addSource` (same static asset as EclipseMap) — totality path fill + centerline
- Fixed center: [-22.5, 65.0], zoom: 5.5
- Dark style (mapbox://styles/mapbox/dark-v11) matching app theme
- Height: 400px, rounded corners, border matching void-border
- Region labels as static markers or map annotations (Westfjords, Snæfellsnes, Reykjanes, Reykjavík)
- Wrapped in `<ClientOnly>` with loading fallback

**Why a separate component (not reusing EclipseMap):**
EclipseMap is a complex interactive component with weather markers, spot markers, zoom handling, popups, and profile integration. The guide needs a simple static illustration. A dedicated component avoids pulling in unnecessary complexity and keeps the guide page lightweight.

### Page Wrapper (guide.vue)

**Layout:**
- Nav: logo + "MAP" link (same as recommend.vue)
- Article: `section-container max-w-2xl`
- Renders `<ContentDoc>` from Nuxt Content
- Footer: links to /map, /recommend, and back to home

**SEO Head:**
- Title: `'Complete Guide to the 2026 Total Solar Eclipse in Iceland'` (short form — the global `titleTemplate` in nuxt.config.ts appends ` — EclipseChase.is` automatically)
- Meta description: "Everything you need to plan your trip to see the August 12, 2026 total solar eclipse in Iceland — path of totality, best viewing spots, weather, and what to bring."
- JSON-LD: `Article` schema following the `index.vue` pattern — use `useRuntimeConfig().public.siteUrl` for URLs, not hardcoded strings. Structure:

```ts
{
  '@context': 'https://schema.org',
  '@type': 'Article',
  'headline': 'Complete Guide to the 2026 Total Solar Eclipse in Iceland',
  'datePublished': '2026-03-15',
  'author': { '@type': 'Organization', 'name': 'EclipseChase.is', 'url': siteUrl },
  'publisher': { '@type': 'Organization', 'name': 'EclipseChase.is' },
  'description': '...',
  'image': `${siteUrl}/og-image.jpg`,
  'url': `${siteUrl}/guide`,
}
```

- Open Graph: override `og:type` to `article`, `og:url` to `${siteUrl}/guide`
- Canonical: `${siteUrl}/guide` (use runtimeConfig, not hardcoded)

**Styling for Markdown content:**

Use scoped CSS with `:deep()` selectors on a `.guide-content` wrapper class. Do NOT add `@tailwindcss/typography` — it's unnecessary for a single page. The styles target Nuxt Content's rendered HTML elements directly:

```vue
<style scoped>
.guide-content :deep(h2) { /* font-display text-2xl font-bold text-white, with id anchors */ }
.guide-content :deep(h3) { /* font-display text-lg font-semibold text-slate-200 */ }
.guide-content :deep(p) { /* text-sm sm:text-base text-slate-400 font-mono leading-relaxed */ }
.guide-content :deep(table) { /* dark-themed with void-surface background, corona accent headers */ }
.guide-content :deep(a) { /* corona-colored with hover states */ }
.guide-content :deep(details) { /* void-surface background, corona summary text */ }
.guide-content :deep(ul), .guide-content :deep(ol) { /* styled bullets with slate colors */ }
</style>
```

## i18n

Guide body content is English-only (primary SEO target language). Only page-level meta uses i18n keys:

```json
{
  "guide": {
    "title": "Complete Guide to the 2026 Total Solar Eclipse in Iceland",
    "description": "Everything you need to plan your trip to see the August 12, 2026 total solar eclipse in Iceland."
  }
}
```

Icelandic content can be added later as `content/is/guide.md` using Nuxt Content's locale routing.

## What This Does NOT Include

- No live weather data on the guide page (that's /map)
- No spot recommendation logic (that's /recommend)
- No Stripe/pro-tier gating
- No Icelandic translation of guide content (can be added later)
- No comments or user-generated content
- No cross-linking to /guide from other pages' navs (can be added later as a separate change)
