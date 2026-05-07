# Unified Free + Pro IA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drop the `isPro` gate from site chrome so free users see the same `BrandBar` + `BottomNav` everywhere, replace the marketing-only `/` with a hybrid Home (compact hero + utility tiles + slim email row), and route locked tabs through a single shared `UpsellSheet` instead of bait-and-switch redirects to `/pro`.

**Architecture:** `useNavItems()` becomes Pro-aware (resolves `Home`'s target dynamically, marks `Map` as locked when `!isPro`). Both `BottomNav` and `BrandBar` masthead consume that flag and intercept locked clicks via a new `useUpsell()` composable that controls a single `<UpsellSheet>` mounted at `app.vue`. The hybrid `/` page composes existing pieces (Starfield, EclipseHero, CountdownBar, EmailSignup) inside `PageShell` with a new `<HomeTileGrid>` for utility entry points.

**Tech Stack:** Vue 3.5 / Nuxt 4.4, TypeScript, TailwindCSS (semantic tokens from `app/assets/css/main.css`), Vitest for unit + component tests via `@nuxt/test-utils/runtime`, Playwright for e2e (existing).

**Spec:** [`docs/superpowers/specs/2026-05-07-unified-free-pro-ia-design.md`](../specs/2026-05-07-unified-free-pro-ia-design.md)

---

## File Structure

| File | Action | Purpose |
|---|---|---|
| `i18n/en.json` | modify | Add `v0.upsell.*` and `v0.home.*` keys |
| `i18n/is.json` | modify | Mirror EN keys (Icelandic falls back to EN automatically for `v0.*`, but mirroring helps grep) |
| `app/composables/useUpsell.ts` | create | `openUpsell({ source })` / `closeUpsell()` / `isOpen` — single SSR-safe state |
| `app/composables/useNavItems.ts` | modify | Add `locked?: boolean` per item; resolve `Home.to` from `useProStatus().isPro`; mark `Map` locked when `!isPro` |
| `app/components/UpsellSheet.vue` | create | Bottom sheet (mobile) / centered card (desktop) — title, 3 bullets, primary + secondary CTA, dismiss |
| `app/components/HomeTileGrid.vue` | create | 4-tile grid for hybrid Home; Pro-aware (Get-Pro tile auto-hides; Map tile flips locked → routed) |
| `app/components/BottomNav.vue` | modify | Drop `isPro` gate; render lock dot for `locked` items; intercept clicks → `useUpsell` |
| `app/components/BrandBar.vue` | modify | Drop `isPro` gate on masthead; lock glyph on locked links; scroll-aware transparency on `/`; Free `Get Pro` pill in right slot |
| `app/components/EmailSignup.vue` | modify | Add `compact?: boolean` prop; in compact mode drop the privacy-note paragraph but keep the form + success state |
| `app/pages/index.vue` | rewrite | Replace marketing layout with `PageShell` + compact hero + `<HomeTileGrid>` + slim `<EmailSignup compact>` + footer; keep all existing `useHead` JSON-LD |
| `app/app.vue` | modify | Mount `<UpsellSheet>` once; simplify the `mobileNavPadding` calc since BottomNav now renders for free users too |
| Tests (new) | create | `tests/unit/composables/useUpsell.test.ts`, `tests/unit/composables/useNavItems.test.ts`, `tests/components/UpsellSheet.test.ts`, `tests/components/HomeTileGrid.test.ts`, `tests/components/BottomNav.test.ts`, `tests/components/BrandBar.test.ts`, `tests/components/EmailSignup.test.ts` (extend) |

**Existing patterns to follow:**
- Components use `<script setup lang="ts">` + scoped `<style>` with semantic tokens (`bg-surface`, `border-border-subtle`, `text-ink-1/2/3`, `text-accent`).
- Composables use `useState` for SSR-safe singletons (see `useProStatus.ts:23-25`).
- Tests use `mountSuspended` from `@nuxt/test-utils/runtime` (see `tests/components/EmailSignup.test.ts`).
- i18n keys live under `v0.*` namespace; Icelandic falls back to English via Nuxt i18n's lazy fallback.

---

## Task 1: Add i18n keys

**Files:**
- Modify: `i18n/en.json`
- Modify: `i18n/is.json`

- [ ] **Step 1: Add `v0.upsell` block to `i18n/en.json`**

Insert under the existing `v0` object (e.g. immediately before `v0.pro_compare`):

```json
"upsell": {
  "title": "Live weather map is part of Pro Access",
  "bullet_weather": "Live cloud cover from 55 weather stations, refreshed every 15 min",
  "bullet_spots": "Personalised \"best spot for you right now\" with horizon checks",
  "bullet_roads": "Road conditions + roadside camera feeds across the path",
  "cta_primary": "Get Pro · €9.99",
  "cta_secondary": "Already paid? Restore",
  "dismiss": "Close",
  "price_note": "One-time payment. No subscription."
},
"home": {
  "tagline": "Iceland · 12 Aug 2026 · find the clearest sky",
  "tile_spots_title": "Browse spots",
  "tile_spots_body": "30+ vetted viewing points across the path",
  "tile_guide_title": "Read the guide",
  "tile_guide_body": "Plan with the long-form eclipse guide",
  "tile_map_title": "Live weather map",
  "tile_map_body": "Live cloud cover + ranked spots (Pro)",
  "tile_pro_title": "Get Pro · €9.99",
  "tile_pro_body": "Live data, ranked spots, offline-ready map",
  "email_title": "Launch reminders",
  "nav_get_pro": "Get Pro"
}
```

- [ ] **Step 2: Mirror the same keys into `i18n/is.json`**

Use English values verbatim (the Nuxt i18n `v0.*` lazy fallback already covers IS, but having literal entries makes future translation easier and keeps grep results consistent).

- [ ] **Step 3: Run i18n e2e to confirm no parse errors**

Run: `npm run test -- tests/e2e/i18n.test.ts`
Expected: PASS (existing test only validates structure, not specific keys).

If you can't run e2e in this environment, run a JSON parse check:
Run: `node -e "JSON.parse(require('fs').readFileSync('i18n/en.json')); JSON.parse(require('fs').readFileSync('i18n/is.json')); console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 4: Commit**

```bash
git add i18n/en.json i18n/is.json
git commit -m "i18n(home,upsell): add keys for hybrid home tile grid + upsell sheet"
```

---

## Task 2: `useUpsell` composable

**Files:**
- Create: `app/composables/useUpsell.ts`
- Test: `tests/unit/composables/useUpsell.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/composables/useUpsell.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useUpsell } from '~/composables/useUpsell'

const sessionStore = new Map<string, string>()

beforeEach(() => {
  sessionStore.clear()
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => sessionStore.get(k) ?? null,
    setItem: (k: string, v: string) => { sessionStore.set(k, v) },
    removeItem: (k: string) => { sessionStore.delete(k) },
    clear: () => sessionStore.clear(),
  })
  // useState singletons leak across tests — reset by re-importing.
  vi.resetModules()
})

