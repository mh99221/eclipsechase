# Legal Compliance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add EU-compliant privacy policy, terms of service, cookie consent banner, and withdrawal waiver checkbox to EclipseChase.is.

**Architecture:** Four independent deliverables: (1) rewrite `/privacy` page with full GDPR disclosures, (2) create `/terms` page, (3) build cookie consent banner + analytics consent composable that conditionally loads Umami, (4) update footers across all pages + add withdrawal waiver checkbox on `/pro`. Tasks are ordered by dependency — the consent composable must exist before the cookie banner, and the legal pages must exist before footer links point to them.

**Tech Stack:** Nuxt 4, Vue 3 Composition API, TailwindCSS, TypeScript, i18n (`useI18n` / `$t`)

**Spec:** `docs/superpowers/specs/2026-03-19-legal-compliance-design.md`

---

### Task 1: Add i18n keys for legal pages and cookie consent

**Files:**
- Modify: `i18n/en.json`
- Modify: `i18n/is.json`

All new UI text needs i18n keys. The legal page body text is English-only (no Icelandic translation needed yet), but UI elements (nav links, buttons, banner text, checkbox labels) need keys in both locales.

- [ ] **Step 1: Add English i18n keys**

Add these keys to `i18n/en.json`:

Add these keys inside their respective nested objects in `i18n/en.json`. The file uses nested JSON (not flat dotted keys).

In the `"footer"` object (which already has `"privacy": "Privacy"`), add:
```json
"terms": "Terms"
```

Add a new `"cookie"` object at the top level:
```json
"cookie": {
  "banner_text": "We use essential cookies for authentication. We also use Umami for anonymous analytics, which requires your consent.",
  "learn_more": "Learn more",
  "accept_all": "Accept all",
  "essential_only": "Essential only"
}
```

In the existing `"pro"` object, add these keys:
```json
"withdrawal_waiver": "I agree that my Pro access begins immediately and I waive my 14-day right of withdrawal. I have read the {terms_link} and {privacy_link}.",
"terms_link_text": "Terms of Service",
"privacy_link_text": "Privacy Policy"
```

Note: `footer.privacy` already exists as `"Privacy"`. The existing key `signup.privacy_note_pre` / `signup.privacy_note_link` can stay as-is.

- [ ] **Step 2: Add Icelandic i18n keys**

Add matching keys to `i18n/is.json` (Icelandic translations for UI elements only):

Same nested structure as English. In the `"footer"` object, add:
```json
"terms": "Skilmálar"
```

Add a new `"cookie"` object:
```json
"cookie": {
  "banner_text": "Við notum nauðsynleg vefkökur fyrir auðkenningu. Við notum einnig Umami fyrir nafnlausar greiningar, sem krefst samþykkis þíns.",
  "learn_more": "Nánar",
  "accept_all": "Samþykkja allt",
  "essential_only": "Aðeins nauðsynlegt"
}
```

In the existing `"pro"` object, add:
```json
"withdrawal_waiver": "Ég samþykki að Pro aðgangur minn hefjist strax og ég afsala mér 14 daga endurgreiðslurétti. Ég hef lesið {terms_link} og {privacy_link}.",
"terms_link_text": "Skilmála",
"privacy_link_text": "Persónuverndarstefnu"
```

- [ ] **Step 3: Commit**

```bash
git add i18n/en.json i18n/is.json
git commit -m "feat: add i18n keys for legal pages, cookie consent, and withdrawal waiver"
```

---

### Task 2: Rewrite Privacy Policy page

**Files:**
- Modify: `app/pages/privacy.vue` (full rewrite)

Rewrite the existing privacy page with all 9 sections from the spec. The page is static HTML/Vue template — no script logic beyond `useHead`. Keep the existing page structure (noise wrapper, nav with SVG logo + ECLIPSECHASE wordmark, `section-container max-w-2xl`, footer).

Reference the current `app/pages/privacy.vue` for the exact nav HTML and design patterns. The page already uses `max-w-2xl` — keep that.

- [ ] **Step 1: Rewrite privacy.vue**

