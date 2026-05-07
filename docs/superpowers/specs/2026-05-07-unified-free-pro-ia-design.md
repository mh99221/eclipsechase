# Unified IA for free + Pro users

**Date:** 2026-05-07
**Author:** brainstorming session (Martin + Claude)
**Status:** Design — pending implementation plan

## Problem

The site shipped as two disjoint experiences:

- A **marketing landing** at `/` (hero + features + email signup) with no nav chrome — only the brand mark.
- A **Pro app** behind nav chrome (`BrandBar` masthead + `BottomNav`) that's gated on `useProStatus().isPro`. See `BrandBar.vue:13` (`showMasthead = isPro && !isLanding`) and `BottomNav.vue:15` (`showNav = isPro && route.path !== '/'`).

Consequences for free / anonymous visitors:

1. After leaving `/`, they hit `/spots`, `/spots/[slug]`, or `/guide` with **no nav chrome at all** — only the brand mark renders. The only way back is browser back.
2. The marketing landing is the only entrypoint advertised, even for returning free readers who don't need pitch copy.
3. There's no single, predictable place that says "this is what free vs Pro gets you" — the upsell exists only on `/pro` and inside `<ProGate>` slot fallbacks scattered across pages.

This spec rebuilds the IA so free and Pro users share one chrome and one mental model, while preserving conversion and SEO weight on `/`.

## Strategic anchor

Free users are weighted **~70% conversion funnel / ~30% real free product**. The free utility (`/spots`, `/guide`, spot detail) is genuinely useful and should not be hostile to long-term free readers. The Pro upsell should be visible and recurring, but not bait-and-switch.

## Decisions

### D1 · Single chrome for everyone

`BrandBar` masthead + `BottomNav` render for **all** users on **all** pages, including `/`. The current `isPro` gates are removed. The current `route.path !== '/'` gate is removed.

### D2 · Four nav tabs

Tabs unchanged in number and order: **Home · Spots · Map · Guide**. `Me` stays in `NAV_ITEMS_HIDDEN` — its features (theme toggle, sign-out) already live in `BrandBar`'s right slot, and its restore-purchase form already lives on `/pro`. Adding a 5th tab for a single-event PWA shipping in 4 months is over-engineering.

The `/me` route stays alive as a deep-link target for future use (e.g. `/me?restore=…`), it's just not surfaced in nav.

### D3 · Per-tab behavior table

| Tab | Free | Pro |
|---|---|---|
| Home | `/` (hybrid) | `/dashboard` |
| Spots | `/spots` | `/spots` |
| Map | locked → opens upsell sheet | `/map` |
| Guide | `/guide` | `/guide` |

`useNavItems()` becomes Pro-aware:

- `Home`'s `to` resolves via `useProStatus().isPro` — `/` for free, `/dashboard` for Pro.
- `Map` gets `locked: true` when `!isPro`.

Consumers (`BottomNav`, `BrandBar` masthead) intercept clicks on `locked` items and open `UpsellSheet` instead of routing.

A Pro user typing `/` directly is **not** redirected. Their `BrandLogo` link remains a valid way to view the public home; their `Home` tab routes elsewhere.

### D4 · Hybrid `/` page

`/` becomes a normal `PageShell` page (chrome + content). Composition top-down on mobile, two-column where it makes sense on desktop:

1. **Compact hero** — `Starfield` stays, eclipse glyph stays, `CountdownBar` stays, one-line pitch ("Iceland · 12 Aug 2026 · find the clearest sky"). Hero collapses to ~60vh so tiles peek above the fold.
2. **Utility tile grid** (`HomeTileGrid.vue`, 4 tiles, 2×2 mobile / 1×4 desktop):
   - **Spots** → `/spots` ("Browse 30+ vetted viewing points")
   - **Guide** → `/guide` ("Plan with the long-form guide")
   - **Map** → opens upsell sheet (lock glyph, "Live weather + ranked spots")
   - **Get Pro** → `/pro` (price + 1-line value, accent border)
   For Pro users: the Get-Pro tile auto-hides; the Map tile flips locked → routed.
3. **Slim email row** — single-line `EmailSignup.vue` variant, no marketing header. Wired to existing `signup.post.ts` + `email_signups` table.
4. **Footer** — privacy / terms / credits links.

The marketing copy that exists today (multi-section feature showcase) is removed. Its value moves to:
- the 4 tiles (utility entry points),
- the upsell sheet (when locked Map is tapped),
- the `/pro` page (full pitch for users actively considering).

One less page worth of copy to maintain; returning free users get utility instead of pitch on the second visit.

### D5 · Upsell sheet

New component `UpsellSheet.vue` — single source of truth for the Pro pitch.

