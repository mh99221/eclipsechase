# Remaining Features Implementation Plan

**Status: Updated 2026-03-16**

## Completed

- [x] **Eclipse grid data** — `scripts/compute-eclipse-grid.py` + `generate-grid-fast.py`. Skyfield-computed `grid.json` with 588 points (375 in totality).
- [x] **Stripe Pro tier** — Checkout, webhook, status API, composable with localStorage persistence, pro-gate middleware (skips in dev, client-only in prod).
- [x] **Service Worker** — Cache-first tiles (5000 max), network-first API, offline fallback.
- [x] **Traffic / Road conditions** — Vegagerðin ArcGIS API with spatial filter, in-memory cache, map toggle.
- [x] **Weather cron** — Scheduled ingestion task, Vercel Cron (daily on Hobby tier).
- [x] **Guide page** — Content, MDC components (GuidePathMap, CountdownBar), redesigned to match design system.
- [x] **Pro page** — Checkout flow, redesigned to match design system.
- [x] **Spot pages SEO** — JSON-LD TouristAttraction, og meta, canonical URLs.
- [x] **Sitemap** — `@nuxtjs/sitemap` with dynamic spot URLs from Supabase.
- [x] **Internal linking** — Guide page links to specific spots per region.
- [x] **OG images** — `nuxt-og-image` with Satori template, per-page titles.
- [x] **Offline tile download** — OfflineManager component pre-warms SW cache for western Iceland zoom 5-11.
- [x] **Design system documented** — CLAUDE.md "Page Design Patterns (MUST FOLLOW)" section.
- [x] **Supabase types** — Generated `database.types.ts`, removed all `as any` casts.

## Still TODO

### High Priority (before launch)

1. **Stripe end-to-end test** — Configure `NUXT_STRIPE_SECRET_KEY` and `NUXT_STRIPE_WEBHOOK_SECRET` in Vercel env vars. Test checkout flow with Stripe test mode. Verify webhook fires and creates `pro_users` row.

2. **Vercel deployment** — Fix webhook trigger (GitHub integration may need reconnecting). Verify all env vars are set in Vercel dashboard.

3. **Email delivery pipeline** — Signups are collected in Supabase `email_signups` table but there's no way to actually email users. Options: Resend, Postmark, or Supabase Edge Functions with a mail provider.

### Medium Priority (before eclipse day)

4. **Icelandic translation** — `i18n/is.json` needs real translations for recommend, pro, and new guide content.

5. **Accurate eclipse grid** — Skyfield script has run and produced accurate data. Verify totality times against known references (e.g. NASA eclipse maps).

6. **Road camera integration** — Vegagerðin has road camera feeds. Could add camera thumbnail overlays to the map.

### Low Priority (nice-to-have)

7. **Push notifications** — Notify Pro users of weather changes on eclipse day morning.

8. **Mapbox offline tile download UI for mobile** — Current OfflineManager is desktop-only. Add mobile-friendly version.

9. **Email signup confirmation** — Double opt-in flow for GDPR compliance.

10. **Performance audit** — Lighthouse scores, Core Web Vitals, bundle size optimization.
