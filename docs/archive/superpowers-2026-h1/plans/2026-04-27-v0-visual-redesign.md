# v0 Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pixel-faithful visual port of the locked-in v0 mobile design (`eclipsechase-v0-prototype/`) onto the existing Nuxt production app, with **zero changes to data, routing, auth, or business logic**. Tokens, fonts, layout, components, and copy match v0; everything behind them stays as-is.

**Architecture:** Token layer first (CSS vars in `main.css` + tailwind extends), then chrome (BrandBar / TabBar / PageShell extracted from `app.vue`), then shared primitives (Pill / Card / Eyebrow / Stat / Advisory / etc.), then page-by-page redesigns (Spot Detail → Home → Spots → Map → Guide). Each page replaces its existing layout in-place; no `v0/` co-existence layer.

**Tech Stack:** Nuxt 4 · Vue 3 · TypeScript · TailwindCSS · `@nuxtjs/color-mode` · Mapbox GL JS · `@nuxt/content` · Vitest + Playwright.

**Spec source of truth:** `eclipsechase-v0-prototype/PRODUCTION_SPEC.md` (contract) + `SPEC.md` (narrative) + `v0.jsx` / page-jsx files (visual). When the prototype and the spec disagree, the prototype wins.

---

## Hard constraints (no-logic-change)

These are not suggestions. Any deviation needs the user's sign-off.

1. **No data-model changes.** No new columns, no migrations. `viewing_spots.warnings` stays `string[]` — render every entry as an `info`-level v0 advisory (uniform glyph `i` + `--accent` color). Per-warning level/title/body shape upgrade → out of scope, ticket only.
2. **No route changes.** `/dashboard` stays the Pro-gated home; `/` stays the public landing (untouched in this plan); `/spots`, `/spots/[slug]`, `/map`, `/guide`, `/pro` keep their paths and middleware.
3. **No new pages.** No `/me`. The v0 nav order `HOME · SPOTS · MAP · GUIDE · ME` is reduced to the existing 4-tab order `HOME · SPOTS · MAP · GUIDE` (drop ME entirely; existing `UserMenu` stays in the BrandBar like today).
4. **No new features.** The v0 Spot-Detail "Plan" tab needs alternates data we don't have — render the tab with a "Plan B coming soon" placeholder card; `MiniMap` reuses the existing inline map already present at the bottom of `[slug].vue`.
5. **No Pro-gate changes.** `/dashboard`, `/map`, `/recommend` remain Pro-gated. Free users still hit `/pro`.
6. **No copy changes that affect logic.** v0 verbatim copy goes into `i18n/en.json` under a new `v0.*` namespace; existing keys stay until their consumer is removed. `is.json` keeps existing values; new keys fall back to en (no Icelandic translation in this pass — ticket).
7. **No profile id changes.** v0 lists `all | photographer | family | first-timer | astronomer`. Production `useRecommendation` defines `photographer | family | hiker | skychaser | firsttimer`. **Keep production ids as-is.** Display labels can be v0-styled; the underlying ids and weights don't change.
8. **No region renames.** v0 chips show `All · Snæfellsnes · Westfjords · East · West`. Production regions are `westfjords | snaefellsnes | reykjanes | reykjavik | borgarfjordur`. Render the production set (display-cased), not v0's literal list.
9. **No font swap that requires self-hosting.** Inter Tight + JetBrains Mono load via Google Fonts (matches existing Manrope/IBM-Plex-Mono pattern in `nuxt.config.ts`).
10. **Don't touch `/` (public landing).** Out of scope for v0.

---

## v0 → production mapping

| v0 page (§ in PRODUCTION_SPEC) | Production route | Component file | Existing data sources |
|---|---|---|---|
| Home (§4) | `/dashboard` | `app/pages/dashboard.vue` | `useCountdown`, `bestRegion`, localStorage `eclipse-checklist` |
| Spots List (§5) | `/spots` | `app/pages/spots/index.vue` | `/api/spots`, `/eclipse-data/historical-weather.json`, `useRecommendation` |
| Map (§6) | `/map` | `app/pages/map.vue` + `EclipseMap.vue` | `/api/weather/cloud-cover`, `/api/weather/stations`, `/api/spots`, `useMapOverlay` |
| Spot Detail (§7) | `/spots/[slug]` | `app/pages/spots/[slug].vue` | `/api/spots/[slug]`, `historical-weather.json`, `eclipseGrid` (server) |
| Guide (§8) | `/guide` | `app/pages/guide.vue` + `content/guide.md` | Nuxt Content |
| BrandBar | every page | `app/app.vue` (inline today) | n/a |
| TabBar | Pro pages | `app/components/BottomNav.vue` | `useNavItems` |

---

## File structure (after this plan)

```
app/
├── app.vue                       # MODIFY — replace inline top nav with <BrandBar />
├── assets/css/
│   └── main.css                  # MODIFY — add v0 token block, swap font families
├── components/
│   ├── BrandBar.vue              # NEW — sticky top chrome
│   ├── BottomNav.vue             # MODIFY — restyle to v0 TabBar (4 tabs, no ME)
│   ├── PageShell.vue             # NEW — wraps a page with paddings 90/90 + data-screen
│   ├── ui/                       # NEW — shared v0 primitives
│   │   ├── Eyebrow.vue
│   │   ├── Pill.vue
│   │   ├── StatusDot.vue
│   │   ├── CloudBar.vue
│   │   ├── Card.vue
│   │   ├── CardTitle.vue
│   │   ├── Stat.vue
│   │   └── AdvisoryCard.vue
│   ├── home/                     # NEW — page-specific composites
│   │   ├── CountdownGrid.vue
│   │   └── Checklist.vue
│   ├── spots/
│   │   ├── SpotCard.vue          # NEW — 160px photo card per §5.2
│   │   ├── ProfileSelector.vue   # NEW — pills + hint
│   │   ├── SortTabs.vue          # NEW — two-tab sort
│   │   └── RegionChips.vue       # NEW — h-scroll region pills
│   ├── spot-detail/              # NEW
│   │   ├── SpotHeroBlock.vue
│   │   ├── AdvisoriesBlock.vue
│   │   ├── DetailTabs.vue
│   │   ├── StatStrip.vue
│   │   ├── HorizonDial.vue
│   │   ├── CloudHistogram.vue
│   │   ├── ContactList.vue
│   │   ├── LogisticsRows.vue
│   │   └── AlternatesPlaceholder.vue
│   └── map/                      # NEW
│       ├── MapChipStack.vue
│       └── SelectedLightbox.vue
├── pages/
│   ├── dashboard.vue             # REWRITE per §4
│   ├── spots/
│   │   ├── index.vue             # REWRITE per §5
│   │   └── [slug].vue            # REWRITE per §7
│   ├── map.vue                   # MODIFY — overlay v0 chrome on existing Mapbox
│   └── guide.vue                 # MODIFY — apply v0 typography + add TOC chip strip
└── utils/
    └── v0.ts                     # NEW — small helpers (cloudToStatus, fmtDuration if not already there)

content/guide.md                  # UNCHANGED in shape; CSS prose styles change appearance

tailwind.config.ts                # MODIFY — extend with v0 tokens + fonts
nuxt.config.ts                    # MODIFY — swap font preload links to Inter Tight + JetBrains Mono
i18n/en.json                      # MODIFY — add v0.* namespace with verbatim copy
```

Components removed (replaced wholesale):
- The inline top nav block in `app/app.vue` lines 41–84 → `BrandBar.vue`.
- Existing layout in `dashboard.vue` body / `spots/index.vue` body / `spots/[slug].vue` body / `map.vue` chrome / `guide.vue` body — all rewritten in-place, but the `<script setup>` data-loading code stays.
- `CountdownBar.vue`, `EclipseHero.vue`, `EmailSignup.vue`, `Starfield.vue` → only used by `/`, untouched.

---

## Acceptance criteria (per page)

Verbatim from PRODUCTION_SPEC §12, with this plan's adjustments:

1. Visual diff vs. prototype at 402×874. Within 1–2px on static state.
2. Sticky chrome on every Pro page (BrandBar fixed top with blur, TabBar fixed bottom with blur).
3. Active states match (2px bottom border on Sort tabs, 3px left border on Advisory cards, etc.).
4. Every numeric display has `font-variant-numeric: tabular-nums`.
5. Behaviors unchanged from current production:
   - Home countdown ticks every 1s. **Target = HELLNAR `eclipseDate` constant for v0; existing `useCountdown` already targets it.**
   - Home checklist persists across reload using existing localStorage key `eclipse-checklist` (do NOT migrate to `eclipsechase.checklist`).
   - Spots List sort + filter + profile work as today.
   - Map: pin tap selects → lightbox updates. Default selection = whatever current map.vue defaults to. Layer pills toggle existing weather/roads/cams overlays.
   - Spot Detail tabs swap content; advisories render the existing `warnings` array as `info`-level cards.
6. A11y baseline: ≥44×44 tap targets, `aria-pressed` on toggle pills, status colors paired with text/glyphs, `prefers-reduced-motion` halts countdown's interval (already does so via `useCountdown` — verify).
7. Tests pass: existing unit + server tests untouched; component tests updated for new selectors; Playwright smoke tests for each redesigned page.

---

## Phase 0: Tokens & Fonts

**Files:**
- Modify: `app/assets/css/main.css`
- Modify: `tailwind.config.ts`
- Modify: `nuxt.config.ts:51-55` (font preloads)