- **Triggered by:** tap on locked `Map` tab (BottomNav or BrandBar masthead) or tap on the locked `Map` tile on `/`.
- **Form factor:** bottom sheet on mobile, centered card on desktop (≥768px).
- **Contents:** title, 3-bullet value pitch (live cloud cover · ranked spots · road conditions + cameras), primary CTA `Get Pro · €9.99` → `/pro`, secondary `Already paid? Restore` → `/pro#restore`, dismiss via tap-outside / X / Escape.
- **Dismissal:** session-scoped via `sessionStorage` — closing the sheet once suppresses re-opens within the same session, to avoid repeat-tap nagging. Resets on next visit.

A small composable `useUpsell()` exposes `openUpsell()` / `closeUpsell()` / `isOpen` so any future call-site can trigger the sheet without prop drilling.

### D6 · Lock affordance in nav

Locked Map tab gets a small padlock dot in the upper-right corner of the icon (BottomNav) or replaces the active-state amber dot with a padlock glyph (BrandBar masthead). Label unchanged. The lock visual must be readable in both light and dark themes (use semantic `text-ink-3` for the glyph fill, no hardcoded colours).

### D7 · `BrandBar` right slot

| State | Right slot |
|---|---|
| Free, on `/pro` or `/pro/success` | (empty — already on the upsell path) |
| Free, on `/` | (empty — Get-Pro tile is in-page) |
| Free, all other pages | small `Get Pro` pill |
| Pro | existing theme toggle + sign-out cluster |
| Loading (`useProStatus().loading`) | empty placeholder |

The free `Get Pro` pill is the persistent reminder that the rest of the chrome doesn't include.

### D8 · Chrome on `/` — scroll-aware

`BrandBar` is rendered everywhere, but on `/` it starts **transparent** (no blur, no border) and **transitions to the standard backdrop-blur** once the user scrolls past the hero (~300px). Implemented as a scoped scroll listener on `BrandBar` that adds an `is-scrolled` class. Other routes skip the listener — they always render with the standard backdrop.

Preserves the cinematic feel of the current landing without dropping nav.

## Architecture

### Components

- **New** `app/components/UpsellSheet.vue` — modal/sheet, single instance mounted at `app.vue` level (so any route can open it).
- **New** `app/components/HomeTileGrid.vue` — extracted tile grid; tiles are aware of Pro status (Get-Pro tile auto-hides for Pro, Map tile flips locked → routed).
- **Updated** `app/components/BottomNav.vue` — drop the `isPro` gate. Render lock glyph for `locked` items. Intercept clicks on `locked` → call `useUpsell().openUpsell()` instead of routing.
- **Updated** `app/components/BrandBar.vue` — drop the `isPro` gate on masthead. Same lock-glyph treatment. Scroll-aware transparency on `/`. Free-side `Get Pro` pill in right slot per D7.
- **Updated** `app/components/EmailSignup.vue` — slim variant; drop the marketing copy block, keep the form. (Variant prop or just rewrite — to be decided in the implementation plan.)

### Composables

- **New** `app/composables/useUpsell.ts` — exposes `openUpsell()` / `closeUpsell()` / `isOpen`. Backed by `useState` so SSR-safe.
- **Updated** `app/composables/useNavItems.ts` — add `locked?: boolean` field on `NavItem`. Resolve `Home`'s `to` dynamically via `useProStatus`. Mark `Map` locked when `!isPro`.

### Pages

- **Rewritten** `app/pages/index.vue` — replace the marketing layout with `PageShell` + compact hero + `<HomeTileGrid>` + slim `<EmailSignup>` + footer.

### Server / data

No changes. The `/api/signup` endpoint, `email_signups` table, and the `signup.post.ts` handler stay intact for the slim email row.

### i18n

New keys under `v0.upsell.*` and `v0.home.*`. IS falls back to EN per the existing Nuxt i18n lazy fallback for the `v0.*` namespace. Any old landing-page keys that are no longer rendered after the rewrite can be left in place — removing them is an optional cleanup pass that doesn't block this spec.

## Data flow

1. Anonymous user visits `/` → SSR renders chrome + hybrid Home → `useProStatus()` resolves to `isPro=false` on the client → tiles render in free state, Map tab is locked.
2. User taps Map tab in BottomNav → `BottomNav.vue` checks `item.locked`, calls `useUpsell().openUpsell()` → `UpsellSheet` mounted at `app.vue` becomes visible.
3. User taps `Get Pro · €9.99` in sheet → routes to `/pro` → existing Stripe Checkout flow.
4. User completes purchase → `/pro/success` → existing JWT activation → `useProStatus().isPro` flips to `true` → next render: Map tab unlocks, Get-Pro tile hides, BrandBar right slot swaps to theme + sign-out cluster.

No new state machines. The chrome simply re-derives from `useProStatus().isPro` and `useNavItems()`.