describe('useUpsell', () => {
  it('opens and closes the sheet', () => {
    const { openUpsell, closeUpsell, isOpen } = useUpsell()
    expect(isOpen.value).toBe(false)
    openUpsell({ source: 'tile' })
    expect(isOpen.value).toBe(true)
    closeUpsell()
    expect(isOpen.value).toBe(false)
  })

  it('nav-source open is suppressed after dismissal in same session', () => {
    const { openUpsell, closeUpsell, isOpen } = useUpsell()
    openUpsell({ source: 'nav' })
    expect(isOpen.value).toBe(true)
    closeUpsell()
    openUpsell({ source: 'nav' })
    expect(isOpen.value).toBe(false)
  })

  it('tile-source open ignores dismissal flag', () => {
    const { openUpsell, closeUpsell, isOpen } = useUpsell()
    openUpsell({ source: 'nav' })
    closeUpsell()
    openUpsell({ source: 'tile' })
    expect(isOpen.value).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- useUpsell`
Expected: FAIL with `Cannot find module '~/composables/useUpsell'`.

- [ ] **Step 3: Write minimal implementation**

Create `app/composables/useUpsell.ts`:

```ts
/**
 * Single source of truth for the Pro upsell sheet. The sheet is mounted
 * once at app.vue level; any consumer (BottomNav, BrandBar masthead,
 * Home Map tile) opens it via `openUpsell({ source })`.
 *
 * Session-scoped dismissal: after the user closes the sheet, subsequent
 * `nav`-sourced opens are suppressed within the same session — habitual
 * tab taps shouldn't keep nagging. `tile`-sourced opens always succeed
 * because they're explicit, in-page user actions.
 */

type UpsellSource = 'nav' | 'tile'

const DISMISSAL_KEY = 'eclipsechase.upsell.dismissed'

export function useUpsell() {
  const isOpen = useState<boolean>('upsell-open', () => false)

  function isDismissed(): boolean {
    if (typeof sessionStorage === 'undefined') return false
    return sessionStorage.getItem(DISMISSAL_KEY) === '1'
  }

  function openUpsell(opts: { source: UpsellSource }) {
    if (opts.source === 'nav' && isDismissed()) return
    isOpen.value = true
  }

  function closeUpsell() {
    isOpen.value = false
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(DISMISSAL_KEY, '1')
    }
  }

  return { isOpen, openUpsell, closeUpsell }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- useUpsell`
Expected: PASS, 3 tests passing.

- [ ] **Step 5: Commit**

```bash
git add app/composables/useUpsell.ts tests/unit/composables/useUpsell.test.ts
git commit -m "feat(upsell): add useUpsell composable with session-scoped dismissal for nav source"
```

---

## Task 3: `UpsellSheet` component + mount in `app.vue`

**Files:**
- Create: `app/components/UpsellSheet.vue`
- Test: `tests/components/UpsellSheet.test.ts`
- Modify: `app/app.vue:21-32`

- [ ] **Step 1: Write the failing test**

Create `tests/components/UpsellSheet.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import UpsellSheet from '~/components/UpsellSheet.vue'

beforeEach(() => {
  // Force isOpen=true via direct state seed
  const sessionStore = new Map<string, string>()
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => sessionStore.get(k) ?? null,
    setItem: (k: string, v: string) => { sessionStore.set(k, v) },
    removeItem: (k: string) => { sessionStore.delete(k) },
    clear: () => sessionStore.clear(),
  })
})

describe('UpsellSheet', () => {
  it('does not render when closed', async () => {
    const wrapper = await mountSuspended(UpsellSheet)
    // Default state is closed
    expect(wrapper.find('[data-testid="upsell-sheet"]').exists()).toBe(false)
  })

  it('renders title, three bullets, and both CTAs when opened', async () => {
    const wrapper = await mountSuspended({
      components: { UpsellSheet },
      template: '<UpsellSheet />',
      setup() {
        const { openUpsell } = useUpsell()
        openUpsell({ source: 'tile' })
        return {}
      },
    })
    expect(wrapper.find('[data-testid="upsell-sheet"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="upsell-cta-primary"]').attributes('href')).toBe('/pro')
    expect(wrapper.find('[data-testid="upsell-cta-secondary"]').attributes('href')).toBe('/pro#restore')
    expect(wrapper.findAll('[data-testid="upsell-bullet"]')).toHaveLength(3)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:components -- UpsellSheet`
Expected: FAIL with `Cannot find module '~/components/UpsellSheet'`.

- [ ] **Step 3: Write the component**

Create `app/components/UpsellSheet.vue`:

```vue
<script setup lang="ts">
const { t } = useI18n()
const { isOpen, closeUpsell } = useUpsell()

function onBackdropClick() {
  closeUpsell()
}

function onEsc(e: KeyboardEvent) {
  if (e.key === 'Escape' && isOpen.value) closeUpsell()
}

if (import.meta.client) {
  watch(isOpen, (open) => {
    if (open) {
      window.addEventListener('keydown', onEsc)
    } else {
      window.removeEventListener('keydown', onEsc)
    }
  })
}
</script>

<template>
  <Teleport to="body">
    <Transition name="upsell-fade">
      <div
        v-if="isOpen"
        data-testid="upsell-sheet"
        class="upsell-backdrop"
        role="dialog"
        aria-modal="true"
        :aria-label="t('v0.upsell.title')"
        @click.self="onBackdropClick"
      >
        <div class="upsell-card">
          <button
            class="upsell-close"
            type="button"
            :aria-label="t('v0.upsell.dismiss')"
            @click="closeUpsell"
          >×</button>

          <h2 class="upsell-title">{{ t('v0.upsell.title') }}</h2>

          <ul class="upsell-bullets">
            <li data-testid="upsell-bullet">{{ t('v0.upsell.bullet_weather') }}</li>
            <li data-testid="upsell-bullet">{{ t('v0.upsell.bullet_spots') }}</li>
            <li data-testid="upsell-bullet">{{ t('v0.upsell.bullet_roads') }}</li>
          </ul>

          <p class="upsell-price-note">{{ t('v0.upsell.price_note') }}</p>

          <div class="upsell-actions">
            <NuxtLink
              data-testid="upsell-cta-primary"
              to="/pro"
              class="upsell-cta-primary"
              @click="closeUpsell"
            >
              {{ t('v0.upsell.cta_primary') }}
            </NuxtLink>
            <NuxtLink
              data-testid="upsell-cta-secondary"
              to="/pro#restore"
              class="upsell-cta-secondary"
              @click="closeUpsell"
            >
              {{ t('v0.upsell.cta_secondary') }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.upsell-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgb(0 0 0 / 0.55);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
}
@media (min-width: 768px) {
  .upsell-backdrop {
    align-items: center;
    padding: 24px;
  }
}

.upsell-card {
  position: relative;
  width: 100%;
  max-width: 520px;
  background: rgb(var(--bg-elevated));
  border: 1px solid rgb(var(--border-subtle) / 0.12);
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  padding: 28px 22px max(28px, env(safe-area-inset-bottom));
  box-shadow: 0 -8px 32px rgb(0 0 0 / 0.45);
}
@media (min-width: 768px) {
  .upsell-card {
    border-radius: 16px;
    padding: 32px 28px;
    box-shadow: 0 12px 48px rgb(0 0 0 / 0.5);
  }
}

.upsell-close {
  position: absolute;
  top: 8px;
  right: 12px;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: rgb(var(--ink-3));
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}
.upsell-close:hover { color: rgb(var(--ink-1)); }

.upsell-title {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 20px;
  font-weight: 600;
  color: rgb(var(--ink-1));
  margin: 0 0 16px;
  padding-right: 32px;
}

.upsell-bullets {
  list-style: none;
  padding: 0;
  margin: 0 0 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.upsell-bullets li {
  font-size: 14px;
  line-height: 1.45;
  color: rgb(var(--ink-2));
  padding-left: 18px;
  position: relative;
}
.upsell-bullets li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgb(var(--accent));
}

.upsell-price-note {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.12em;
  color: rgb(var(--ink-3));
  margin: 0 0 20px;
  text-transform: uppercase;
}

.upsell-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.upsell-cta-primary {
  display: block;
  text-align: center;
  background: rgb(var(--accent));
  color: rgb(var(--accent-ink));
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 14px 16px;
  border-radius: 8px;
  text-decoration: none;
}
.upsell-cta-primary:hover { background: rgb(var(--accent-strong)); }

.upsell-cta-secondary {
  display: block;
  text-align: center;
  background: transparent;
  color: rgb(var(--ink-2));
  font-size: 13px;
  font-weight: 500;
  padding: 10px 16px;
  text-decoration: none;
}
.upsell-cta-secondary:hover { color: rgb(var(--ink-1)); }

.upsell-fade-enter-active,
.upsell-fade-leave-active { transition: opacity 0.18s ease; }
.upsell-fade-enter-from,
.upsell-fade-leave-to { opacity: 0; }
</style>
```

- [ ] **Step 4: Mount the sheet once at app root**

Modify `app/app.vue:21-32` — replace the `<template>` block with this version that mounts `<UpsellSheet />`:

```vue
<template>
  <div class="min-h-screen" :class="{ 'pb-20 md:pb-0': mobileNavPadding }">
    <NuxtLoadingIndicator color="#E89A3C" :height="2" :throttle="200" />
    <NuxtRouteAnnouncer />

    <BrandBar />

    <NuxtPage />
    <BottomNav />
    <CookieConsent />
    <UpsellSheet />
  </div>
</template>
```

(Auto-imports cover the new component.)

- [ ] **Step 5: Run component test to verify it passes**

Run: `npm run test:components -- UpsellSheet`
Expected: PASS, 2 tests passing.

- [ ] **Step 6: Commit**

```bash
git add app/components/UpsellSheet.vue app/app.vue tests/components/UpsellSheet.test.ts
git commit -m "feat(upsell): add UpsellSheet component, mount once at app root"
```

---

## Task 4: Pro-aware `useNavItems`

**Files:**
- Modify: `app/composables/useNavItems.ts`
- Test: `tests/unit/composables/useNavItems.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/composables/useNavItems.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('~/composables/useProStatus', () => ({
  useProStatus: vi.fn(),
}))

import { useProStatus } from '~/composables/useProStatus'
import { useNavItems } from '~/composables/useNavItems'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('useNavItems', () => {
  it('points Home at / for free users and marks Map locked', () => {
    vi.mocked(useProStatus).mockReturnValue({
      isPro: ref(false),
      loading: ref(false),
      checkStatus: vi.fn(),
      clearPro: vi.fn(),
    } as any)

    const { items } = useNavItems()
    const home = items.value.find(i => i.icon === 'home')!
    const map = items.value.find(i => i.icon === 'map')!
    expect(home.to).toBe('/')
    expect(map.locked).toBe(true)
  })

  it('points Home at /dashboard for Pro users and Map is unlocked', () => {
    vi.mocked(useProStatus).mockReturnValue({
      isPro: ref(true),
      loading: ref(false),
      checkStatus: vi.fn(),
      clearPro: vi.fn(),
    } as any)

    const { items } = useNavItems()
    const home = items.value.find(i => i.icon === 'home')!
    const map = items.value.find(i => i.icon === 'map')!
    expect(home.to).toBe('/dashboard')
    expect(map.locked).toBeFalsy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- useNavItems`
Expected: FAIL — current `items` is a `readonly NavItem[]`, not a computed `Ref`, and has no `locked` field.

- [ ] **Step 3: Replace `useNavItems.ts`**

Overwrite `app/composables/useNavItems.ts` with:

```ts
/**
 * Shared nav items used by both the desktop top nav (masthead) and the
 * mobile bottom nav. Pro-aware: `Home` resolves to `/` for free users
 * and `/dashboard` for Pro users; `Map` is marked `locked` when the user
 * is not Pro so consumers can intercept the click and open the upsell
 * sheet instead of routing.
 *
 * `Me` stays in NAV_ITEMS_HIDDEN — its features (theme, sign out, restore)
 * already live in BrandBar's right slot or on /pro.
 */
export type NavIcon = 'map' | 'home' | 'spots' | 'guide' | 'me'

export interface NavItem {
  to: string
  label: string
  icon: NavIcon
  locked?: boolean
}

const NAV_ITEMS_HIDDEN: readonly NavItem[] = [
  { to: '/me', label: 'Me', icon: 'me' },
] as const
void NAV_ITEMS_HIDDEN

export function useNavItems() {
  const route = useRoute()
  const { isPro } = useProStatus()

  const items = computed<NavItem[]>(() => [
    { to: isPro.value ? '/dashboard' : '/', label: 'Home',  icon: 'home' },
    { to: '/spots',                                label: 'Spots', icon: 'spots' },
    { to: '/map',                                  label: 'Map',   icon: 'map', locked: !isPro.value },
    { to: '/guide',                                label: 'Guide', icon: 'guide' },
  ])

  function isActive(to: string): boolean {
    if (to === '/spots') return route.path.startsWith('/spots')
    if (to === '/me') return route.path.startsWith('/me')
    if (to === '/' || to === '/dashboard') {
      return route.path === '/' || route.path === '/dashboard'
    }
    return route.path === to
  }

  return { items, isActive }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- useNavItems`
Expected: PASS, 2 tests passing.

- [ ] **Step 5: Commit**

```bash
git add app/composables/useNavItems.ts tests/unit/composables/useNavItems.test.ts
git commit -m "feat(nav): make useNavItems Pro-aware with locked flag and dynamic Home target"
```

---

## Task 5: Rewire `BottomNav` (drop gate, lock dot, click intercept)

**Files:**
- Modify: `app/components/BottomNav.vue`
- Test: `tests/components/BottomNav.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `tests/components/BottomNav.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import BottomNav from '~/components/BottomNav.vue'

vi.mock('~/composables/useProStatus', () => ({
  useProStatus: vi.fn(),
}))
import { useProStatus } from '~/composables/useProStatus'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('BottomNav', () => {
  it('renders for free users with a lock indicator on Map', async () => {
    vi.mocked(useProStatus).mockReturnValue({
      isPro: ref(false), loading: ref(false), checkStatus: vi.fn(), clearPro: vi.fn(),
    } as any)
    const wrapper = await mountSuspended(BottomNav)
    expect(wrapper.find('nav.bottom-nav').exists()).toBe(true)
    expect(wrapper.find('[data-testid="nav-lock-map"]').exists()).toBe(true)
  })

  it('does not render the lock indicator for Pro users', async () => {
    vi.mocked(useProStatus).mockReturnValue({
      isPro: ref(true), loading: ref(false), checkStatus: vi.fn(), clearPro: vi.fn(),
    } as any)
    const wrapper = await mountSuspended(BottomNav)
    expect(wrapper.find('[data-testid="nav-lock-map"]').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:components -- BottomNav`
Expected: FAIL — current `BottomNav` is gated on `isPro && route.path !== '/'` so even the free-state render asserts fail. Lock indicator doesn't exist yet.

- [ ] **Step 3: Rewrite `BottomNav.vue`**

Overwrite `app/components/BottomNav.vue`:

```vue
<script setup lang="ts">
import IconHome from './icons/IconHome.vue'
import IconSpots from './icons/IconSpots.vue'
import IconMap from './icons/IconMap.vue'
import IconGuide from './icons/IconGuide.vue'
import IconMe from './icons/IconMe.vue'
import type { NavIcon, NavItem } from '~/composables/useNavItems'

const route = useRoute()
const { items, isActive } = useNavItems()
const { openUpsell } = useUpsell()

// Bottom nav is unconditionally rendered now — desktop hides it via CSS.
// On `/` we keep showing it so free users have the same chrome everywhere.
const iconMap: Record<NavIcon, ReturnType<typeof defineComponent>> = {
  home:  IconHome,
  spots: IconSpots,
  map:   IconMap,
  guide: IconGuide,
  me:    IconMe,
}

function tapFeedback() {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try { navigator.vibrate(5) } catch { /* swallow rare WebKit reject */ }
  }
}

function onTap(item: NavItem, e: MouseEvent) {
  tapFeedback()
  if (item.locked) {
    e.preventDefault()
    openUpsell({ source: 'nav' })
  }
}
</script>

<template>
  <nav class="bottom-nav" aria-label="Primary">
    <NuxtLink
      v-for="item in items"
      :key="item.to"
      :to="item.locked ? '#' : item.to"
      class="bottom-nav-item"
      :class="{ active: isActive(item.to), locked: item.locked }"
      :aria-current="isActive(item.to) ? 'page' : undefined"
      :aria-disabled="item.locked || undefined"
      @click="(e: MouseEvent) => onTap(item, e)"
    >
      <span class="bottom-nav-icon-wrap">
        <component :is="iconMap[item.icon]" class="bottom-nav-icon" aria-hidden="true" />
        <span
          v-if="item.locked"
          :data-testid="`nav-lock-${item.icon}`"
          class="bottom-nav-lock"
          aria-hidden="true"
        >🔒</span>
      </span>
      <span class="bottom-nav-label">{{ item.label.toUpperCase() }}</span>
      <span class="bottom-nav-dot" aria-hidden="true" />
    </NuxtLink>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  inset: auto 0 0 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: rgb(var(--bg-elevated) / 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid rgb(var(--border-subtle) / 0.08);
  padding: 14px 0 28px;
  padding-bottom: max(28px, env(safe-area-inset-bottom));
}
@media (min-width: 768px) {
  .bottom-nav { display: none; }
}

.bottom-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 44px;
  padding: 4px 0;
  text-decoration: none;
  color: rgb(var(--ink-1) / 0.62);
  transition: color 0.2s ease;
}
.bottom-nav-item:hover { color: rgb(var(--ink-1)); }
.bottom-nav-item.active { color: rgb(var(--accent)); }
.bottom-nav-item.locked { color: rgb(var(--ink-1) / 0.45); }

.bottom-nav-icon-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.bottom-nav-icon { width: 20px; height: 20px; color: inherit; }

.bottom-nav-lock {
  position: absolute;
  top: -6px;
  right: -8px;
  font-size: 10px;
  line-height: 1;
  filter: grayscale(0.4);
  pointer-events: none;
}

.bottom-nav-label {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1.4px;
  color: inherit;
}

.bottom-nav-dot {
  display: block;
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: transparent;
}
.bottom-nav-item.active .bottom-nav-dot { background: rgb(var(--accent)); }
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:components -- BottomNav`
Expected: PASS, 2 tests passing.

- [ ] **Step 5: Commit**

```bash
git add app/components/BottomNav.vue tests/components/BottomNav.test.ts
git commit -m "feat(nav): drop isPro gate from BottomNav; lock indicator + upsell intercept on Map"
```

---

## Task 6: Rewire `BrandBar` (drop gate, lock glyph, scroll-aware on `/`, free Get-Pro pill)

**Files:**
- Modify: `app/components/BrandBar.vue`
- Test: `tests/components/BrandBar.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `tests/components/BrandBar.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import BrandBar from '~/components/BrandBar.vue'

vi.mock('~/composables/useProStatus', () => ({
  useProStatus: vi.fn(),
}))
import { useProStatus } from '~/composables/useProStatus'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('BrandBar', () => {
  it('renders the masthead links for free users on tablet+', async () => {
    vi.mocked(useProStatus).mockReturnValue({
      isPro: ref(false), loading: ref(false), checkStatus: vi.fn(), clearPro: vi.fn(),
    } as any)
    const wrapper = await mountSuspended(BrandBar)
    // Masthead should be present (its display:none on mobile is CSS-only,
    // the markup still mounts).
    expect(wrapper.find('nav.masthead').exists()).toBe(true)
  })

  it('shows the Get Pro pill in the right slot for free users off /pro', async () => {
    vi.mocked(useProStatus).mockReturnValue({
      isPro: ref(false), loading: ref(false), checkStatus: vi.fn(), clearPro: vi.fn(),
    } as any)
    const wrapper = await mountSuspended(BrandBar)
    expect(wrapper.find('[data-testid="brandbar-get-pro"]').exists()).toBe(true)
  })

  it('does not show the Get Pro pill for Pro users', async () => {
    vi.mocked(useProStatus).mockReturnValue({
      isPro: ref(true), loading: ref(false), checkStatus: vi.fn(), clearPro: vi.fn(),
    } as any)
    const wrapper = await mountSuspended(BrandBar)
    expect(wrapper.find('[data-testid="brandbar-get-pro"]').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:components -- BrandBar`
Expected: FAIL — masthead is currently `v-if="showMasthead = isPro && !isLanding"` so the free-side assertion fails; Get-Pro pill doesn't exist yet.

- [ ] **Step 3: Rewrite `BrandBar.vue`**

Overwrite `app/components/BrandBar.vue`:

```vue
<script setup lang="ts">
const { t } = useI18n()
const { isPro, loading: proLoading, clearPro } = useProStatus()
const route = useRoute()
const { items: navItems, isActive: isNavActive } = useNavItems()
const { openUpsell } = useUpsell()

const isLanding = computed(() => route.path === '/')
const isMap = computed(() => route.path === '/map')
const isProRoute = computed(() => route.path === '/pro' || route.path.startsWith('/pro/'))

// Free users see a small Get-Pro pill in the right slot on every page
// except / (where the in-page tile already serves that purpose) and
// /pro / /pro/success (where they're already on the upsell path).
const showFreeGetProPill = computed(
  () => !proLoading.value && !isPro.value && !isLanding.value && !isProRoute.value,
)

// Scroll-aware transparency on `/` — start transparent over the cinematic
// hero, transition to the standard backdrop blur after 300px of scroll.
const scrolled = ref(false)
function onScroll() {
  scrolled.value = window.scrollY > 300
}
onMounted(() => {
  if (!import.meta.client) return
  if (isLanding.value) {
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
  }
})
onUnmounted(() => {
  if (import.meta.client) window.removeEventListener('scroll', onScroll)
})
watch(isLanding, (landing) => {
  if (!import.meta.client) return
  if (landing) {
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
  } else {
    window.removeEventListener('scroll', onScroll)
    scrolled.value = false
  }
})

const isLoggingOut = ref(false)
async function handleLogout() {
  isLoggingOut.value = true
  try {
    await clearPro()
    navigateTo('/pro')
  }
  finally {
    isLoggingOut.value = false
  }
}

function onMastheadClick(item: { to: string; locked?: boolean }, e: MouseEvent) {
  if (item.locked) {
    e.preventDefault()
    openUpsell({ source: 'nav' })
  }
}
</script>

<template>
  <header
    class="brand-bar"
    :class="{ 'is-landing': isLanding, 'is-scrolled': scrolled }"
  >
    <div :class="['brand-bar-inner', isMap ? 'is-map' : 'is-content']">
      <NuxtLink to="/" aria-label="EclipseChase — Home" class="brand-mark">
        <BrandLogo />
      </NuxtLink>

      <ClientOnly>
        <nav class="masthead" aria-label="Primary">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to + item.icon"
            :to="item.locked ? '#' : item.to"
            class="masthead-link"
            :class="{ active: isNavActive(item.to), locked: item.locked }"
            :aria-current="isNavActive(item.to) ? 'page' : undefined"
            :aria-disabled="item.locked || undefined"
            @click="(e: MouseEvent) => onMastheadClick(item, e)"
          >
            {{ item.label }}
            <span
              v-if="item.locked"
              :data-testid="`masthead-lock-${item.icon}`"
              class="masthead-lock"
              aria-hidden="true"
            >🔒</span>
          </NuxtLink>
        </nav>
      </ClientOnly>

      <div class="brand-bar-right">
        <ClientOnly>
          <NuxtLink
            v-if="showFreeGetProPill"
            data-testid="brandbar-get-pro"
            to="/pro"
            class="get-pro-pill"
          >
            {{ t('v0.home.nav_get_pro') }}
          </NuxtLink>
          <div v-else-if="isPro && !proLoading" class="flex items-center gap-3">
            <span class="hidden sm:inline font-mono text-[10px] text-accent/60 tracking-wider uppercase">
              {{ t('pro.badge', 'Pro') }}
            </span>
            <ThemeToggle />
            <button
              :disabled="isLoggingOut"
              class="font-mono text-[10px] text-ink-3 hover:text-ink-2 tracking-wider uppercase transition-colors disabled:opacity-50"
              @click="handleLogout"
            >
              {{ t('auth.logout') }}
            </button>
          </div>
        </ClientOnly>
      </div>
    </div>
  </header>
</template>

<style scoped>
.brand-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 30;
  background: rgb(var(--bg-elevated) / 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgb(var(--border-subtle) / 0.08);
  transition: background 0.25s ease, border-color 0.25s ease, backdrop-filter 0.25s ease;
}
/* Cinematic / on landing — fully transparent until scrolled past hero. */
.brand-bar.is-landing:not(.is-scrolled) {
  background: transparent;
  border-bottom-color: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.brand-bar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: max(env(safe-area-inset-top), 14px) 16px 14px;
  min-height: 60px;
  gap: 14px;
}
.brand-bar-inner.is-content {
  max-width: 768px;
  margin: 0 auto;
}
.brand-bar-inner.is-map { width: 100%; }
@media (min-width: 1024px) {
  .brand-bar-inner { padding-left: 24px; padding-right: 24px; }
}

.brand-mark {
  display: flex;
  align-items: center;
  text-decoration: none;
  min-height: 44px;
}
.brand-bar-right {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 44px;
}

.masthead {
  display: none;
  align-items: center;
  gap: 24px;
}
@media (min-width: 768px) {
  .masthead { display: flex; }
}
.masthead-link {
  position: relative;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgb(var(--ink-1) / 0.62);
  text-decoration: none;
  padding: 4px 0;
  transition: color 0.2s ease;
}
.masthead-link:hover { color: rgb(var(--ink-1)); }
.masthead-link.active { color: rgb(var(--accent)); }
.masthead-link.locked { color: rgb(var(--ink-1) / 0.42); }
.masthead-link.active::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: 99px;
  background: rgb(var(--accent));
  box-shadow: 0 0 8px rgb(var(--accent) / 0.7);
}
.masthead-lock {
  display: inline-block;
  margin-left: 4px;
  font-size: 10px;
  filter: grayscale(0.4);
}

.get-pro-pill {
  display: inline-flex;
  align-items: center;
  background: rgb(var(--accent));
  color: rgb(var(--accent-ink));
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 7px 12px;
  border-radius: 999px;
  text-decoration: none;
  transition: background 0.2s ease;
}
.get-pro-pill:hover { background: rgb(var(--accent-strong)); }

@media (max-width: 480px) {
  .hide-sm { display: none; }
}
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:components -- BrandBar`
Expected: PASS, 3 tests passing.

- [ ] **Step 5: Commit**

```bash
git add app/components/BrandBar.vue tests/components/BrandBar.test.ts
git commit -m "feat(brandbar): drop isPro gate, add lock glyph + scroll-aware /, free Get-Pro pill"
```

---

## Task 7: `HomeTileGrid` component

**Files:**
- Create: `app/components/HomeTileGrid.vue`
- Test: `tests/components/HomeTileGrid.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/components/HomeTileGrid.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import HomeTileGrid from '~/components/HomeTileGrid.vue'

vi.mock('~/composables/useProStatus', () => ({
  useProStatus: vi.fn(),
}))
import { useProStatus } from '~/composables/useProStatus'

beforeEach(() => { vi.resetAllMocks() })

describe('HomeTileGrid', () => {
  it('renders 4 tiles for free users including Get Pro and locked Map', async () => {
    vi.mocked(useProStatus).mockReturnValue({
      isPro: ref(false), loading: ref(false), checkStatus: vi.fn(), clearPro: vi.fn(),
    } as any)
    const wrapper = await mountSuspended(HomeTileGrid)
    expect(wrapper.findAll('[data-testid="home-tile"]')).toHaveLength(4)
    expect(wrapper.find('[data-testid="home-tile-pro"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="home-tile-map"]').classes()).toContain('locked')
  })

  it('renders 3 tiles for Pro users (no Get Pro), Map unlocked', async () => {
    vi.mocked(useProStatus).mockReturnValue({
      isPro: ref(true), loading: ref(false), checkStatus: vi.fn(), clearPro: vi.fn(),
    } as any)
    const wrapper = await mountSuspended(HomeTileGrid)
    expect(wrapper.findAll('[data-testid="home-tile"]')).toHaveLength(3)
    expect(wrapper.find('[data-testid="home-tile-pro"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="home-tile-map"]').classes()).not.toContain('locked')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:components -- HomeTileGrid`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

Create `app/components/HomeTileGrid.vue`:

```vue
<script setup lang="ts">
const { t } = useI18n()
const { isPro } = useProStatus()
const { openUpsell } = useUpsell()

function onMapTileClick(e: MouseEvent) {
  if (!isPro.value) {
    e.preventDefault()
    openUpsell({ source: 'tile' })
  }
}
</script>

<template>
  <div class="home-tile-grid">
    <NuxtLink
      data-testid="home-tile"
      class="tile"
      to="/spots"
    >
      <span class="tile-eyebrow">SPOTS</span>
      <span class="tile-title">{{ t('v0.home.tile_spots_title') }}</span>
      <span class="tile-body">{{ t('v0.home.tile_spots_body') }}</span>
    </NuxtLink>

    <NuxtLink
      data-testid="home-tile"
      class="tile"
      to="/guide"
    >
      <span class="tile-eyebrow">GUIDE</span>
      <span class="tile-title">{{ t('v0.home.tile_guide_title') }}</span>
      <span class="tile-body">{{ t('v0.home.tile_guide_body') }}</span>
    </NuxtLink>

    <NuxtLink
      data-testid="home-tile home-tile-map"
      :data-testid-extra="'home-tile-map'"
      :to="isPro ? '/map' : '#'"
      class="tile"
      :class="{ locked: !isPro }"
      @click="onMapTileClick"
    >
      <span class="tile-eyebrow">
        MAP
        <span v-if="!isPro" class="tile-lock" aria-hidden="true">🔒</span>
      </span>
      <span class="tile-title">{{ t('v0.home.tile_map_title') }}</span>
      <span class="tile-body">{{ t('v0.home.tile_map_body') }}</span>
    </NuxtLink>

    <NuxtLink
      v-if="!isPro"
      data-testid="home-tile home-tile-pro"
      to="/pro"
      class="tile tile-accent"
    >
      <span class="tile-eyebrow">PRO · €9.99</span>
      <span class="tile-title">{{ t('v0.home.tile_pro_title') }}</span>
      <span class="tile-body">{{ t('v0.home.tile_pro_body') }}</span>
    </NuxtLink>
  </div>
</template>

<style scoped>
.home-tile-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
@media (min-width: 768px) {
  .home-tile-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
}

.tile {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 18px 16px;
  background: rgb(var(--surface));
  border: 1px solid rgb(var(--border-subtle) / 0.4);
  border-radius: 4px;
  text-decoration: none;
  color: rgb(var(--ink-1));
  transition: border-color 0.2s ease, background 0.2s ease;
  min-height: 124px;
}
.tile:hover {
  border-color: rgb(var(--border-subtle) / 0.8);
  background: rgb(var(--surface-raised));
}
.tile.locked { color: rgb(var(--ink-2)); }
.tile-accent {
  border-color: rgb(var(--accent) / 0.5);
  background: rgb(var(--accent) / 0.06);
}
.tile-accent:hover {
  border-color: rgb(var(--accent));
  background: rgb(var(--accent) / 0.1);
}

.tile-eyebrow {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.16em;
  color: rgb(var(--ink-3));
  text-transform: uppercase;
}
.tile-lock {
  display: inline-block;
  margin-left: 6px;
  font-size: 10px;
}
.tile-title {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: rgb(var(--ink-1));
}
.tile-body {
  font-size: 13px;
  line-height: 1.4;
  color: rgb(var(--ink-2));
}
</style>
```

> **Note on `data-testid` on the Map tile:** the test asserts both `home-tile` (count) and `home-tile-map` (specific). NuxtLink renders attributes onto the underlying `<a>`. Using a single `data-testid="home-tile home-tile-map"` exposes both via the `findAll('[data-testid="home-tile"]')` substring matcher? **No** — Vue Test Utils selectors are exact. Replace the trick with two attributes: drop the combined string and use `data-testid="home-tile" data-testid-extra="home-tile-map"`. Update the test to query `[data-testid-extra="home-tile-map"]` instead. **Action:** before running the test, change the test selector from `[data-testid="home-tile-map"]` to `[data-testid-extra="home-tile-map"]`. Same for `home-tile-pro` — give it `data-testid="home-tile" data-testid-extra="home-tile-pro"` and adjust the test to match.

Updated test (apply this change to `tests/components/HomeTileGrid.test.ts` from Step 1):

```ts
// Replace these lines in the test:
// expect(wrapper.find('[data-testid="home-tile-pro"]').exists()).toBe(true)
// expect(wrapper.find('[data-testid="home-tile-map"]').classes()).toContain('locked')
// With:
expect(wrapper.find('[data-testid-extra="home-tile-pro"]').exists()).toBe(true)
expect(wrapper.find('[data-testid-extra="home-tile-map"]').classes()).toContain('locked')
// And in the Pro test:
// expect(wrapper.find('[data-testid="home-tile-pro"]').exists()).toBe(false)
// expect(wrapper.find('[data-testid="home-tile-map"]').classes()).not.toContain('locked')
// With:
expect(wrapper.find('[data-testid-extra="home-tile-pro"]').exists()).toBe(false)
expect(wrapper.find('[data-testid-extra="home-tile-map"]').classes()).not.toContain('locked')
```

Update component to match:

```vue
<!-- Map tile -->
<NuxtLink
  data-testid="home-tile"
  data-testid-extra="home-tile-map"
  :to="isPro ? '/map' : '#'"
  class="tile"
  :class="{ locked: !isPro }"
  @click="onMapTileClick"
>
  ...
</NuxtLink>

<!-- Pro tile -->
<NuxtLink
  v-if="!isPro"
  data-testid="home-tile"
  data-testid-extra="home-tile-pro"
  to="/pro"
  class="tile tile-accent"
>
  ...
</NuxtLink>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:components -- HomeTileGrid`
Expected: PASS, 2 tests passing.

- [ ] **Step 5: Commit**

```bash
git add app/components/HomeTileGrid.vue tests/components/HomeTileGrid.test.ts
git commit -m "feat(home): add HomeTileGrid with Pro-aware tiles + locked Map intercept"
```

---

## Task 8: `EmailSignup` slim variant

**Files:**
- Modify: `app/components/EmailSignup.vue`
- Test: `tests/components/EmailSignup.test.ts` (extend)

- [ ] **Step 1: Write the failing test**

Append to `tests/components/EmailSignup.test.ts`:

```ts
  it('hides the privacy note paragraph when compact prop is true', async () => {
    const wrapper = await mountSuspended(EmailSignup, { props: { compact: true } })
    const links = wrapper.findAll('a')
    const privacyLink = links.filter(l => l.attributes('href') === '/privacy')
    expect(privacyLink.length).toBe(0)
  })
```

(Add this `it` block inside the existing `describe('EmailSignup', ...)` — keep the existing 4 tests, add this 5th.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:components -- EmailSignup`
Expected: 4 PASS + 1 FAIL — the privacy link still renders unconditionally.

- [ ] **Step 3: Add the `compact` prop and gate the privacy paragraph**

Modify `app/components/EmailSignup.vue`:

After line 1 (`<script setup lang="ts">`), add the prop declaration:

```ts
const props = defineProps<{ compact?: boolean }>()
```

Then gate the privacy paragraph (replace lines 105-110):

```vue
<p v-if="!props.compact" class="mt-3 text-xs text-ink-3 text-center">
  {{ t('signup.privacy_note_pre') }}
  <NuxtLink to="/privacy" class="text-ink-2 hover:text-ink-1 underline underline-offset-2 transition-colors">
    {{ t('signup.privacy_note_link') }}
  </NuxtLink>
</p>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:components -- EmailSignup`
Expected: 5 PASS.

- [ ] **Step 5: Commit**

```bash
git add app/components/EmailSignup.vue tests/components/EmailSignup.test.ts
git commit -m "feat(signup): add compact prop to EmailSignup that drops the privacy paragraph"
```

---

## Task 9: Rewrite `app/pages/index.vue` as hybrid Home

**Files:**
- Modify: `app/pages/index.vue` (full rewrite)

- [ ] **Step 1: Snapshot the existing `useHead` block**

Open `app/pages/index.vue:1-58` and copy the entire `useHead({...})` call verbatim. The new file will paste it back unchanged so SEO/JSON-LD doesn't regress.

- [ ] **Step 2: Replace the file with the hybrid Home composition**

Overwrite `app/pages/index.vue`:

```vue
<script setup lang="ts">
const { t } = useI18n()
const siteUrl = useRuntimeConfig().public.siteUrl as string

useHead(() => ({
  title: t('meta.title'),
  titleTemplate: '%s',
  meta: [
    { name: 'description', content: t('meta.description') },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            'name': 'EclipseChase.is',
            'url': siteUrl,
            'description': t('meta.description'),
            'inLanguage': ['en', 'is'],
          },
          {
            '@type': 'Event',
            'name': 'Total Solar Eclipse in Iceland 2026',
            'startDate': '2026-08-12T17:43:00+00:00',
            'endDate': '2026-08-12T17:48:00+00:00',
            'eventAttendanceMode': 'https://schema.org/OfflineEventAttendanceMode',
            'eventStatus': 'https://schema.org/EventScheduled',
            'location': {
              '@type': 'Place',
              'name': 'Western Iceland',
              'geo': { '@type': 'GeoCoordinates', 'latitude': 64.15, 'longitude': -21.94 },
              'address': { '@type': 'PostalAddress', 'addressCountry': 'IS', 'addressRegion': 'Western Iceland' },
            },
            'description': 'Total solar eclipse visible from Western Iceland. Maximum totality duration 2m 18s. Path crosses Westfjords, Snæfellsnes, and Reykjanes.',
            'image': `${siteUrl}/og-image.jpg`,
            'url': siteUrl,
            'organizer': { '@type': 'Organization', 'name': 'EclipseChase.is', 'url': siteUrl },
          },
        ],
      }),
    },
  ],
}))
</script>

<template>
  <PageShell screen="home" width="wide">
    <div class="home-root">
      <!-- Compact hero — Starfield + glyph + countdown + tagline. ~60vh on
           mobile so the tile grid peeks above the fold. -->
      <section class="home-hero" aria-label="Eclipse countdown">
        <Starfield />
        <div class="home-hero-inner">
          <EclipseHero />
          <CountdownBar />
          <p class="home-tagline">{{ t('v0.home.tagline') }}</p>
        </div>
      </section>

      <!-- Utility tile grid -->
      <section class="home-section" aria-label="Quick links">
        <HomeTileGrid />
      </section>

      <!-- Slim email row -->
      <section class="home-section home-email" aria-label="Launch reminders">
        <h2 class="home-email-title">{{ t('v0.home.email_title') }}</h2>
        <EmailSignup compact />
      </section>

      <!-- Footer -->
      <footer class="home-footer">
        <NuxtLink to="/privacy">{{ t('footer.privacy') }}</NuxtLink>
        <span aria-hidden="true">·</span>
        <NuxtLink to="/terms">{{ t('footer.terms') }}</NuxtLink>
        <span aria-hidden="true">·</span>
        <NuxtLink to="/credits">{{ t('footer.credits') }}</NuxtLink>
      </footer>
    </div>
  </PageShell>
</template>

<style scoped>
.home-root {
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding: 0 16px 24px;
}
@media (min-width: 768px) {
  .home-root { gap: 40px; padding: 0 24px 32px; }
}

.home-hero {
  position: relative;
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 0;
  overflow: hidden;
}
.home-hero-inner {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  text-align: center;
}
.home-tagline {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
  letter-spacing: 0.18em;
  color: rgb(var(--ink-2));
  text-transform: uppercase;
  margin: 0;
}

.home-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.home-email-title {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.16em;
  color: rgb(var(--ink-3));
  text-transform: uppercase;
  margin: 0;
}

.home-footer {
  display: flex;
  justify-content: center;
  gap: 10px;
  padding-top: 24px;
  border-top: 1px solid rgb(var(--border-subtle) / 0.3);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  color: rgb(var(--ink-3));
}
.home-footer a {
  color: rgb(var(--ink-3));
  text-decoration: none;
}
.home-footer a:hover { color: rgb(var(--ink-1)); }
</style>
```

- [ ] **Step 3: Verify i18n keys for footer exist**

Quick check: the new template uses `footer.privacy`, `footer.terms`, `footer.credits`. Run a JSON grep:

```bash
grep -E '"privacy"|"terms"|"credits"' i18n/en.json
```

If `footer.privacy` etc. don't exist (look for them under a `"footer": { ... }` block), add them now to both `en.json` and `is.json`:

```json
"footer": {
  "privacy": "Privacy",
  "terms": "Terms",
  "credits": "Credits"
}
```

If the keys already exist (they may already be defined), skip this addition.

- [ ] **Step 4: Update existing landing e2e test if it asserts on removed copy**

Run: `npm run test -- tests/e2e/landing.test.ts`
Expected: most assertions about basic page render still pass; any assertion checking specific marketing copy (e.g. multi-section feature text) will fail.

If failures reference marketing copy that's no longer present, edit the e2e test to assert on the new structure instead — at minimum:
- Page renders the brand mark
- Tile grid is present (`[data-testid="home-tile"]` count >= 3)
- Email signup form is present
- Footer links are present

- [ ] **Step 5: Run the full unit + component suite**

Run: `npm run test:unit && npm run test:components`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add app/pages/index.vue i18n/en.json i18n/is.json tests/e2e/landing.test.ts
git commit -m "feat(home): rewrite / as hybrid (compact hero + tile grid + slim email + footer)"
```

---

## Task 10: Simplify `mobileNavPadding` in `app.vue`

**Files:**
- Modify: `app/app.vue:5-19`

The old logic added bottom padding only for Pro users on non-`/`/non-`/map` pages, because the BottomNav rendered only there. Now the BottomNav renders for everyone except via the `display:none` desktop CSS, so the padding rule simplifies.

- [ ] **Step 1: Replace the script block in `app/app.vue`**

```vue
<script setup lang="ts">
useAnalyticsConsent()

const route = useRoute()

const normalizedPath = computed(() => {
  const p = route.path
  return p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p
})
const isMap = computed(() => normalizedPath.value === '/map')

// BottomNav is now mounted for all users (it self-hides at md+ via CSS).
// /map is the one exception — it's full-bleed, so it manages its own
// bottom spacing via SelectedLightbox + map controls.
const mobileNavPadding = computed(() => !isMap.value)
</script>
```

(Keep the `<template>` block from Task 3, Step 4 — it already mounts `<UpsellSheet />`.)

- [ ] **Step 2: Run e2e responsive sanity check**

Run: `npm run test -- tests/e2e/responsive.test.ts`
Expected: PASS — if any assertion is sensitive to bottom padding on non-Pro pages, update its expected value.

- [ ] **Step 3: Run the full test suite**

Run: `npm run test`
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add app/app.vue
git commit -m "refactor(app): simplify mobileNavPadding now that BottomNav renders for all users"
```

---

## Task 11: Manual dev preview verification

**Files:** none — this is a verification pass against `npm run dev`.

- [ ] **Step 1: Start dev**

Run: `npm run dev`
Expected: server up at `http://localhost:3000`.

- [ ] **Step 2: Verify free-user flow**

In `.env`, ensure `NUXT_PUBLIC_BYPASS_PRO_GATE=0` so the dev bypass doesn't make every visitor Pro. Restart `npm run dev` after editing `.env`.

Walk through:
1. Visit `/` → see chrome (BrandBar + BottomNav on mobile) overlaying the hero. BrandBar starts transparent, gains backdrop on scroll past 300px.
2. Tile grid is visible below the hero. 4 tiles (Spots / Guide / Map locked / Get Pro).
3. Tap the Map tile → UpsellSheet opens. Close it. Tap the Map tile again → opens again (tile source ignores dismissal).
4. Tap the Map tab in BottomNav → UpsellSheet opens. Close it. Tap Map tab again → does NOT reopen (nav source respects dismissal).
5. Reload → dismissal cleared (sessionStorage); tabs reopen the sheet.
6. Navigate to `/spots` → BrandBar masthead visible at desktop sizes; locked Map link shows the lock glyph; clicking it opens the sheet (and is suppressed if already dismissed).
7. Right slot of BrandBar shows a "GET PRO" pill on `/spots` and `/guide`. No pill on `/`.
8. `/me`, `/dashboard`, `/map` all redirect to `/pro` for the free user (existing pro-gate middleware).

- [ ] **Step 3: Verify Pro-user flow**

Set `NUXT_PUBLIC_BYPASS_PRO_GATE=1` (or remove the override) in `.env` and restart `npm run dev`.

1. Visit `/dashboard` → unchanged dashboard, BrandBar masthead with all 4 tabs unlocked, no Get-Pro pill (theme + sign-out cluster instead).
2. Visit `/` → hybrid Home renders without the Get-Pro tile (3 tiles), Map tile routes to `/map` directly (no sheet).
3. Confirm `Home` tab in BottomNav routes to `/dashboard` (not `/`).

- [ ] **Step 4: Visual sanity check**

- BrandBar transparency on `/` looks intentional, not broken.
- BottomNav lock dot is visible but not garish.
- UpsellSheet animates in, dismisses on backdrop click, has no scroll lock issues, and respects safe-area on iOS.

- [ ] **Step 5: Final commit (if any tweaks were needed)**

```bash
git status
# If clean, no commit needed.
# If tweaks: stage them and commit with a focused message.
```

---

## Self-Review

(Inline checks I ran while finalizing this plan; no action needed unless you spot something I missed.)

**Spec coverage:**
- D1 (single chrome) → Tasks 5, 6, 10 ✓
- D2 (4 tabs, Me hidden) → Task 4 keeps existing structure ✓
- D3 (per-tab behavior + dynamic Home + locked Map) → Task 4 ✓
- D4 (hybrid `/`) → Tasks 7, 9 ✓
- D5 (UpsellSheet) → Tasks 2, 3 ✓
- D6 (lock affordance) → Tasks 5 (BottomNav), 6 (BrandBar masthead), 7 (HomeTileGrid) ✓
- D7 (BrandBar right slot) → Task 6 (`showFreeGetProPill` computed) ✓
- D8 (scroll-aware on `/`) → Task 6 (`scrolled` ref + `is-landing.is-scrolled` CSS) ✓
- Edge case "tile click ignores dismissal" → Task 2 (`source` parameter) + Task 7 (`source: 'tile'`) ✓

**Type consistency:**
- `useUpsell()` exposes `openUpsell({ source })` everywhere it's called. `BottomNav` and masthead use `'nav'`; `HomeTileGrid` uses `'tile'`. ✓
- `NavItem.locked?: boolean` declared in Task 4, consumed in Tasks 5 + 6 with the same field name. ✓
- `EmailSignup.compact?: boolean` declared in Task 8, used in Task 9 as `<EmailSignup compact />`. ✓

**No placeholders:** Every step has full code or a concrete shell command. Task 9 Step 3 has a *conditional* (add footer keys only if missing) — that's an intentional dependency check, not a placeholder.