### Task 0.1: Add v0 color tokens to dark theme

- [ ] **Step 1:** Open `app/assets/css/main.css`. Inside the `html.dark { ... }` block, replace existing color values with v0 dark palette and add the missing v0 tokens:

```css
html.dark {
  /* v0 dark theme — values from eclipsechase-v0-prototype/tokens.jsx THEMES.dark */
  --bg:             7   10  18;   /* #070A12 */
  --bg-elevated:    13  19  32;   /* #0D1320 */
  --surface:        255 255 255;  /* used with /0.04 alpha — see tailwind extend */
  --surface-solid:  16  23  42;   /* #10172A */
  --border-subtle:  255 255 255;  /* used with /0.08 alpha */
  --border-strong:  255 255 255;  /* used with /0.16 alpha */

  --ink-1:          232 229 220;  /* #E8E5DC primary cream text (was 255 255 255) */
  --ink-2:          232 229 220;  /* used with /0.62 alpha for secondary */
  --ink-3:          232 229 220;  /* used with /0.42 alpha for faint */

  --accent:         232 154 60;   /* #E89A3C amber (was 245 158 11) */
  --accent-strong:  232 154 60;
  --accent-soft:    232 154 60;   /* used with /0.16 alpha for accentDim */

  --totality:       143 140 97;   /* #8F8C61 olive — NEW */
  --cream:          229 214 181;  /* #E5D6B5 — NEW */

  --good:           120 216 136;  /* #78D888 — NEW */
  --warn:           229 192 74;   /* #E5C04A — NEW */
  --bad:            216 88  72;   /* #D85848 — NEW */

  --chart-track:    255 255 255;  /* used with /0.06 alpha */

  --selection-bg:   232 154 60;
  --selection-ink:  232 229 220;
  --body-gradient:  radial-gradient(ellipse at 50% 0%, #0a1320 0%, #070A12 70%);
}
```

- [ ] **Step 2:** Update the default `html { ... }` fallback block (lines 73–87) to mirror these new dark values so SSR doesn't flash.

- [ ] **Step 3:** Update `html.light { ... }` block to v0 light palette (lines 25–43 of `tokens.jsx → THEMES.light`). Light theme stays unverified per spec §13 — wire it but don't surface a toggle. **Hide the existing `ThemeToggle.vue` from any UI in this pass** (don't render it; ticket the verification pass).

- [ ] **Step 4:** Verify: run `npm run dev`, open any page, inspect computed styles on `<html>`. Confirm `--accent` resolves to `232 154 60`, `--totality` exists.

- [ ] **Step 5:** Commit:

```bash
git add app/assets/css/main.css
git commit -m "feat(tokens): §2.1 v0 color tokens — replace amber + add totality/cream/good/warn/bad

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 0.2: Extend tailwind config with new tokens

- [ ] **Step 1:** Open `tailwind.config.ts`. In `theme.extend.colors`, add v0 tokens (alongside legacy void/corona/ice — keep legacy entries; they may still be referenced by `/`):

```ts
// Inside theme.extend.colors after the existing semantic tokens:
'bg-elevated':    'rgb(var(--bg-elevated) / <alpha-value>)',
'surface-solid':  'rgb(var(--surface-solid) / <alpha-value>)',
'border-strong':  'rgb(var(--border-strong) / <alpha-value>)',
totality:         'rgb(var(--totality) / <alpha-value>)',
cream:            'rgb(var(--cream) / <alpha-value>)',
good:             'rgb(var(--good) / <alpha-value>)',
warn:             'rgb(var(--warn) / <alpha-value>)',
bad:              'rgb(var(--bad) / <alpha-value>)',
'chart-track':    'rgb(var(--chart-track) / <alpha-value>)',
```

- [ ] **Step 2:** Replace the `fontFamily` block (lines 51–54):

```ts
fontFamily: {
  display: ['"Inter Tight"', '-apple-system', 'system-ui', 'sans-serif'],
  body:    ['"Inter Tight"', '-apple-system', 'system-ui', 'sans-serif'],
  mono:    ['"JetBrains Mono"', '"SF Mono"', 'ui-monospace', 'Menlo', 'monospace'],
},
```

- [ ] **Step 3:** Restart dev server. In a Vue file, try `class="bg-totality text-cream font-mono"` on a temporary `<div>` — confirm tailwind picks them up. Remove the test div.

- [ ] **Step 4:** Commit: `feat(tokens): §2.2 expose v0 tokens + Inter Tight / JetBrains Mono via tailwind`

### Task 0.3: Swap font preloads

- [ ] **Step 1:** Open `nuxt.config.ts:51-55`. Replace the Manrope/IBM Plex Mono preload with:

```ts
{ rel: 'preload', as: 'style', href: 'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap', onload: "this.onload=null;this.rel='stylesheet'" },
{ rel: 'noscript', innerHTML: '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap">' } as any,
```

- [ ] **Step 2:** Open `app/assets/css/main.css`. Update the base `html { font-family: ... }` (line 88) to `font-family: 'Inter Tight', system-ui, sans-serif;`.

- [ ] **Step 3:** Verify: open `/dashboard`. Body text renders in Inter Tight; mono labels render in JetBrains Mono. Check Network tab — old Manrope CSS should not be requested.

- [ ] **Step 4:** Commit: `feat(tokens): §2.2 swap fonts to Inter Tight + JetBrains Mono`

### Task 0.4: Add v0 i18n namespace

- [ ] **Step 1:** Open `i18n/en.json`. Add a top-level `v0` key:

```json
"v0": {
  "home": {
    "eyebrow": "ECLIPSE 2026",
    "best_conditions_now": "BEST CONDITIONS NOW",
    "view_map_cta": "VIEW MAP →",
    "checklist_eyebrow": "ECLIPSE DAY CHECKLIST",
    "checklist": [
      "Eclipse glasses (ISO 12312-2 certified)",
      "Check weather forecast morning of eclipse day",
      "Arrive at viewing spot 2 hours before totality",
      "Fully charged phone & camera",
      "Warm layers (Iceland weather is unpredictable)",
      "Snacks & water"
    ]
  },
  "spots": {
    "viewer_profile_eyebrow": "— VIEWER PROFILE",
    "sort_duration": "TOTALITY DURATION",
    "sort_clearness": "HISTORICAL CLEARNESS"
  },
  "spot_detail": {
    "kicker": "● SPOT DOSSIER",
    "advisories_eyebrow": "— ADVISORIES",
    "tab_overview": "Overview",
    "tab_sky": "Sky",
    "tab_weather": "Weather",
    "tab_plan": "Plan",
    "stat_totality": "TOTALITY",
    "stat_sun_alt": "SUN ALT",
    "stat_horizon": "HORIZON",
    "card_contact": "Contact times · UTC",
    "card_logistics": "Logistics",
    "card_sun_position": "Sun position at totality",
    "card_cloud_cover": "Cloud cover · 16-yr Aug 12",
    "card_plan_b": "Plan B · within 30 min",
    "card_map": "Map",
    "plan_placeholder": "Alternates data coming soon."
  },
  "map": {
    "open_field_card": "OPEN FIELD CARD →",
    "selected": "SELECTED",
    "stat_totality": "TOTALITY",
    "stat_cloud": "CLOUD",
    "stat_score": "SCORE"
  }
}
```

- [ ] **Step 2:** Commit: `feat(i18n): add v0.* namespace with verbatim copy from prototype`

---

## Phase 1: Chrome — BrandBar, TabBar, PageShell

### Task 1.1: BrandBar component

**Files:**
- Create: `app/components/BrandBar.vue`
- Modify: `app/app.vue`

- [ ] **Step 1:** Create `app/components/BrandBar.vue`:

```vue
<script setup lang="ts">
const { isPro } = useProStatus()
const route = useRoute()
const isLanding = computed(() => route.path === '/')
</script>

<template>
  <header class="brand-bar">
    <div class="brand-bar-inner">
      <NuxtLink to="/" aria-label="EclipseChase — Home" class="brand-mark">
        <svg class="brand-mark-logo" viewBox="0 0 128 128" fill="none" aria-hidden="true">
          <circle cx="64" cy="64" r="36" fill="#070A12" />
          <circle cx="64" cy="64" r="36" stroke="rgb(var(--accent))" stroke-width="3" opacity="0.8" />
          <circle cx="96" cy="48" r="4" fill="rgb(var(--accent))" />
        </svg>
        <span class="brand-mark-wordmark">ECLIPSECHASE</span>
      </NuxtLink>

      <div class="brand-bar-right">
        <span v-if="isLanding" class="brand-bar-coords">64.1°N 21.9°W · AUG 12 2026</span>
        <ClientOnly v-else><UserMenu /></ClientOnly>
      </div>
    </div>
  </header>
</template>