## Edge cases / non-obvious behavior

- **Restore purchase on a fresh device.** A user with a token they've forgotten taps locked Map → sheet → `Already paid? Restore` → routes to `/pro#restore` → existing OTP flow → JWT issued → chrome updates.
- **Service worker offline.** `useProStatus` reads from IndexedDB, so chrome decisions remain consistent offline. Locked tabs still open the upsell sheet, which renders fine offline (no network calls until user clicks `Get Pro`).
- **Tile grid on Pro.** With `isPro=true`, the Get-Pro tile is `v-if`'d out and the grid becomes 3-up. We accept the asymmetric grid — it's intentional that the Pro Home (`/dashboard`) is a richer destination, so we don't fluff `/` for them.
- **First-time visit + immediate Pro purchase + return to `/`.** Pro user on `/` sees the rebadged tiles. No redirect. They navigate via the `Home` tab (which routes to `/dashboard`) when they want their dashboard.
- **Session-dismissed upsell sheet + tile click.** The session-dismissal flag suppresses **nav-tab** triggers only. Clicking the locked Map *tile* on `/` always opens the sheet — tiles are an explicit, in-page user action; nav taps are often habitual and warrant the suppression. `useUpsell.openUpsell({ source: 'nav' | 'tile' })` honors / ignores the flag based on `source`.

## Out of scope

Explicitly NOT in this spec:

- Push notification UX (separate workstream)
- `/pro` page redesign — only deep-linking via `#restore` is added on the consumer side
- A/B testing of upsell variants
- Analytics events on locked-tab taps — nice-to-have, separate one-line PR after this lands
- Returning `Me` tab to nav
- Email broadcast infrastructure (signup form just feeds the existing table)
- Removing the now-dead landing copy from `i18n/en.json` — optional cleanup

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Free user repeatedly taps locked Map hoping it'll work | Session-scoped dismissal + persistent lock glyph; tiles rephrase "Map" as "Live weather map" to set expectation. |
| `/`'s cinematic feel breaks with chrome on top | Transparent BrandBar until scroll threshold (D8); tune threshold during implementation if it still feels off. |
| Pro user lands on `/` and sees a non-Pro home | Tiles rebadge automatically; nav `Home` still points to `/dashboard`; no redirect needed. |
| Removing the marketing copy reduces SEO surface | The hybrid `/` keeps the same H1, hero copy, and a meta description — Google sees a leaner but still-keyword-aligned page. The 4-tile grid adds internal links to `/spots`, `/guide`, `/pro` which the old landing already did. |
| 4-tile grid becomes 3-up for Pro and looks off-balance | Acceptable — Pro Home is `/dashboard` anyway; `/` for Pro is a rare path. |

## Files touched (summary)

| File | Change | Est. size |
|---|---|---|
| `app/composables/useNavItems.ts` | Pro-aware tabs + `locked` flag | small |
| `app/composables/useUpsell.ts` | **New** | small |
| `app/components/BottomNav.vue` | Drop gate, lock glyph, click intercept | small |
| `app/components/BrandBar.vue` | Drop gate, lock glyph, scroll-aware on `/`, free Get-Pro pill | medium |
| `app/components/UpsellSheet.vue` | **New** | medium |
| `app/components/HomeTileGrid.vue` | **New** | small |
| `app/components/EmailSignup.vue` | Slim variant | small |
| `app/pages/index.vue` | Rewrite to hybrid Home | medium-large |
| `i18n/en.json`, `i18n/is.json` | New keys under `v0.upsell.*`, `v0.home.*` | small |
| `app.vue` | Mount `<UpsellSheet>` once at app root | very small |

Files **not touched:** `/dashboard`, `/spots`, `/spots/[slug]`, `/guide`, `/map`, `/me`, `/pro`, `/pro/success`, all legal pages, service worker, Pro-gate middleware, Supabase schema.

## Success criteria

1. A free user lands on `/` → sees chrome + hybrid Home → can navigate to Spots, Guide via tabs without browser-back.
2. A free user lands on `/spots/[slug]` directly (e.g. shared link) → sees full chrome → can navigate sideways and back to Home.
3. A free user taps Map → sees the upsell sheet, not a 404 or a route change to `/pro`.
4. A Pro user's experience is unchanged on `/dashboard`, `/spots`, `/map`, `/guide` — same tabs, same chrome.
5. A Pro user visiting `/` sees the hybrid Home with the Get-Pro tile hidden and the Map tile routed, and is not redirected.
6. The upsell sheet, once dismissed, doesn't reappear within the same session via the nav-tab trigger.
7. `BrandBar` on `/` is visually transparent above the fold and standard-blurred after scroll.
8. No type errors, all existing tests pass, and CI is green.