Replace the entire file content. The page has:
- `<script setup>` with `useHead({ title: 'Privacy Policy' })`
- Same nav as current (SVG logo + ECLIPSECHASE wordmark, no right-side link)
- `<article class="section-container max-w-2xl py-12 sm:py-20">`
- h1: "Privacy Policy" + "Last updated: March 19, 2026" in mono
- 9 sections with h2 headings per spec sections 1.1–1.9
- Section 1.2 (data collection) and 1.3 (cookies) and 1.4 (third-party services) use HTML `<table>` elements styled with the dark theme:
  - Table: `class="w-full text-sm text-left mt-3"`
  - `<thead>`: `class="text-xs font-mono uppercase tracking-wider text-slate-500 border-b border-void-border/40"`
  - `<th>`: `class="py-2 pr-4"`
  - `<td>`: `class="py-2.5 pr-4 align-top text-slate-300"` with first column `text-slate-200 font-medium`
  - `<tr>`: `class="border-b border-void-border/20"`
- Section 1.7 (GDPR rights) uses `<ul class="list-disc list-outside ml-5 space-y-2">` same as current
- All external links (privacy policies of third parties) open in new tab with `target="_blank" rel="noopener"`
- Footer: use the new footer pattern (back home link left + Privacy/Terms links right) — but since this IS the privacy page, the Privacy link should not appear; just show Terms:

```html
<footer class="border-t border-void-border/30 py-8">
  <div class="section-container flex items-center justify-between">
    <NuxtLink to="/" class="font-mono text-sm text-slate-500 hover:text-slate-300 transition-colors">
      &larr; Back to home
    </NuxtLink>
    <NuxtLink to="/terms" class="font-mono text-xs text-slate-500 hover:text-slate-300 transition-colors">
      Terms
    </NuxtLink>
  </div>
</footer>
```

**Content for each section** — use the exact text from spec sections 1.1–1.9. The developer placeholder "(IČO and registered address to be added by the developer)" should be rendered as `[IČO]` and `[Address]` in the HTML as TODO markers the developer will fill in.

- [ ] **Step 2: Verify the page renders**

Run: `npx nuxi dev` and navigate to `http://localhost:3000/privacy`
Expected: All 9 sections render, tables are readable, links work.

- [ ] **Step 3: Commit**

```bash
git add app/pages/privacy.vue
git commit -m "feat: rewrite privacy policy with full GDPR disclosures"
```

---

### Task 3: Create Terms of Service page

**Files:**
- Create: `app/pages/terms.vue`

New page following identical structure to the rewritten privacy page. Same nav, same `section-container max-w-2xl`, same footer pattern (but linking to Privacy instead of Terms).

- [ ] **Step 1: Create terms.vue**

Structure:
- `<script setup>` with `useHead({ title: 'Terms of Service' })`
- Same nav as privacy page
- `<article class="section-container max-w-2xl py-12 sm:py-20">`
- h1: "Terms of Service" + "Last updated: March 19, 2026"
- 11 sections with h2 headings per spec sections 2.1–2.11
- Section 2.4 (safety disclaimer) should use a warning-styled banner for the "Users are solely responsible" block:

```html
<div class="my-4 px-3 py-2.5 rounded bg-amber-900/15 border border-amber-700/20 text-xs font-mono text-amber-400/80">
  <strong>Important:</strong> Users are solely responsible for their own safety...
</div>
```