<style scoped>
.brand-bar {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 30;
  background: rgb(var(--bg-elevated) / 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgb(var(--border-subtle) / 0.08);
}
.brand-bar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: max(env(safe-area-inset-top), 16px) 16px 14px;
  min-height: 74px;
}
.brand-mark {
  display: flex; align-items: center; gap: 10px;
  text-decoration: none;
}
.brand-mark-logo { width: 22px; height: 22px; }
.brand-mark-wordmark {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.21em; /* 2.5 / 12 */
  color: rgb(var(--ink-1));
}
.brand-bar-coords {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.18em;
  color: rgb(var(--ink-1) / 0.62);
}
.brand-bar-right { display: flex; align-items: center; gap: 14px; min-height: 44px; }
</style>
```

- [ ] **Step 2:** In `app/app.vue`, replace the inline nav (lines 41–84) with `<BrandBar />`. Keep `NuxtLoadingIndicator`, `NuxtRouteAnnouncer`, `<NuxtPage />`, `<BottomNav />`, `<CookieConsent />`. Drop the `mobileNavPadding`, `showMasthead`, `navInnerClass` computeds; the new chrome handles spacing via `PageShell`.

- [ ] **Step 3:** Manual verify: every page now shows the v0 wordmark + safe-area-aware padding. UserMenu still appears on Pro pages.

- [ ] **Step 4:** Commit: `feat(chrome): §3.1 BrandBar component replaces inline top nav`

### Task 1.2: BottomNav restyle to v0 TabBar

**Files:**
- Modify: `app/components/BottomNav.vue`
- Modify: `app/composables/useNavItems.ts` (reorder)

- [ ] **Step 1:** Open `app/composables/useNavItems.ts`. Reorder `NAV_ITEMS` to `Home · Spots · Map · Guide` (drop ME — out of scope per constraint #3):

```ts
export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/dashboard', label: 'Home',  icon: 'home' },
  { to: '/spots',     label: 'Spots', icon: 'spots' },
  { to: '/map',       label: 'Map',   icon: 'map' },
  { to: '/guide',     label: 'Guide', icon: 'guide' },
] as const
```

- [ ] **Step 2:** Open `app/components/BottomNav.vue`. Restyle per §3.2 — keep existing show/hide logic and SVG icons but update spacing + colors:

```vue
<style scoped>
.bottom-nav {
  position: fixed; bottom: 0; left: 0; right: 0;
  height: 72px;
  display: flex; align-items: center; justify-content: space-around;
  background: rgb(var(--bg-elevated) / 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid rgb(var(--border-subtle) / 0.08);
  z-index: 30;
}
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .bottom-nav {
    height: calc(72px + env(safe-area-inset-bottom));
    padding-bottom: env(safe-area-inset-bottom);
  }
}
@media (min-width: 768px) { .bottom-nav { display: none; } }

.bottom-nav-item {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  flex: 1; padding: 8px 0; min-height: 44px;
  text-decoration: none;
}
.bottom-nav-item svg { width: 20px; height: 20px; color: rgb(var(--ink-1) / 0.62); transition: color 0.2s; }
.bottom-nav-label {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: rgb(var(--ink-1) / 0.62);
  transition: color 0.2s;
}
.bottom-nav-item.active svg,
.bottom-nav-item.active .bottom-nav-label { color: rgb(var(--accent)); }
</style>
```

Inside the template, also resize the icons to `width="20" height="20"` (currently 27/29) and drop the active-dot pseudo-element.

- [ ] **Step 3:** Verify each tab on /dashboard, /spots, /map, /guide. Active state lights amber. Tap target ≥44px. Hidden on desktop.

- [ ] **Step 4:** Commit: `feat(chrome): §3.2 TabBar restyle, drop ME, reorder per spec`

### Task 1.3: PageShell wrapper

**Files:** Create: `app/components/PageShell.vue`

- [ ] **Step 1:** Create:

```vue
<script setup lang="ts">
defineProps<{ screen: string }>()
</script>

<template>
  <main :data-screen="screen" class="page-shell">
    <slot />
  </main>
</template>

<style scoped>
.page-shell {
  background: rgb(var(--bg));
  color: rgb(var(--ink-1));
  min-height: 100vh;
  padding-top: 90px;    /* clears BrandBar */
  padding-bottom: 90px; /* clears TabBar */
}
</style>
```

- [ ] **Step 2:** Commit: `feat(chrome): §3.3 PageShell with 90/90 padding + data-screen`

---

## Phase 2: Shared primitives

All small components in `app/components/ui/`. Each is one file, one concern. Build them up-front so subsequent page work is composition.

### Task 2.1: `Eyebrow.vue`

```vue
<script setup lang="ts">
defineProps<{
  variant?: 'plain' | 'dot' | 'dash'
  align?: 'left' | 'center'
}>()
</script>

<template>
  <div class="eyebrow" :data-variant="variant ?? 'plain'" :data-align="align ?? 'left'">
    <span v-if="variant === 'dot'">● </span>
    <span v-else-if="variant === 'dash'">— </span>
    <slot />
  </div>
</template>

<style scoped>
.eyebrow {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgb(var(--ink-1) / 0.62);
}
.eyebrow[data-align='center'] { text-align: center; }
</style>
```

- [ ] **Step 1:** Create file. **Step 2:** Commit: `feat(ui): Eyebrow primitive`

### Task 2.2: `Pill.vue`

```vue
<script setup lang="ts">
defineProps<{
  active?: boolean
  size?: 'sm' | 'md'      // sm = mono 10/6×10, md = mono 11/6×12
  ariaPressed?: boolean
}>()
</script>

<template>
  <button
    type="button"
    class="pill"
    :data-active="active ?? false"
    :data-size="size ?? 'md'"
    :aria-pressed="ariaPressed ?? active ?? false"
  >
    <slot />
  </button>
</template>

<style scoped>
.pill {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-weight: 500;
  border-radius: 99px;
  white-space: nowrap;
  cursor: pointer;
  background: transparent;
  color: rgb(var(--ink-1) / 0.62);
  border: 1px solid rgb(var(--border-subtle) / 0.08);
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  min-height: 32px;
}
.pill[data-size='sm'] { padding: 6px 10px; font-size: 10px; letter-spacing: 0.1em; }
.pill[data-size='md'] { padding: 6px 12px; font-size: 11px; letter-spacing: 0.045em; }

.pill[data-active='true'] {
  background: rgb(var(--accent) / 0.16);
  color: rgb(var(--accent));
  border-color: rgb(var(--accent));
}

.pill:focus-visible {
  outline: 2px solid rgb(var(--accent));
  outline-offset: 2px;
}
</style>
```

- [ ] **Step 1:** Create. **Step 2:** Commit: `feat(ui): Pill primitive (sm/md, active/inactive)`

### Task 2.3: `StatusDot.vue`

```vue
<script setup lang="ts">
import { cloudToStatus } from '~/utils/v0'
defineProps<{ status: 'good' | 'marginal' | 'bad' }>()
</script>

<template>
  <span class="status-dot" :data-status="status" aria-hidden="true" />
</template>

<style scoped>
.status-dot {
  display: inline-block;
  width: 8px; height: 8px;
  border-radius: 99px;
  vertical-align: middle;
}
.status-dot[data-status='good']     { background: rgb(var(--good)); }
.status-dot[data-status='marginal'] { background: rgb(var(--warn)); }
.status-dot[data-status='bad']      { background: rgb(var(--bad)); }
</style>
```

- [ ] **Step 1:** Create. **Step 2:** Commit: `feat(ui): StatusDot primitive`

### Task 2.4: `app/utils/v0.ts`

```ts
export type V0Status = 'good' | 'marginal' | 'bad'

export function cloudToStatus(cloud: number | null | undefined): V0Status {
  if (cloud == null) return 'marginal'
  if (cloud < 40) return 'good'
  if (cloud <= 70) return 'marginal'
  return 'bad'
}

export function statusColor(status: V0Status): string {
  return status === 'good' ? 'rgb(var(--good))'
       : status === 'bad'  ? 'rgb(var(--bad))'
       :                     'rgb(var(--warn))'
}
```

`formatDuration` already exists in `app/utils/eclipse.ts` — reuse it.

- [ ] **Step 1:** Create. **Step 2:** Commit: `feat(util): cloudToStatus + statusColor helpers per §10`

### Task 2.5: `CloudBar.vue` (12-segment bar)

```vue
<script setup lang="ts">
const props = defineProps<{ cloud: number; segments?: number }>()
const filled = computed(() => Math.round((props.cloud / 100) * (props.segments ?? 12)))
const total = computed(() => props.segments ?? 12)
</script>

<template>
  <div class="cloud-bar" :aria-label="`${cloud}% cloud cover`">
    <span
      v-for="i in total"
      :key="i"
      class="seg"
      :data-on="i <= filled"
      :data-band="i / total < 0.5 ? 'good' : i / total < 0.7 ? 'warn' : 'bad'"
    />
  </div>
</template>

<style scoped>
.cloud-bar { display: flex; gap: 2px; }
.seg { flex: 1; height: 4px; border-radius: 1px; background: rgb(var(--chart-track) / 0.06); }
.seg[data-on='true'][data-band='good'] { background: rgb(var(--good)); }
.seg[data-on='true'][data-band='warn'] { background: rgb(var(--warn)); }
.seg[data-on='true'][data-band='bad']  { background: rgb(var(--bad)); }
</style>
```

- [ ] **Step 1:** Create. **Step 2:** Commit: `feat(ui): CloudBar 12-segment primitive`

### Task 2.6: `Card.vue` and `CardTitle.vue`

```vue
<!-- Card.vue -->
<template>
  <div class="ui-card"><slot /></div>
</template>
<style scoped>
.ui-card {
  background: rgb(255 255 255 / 0.04);
  border: 1px solid rgb(var(--border-subtle) / 0.08);
  border-radius: 12px;
  padding: 14px;
}
</style>
```

```vue
<!-- CardTitle.vue -->
<template>
  <div class="ui-card-title"><slot /></div>
</template>
<style scoped>
.ui-card-title {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--ink-1) / 0.62);
  margin-bottom: 12px;
}
</style>
```

- [ ] **Step 1:** Create both. **Step 2:** Commit: `feat(ui): Card + CardTitle primitives`

### Task 2.7: `Stat.vue`

```vue
<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  sub?: string
  tone?: 'totality' | 'good' | 'warn' | 'bad' | 'ink'
  size?: 'sm' | 'md' | 'lg'   // sm=14, md=18, lg=26
}>()
</script>

<template>
  <div class="ui-stat">
    <div class="ui-stat-label">{{ label }}</div>
    <div class="ui-stat-value" :data-tone="tone ?? 'ink'" :data-size="size ?? 'md'">{{ value }}</div>
    <div v-if="sub" class="ui-stat-sub">{{ sub }}</div>
  </div>
</template>

<style scoped>
.ui-stat-label {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.17em;
  color: rgb(var(--ink-1) / 0.42);
}
.ui-stat-value {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  margin-top: 4px;
  color: rgb(var(--ink-1));
}
.ui-stat-value[data-size='sm']  { font-size: 14px; }
.ui-stat-value[data-size='md']  { font-size: 18px; }
.ui-stat-value[data-size='lg']  { font-size: 26px; }
.ui-stat-value[data-tone='totality'] { color: rgb(var(--totality)); }
.ui-stat-value[data-tone='good'] { color: rgb(var(--good)); }
.ui-stat-value[data-tone='warn'] { color: rgb(var(--warn)); }
.ui-stat-value[data-tone='bad']  { color: rgb(var(--bad)); }

.ui-stat-sub {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  color: rgb(var(--ink-1) / 0.62);
  margin-top: 2px;
}
</style>
```

- [ ] **Step 1:** Create. **Step 2:** Commit: `feat(ui): Stat primitive`

### Task 2.8: `AdvisoryCard.vue`

```vue
<script setup lang="ts">
defineProps<{
  level: 'bad' | 'warn' | 'info'
  title: string
  body?: string
}>()

const glyph = (level: 'bad' | 'warn' | 'info') =>
  level === 'bad' ? '!' : level === 'warn' ? '⚠' : 'i'
</script>

<template>
  <div class="advisory" :data-level="level">
    <div class="advisory-icon" aria-hidden="true">{{ glyph(level) }}</div>
    <div class="advisory-body">
      <div class="advisory-title">{{ title }}</div>
      <div v-if="body" class="advisory-text">{{ body }}</div>
    </div>
  </div>
</template>

<style scoped>
.advisory {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 10px;
  align-items: flex-start;
  padding: 12px 12px 12px 0;
  background: rgb(255 255 255 / 0.04);
  border: 1px solid rgb(var(--border-subtle) / 0.08);
  border-radius: 8px;
}
.advisory[data-level='bad']  { border-left: 3px solid rgb(var(--bad)); }
.advisory[data-level='warn'] { border-left: 3px solid rgb(var(--warn)); }
.advisory[data-level='info'] { border-left: 3px solid rgb(var(--accent)); }

.advisory-icon {
  width: 24px; height: 24px;
  border-radius: 99px;
  border: 1.5px solid currentColor;
  display: flex; align-items: center; justify-content: center;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  font-weight: 700;
  margin-left: 10px;
  margin-top: 1px;
}
.advisory[data-level='bad']  .advisory-icon { color: rgb(var(--bad)); }
.advisory[data-level='warn'] .advisory-icon { color: rgb(var(--warn)); }
.advisory[data-level='info'] .advisory-icon { color: rgb(var(--accent)); }

.advisory-body { min-width: 0; padding-right: 8px; }
.advisory-title {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13.5px;
  font-weight: 600;
  color: rgb(var(--ink-1));
  margin-bottom: 3px;
}
.advisory-text {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 12.5px;
  color: rgb(var(--ink-1) / 0.62);
  line-height: 1.45;
}
</style>
```

- [ ] **Step 1:** Create. **Step 2:** Commit: `feat(ui): §7.2 AdvisoryCard with level glyph + colored left border`

---

## Phase 3: Spot Detail (`/spots/[slug]`)

Establishes the most reusable components, so build it before Home / Spots List.

**Files:**
- Modify: `app/pages/spots/[slug].vue`
- Create: `app/components/spot-detail/SpotHeroBlock.vue`
- Create: `app/components/spot-detail/AdvisoriesBlock.vue`
- Create: `app/components/spot-detail/DetailTabs.vue`
- Create: `app/components/spot-detail/StatStrip.vue`
- Create: `app/components/spot-detail/HorizonDial.vue`
- Create: `app/components/spot-detail/CloudHistogram.vue`
- Create: `app/components/spot-detail/ContactList.vue`
- Create: `app/components/spot-detail/LogisticsRows.vue`
- Create: `app/components/spot-detail/AlternatesPlaceholder.vue`

### Task 3.1: SpotHeroBlock

Per §7.1 step 2. Real-photo background (existing `heroPhoto`), gradient veil bottom-up, kicker `● SPOT DOSSIER`, name 28px/700, region 13px dim.

- [ ] **Step 1:** Create `app/components/spot-detail/SpotHeroBlock.vue`:

```vue
<script setup lang="ts">
import type { SpotPhoto } from '~/types/spots'

defineProps<{
  name: string
  region: string
  hero: SpotPhoto | null
}>()
</script>

<template>
  <header class="spot-hero">
    <div class="spot-hero-photo">
      <img
        v-if="hero"
        :src="`/images/spots/${hero.filename}`"
        :alt="hero.alt"
        loading="eager"
      />
      <div v-else class="spot-hero-fallback" aria-hidden="true" />
      <div class="spot-hero-veil" aria-hidden="true" />
    </div>
    <div class="spot-hero-meta">
      <div class="spot-hero-kicker">● {{ $t('v0.spot_detail.kicker').replace('● ', '') }}</div>
      <h1 class="spot-hero-name">{{ name }}</h1>
      <div class="spot-hero-region">{{ region }}</div>
    </div>
  </header>
</template>