- Bulleted lists use `<ul class="list-disc list-outside ml-5 space-y-2">`
- Footer: back home + link to Privacy (not Terms, since we're on Terms):

```html
<footer class="border-t border-void-border/30 py-8">
  <div class="section-container flex items-center justify-between">
    <NuxtLink to="/" class="font-mono text-sm text-slate-500 hover:text-slate-300 transition-colors">
      &larr; Back to home
    </NuxtLink>
    <NuxtLink to="/privacy" class="font-mono text-xs text-slate-500 hover:text-slate-300 transition-colors">
      Privacy
    </NuxtLink>
  </div>
</footer>
```

Use exact text from spec sections 2.1–2.11 for all content.

- [ ] **Step 2: Add /terms to route rules in nuxt.config.ts**

In `nuxt.config.ts`, add `/terms` prerender rule to `routeRules`:

```typescript
routeRules: {
  '/guide': { prerender: true },
  '/pro': { ssr: true },
  '/privacy': { prerender: true },
  '/terms': { prerender: true },   // <-- add this
  '/spots/**': { isr: 3600 },
},
```

- [ ] **Step 3: Verify the page renders**

Run: `npx nuxi dev` and navigate to `http://localhost:3000/terms`
Expected: All 11 sections render, safety disclaimer banner visible, footer links work.

- [ ] **Step 4: Commit**

```bash
git add app/pages/terms.vue nuxt.config.ts
git commit -m "feat: add terms of service page with safety disclaimer"
```

---

### Task 4: Create analytics consent composable

**Files:**
- Create: `app/composables/useAnalyticsConsent.ts`
- Modify: `nuxt.config.ts` (remove static Umami script)

This composable manages cookie/analytics consent state and conditionally loads the Umami script. It must be created before the CookieConsent banner component (which calls its methods).

- [ ] **Step 1: Create useAnalyticsConsent.ts**

```typescript
const CONSENT_KEY = 'eclipsechase-consent'

// Shared state across all component instances.
// Safe as module-level refs because all reads/writes are guarded by import.meta.client.
// On the server these remain at their initial values and are never mutated.
const consentState = ref<'all' | 'essential' | null>(null)
const umamiLoaded = ref(false)

export function useAnalyticsConsent() {
  const config = useRuntimeConfig()

  function readConsent(): 'all' | 'essential' | null {
    if (!import.meta.client) return null
    const value = localStorage.getItem(CONSENT_KEY)
    if (value === 'all' || value === 'essential') return value
    return null
  }

  function setConsent(value: 'all' | 'essential') {
    if (!import.meta.client) return
    localStorage.setItem(CONSENT_KEY, value)
    consentState.value = value
    if (value === 'all') loadUmami()
  }

  function loadUmami() {
    if (!import.meta.client) return
    if (umamiLoaded.value) return
    const host = config.public.umamiHost || 'https://cloud.umami.is'
    const websiteId = config.public.umamiWebsiteId
    if (!websiteId) return

    const script = document.createElement('script')
    script.src = `${host}/script.js`
    script.async = true
    script.dataset.websiteId = websiteId
    document.head.appendChild(script)
    umamiLoaded.value = true
  }

  // Initialize state on first use (client-side only)
  if (import.meta.client && consentState.value === null) {
    consentState.value = readConsent()
  }

  const hasConsent = computed(() => consentState.value === 'all')
  const consentGiven = computed(() => consentState.value !== null)

  return {
    consentState: readonly(consentState),
    hasConsent,
    consentGiven,
    setConsent,
    loadUmami,
  }
}
```

- [ ] **Step 2: Remove static Umami script from nuxt.config.ts**

In `nuxt.config.ts`, replace the `script` array in `app.head` with an empty array:

```typescript
// Before:
script: [
  ...(process.env.NUXT_PUBLIC_UMAMI_WEBSITE_ID
    ? [{
      src: `${process.env.NUXT_PUBLIC_UMAMI_HOST || 'https://cloud.umami.is'}/script.js`,
      async: true,
      'data-website-id': process.env.NUXT_PUBLIC_UMAMI_WEBSITE_ID,
    }]
    : []),
],

// After: remove the entire script property (or set to empty array)
```

Simply delete the `script` property from the `head` config entirely.

- [ ] **Step 3: Commit**

```bash
git add app/composables/useAnalyticsConsent.ts nuxt.config.ts
git commit -m "feat: add analytics consent composable, remove static Umami loading"
```

---

### Task 5: Create Cookie Consent Banner component

**Files:**
- Create: `app/components/CookieConsent.vue`
- Modify: `app/app.vue`

The banner appears on every page via `app.vue`. It reads consent state from the composable and shows/hides accordingly.

- [ ] **Step 1: Create CookieConsent.vue**

```vue
<script setup lang="ts">
const { t } = useI18n()
const { consentGiven, setConsent } = useAnalyticsConsent()

const visible = ref(false)

onMounted(() => {
  visible.value = !consentGiven.value
})

function accept() {
  setConsent('all')
  visible.value = false
}

function decline() {
  setConsent('essential')
  visible.value = false
}
</script>

<template>
  <div
    v-if="visible"
    class="fixed bottom-0 inset-x-0 z-50 bg-void-surface border-t border-void-border/40"
  >
    <div class="section-container py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <p class="text-sm text-slate-300 flex-1">
        {{ t('cookie.banner_text') }}
        <NuxtLink to="/privacy" class="text-corona hover:text-corona-bright transition-colors ml-1">
          {{ t('cookie.learn_more') }}
        </NuxtLink>
      </p>
      <div class="flex gap-2 shrink-0">
        <button
          class="border border-void-border text-slate-400 font-mono text-xs uppercase tracking-wider px-4 py-2 rounded hover:border-slate-500 hover:text-slate-300 transition-colors"
          @click="decline"
        >
          {{ t('cookie.essential_only') }}
        </button>
        <button
          class="bg-corona text-void font-mono text-xs uppercase tracking-wider px-4 py-2 rounded hover:bg-corona-bright transition-colors"
          @click="accept"
        >
          {{ t('cookie.accept_all') }}
        </button>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Add CookieConsent to app.vue and initialize analytics on load**

Update `app/app.vue` to:

```vue
<script setup lang="ts">
const { hasConsent, loadUmami } = useAnalyticsConsent()

onMounted(() => {
  if (hasConsent.value) loadUmami()
})
</script>

<template>
  <div class="min-h-screen">
    <NuxtRouteAnnouncer />
    <NuxtPage />
    <CookieConsent />
  </div>
</template>
```

This ensures: (1) if user previously consented, Umami loads on mount, (2) if user hasn't consented, the CookieConsent banner shows, (3) when user clicks "Accept all", the composable loads Umami immediately.

- [ ] **Step 3: Verify consent flow works**

Run: `npx nuxi dev` and navigate to `http://localhost:3000`

Test flow:
1. Clear localStorage. Reload. Banner should appear at bottom.
2. Click "Essential only". Banner disappears. Check localStorage: `eclipsechase-consent` = `"essential"`. Reload — banner should NOT reappear. Check page source/network — Umami script should NOT be loaded.
3. Clear localStorage again. Reload. Click "Accept all". Check localStorage: `eclipsechase-consent` = `"all"`. Check network tab — Umami script should load from cloud.umami.is. Reload — banner should NOT reappear, Umami should load automatically.

- [ ] **Step 4: Commit**

```bash
git add app/components/CookieConsent.vue app/app.vue
git commit -m "feat: add cookie consent banner with conditional Umami loading"
```

---

### Task 6: Update footers across all pages

**Files:**
- Modify: `app/pages/index.vue`
- Modify: `app/pages/guide.vue`
- Modify: `app/pages/pro.vue`
- Modify: `app/pages/spots/[slug].vue`
- Modify: `app/pages/recommend.vue`

Note: `app/pages/map.vue` is a full-screen map with no footer — do NOT add one. The privacy and terms pages already have cross-links from Tasks 2 and 3.

- [ ] **Step 1: Update index.vue footer**

The landing page footer already has a Privacy link in its `<!-- Meta -->` div. Add a Terms link next to it with the same separator pattern:

Find the existing meta div in the footer (the one with `footer.privacy` link and `footer.eclipse_date`). Add a Terms link before the Privacy link:

```html
<div class="flex items-center gap-4 text-xs font-mono text-slate-500 tracking-wider">
  <NuxtLink to="/privacy" class="hover:text-slate-300 transition-colors">
    {{ t('footer.privacy') }}
  </NuxtLink>
  <div class="w-px h-3 bg-void-border" />
  <NuxtLink to="/terms" class="hover:text-slate-300 transition-colors">
    {{ t('footer.terms') }}
  </NuxtLink>
  <div class="w-px h-3 bg-void-border" />
  <span>{{ t('footer.eclipse_date') }}</span>
</div>
```

- [ ] **Step 2: Update guide.vue footer**

Replace the simple centered footer with the new pattern:

```html
<footer class="border-t border-void-border/30 py-8">
  <div class="section-container flex items-center justify-between">
    <NuxtLink to="/" class="font-mono text-sm text-slate-500 hover:text-slate-300 transition-colors">
      &larr; {{ t('nav.back_home') }}
    </NuxtLink>
    <div class="flex gap-4">
      <NuxtLink to="/privacy" class="font-mono text-xs text-slate-500 hover:text-slate-300 transition-colors">
        {{ t('footer.privacy') }}
      </NuxtLink>
      <NuxtLink to="/terms" class="font-mono text-xs text-slate-500 hover:text-slate-300 transition-colors">
        {{ t('footer.terms') }}
      </NuxtLink>
    </div>
  </div>
</footer>
```

- [ ] **Step 3: Update pro.vue footer**

Same pattern as guide.vue — replace the centered footer. Keep the existing `t('nav.back_home')` text:

```html
<footer class="border-t border-void-border/30 py-8">
  <div class="section-container flex items-center justify-between">
    <NuxtLink to="/" class="font-mono text-sm text-slate-500 hover:text-slate-300 transition-colors">
      &larr; {{ t('nav.back_home') }}
    </NuxtLink>
    <div class="flex gap-4">
      <NuxtLink to="/privacy" class="font-mono text-xs text-slate-500 hover:text-slate-300 transition-colors">
        {{ t('footer.privacy') }}
      </NuxtLink>
      <NuxtLink to="/terms" class="font-mono text-xs text-slate-500 hover:text-slate-300 transition-colors">
        {{ t('footer.terms') }}
      </NuxtLink>
    </div>
  </div>
</footer>
```

- [ ] **Step 4: Update spots/[slug].vue footer**

Same pattern. Keep the existing dynamic `:to="backToMapUrl"` for the back link:

```html
<footer class="border-t border-void-border/30 py-8">
  <div class="section-container flex items-center justify-between">
    <NuxtLink :to="backToMapUrl" class="font-mono text-sm text-slate-500 hover:text-slate-300 transition-colors">
      &larr; {{ t('nav.back_map') }}
    </NuxtLink>
    <div class="flex gap-4">
      <NuxtLink to="/privacy" class="font-mono text-xs text-slate-500 hover:text-slate-300 transition-colors">
        {{ t('footer.privacy') }}
      </NuxtLink>
      <NuxtLink to="/terms" class="font-mono text-xs text-slate-500 hover:text-slate-300 transition-colors">
        {{ t('footer.terms') }}
      </NuxtLink>
    </div>
  </div>
</footer>
```

- [ ] **Step 5: Update recommend.vue footer**

Same pattern. Keep the existing "Back to map" link and the extra margin/padding classes:

```html
<footer class="border-t border-void-border/30 py-8 mt-12 sm:mb-0 mb-16">
  <div class="section-container flex items-center justify-between">
    <NuxtLink to="/map" class="font-mono text-sm text-slate-500 hover:text-slate-300 transition-colors">
      &larr; Back to map
    </NuxtLink>
    <div class="flex gap-4">
      <NuxtLink to="/privacy" class="font-mono text-xs text-slate-500 hover:text-slate-300 transition-colors">
        Privacy
      </NuxtLink>
      <NuxtLink to="/terms" class="font-mono text-xs text-slate-500 hover:text-slate-300 transition-colors">
        Terms
      </NuxtLink>
    </div>
  </div>
</footer>
```

Note: recommend.vue uses hardcoded English strings (not i18n) for "Back to map" — keep that pattern for the Privacy/Terms links too to stay consistent with the file.

- [ ] **Step 6: Verify all footers**

Run: `npx nuxi dev` and check each page:
- `/` — Privacy + Terms links visible in footer meta section
- `/guide` — Back home left, Privacy + Terms right
- `/pro` — Back home left, Privacy + Terms right
- `/privacy` — Back home left, Terms right
- `/terms` — Back home left, Privacy right
- `/spots/reykjavik` (or any valid spot slug) — Back to map left, Privacy + Terms right
- `/recommend` — Back to map left, Privacy + Terms right
- `/map` — No footer (full-screen map, unchanged)

- [ ] **Step 7: Commit**

```bash
git add app/pages/index.vue app/pages/guide.vue app/pages/pro.vue app/pages/spots/\[slug\].vue app/pages/recommend.vue
git commit -m "feat: add Privacy and Terms links to all page footers"
```

---

### Task 7: Add withdrawal waiver checkbox to Pro page

**Files:**
- Modify: `app/pages/pro.vue`

Add a mandatory checkbox between the email input and the checkout button. The checkout button must be disabled until the checkbox is ticked.

- [ ] **Step 1: Add checkbox state to script setup**

In `app/pages/pro.vue`, add after the `checkoutError` ref (around line 56):

```typescript
const waiverAccepted = ref(false)
```

- [ ] **Step 2: Update handleCheckout to check waiver**

Add at the start of the `handleCheckout` function, before the email validation:

```typescript
if (!waiverAccepted.value) {
  checkoutError.value = 'Please accept the terms before proceeding.'
  return
}
```

- [ ] **Step 3: Add checkbox UI**

In the template, after the email input `<div class="max-w-sm mx-auto mb-4">` block and before the `<!-- Error -->` comment, add:

Use the `<i18n-t>` component (from vue-i18n) to interpolate NuxtLink components into the translated string. Use the `path` attribute (not `keypath`, which is deprecated in vue-i18n v10+).

Note: `<i18n-t>` has not been used elsewhere in this project. It should be auto-imported by `@nuxtjs/i18n`, but if it is not resolved at runtime, add `import { Translation as i18nT } from 'vue-i18n'` and register it as a component, or use `resolveComponent('i18n-t')`.

```html
<!-- Withdrawal waiver checkbox -->
<div class="max-w-sm mx-auto mb-4 text-left">
  <label class="flex items-start gap-2.5 cursor-pointer">
    <input
      v-model="waiverAccepted"
      type="checkbox"
      class="mt-1 shrink-0 accent-corona"
    >
    <span class="text-xs text-slate-400 leading-relaxed">
      <i18n-t path="pro.withdrawal_waiver" tag="span">
        <template #terms_link>
          <NuxtLink to="/terms" class="text-corona hover:text-corona-bright transition-colors">
            {{ t('pro.terms_link_text') }}
          </NuxtLink>
        </template>
        <template #privacy_link>
          <NuxtLink to="/privacy" class="text-corona hover:text-corona-bright transition-colors">
            {{ t('pro.privacy_link_text') }}
          </NuxtLink>
        </template>
      </i18n-t>
    </span>
  </label>
</div>
```

- [ ] **Step 4: Disable checkout button when waiver unchecked**

Update the checkout button's `:disabled` binding:

```html
<!-- Before -->
:disabled="checkoutSubmitting"

<!-- After -->
:disabled="checkoutSubmitting || !waiverAccepted"
```

Also add a visual cue — when `!waiverAccepted && !checkoutSubmitting`, the button should look dimmed. The existing `disabled:opacity-50 disabled:cursor-not-allowed` classes already handle this.

- [ ] **Step 5: Verify the checkout flow**

Run: `npx nuxi dev` and navigate to `http://localhost:3000/pro`

Test:
1. Checkout button should be disabled (dimmed) by default
2. Enter email, click checkout without checking box → error message appears
3. Check the waiver checkbox → button becomes active
4. Links in waiver text should navigate to `/terms` and `/privacy`

- [ ] **Step 6: Commit**

```bash
git add app/pages/pro.vue
git commit -m "feat: add EU withdrawal waiver checkbox to Pro checkout"
```

---

### Task 8: Final verification

No file changes. Verify everything works together.

- [ ] **Step 1: Full flow test**

Run: `npx nuxi dev`

1. Open `http://localhost:3000` in an incognito/private window
2. Cookie consent banner appears at bottom
3. Click "Essential only" → banner disappears, no Umami in network tab
4. Navigate to `/privacy` → all 9 sections render, tables readable, Terms link in footer works
5. Navigate to `/terms` → all 11 sections render, safety disclaimer banner visible, Privacy link in footer works
6. Navigate to `/pro` → waiver checkbox visible, checkout button disabled until checked, links in waiver text work
7. Navigate to `/guide` → Privacy + Terms in footer
8. Navigate to `/map` → no footer (full-screen map), cookie banner does NOT overlap map controls
9. Clear localStorage, reload → cookie banner reappears
10. Click "Accept all" → Umami script appears in network tab

- [ ] **Step 2: Build check**

Run: `npx nuxi build`
Expected: Build succeeds with no errors. Both `/privacy` and `/terms` are prerendered.

---

## Known Follow-ups (Out of Scope)

- **"Manage cookies" footer link**: Per EDPB guidelines, withdrawing consent should be as easy as giving it. Plan to add a small "Cookies" link in the footer that clears `eclipsechase-consent` from localStorage and re-shows the banner. Target: before launch.
- **map.vue legal links**: The full-screen map has no footer. Consider adding Privacy/Terms links in a map overlay or settings panel in a future iteration. The spec lists map.vue as a footer update target but this was intentionally skipped — the map layout would break with a traditional footer.