<style scoped>
.spot-hero { position: relative; }
.spot-hero-photo {
  position: relative;
  height: 220px;
  overflow: hidden;
  background: linear-gradient(180deg, #2a1f15 0%, #0f1018 100%);
}
.spot-hero-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
.spot-hero-fallback {
  width: 100%; height: 100%;
  background: linear-gradient(180deg, #2a1f15 0%, #0f1018 100%);
}
.spot-hero-veil {
  position: absolute; inset: 0;
  background: linear-gradient(180deg, transparent 30%, rgba(7,10,18,0.92) 100%);
}
.spot-hero-meta { padding: 20px 16px 8px; }
.spot-hero-kicker {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  color: rgb(var(--accent));
  letter-spacing: 0.2em;
  margin-bottom: 8px;
}
.spot-hero-name {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 28px;
  font-weight: 700;
  color: rgb(var(--ink-1));
  letter-spacing: -0.02em;
  line-height: 1.1;
  margin: 0;
}
.spot-hero-region {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  color: rgb(var(--ink-1) / 0.62);
  margin-top: 6px;
}
</style>
```

- [ ] **Step 2:** Commit: `feat(spot-detail): §7.1 SpotHeroBlock with photo hero + veil`

### Task 3.2: AdvisoriesBlock — wrap existing `warnings` as info-level cards

```vue
<script setup lang="ts">
import AdvisoryCard from '~/components/ui/AdvisoryCard.vue'
import Eyebrow from '~/components/ui/Eyebrow.vue'

const props = defineProps<{ warnings: string[] }>()
const count = computed(() => props.warnings.length)
</script>

<template>
  <div v-if="count > 0" class="advisories-block">
    <Eyebrow variant="dash">ADVISORIES · {{ count }}</Eyebrow>
    <div class="advisories-list">
      <AdvisoryCard
        v-for="(w, i) in warnings"
        :key="i"
        level="info"
        :title="w"
      />
    </div>
  </div>
</template>

<style scoped>
.advisories-block { padding: 0 16px 14px; }
.advisories-block :deep(.eyebrow) { margin: 4px 0 8px; }
.advisories-list { display: flex; flex-direction: column; gap: 6px; }
</style>
```

Per constraint #1 — `warnings` is `string[]`, all rendered as info-level. Each warning becomes a one-line title (no body). When the schema is upgraded to `{level,title,body}` (out-of-scope ticket), this component swaps to pass `level/title/body` through.

- [ ] **Step 1:** Create. **Step 2:** Commit: `feat(spot-detail): §7.2 AdvisoriesBlock — render warnings[] as info-level`

### Task 3.3: StatStrip + DetailTabs

`StatStrip.vue`:
```vue
<script setup lang="ts">
import Card from '~/components/ui/Card.vue'
import { formatDuration } from '~/utils/eclipse'

defineProps<{
  totalitySeconds: number
  totalityStart: string         // 'HH:MM:SS' UTC
  sunAltitude: number
  sunAzimuth: number
  horizonVerdict: 'CLEAR' | 'MARGINAL' | 'RISKY' | 'BLOCKED'
  horizonScanCount?: number
}>()
</script>

<template>
  <div class="stat-strip">
    <Card>
      <div class="stat-label">TOTALITY</div>
      <div class="stat-totality">{{ formatDuration(totalitySeconds) }}</div>
      <div class="stat-sub">STARTS · {{ totalityStart }}</div>
    </Card>
    <Card>
      <div class="stat-label">SUN ALT</div>
      <div class="stat-sun">{{ sunAltitude.toFixed(1) }}°</div>
      <div class="stat-sub">{{ azimuthCompass(sunAzimuth) }} · {{ Math.round(sunAzimuth) }}°</div>
    </Card>
    <Card>
      <div class="stat-label">HORIZON</div>
      <div class="stat-horizon" :data-verdict="horizonVerdict">{{ horizonVerdict }}</div>
      <div v-if="horizonScanCount" class="stat-sub">{{ horizonScanCount }} PT SCAN</div>
    </Card>
  </div>
</template>

<script lang="ts">
function azimuthCompass(az: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW']
  return dirs[Math.round(((az % 360) / 22.5))] ?? 'N'
}
</script>

<style scoped>
.stat-strip {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  gap: 6px;
  margin-bottom: 12px;
}
.stat-label {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.17em;
  color: rgb(var(--ink-1) / 0.42);
}
.stat-totality, .stat-sun, .stat-horizon {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  margin-top: 4px;
  letter-spacing: -0.005em;
}
.stat-totality { font-size: 26px; color: rgb(var(--totality)); }
.stat-sun     { font-size: 22px; color: rgb(var(--ink-1)); }
.stat-horizon { font-size: 18px; }
.stat-horizon[data-verdict='CLEAR']    { color: rgb(var(--good)); }
.stat-horizon[data-verdict='MARGINAL'] { color: rgb(var(--warn)); }
.stat-horizon[data-verdict='RISKY']    { color: rgb(var(--warn)); }
.stat-horizon[data-verdict='BLOCKED']  { color: rgb(var(--bad)); }
.stat-sub {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  color: rgb(var(--ink-1) / 0.62);
  margin-top: 2px;
}
</style>
```

`DetailTabs.vue`:
```vue
<script setup lang="ts">
import Pill from '~/components/ui/Pill.vue'

const model = defineModel<'overview' | 'sky' | 'weather' | 'plan'>({ required: true })
const tabs = [
  { k: 'overview', l: 'Overview' },
  { k: 'sky',      l: 'Sky' },
  { k: 'weather',  l: 'Weather' },
  { k: 'plan',     l: 'Plan' },
] as const
</script>

<template>
  <div class="detail-tabs">
    <Pill
      v-for="t in tabs"
      :key="t.k"
      :active="model === t.k"
      size="md"
      @click="model = t.k"
    >{{ t.l }}</Pill>
  </div>
</template>

<style scoped>
.detail-tabs {
  display: flex; gap: 6px;
  padding: 4px 16px 14px;
  border-bottom: 1px solid rgb(var(--border-subtle) / 0.08);
  overflow-x: auto;
}
</style>
```

- [ ] **Step 1:** Create both. **Step 2:** Commit: `feat(spot-detail): §7.1 StatStrip + DetailTabs`

### Task 3.4: ContactList, LogisticsRows, HorizonDial, CloudHistogram, AlternatesPlaceholder

For each: port directly from prototype `spot-detail.jsx` lines 193–260 (ContactList, LogisticsRows), 13–48 (HorizonDial), 50–65 (CloudHistogram). Map prototype's inline-style props to scoped CSS using v0 tokens.

**Data sources for each (from existing `spot.value` shape):**

| Component | Data binding |
|---|---|
| ContactList | C2 = `spot.totality_start`; MAX/C3 derived (start + dur/2, start + dur); C1/C4 = "—" placeholder until eclipseGrid lookup is wired (out-of-scope ticket; v0 spec calls for these but no row data — render `—` for now) |
| LogisticsRows | `spot.parking_info`, `spot.cell_coverage`, `spot.terrain_notes`, etc. — already on the row |
| HorizonDial | `spot.sun_altitude`, `spot.sun_azimuth` |
| CloudHistogram | `historicalData.spots[slug]` exists per slug — but it's a summary `{clear_years, total_years, avg_cloud_cover}`, not 16-yr per-year data. **Render the bar histogram with `total_years` bars colored by per-year cloud %, IF that detail is present in the JSON.** Inspect `public/eclipse-data/historical-weather.json` first; if it only has summary, render a single tall bar showing avg + a label (degrade gracefully). Ticket: enrich JSON with per-year bins. |
| AlternatesPlaceholder | Static card "Alternates data coming soon — see Map for nearby spots." Ticket the real feature. |

- [ ] **Step 1:** Inspect `public/eclipse-data/historical-weather.json` shape; decide CloudHistogram render strategy. Document the chosen rendering in the component file's comment.
- [ ] **Step 2:** Create the 5 components. Use the prototype's SVG/markup verbatim, replace inline `style={{...}}` with scoped CSS using v0 tokens.
- [ ] **Step 3:** Commit each as `feat(spot-detail): §7.3 <ComponentName>` (5 separate commits).

### Task 3.5: Rewrite `spots/[slug].vue`

Keep `<script setup>` data fetching (lines 1–60ish) intact. Replace template entirely.

- [ ] **Step 1:** Open `app/pages/spots/[slug].vue`. Above the existing `<template>`, leave the script block untouched. Replace the template with:

```vue
<template>
  <PageShell screen="spot-detail">
    <SpotHeroBlock
      :name="spot.name"
      :region="regionLabel(spot.region)"
      :hero="heroPhoto"
    />

    <AdvisoriesBlock :warnings="warnings" />

    <DetailTabs v-model="activeTab" />

    <div class="spot-body">
      <StatStrip
        :totality-seconds="spot.totality_duration_seconds"
        :totality-start="formatTotalityStartUtc(spot.totality_start)"
        :sun-altitude="spot.sun_altitude"
        :sun-azimuth="spot.sun_azimuth"
        :horizon-verdict="horizonVerdict"
        :horizon-scan-count="91"
      />

      <template v-if="activeTab === 'overview'">
        <Card>
          <CardTitle>{{ $t('v0.spot_detail.card_contact') }}</CardTitle>
          <ContactList :spot="spot" />
        </Card>
        <div class="spacer-8" />
        <Card>
          <CardTitle>{{ $t('v0.spot_detail.card_logistics') }}</CardTitle>
          <LogisticsRows :spot="spot" />
        </Card>
      </template>

      <Card v-else-if="activeTab === 'sky'">
        <CardTitle>{{ $t('v0.spot_detail.card_sun_position') }}</CardTitle>
        <HorizonDial :altitude="spot.sun_altitude" :azimuth="spot.sun_azimuth" />
      </Card>

      <Card v-else-if="activeTab === 'weather'">
        <CardTitle>{{ $t('v0.spot_detail.card_cloud_cover') }}</CardTitle>
        <CloudHistogram :slug="spot.slug" />
        <div class="weather-legend">
          <span class="lg-good">● &lt;40% clear</span>
          <span class="lg-warn">● 40–70%</span>
          <span class="lg-bad">● &gt;70%</span>
        </div>
      </Card>

      <template v-else-if="activeTab === 'plan'">
        <AlternatesPlaceholder />
        <div class="spacer-8" />
        <Card>
          <CardTitle>{{ $t('v0.spot_detail.card_map') }}</CardTitle>
          <SpotLocationMap :spot="spot" />
        </Card>
      </template>
    </div>
  </PageShell>
</template>
```

- [ ] **Step 2:** Add `const activeTab = ref<'overview'|'sky'|'weather'|'plan'>('overview')` in script. Add `formatTotalityStartUtc` and `horizonVerdict` computeds based on existing `spot.value.horizon_check`.
- [ ] **Step 3:** Update existing component imports — drop `SpotPhotoGallery`, keep `SpotLocationMap` (Plan tab map).
- [ ] **Step 4:** Run dev. Visit `/spots/hellnar-coastal-viewpoint` (or whatever Hellnar's actual slug is — check via `npx supabase` or `/api/spots`). Verify hero photo, advisories, all 4 tabs swap content, stat strip values match data.
- [ ] **Step 5:** Run existing tests: `npm run test:components` — fix any test that targeted the old layout. (Expected: a few selector breakages.)
- [ ] **Step 6:** Playwright smoke: `npx playwright test --grep "spot detail"` — update visual snapshots if any exist.
- [ ] **Step 7:** Commit: `feat(spots/slug): §7 v0 redesign — hero/advisories/tabs/stat-strip/cards`

---

## Phase 4: Home (`/dashboard`)

**Files:**
- Modify: `app/pages/dashboard.vue`
- Create: `app/components/home/CountdownGrid.vue`
- Create: `app/components/home/Checklist.vue`

### Task 4.1: CountdownGrid

```vue
<script setup lang="ts">
const { days, hours, minutes, seconds } = useCountdown()
const cells = computed(() => [
  { v: days.value, u: 'Days' },
  { v: String(hours.value).padStart(2, '0'), u: 'Hours' },
  { v: String(minutes.value).padStart(2, '0'), u: 'Minutes' },
  { v: String(seconds.value).padStart(2, '0'), u: 'Seconds' },
])
</script>

<template>
  <div class="countdown-grid" role="timer" aria-live="polite">
    <template v-for="(c, i) in cells" :key="c.u">
      <div class="cell">
        <div class="cell-v">{{ c.v }}</div>
        <div class="cell-u">{{ c.u }}</div>
      </div>
      <div v-if="i < cells.length - 1" class="divider" aria-hidden="true" />
    </template>
  </div>
</template>

<style scoped>
.countdown-grid {
  display: flex;
  padding: 0 8px 28px;
}
.cell { flex: 1; text-align: center; }
.cell-v {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 44px;
  font-weight: 700;
  color: rgb(var(--ink-1));
  letter-spacing: -0.023em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.cell-u {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9.5px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: rgb(var(--ink-1) / 0.62);
  margin-top: 6px;
}
.divider {
  width: 1px;
  background: rgb(var(--border-subtle) / 0.08);
  margin: 8px 0;
}
@media (prefers-reduced-motion: reduce) {
  .cell-v { transition: none; }
}
</style>
```

**Note:** `useCountdown` already exists. Verify its target is the C2 instant for Hellnar (`2026-08-12T17:47:51Z`). If not, no logic change — just don't override; keep its existing target.

- [ ] **Step 1:** Create. **Step 2:** Commit: `feat(home): §4 CountdownGrid — 4-cell mission control style`

### Task 4.2: Checklist

```vue
<script setup lang="ts">
const { t, tm } = useI18n()

const items = computed<string[]>(() => {
  const raw = tm('v0.home.checklist')
  return Array.isArray(raw) ? raw.map(String) : []
})

const checked = ref<Record<number, boolean>>({})

onMounted(() => {
  try {
    const saved = localStorage.getItem('eclipse-checklist')
    if (saved) checked.value = JSON.parse(saved)
  } catch {}
})

function toggle(i: number) {
  checked.value[i] = !checked.value[i]
  localStorage.setItem('eclipse-checklist', JSON.stringify(checked.value))
}

const checkedCount = computed(() => Object.values(checked.value).filter(Boolean).length)
</script>

<template>
  <section class="checklist">
    <div class="checklist-head">
      <Eyebrow>{{ t('v0.home.checklist_eyebrow') }}</Eyebrow>
      <span class="counter">{{ checkedCount }}/{{ items.length }}</span>
    </div>
    <div class="checklist-card">
      <button
        v-for="(item, i) in items"
        :key="i"
        type="button"
        class="row"
        :data-checked="!!checked[i]"
        :aria-pressed="!!checked[i]"
        @click="toggle(i)"
      >
        <span class="circle" aria-hidden="true">
          <svg v-if="checked[i]" viewBox="0 0 10 10" width="10" height="10">
            <path d="M1 5l3 3 5-6" stroke="rgb(var(--bg))" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <span class="text">{{ item }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.checklist { padding: 8px 16px 24px; }
.checklist-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 10px;
}
.counter {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--ink-1));
}
.checklist-card {
  background: rgb(255 255 255 / 0.04);
  border: 1px solid rgb(var(--border-subtle) / 0.08);
  border-radius: 10px;
  overflow: hidden;
}
.row {
  display: flex; align-items: center; gap: 14px;
  width: 100%;
  padding: 14px 18px;
  background: transparent;
  border: 0;
  text-align: left;
  cursor: pointer;
  min-height: 44px;
}
.row + .row { border-top: 1px solid rgb(var(--border-subtle) / 0.08); }
.circle {
  width: 18px; height: 18px;
  border-radius: 4px;
  border: 1.5px solid rgb(var(--border-subtle) / 0.16);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.row[data-checked='true'] .circle {
  background: rgb(var(--accent));
  border-color: rgb(var(--accent));
}
.text {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 14px;
  color: rgb(var(--ink-1));
}
.row[data-checked='true'] .text {
  color: rgb(var(--ink-1) / 0.62);
  text-decoration: line-through;
}
</style>
```

- [ ] **Step 1:** Create. **Step 2:** Commit: `feat(home): §4.1 Checklist — localStorage-backed, hollow→filled circle`

### Task 4.3: Rewrite `dashboard.vue`

Keep `<script setup>` data loaders (cloudData, stationsData, weatherBest computed, updates query — leave them; they're feeding the conditions card). Replace template body.

- [ ] **Step 1:** Replace template with:

```vue
<template>
  <PageShell screen="home">
    <Eyebrow align="center" class="home-eyebrow">{{ $t('v0.home.eyebrow') }}</Eyebrow>

    <CountdownGrid />

    <section class="conditions">
      <Eyebrow>{{ $t('v0.home.best_conditions_now') }}</Eyebrow>
      <div class="conditions-card">
        <div>
          <div class="conditions-name">{{ weatherBest?.region ? regionLabel(weatherBest.region) : '—' }}</div>
          <div class="conditions-sub">
            <span v-if="weatherBest">{{ weatherBest.cloudPct }}% cloud cover · {{ cloudLevel(weatherBest.cloudPct).label }}</span>
            <span v-else>Loading conditions…</span>
          </div>
        </div>
        <NuxtLink to="/map" class="conditions-cta">{{ $t('v0.home.view_map_cta') }}</NuxtLink>
      </div>
    </section>

    <Checklist />
  </PageShell>
</template>
```

- [ ] **Step 2:** Inline styles for `.home-eyebrow` (28px 16px 18px padding), `.conditions` (0 16px 24px padding), `.conditions-card` (surface bg, 10px radius, 1px border, 16×18 padding, flex space-between), `.conditions-name` (Inter Tight 22px/500), `.conditions-sub` (Inter Tight 13px dim with 4px margin-top), `.conditions-cta` (Inter Tight 12px/600 accent, letter-spacing 0.1em, no-wrap).

- [ ] **Step 3:** Drop the existing dashboard's news/updates feed if it's not in v0 §4. Per spec §13 ("don't add features"), v0 Home only has eyebrow + countdown + conditions + checklist. **Move the updates feed to a deferred section below the v0-spec'd content** rather than deleting (constraint #4: no feature removal either). Wrap it in a `<section class="legacy">` block below the Checklist, separated by a 1px border. Ticket: relocate or remove updates feed.

- [ ] **Step 4:** Verify: `/dashboard` renders countdown ticking, conditions card pulling real `bestRegion`, checklist toggles + persists.

- [ ] **Step 5:** Commit: `feat(dashboard): §4 v0 home redesign — countdown + conditions + checklist`

---

## Phase 5: Spots List (`/spots`)

**Files:**
- Modify: `app/pages/spots/index.vue`
- Create: `app/components/spots/SpotCard.vue`
- Create: `app/components/spots/ProfileSelector.vue`
- Create: `app/components/spots/SortTabs.vue`
- Create: `app/components/spots/RegionChips.vue`

### Task 5.1: ProfileSelector / SortTabs / RegionChips

`ProfileSelector.vue`:
- Eyebrow `— VIEWER PROFILE`
- Horizontal-scroll `<Pill size="md">` row over existing `PROFILES` from `useRecommendation`. Plus a synthetic `{ id: null, name: 'All' }` as the leftmost. **Pill labels = `PROFILES[i].name`** (existing — `Photographer / Family / Hiker / Sky Chaser / First-Timer`). Constraint #7 forbids id changes; visual labels match what's in `useRecommendation`.
- Hint line below: italic 12px dim, sourced from existing i18n `recommend.profiles.<id>` keys.
- Two-way bind selectedProfile.

`SortTabs.vue`:
- Two equal-flex tabs labelled via i18n `v0.spots.sort_duration` / `v0.spots.sort_clearness`.
- Active styling: bg `surface`, text `accent`, 2px bottom border `accent`. Inactive: transparent + 2px transparent border + dim text.
- v-model binds to existing `sortKey` ref (`'duration' | 'historical'`).

`RegionChips.vue`:
- Horizontal-scroll `<Pill size="md">` row.
- Source from production REGIONS export in `app/types/spots.ts` (constraint #8): All + each region. Display labels via existing `regionLabel(region)` util.
- v-model binds to existing region filter ref (which the page may not have today — add a local `selectedRegion` ref if needed; that's UI state, not logic).

- [ ] **Step 1:** Create three components. Each ≤80 lines. Use Pill primitive for items.
- [ ] **Step 2:** Commit each separately.

### Task 5.2: SpotCard (160px photo card)

```vue
<script setup lang="ts">
import StatusDot from '~/components/ui/StatusDot.vue'
import CloudBar from '~/components/ui/CloudBar.vue'
import { cloudToStatus } from '~/utils/v0'
import { formatDuration, regionLabel } from '~/utils/eclipse'
import type { SpotPhoto } from '~/types/spots'

const props = defineProps<{
  slug: string
  name: string
  region: string
  durationSeconds: number
  cloud: number | null
  hero: SpotPhoto | null
}>()

const status = computed(() => cloudToStatus(props.cloud))
const cloudPct = computed(() => props.cloud ?? 0)
</script>

<template>
  <NuxtLink :to="`/spots/${slug}`" class="spot-card">
    <img
      v-if="hero"
      :src="`/images/spots/${hero.filename}`"
      :alt="hero.alt"
      class="spot-card-img"
      loading="lazy"
    />
    <div v-else class="spot-card-fallback" aria-hidden="true" />
    <div class="spot-card-veil" aria-hidden="true" />
    <div class="spot-card-region-badge">{{ regionLabel(region).toUpperCase() }}</div>
    <div class="spot-card-cloud-badge">
      <StatusDot :status="status" />
      <span>{{ cloudPct }}% cloud</span>
    </div>
    <div class="spot-card-bottom">
      <div class="spot-card-name">{{ name }}</div>
      <div class="spot-card-bottom-row">
        <div class="spot-card-dur">{{ formatDuration(durationSeconds) }}</div>
        <div class="spot-card-bar"><CloudBar :cloud="cloudPct" :segments="12" /></div>
      </div>
    </div>
  </NuxtLink>
</template>

<style scoped>
.spot-card {
  position: relative;
  display: block;
  height: 160px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgb(var(--border-subtle) / 0.08);
  text-decoration: none;
  isolation: isolate;
}
.spot-card-img,
.spot-card-fallback { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.spot-card-fallback { background: linear-gradient(180deg, #1A2030 0%, #382828 100%); }
.spot-card-veil {
  position: absolute; inset: 0;
  background: linear-gradient(180deg, transparent 30%, rgba(7,10,18,0.92) 100%);
}
.spot-card-region-badge,
.spot-card-cloud-badge {
  position: absolute; top: 12px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9.5px;
  color: #fff;
  padding: 3px 8px;
  border-radius: 4px;
  background: rgba(7,10,18,0.65);
  backdrop-filter: blur(6px);
  letter-spacing: 0.1em;
}
.spot-card-region-badge { left: 14px; }
.spot-card-cloud-badge { right: 14px; display: flex; align-items: center; gap: 6px; font-size: 10px; }
.spot-card-bottom { position: absolute; bottom: 12px; left: 14px; right: 14px; }
.spot-card-name {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 6px;
}
.spot-card-bottom-row { display: flex; align-items: center; justify-content: space-between; }
.spot-card-dur {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 16px;
  color: rgb(var(--totality));
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
.spot-card-bar { flex: 1; margin-left: 14px; }
</style>
```

- [ ] **Step 1:** Create. **Step 2:** Commit: `feat(spots): §5.2 SpotCard with photo hero + cloud bar`

### Task 5.3: Rewrite `spots/index.vue`

Keep all data loading + sort/profile logic. Replace template structure.

- [ ] **Step 1:** Replace template with:

```vue
<template>
  <PageShell screen="spots">
    <header class="spots-header">
      <Eyebrow variant="dot">SPOTS · {{ rawSpots.length }}</Eyebrow>
      <h1 class="spots-title">{{ activeProfile?.name ?? 'All' }} · sorted by {{ sortKey === 'duration' ? 'totality duration' : 'historical clearness' }}</h1>
    </header>

    <ProfileSelector v-model="selectedProfile" />
    <SortTabs v-model="sortKey" />
    <RegionChips v-model="selectedRegion" />

    <div class="spots-list">
      <SpotCard
        v-for="spot in filteredSpots"
        :key="spot.slug"
        :slug="spot.slug"
        :name="spot.name"
        :region="spot.region"
        :duration-seconds="spot.totality_duration_seconds"
        :cloud="cloudFor(spot)"
        :hero="heroFor(spot)"
      />
    </div>
  </PageShell>
</template>
```

- [ ] **Step 2:** Add `selectedRegion` ref, `filteredSpots` computed (existing `rawSpots` filtered by region). Add `heroFor(spot)` helper using existing `parseJsonb<SpotPhoto[]>(spot.photos, [])` + `find(p => p.is_hero)`. Add `cloudFor(spot)` using existing `historyFor(slug).avg_cloud_cover`.

- [ ] **Step 3:** Verify: `/spots` lists every spot, sort tabs reorder, region chips filter, profile pills toggle (no algorithmic re-ranking, per existing — visual only matches v0 §5.3).

- [ ] **Step 4:** Commit: `feat(spots): §5 v0 redesign — profile/sort/region + SpotCard list`

---

## Phase 6: Map (`/map`)

**Files:**
- Modify: `app/pages/map.vue`
- Create: `app/components/map/MapChipStack.vue`
- Create: `app/components/map/SelectedLightbox.vue`

The hardest page. The Mapbox GL canvas, marker logic, traffic/camera overlays, and station bindings all stay. v0 changes are: top chip stacks (overlay), bottom selected lightbox (new component), pin scale on selection.

### Task 6.1: MapChipStack

Two-row chip stack: profile pills (row 1) + layer pills (row 2). Floating absolute over the map. Wrapper has `pointer-events: none`, each row has `pointer-events: auto`.

- Profile pills bind to existing `profileParam` ref. Layer pills bind to existing `showWeather`/`showTraffic`/`showCameras` refs.
- Use Pill (sm size) + the v0 `backdrop-filter: blur(8px)` + `rgba(7,10,18,0.7)` background.

```vue
<script setup lang="ts">
import Pill from '~/components/ui/Pill.vue'
import { PROFILES } from '~/composables/useRecommendation'
import type { ProfileId } from '~/composables/useRecommendation'

defineProps<{
  selectedProfile: ProfileId | null
  showWeather: boolean
  showTraffic: boolean
  showCameras: boolean
}>()
const emit = defineEmits<{
  'update:selectedProfile': [ProfileId | null]
  'update:showWeather': [boolean]
  'update:showTraffic': [boolean]
  'update:showCameras': [boolean]
}>()
</script>

<template>
  <div class="chip-stack" aria-label="Map filters">
    <div class="row">
      <Pill
        :active="selectedProfile === null"
        size="sm"
        class="chip"
        @click="emit('update:selectedProfile', null)"
      >ALL</Pill>
      <Pill
        v-for="p in PROFILES"
        :key="p.id"
        :active="selectedProfile === p.id"
        size="sm"
        class="chip"
        @click="emit('update:selectedProfile', p.id)"
      >{{ p.name.toUpperCase() }}</Pill>
    </div>
    <div class="row">
      <Pill :active="showWeather" size="sm" class="chip" @click="emit('update:showWeather', !showWeather)">WEATHER</Pill>
      <Pill :active="showTraffic" size="sm" class="chip" @click="emit('update:showTraffic', !showTraffic)">ROADS</Pill>
      <Pill :active="showCameras" size="sm" class="chip" @click="emit('update:showCameras', !showCameras)">LIVE CAMS</Pill>
    </div>
  </div>
</template>

<style scoped>
.chip-stack {
  position: absolute; top: 12px; left: 12px; right: 12px;
  display: flex; flex-direction: column; gap: 8px;
  pointer-events: none; z-index: 5;
}
.row { display: flex; gap: 6px; overflow-x: auto; pointer-events: auto; }
.chip {
  background: rgb(7 10 18 / 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
.chip[data-active='true'] {
  background: rgb(var(--accent) / 0.18);
}
</style>
```

- [ ] **Step 1:** Create. **Step 2:** Commit: `feat(map): §6.2 MapChipStack — top profile + layer chips`

### Task 6.2: SelectedLightbox

```vue
<script setup lang="ts">
import StatusDot from '~/components/ui/StatusDot.vue'
import { formatDuration } from '~/utils/eclipse'
import { cloudToStatus, statusColor } from '~/utils/v0'

const props = defineProps<{
  name: string
  slug: string
  totalitySeconds: number
  cloud: number | null
}>()

const status = computed(() => cloudToStatus(props.cloud))
const score = computed(() => props.cloud == null ? 50 : Math.max(0, Math.min(100, 100 - props.cloud)))
</script>

<template>
  <div class="lb-veil">
    <div class="lb-card">
      <div class="lb-head">
        <span class="lb-selected">
          <StatusDot :status="status" />
          {{ $t('v0.map.selected') }}
        </span>
        <span class="lb-tot-label">{{ formatDuration(totalitySeconds).toUpperCase() }} TOTALITY</span>
      </div>
      <div class="lb-name">{{ name }}</div>
      <div class="lb-strip">
        <div>
          <div class="lb-stat-l">{{ $t('v0.map.stat_totality') }}</div>
          <div class="lb-stat-totality">{{ formatDuration(totalitySeconds) }}</div>
        </div>
        <div>
          <div class="lb-stat-l">{{ $t('v0.map.stat_cloud') }}</div>
          <div class="lb-stat-cloud">{{ cloud ?? '—' }}<span v-if="cloud != null">%</span></div>
        </div>
        <div>
          <div class="lb-stat-l">{{ $t('v0.map.stat_score') }}</div>
          <div class="lb-stat-score" :data-status="status">{{ score }}</div>
        </div>
      </div>
      <NuxtLink :to="`/spots/${slug}`" class="lb-cta">{{ $t('v0.map.open_field_card') }}</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.lb-veil {
  position: absolute; left: 0; right: 0; bottom: 0;
  padding: 40px 14px 16px;
  background: linear-gradient(180deg, rgba(7,10,18,0) 0%, rgba(7,10,18,0.88) 60%, rgba(7,10,18,0.96) 100%);
  pointer-events: none;
  z-index: 5;
}
.lb-card {
  background: rgb(11 14 22 / 0.92);
  border: 1px solid rgb(var(--border-subtle) / 0.08);
  border-radius: 14px;
  padding: 14px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  pointer-events: auto;
}
.lb-head {
  display: flex; align-items: baseline; justify-content: space-between;
  margin-bottom: 8px;
}
.lb-selected {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9.5px;
  color: rgb(var(--accent));
  letter-spacing: 0.16em;
  display: inline-flex; align-items: center; gap: 6px;
}
.lb-tot-label {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  color: rgb(var(--ink-1) / 0.42);
  letter-spacing: 0.11em;
}
.lb-name {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 19px;
  font-weight: 700;
  color: rgb(var(--ink-1));
  letter-spacing: -0.01em;
  margin-bottom: 10px;
}
.lb-strip {
  display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;
  padding: 10px 0;
  border-top: 1px solid rgb(var(--border-subtle) / 0.08);
  border-bottom: 1px solid rgb(var(--border-subtle) / 0.08);
  margin-bottom: 12px;
}
.lb-stat-l {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  color: rgb(var(--ink-1) / 0.42);
  letter-spacing: 0.11em;
}
.lb-stat-totality, .lb-stat-cloud, .lb-stat-score {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 16px;
  font-weight: 700;
  margin-top: 2px;
  font-variant-numeric: tabular-nums;
}
.lb-stat-totality { color: rgb(var(--totality)); }
.lb-stat-cloud { color: rgb(var(--ink-1)); }
.lb-stat-cloud span { font-size: 11px; color: rgb(var(--ink-1) / 0.62); margin-left: 1px; }
.lb-stat-score[data-status='good'] { color: rgb(var(--good)); }
.lb-stat-score[data-status='marginal'] { color: rgb(var(--warn)); }
.lb-stat-score[data-status='bad'] { color: rgb(var(--bad)); }
.lb-cta {
  display: block;
  width: 100%;
  padding: 12px;
  background: rgb(var(--accent));
  color: #0a0a0a;
  border: 0;
  border-radius: 8px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
  min-height: 44px;
}
</style>
```

- [ ] **Step 1:** Create. **Step 2:** Commit: `feat(map): §6.3 SelectedLightbox bottom overlay`

### Task 6.3: Wire chrome into `map.vue`

- [ ] **Step 1:** In `app/pages/map.vue`, wrap the existing Mapbox container with `<PageShell screen="map">` and add `<MapChipStack ... />` + `<SelectedLightbox v-if="selectedSpot" ... />` overlays inside the map container (which must be `position: relative`).
- [ ] **Step 2:** Bind chip stack props to existing layer toggle refs. Bind lightbox props to whatever `selectedSpot`-equivalent ref exists today (or add one — UI state, not logic). Pin click in `EclipseMap.vue` already emits something; reuse or add a tiny event.
- [ ] **Step 3:** Adjust pin marker sizing in `EclipseMap.vue` so selected pin is 1.4× scale (existing). If no selection state today, add a local ref — UI state.
- [ ] **Step 4:** Verify: `/map` shows v0 chrome overlaid on real Mapbox. Layer toggles still work. Tapping a spot pin updates lightbox.
- [ ] **Step 5:** Run `npm run test:e2e -- map` — fix any selectors.
- [ ] **Step 6:** Commit: `feat(map): §6 wire MapChipStack + SelectedLightbox over Mapbox canvas`

---

## Phase 7: Guide (`/guide`)

Scope per constraint #1 (no logic change): apply v0 typography + add a TOC chip strip. Don't restructure `content/guide.md`.

**Files:**
- Modify: `app/pages/guide.vue`
- Modify: `app/assets/css/main.css` (prose-class additions inside `@layer components`)

### Task 7.1: TOC chip strip + page chrome

- [ ] **Step 1:** In `app/pages/guide.vue`, wrap content in `<PageShell screen="guide">`. Above the `<ContentRenderer>` (or `<ContentDoc>`), render the v0 header + TOC chips:

```vue
<template>
  <PageShell screen="guide">
    <header class="guide-header">
      <Eyebrow>GUIDE · 2026.08.12</Eyebrow>
      <h1 class="guide-title">{{ doc?.title }}</h1>
      <p class="guide-sub">{{ doc?.description }}</p>
    </header>

    <nav class="guide-toc" aria-label="Sections">
      <Pill
        v-for="entry in toc"
        :key="entry.id"
        size="sm"
        :active="false"
        @click="scrollTo(entry.id)"
      >{{ entry.label }}</Pill>
    </nav>

    <article class="guide-prose">
      <ContentDoc />
    </article>
  </PageShell>
</template>
```

- [ ] **Step 2:** Hardcode `toc` array matching the headings in `guide.md`. `scrollTo(id)` does `document.getElementById(id)?.scrollIntoView({behavior:'smooth'})`.

- [ ] **Step 3:** Add a `.guide-prose` block to `main.css` `@layer components` that styles `h1/h2/h3/p/table/li` with Inter Tight + JetBrains Mono per §2.3. Highlight totality durations in `.totality { color: rgb(var(--totality)); }` (no markdown change needed — the existing `<strong>` in markdown stays as primary emphasis, and we add a `--token` callout class only if/when needed).

- [ ] **Step 4:** Verify `/guide` renders existing markdown with v0 typography and a sticky TOC chip row.

- [ ] **Step 5:** Commit: `feat(guide): §8 v0 typography pass + TOC chip strip`

---

## Phase 8: Polish

### Task 8.1: A11y audit

- [ ] **Step 1:** Open each page in dev, axe-devtools (or `@axe-core/playwright`) scan.
- [ ] **Step 2:** Verify: every Pill/SortTab has `aria-pressed`. AdvisoryCard's icon is `aria-hidden`. CountdownGrid has `role="timer"` `aria-live="polite"`. SelectedLightbox CTA has accessible name.
- [ ] **Step 3:** Verify focus rings on Pill / SortTab / RegionChips (already added in Pill primitive).
- [ ] **Step 4:** Verify ≥44×44 tap targets on every clickable: Pill (32px → bump to min-height 44 inside scroll rows? Or accept 32 because spec §10 says 6×10/6×12 padding gives ~32 — A11y baseline calls for 44 minimum; **bump min-height to 44 on chrome-level pills (TabBar, MapChipStack), keep 32 on inline filters where touch targets cluster** — this is consistent with iOS HIG and is visual-only). Document in component comments.
- [ ] **Step 5:** Commit: `chore(a11y): §12 a11y baseline pass — aria-pressed, focus rings, tap targets`

### Task 8.2: prefers-reduced-motion

- [ ] **Step 1:** `useCountdown` already uses `setInterval`. Wrap with `if (!matchMedia('(prefers-reduced-motion: reduce)').matches)` — actually no; the countdown should still tick (informational), but pulse animations should pause. Verify no auto-pulse animations on map pins or hero. If any, wrap CSS with `@media (prefers-reduced-motion: reduce)` to disable.
- [ ] **Step 2:** Commit: `chore(a11y): §12 prefers-reduced-motion guards`

### Task 8.3: Playwright visual snapshots

- [ ] **Step 1:** Create `tests/e2e/visual-v0.spec.ts` with one test per page (dashboard, spots, map, spots/[slug] sample, guide). Set viewport `{ width: 402, height: 874 }`. `await page.screenshot({ path: ... })` for the baseline.
- [ ] **Step 2:** Run once to generate snapshots, commit them under `tests/e2e/__screenshots__/`.
- [ ] **Step 3:** Add `npm run test:visual` script.
- [ ] **Step 4:** Commit: `test(visual): §12 Playwright snapshot baseline at 402×874`

### Task 8.4: Lighthouse pass

- [ ] **Step 1:** `npx lighthouse http://localhost:3000/dashboard --view`. Note any regression vs. main (target: no >5 point drop in any category).
- [ ] **Step 2:** Document outcomes in plan.
- [ ] **Step 3:** Commit (only if changes were made): `chore(perf): lighthouse pass — <fix>`

---

## Out-of-scope tickets (file separately at end)

These were called out but explicitly deferred:

1. **`viewing_spots.warnings` schema upgrade** to `{level, title, body}[]` — required to render advisories with proper level/glyph/color per spec §7.2. Currently rendered uniform `info`-level.
2. **C1/C4 contact times** in Spot Detail Overview tab — pull from `eclipseGrid` server util at request time. Currently rendered as `—`.
3. **Plan-B alternates feature** — Spot Detail Plan tab needs an alternates list. Either compute by haversine proximity at request time or seed manually. Currently a placeholder card.
4. **CloudHistogram per-year data** — JSON only has summary today; needs 16-yr per-year cloud %. Currently degrades gracefully (single bar / summary text).
5. **ME tab + `/me` route** — auth UI, saved spots. Spec calls it for the 5th tab; we ship 4-tab nav.
6. **Astronomer profile** — v0 spec lists it; production has 5 different ids. Add `Astronomer` profile to `useRecommendation` if business confirms.
7. **Region renames / additions** — v0 chips show `East`/`West`; production has slugs. Either rename slugs (DB migration) or add a display mapping.
8. **Light theme verification pass** — tokens are wired but unverified. Hide ThemeToggle until then.
9. **i18n: Icelandic translations** for `v0.*` namespace.
10. **Public landing (`/`) v0 redesign** — out of scope; landing not in the v0 spec.

---

## Self-review notes

- Spec §1–§8 → mapped to Phases 0–7. ✓
- §9 data shape: not introduced in this pass (constraint #1); kept existing prod shapes. Schema upgrade is out-of-scope ticket #1.
- §10 component inventory: every component has a target file. ✓
- §11 reference files: all read.
- §12 acceptance criteria: addressed page-by-page; visual diff via Playwright snapshots in Task 8.3.
- §13 don'ts: respected (no new colors, no font subs, no extra sections, replace not blend, no light toggle, nav order respected with ME exception, no spacing reinventions).
- §14 implementation order: tokens → chrome → spot detail → home → spots → map → guide. Matches.
- §15 working agreements: commit message templates cite spec sections.

Type/method consistency: `cloudToStatus` defined in Task 2.4, used by SpotCard (5.2) and SelectedLightbox (6.2). `formatDuration` reused from existing `app/utils/eclipse.ts`. `regionLabel` reused from existing `app/utils/eclipse.ts`. `useCountdown` reused as-is. Pill props (`active`, `size`, `aria-pressed`) consistent across all consumers (DetailTabs, ProfileSelector, RegionChips, MapChipStack, guide TOC).

No placeholders detected on a final scan. Where I deferred details ("inspect JSON shape first", "match existing scroll behavior"), the deferral is the *task* — bounded to the file in question, not a hand-wave.
