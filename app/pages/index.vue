<script setup lang="ts">
import { safeJsonLd } from '~/utils/jsonLd'
import { canonicalize } from '~/utils/eclipse'
import type { HorizonProfileData } from '~/types/horizon'
// Bundled at build time — ~10 KB, two pre-computed horizon profiles
// (Ísafjörður roadside vs Búðir Black Church). Importing it directly
// instead of fetching avoids the dev SSR 404 (Nuxt's server-side fetcher
// can't resolve /public/ assets) and ships the data in the page chunk so
// the chart renders in initial HTML.
import horizonComparisonRaw from '~/assets/eclipse/horizon-comparison.json'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const siteUrl = useRuntimeConfig().public.siteUrl as string

// Locale-aware canonical for the landing page. `prefix_except_default`:
// EN lives at `/`, IS at `/is`. canonicalize() applies the trailing-slash
// convention so the tag matches what Vercel serves (and the sitemap).
// The home page was the one route that declared no canonical at all —
// GSC's URL Inspection reported "User-declared canonical: None" for `/`.
const homeUrl = computed(() =>
  canonicalize(locale.value === 'en' ? siteUrl : `${siteUrl}/${locale.value}`),
)
// Absolute per-locale home URLs for the reciprocal hreflang set. Same on
// both `/` and `/is/`, so each locale points at itself + its sibling, with
// x-default → EN.
const homeUrlEn = canonicalize(siteUrl)
const homeUrlIs = canonicalize(`${siteUrl}/is`)
interface HorizonComparisonEntry {
  id: string
  lat: number
  lng: number
  profile: HorizonProfileData
}
const horizonComparisons = horizonComparisonRaw.comparisons as HorizonComparisonEntry[]
const blockedComparison = horizonComparisons.find(c => c.id === 'isafjordur-roadside') ?? null
const clearComparison = horizonComparisons.find(c => c.id === 'budir-black-church') ?? null

// defineOgImageComponent emits the og:image / twitter:image meta tags
// pointing at the Satori-rendered card. Social crawlers and Google Rich
// Results read from those meta tags — we deliberately don't duplicate
// the URL into JSON-LD because the v6 URL scheme is content-addressed
// (/_og/s/{encoded-params}.png) and would drift if props change.
defineOgImageComponent('Default', {
  label: 'AUGUST 12, 2026',
  title: 'Find Clear Skies on Eclipse Day',
  subtitle: 'Real-time weather and 24+ curated viewing spots for the total solar eclipse over western Iceland.',
})

useHead(() => ({
  title: t('meta.title'),
  titleTemplate: '%s',
  meta: [
    { name: 'description', content: t('meta.description') },
    { property: 'og:url', content: homeUrl.value },
  ],
  link: [
    { rel: 'canonical', href: homeUrl.value },
    { rel: 'alternate', hreflang: 'en', href: homeUrlEn },
    { rel: 'alternate', hreflang: 'is', href: homeUrlIs },
    { rel: 'alternate', hreflang: 'x-default', href: homeUrlEn },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: safeJsonLd({
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
            '@type': 'WebApplication',
            'name': 'EclipseChase.is',
            'applicationCategory': 'TravelApplication',
            'operatingSystem': 'Web (PWA)',
            'url': siteUrl,
            'description': 'Free PWA for the August 12, 2026 total solar eclipse over Iceland. 24+ curated viewing spots with horizon checks against ÍslandsDEM terrain, real-time weather, and offline maps.',
            'offers': {
              '@type': 'Offer',
              'price': '0.00',
              'priceCurrency': 'EUR',
              'description': 'Free core features',
            },
          },
          {
            '@type': 'Event',
            'name': 'Total Solar Eclipse in Iceland 2026',
            'startDate': '2026-08-12T17:43:00+00:00',
            'endDate': '2026-08-12T17:48:00+00:00',
            'eventAttendanceMode': 'https://schema.org/OfflineEventAttendanceMode',
            'eventStatus': 'https://schema.org/EventScheduled',
            // 1200x630 OG card emitted by nuxt-og-image for the home
            // route, mirroring the og:image meta. The hash in the URL
            // is derived from the defineOgImageComponent props above
            // (label/title/subtitle); if those copy strings change the
            // hash rotates and this URL needs to follow. Closes the
            // GSC "Missing field 'image'" Event rich-result hint
            // without inventing eclipse photography we don't own.
            'image': [`${siteUrl}/_og/s/o_pqal64.png`],
            'location': {
              '@type': 'Place',
              'name': 'Western Iceland',
              'geo': { '@type': 'GeoCoordinates', 'latitude': 64.15, 'longitude': -21.94 },
              'address': { '@type': 'PostalAddress', 'addressCountry': 'IS', 'addressRegion': 'Western Iceland' },
            },
            'description': 'Total solar eclipse visible from Western Iceland. Maximum totality duration 2m 18s. Path crosses Westfjords, Snæfellsnes, and Reykjanes.',
            'url': siteUrl,
            // Google's Event rich-result spec requires an Offer to
            // surface "free" in Search; price 0 honestly represents
            // viewing a public celestial event. `performer` is omitted
            // by design — a natural event has none, and faking one
            // would be schema spam.
            'offers': {
              '@type': 'Offer',
              'url': siteUrl,
              'price': '0',
              'priceCurrency': 'EUR',
              'availability': 'https://schema.org/InStock',
              'validFrom': '2026-01-01T00:00:00+00:00',
            },
            'organizer': { '@type': 'Organization', 'name': 'EclipseChase.is', 'url': siteUrl },
          },
        ],
      }),
    },
  ],
}))

// The "do I need an account?" entry was dropped 2026-08-13 — it was
// framed entirely around the Pro purchase flow, which no longer exists.
// The rest still answer real questions about the archived data.
const faqItems = computed(() => [
  { q: t('v0.home.faq_q_offline'), a: t('v0.home.faq_a_offline') },
  { q: t('v0.home.faq_q_accuracy'), a: t('v0.home.faq_a_accuracy') },
  { q: t('v0.home.faq_q_clouds'), a: t('v0.home.faq_a_clouds') },
])
</script>

<template>
  <PageShell screen="home" width="reading">
    <div class="home-root">
      <!-- Compact hero — Starfield (dark only) + glyph + headline + countdown + tagline. -->
      <section class="home-hero" aria-label="Eclipse countdown">
        <div class="hidden dark:block">
          <Starfield />
        </div>
        <div class="home-hero-inner">
          <EclipseHero />
          <div class="home-headline-block">
            <h1 class="home-headline">{{ t('v0.home.headline') }}</h1>
            <p class="home-subhead">{{ t('v0.home.subhead') }}</p>
          </div>
          <CountdownBar />
          <p class="home-rarity">{{ t('v0.home.hero_rarity') }}</p>
          <p class="home-tagline">{{ t('v0.home.tagline') }}</p>
          <ul class="home-support" aria-label="What you get">
            <li>{{ t('v0.home.hero_support_1') }}</li>
            <li>{{ t('v0.home.hero_support_2') }}</li>
            <li>{{ t('v0.home.hero_support_3') }}</li>
          </ul>
          <NuxtLinkLocale to="/spots" class="btn-corona home-hero-cta">
            {{ t('v0.home.hero_cta') }}
          </NuxtLinkLocale>
        </div>
      </section>

      <!-- Utility tile grid -->
      <section class="home-section" aria-label="Quick links">
        <HomeTileGrid />
      </section>

      <!-- Dashboard preview — three phone screenshots of the live map
           (scoring / horizon / road cam). Moved high (right after the quick-
           links grid) so proof-of-value — the tool actually working — lands
           before the page argues why eclipse day is hard. Page now goes:
           hero → utility → product in action → tradeoff → methodology → offer. -->
      <section class="home-section home-dashboard" aria-labelledby="dashboard-heading">
        <p class="home-eyebrow">{{ t('v0.home.dashboard_eyebrow') }}</p>
        <h2 id="dashboard-heading" class="home-h2">{{ t('v0.home.dashboard_title') }}</h2>
        <p class="home-body">{{ t('v0.home.dashboard_body') }}</p>

        <div class="dashboard-grid">
          <figure class="dashboard-card">
            <div class="dashboard-shot">
              <img
                :src="'/landing/dashboard-1-scoring.webp'"
                :alt="t('v0.home.dashboard_scoring_alt')"
                loading="lazy"
                width="1048"
                height="2340"
              >
            </div>
            <figcaption class="dashboard-meta">
              <h3 class="dashboard-name">{{ t('v0.home.dashboard_scoring_title') }}</h3>
              <p class="dashboard-caption">{{ t('v0.home.dashboard_scoring_caption') }}</p>
            </figcaption>
          </figure>

          <figure class="dashboard-card">
            <div class="dashboard-shot">
              <img
                :src="'/landing/dashboard-2-horizon.webp'"
                :alt="t('v0.home.dashboard_horizon_alt')"
                loading="lazy"
                width="1048"
                height="2340"
              >
            </div>
            <figcaption class="dashboard-meta">
              <h3 class="dashboard-name">{{ t('v0.home.dashboard_horizon_title') }}</h3>
              <p class="dashboard-caption">{{ t('v0.home.dashboard_horizon_caption') }}</p>
            </figcaption>
          </figure>

          <figure class="dashboard-card">
            <div class="dashboard-shot">
              <img
                :src="'/landing/dashboard-3-roadcam.webp'"
                :alt="t('v0.home.dashboard_roadcam_alt')"
                loading="lazy"
                width="1048"
                height="2340"
              >
            </div>
            <figcaption class="dashboard-meta">
              <h3 class="dashboard-name">{{ t('v0.home.dashboard_roadcam_title') }}</h3>
              <p class="dashboard-caption">{{ t('v0.home.dashboard_roadcam_caption') }}</p>
            </figcaption>
          </figure>
        </div>
      </section>

      <!-- The cloud-vs-totality tradeoff — planning content, not a
           conversion section. Useful to Pro users on eclipse day too, so
           it stays visible regardless of tier. -->
      <section class="home-section home-tricky" aria-labelledby="tricky-heading">
        <p class="home-eyebrow">{{ t('v0.home.tricky_eyebrow') }}</p>
        <h2 id="tricky-heading" class="home-h2">{{ t('v0.home.tricky_title') }}</h2>
        <p class="home-body">{{ t('v0.home.tricky_body') }}</p>

        <div class="tricky-grid">
          <NuxtLinkLocale
            to="/spots/ondverdarnes-svortuloft"
            class="tricky-card tricky-card-warn"
          >
            <div class="tricky-photo">
              <img
                src="/images/spots/ondverdarnes-svortuloft-hero-thumb.webp"
                alt="Svörtuloft lighthouse on black basalt cliffs at Öndverðarnes, Snæfellsnes"
                loading="lazy"
                width="600"
                height="400"
              >
              <span class="tricky-badge tricky-badge-warn">{{ t('v0.home.tricky_left_badge') }}</span>
            </div>
            <div class="tricky-text">
              <h3 class="tricky-name">{{ t('v0.home.tricky_left_name') }}</h3>
              <p class="tricky-caption">{{ t('v0.home.tricky_left_caption') }}</p>
              <span class="tricky-cta">{{ t('v0.home.tricky_left_cta') }}</span>
            </div>
          </NuxtLinkLocale>

          <NuxtLinkLocale
            to="/spots/gardur-lighthouse"
            class="tricky-card tricky-card-good"
          >
            <div class="tricky-photo">
              <img
                src="/images/spots/gardur-lighthouse-hero-thumb.webp"
                alt="Garður lighthouse at Garðskagi, northwestern tip of the Reykjanes peninsula"
                loading="lazy"
                width="600"
                height="400"
              >
              <span class="tricky-badge tricky-badge-good">{{ t('v0.home.tricky_right_badge') }}</span>
            </div>
            <div class="tricky-text">
              <h3 class="tricky-name">{{ t('v0.home.tricky_right_name') }}</h3>
              <p class="tricky-caption">{{ t('v0.home.tricky_right_caption') }}</p>
              <span class="tricky-cta">{{ t('v0.home.tricky_right_cta') }}</span>
            </div>
          </NuxtLinkLocale>
        </div>
        <p class="tricky-caveat">{{ t('v0.home.tricky_caveat') }}</p>
      </section>

      <!-- Persona re-ranker — interactive teaser for the profile-based
           recommendation engine (gated on /map + /spots). Sits between the
           cloud tradeoff and the horizon proof so the page argues in three
           beats: clouds change the best spot → YOU change the best spot →
           terrain can veto any of them. Static by design (HomePersonaRanker
           never hits live weather or the real scorer), so it stays SSR-safe
           and doesn't leak Pro scoring; the CTA routes to the free /spots
           browse. -->
      <section class="home-section home-persona" aria-labelledby="persona-heading">
        <p class="home-eyebrow">{{ t('v0.home.persona_eyebrow') }}</p>
        <h2 id="persona-heading" class="home-h2">{{ t('v0.home.persona_title') }}</h2>
        <p class="home-body">{{ t('v0.home.persona_body') }}</p>
        <HomePersonaRanker />
      </section>

      <!-- Horizon check, visualised. Sits AFTER the tricky-spot photos so
           the page goes: emotional hook (real places might fail you) →
           technical proof (here's the chart that decides). Visible to
           everyone — it's the engineering differentiator, not a free
           upsell. Two HorizonProfile charts make the data legible: the
           Ísafjörður roadside grid point (blocked) and Búðir Black
           Church (clear). -->
      <section class="home-section home-horizon" aria-labelledby="horizon-heading">
        <p class="home-eyebrow">{{ t('v0.home.horizon_eyebrow') }}</p>
        <h2 id="horizon-heading" class="home-h2">{{ t('v0.home.horizon_title') }}</h2>
        <p class="home-body">{{ t('v0.home.horizon_body') }}</p>

        <div class="horizon-grid">
          <article v-if="blockedComparison" class="horizon-card">
            <div class="horizon-meta">
              <h3 class="horizon-name">{{ t('v0.home.horizon_blocked_name') }}</h3>
              <p class="horizon-caption">{{ t('v0.home.horizon_blocked_caption') }}</p>
            </div>
            <HorizonProfile
              :data="blockedComparison.profile"
              :lat="blockedComparison.lat"
              :lng="blockedComparison.lng"
              :width="480"
              :height="280"
              :interactive="false"
            />
          </article>

          <article v-if="clearComparison" class="horizon-card">
            <div class="horizon-meta">
              <h3 class="horizon-name">{{ t('v0.home.horizon_clear_name') }}</h3>
              <p class="horizon-caption">{{ t('v0.home.horizon_clear_caption') }}</p>
            </div>
            <HorizonProfile
              :data="clearComparison.profile"
              :lat="clearComparison.lat"
              :lng="clearComparison.lng"
              :width="480"
              :height="280"
              :interactive="false"
            />
          </article>
        </div>

        <p class="horizon-note">{{ t('v0.home.horizon_note') }}</p>
      </section>

      <!-- Unique-opportunity band — fact-driven urgency. The 170-year
           scarcity is genuinely true (next Iceland totality is 2196), so it
           reinforces the data-led voice rather than reading as hype. Sits
           after the horizon proof as the emotional bridge into the offer.
           Visible to everyone — rarity applies to Pro users too — and the
           CTA points to the free /spots browse. -->
      <section class="home-section home-opportunity" aria-labelledby="opportunity-heading">
        <p class="home-eyebrow">{{ t('v0.home.opportunity_eyebrow') }}</p>
        <h2 id="opportunity-heading" class="home-h2">{{ t('v0.home.opportunity_title') }}</h2>
        <i18n-t keypath="v0.home.opportunity_body" tag="p" class="home-body">
          <template #emphasis><strong>{{ t('v0.home.opportunity_emphasis') }}</strong></template>
        </i18n-t>
        <div class="home-cta-center">
          <NuxtLinkLocale to="/spots" class="btn-corona home-opportunity-cta">
            {{ t('v0.home.opportunity_cta') }}
          </NuxtLinkLocale>
        </div>
      </section>

      <!-- FAQ — visible to everyone. -->
      <section class="home-section home-faq" aria-labelledby="faq-heading">
        <p class="home-eyebrow">{{ t('v0.home.faq_eyebrow') }}</p>
        <h2 id="faq-heading" class="home-h2">{{ t('v0.home.faq_title') }}</h2>

        <div class="faq-list">
          <details v-for="(item, i) in faqItems" :key="i" class="faq-item">
            <summary class="faq-q">{{ item.q }}</summary>
            <p class="faq-a">{{ item.a }}</p>
          </details>
        </div>
      </section>

      <!-- Eclipse updates email row. -->
      <section class="home-section home-email" aria-labelledby="email-heading">
        <h2 id="email-heading" class="home-h2-mono">{{ t('v0.home.email_title') }}</h2>
        <p class="home-email-body">{{ t('v0.home.email_body') }}</p>
        <EmailSignup compact />
      </section>

      <!-- Trust strip — relocated from under the hero so methodology doesn't
           compete with the conversion message in the first screenful. Now
           sits as a lead-in to the full Data sources breakdown. -->
      <p class="home-trust" aria-label="Data sources">
        <i18n-t keypath="v0.home.trust_strip" tag="span">
          <template #dem><strong>{{ t('v0.home.trust_strip_dem') }}</strong></template>
          <template #weather><strong>{{ t('v0.home.trust_strip_weather') }}</strong></template>
          <template #eclipse><strong>{{ t('v0.home.trust_strip_eclipse') }}</strong></template>
        </i18n-t>
      </p>

      <!-- Data sources -->
      <section class="home-section home-sources" aria-labelledby="sources-heading">
        <p class="home-eyebrow">{{ t('v0.home.sources_eyebrow') }}</p>
        <h2 id="sources-heading" class="home-h2">{{ t('v0.home.sources_title') }}</h2>

        <dl class="sources-list">
          <div class="sources-item">
            <dt class="sources-label">{{ t('v0.home.sources_terrain_label') }}</dt>
            <dd class="sources-body">{{ t('v0.home.sources_terrain_body') }}</dd>
          </div>
          <div class="sources-item">
            <dt class="sources-label">{{ t('v0.home.sources_weather_label') }}</dt>
            <dd class="sources-body">{{ t('v0.home.sources_weather_body') }}</dd>
          </div>
          <div class="sources-item">
            <dt class="sources-label">{{ t('v0.home.sources_eclipse_label') }}</dt>
            <dd class="sources-body">{{ t('v0.home.sources_eclipse_body') }}</dd>
          </div>
        </dl>
      </section>

      <!-- Footer -->
      <footer class="home-footer">
        <div class="home-footer-links">
          <NuxtLinkLocale to="/privacy">{{ t('footer.privacy') }}</NuxtLinkLocale>
          <span aria-hidden="true">·</span>
          <NuxtLinkLocale to="/terms">{{ t('footer.terms') }}</NuxtLinkLocale>
          <span aria-hidden="true">·</span>
          <NuxtLinkLocale to="/credits">{{ t('footer.credits') }}</NuxtLinkLocale>
          <span aria-hidden="true">·</span>
          <a
            href="mailto:support@eclipsechase.is?subject=EclipseChase%20issue&body=Page%3A%20%0A%0AWhat%20happened%3A%20%0A%0AExpected%3A%20"
            rel="noopener"
          >{{ t('footer.report_issue') }}</a>
        </div>
      </footer>
    </div>
  </PageShell>
</template>

<style scoped>
.home-root {
  display: flex;
  flex-direction: column;
  gap: 48px;
  padding: 0 16px 24px;
}
@media (min-width: 768px) {
  .home-root { gap: 64px; padding: 0 24px 32px; }
}

/* ── Hero ───────────────────────────────────────────────── */
.home-hero {
  position: relative;
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 0 16px;
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
.home-headline-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 600px;
  margin: 8px auto 4px;
}
.home-headline {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 28px;
  line-height: 1.15;
  font-weight: 600;
  color: rgb(var(--ink-1));
  margin: 0;
  letter-spacing: -0.01em;
}
.home-subhead {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 16px;
  line-height: 1.55;
  font-weight: 400;
  color: rgb(var(--ink-2));
  margin: 0;
}
@media (min-width: 768px) {
  .home-headline { font-size: 40px; }
  .home-subhead { font-size: 18px; }
}
.home-tagline {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
  letter-spacing: 0.18em;
  color: rgb(var(--ink-2));
  text-transform: uppercase;
  margin: 0;
}
/* Rarity microline — a plain sentence, not uppercase mono, so it reads as a
   fact rather than another label. Sits between the countdown and tagline. */
.home-rarity {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.5;
  color: rgb(var(--ink-3));
  margin: 0;
}
/* Hero value bullets — three concrete outcomes that justify the primary
   CTA. Left-aligned inside a centered, capped column so the lines stay
   scannable rather than centre-justified mush; a small accent dot marks
   each. */
.home-support {
  list-style: none;
  margin: 2px auto;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
  text-align: left;
  max-width: 400px;
}
.home-support li {
  position: relative;
  padding-left: 20px;
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.45;
  color: rgb(var(--ink-2));
}
.home-support li::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 0.55em;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgb(var(--accent));
}
@media (min-width: 768px) {
  .home-support li { font-size: 14px; }
}
.home-hero-cta {
  margin-top: 6px;
}
/* ── Trust strip ────────────────────────────────────────── */
.home-trust {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.04em;
  line-height: 1.6;
  text-align: center;
  color: rgb(var(--ink-3));
  margin: 0;
  padding: 12px 8px;
  border-top: 1px solid rgb(var(--border-subtle) / 0.3);
  border-bottom: 1px solid rgb(var(--border-subtle) / 0.3);
}
.home-trust strong {
  color: rgb(var(--ink-2));
  font-weight: 600;
}

/* ── Generic section type ───────────────────────────────── */
.home-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.home-eyebrow {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.16em;
  color: rgb(var(--ink-3));
  text-transform: uppercase;
  margin: 0;
}
.home-h2 {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 24px;
  line-height: 1.2;
  font-weight: 600;
  color: rgb(var(--ink-1));
  margin: 0;
  letter-spacing: -0.01em;
}
@media (min-width: 768px) {
  .home-h2 { font-size: 30px; }
}
.home-h2-mono {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.16em;
  color: rgb(var(--ink-3));
  text-transform: uppercase;
  margin: 0;
}
.home-body {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 15px;
  line-height: 1.6;
  color: rgb(var(--ink-2));
  margin: 0;
}
.home-cta-center {
  text-align: center;
}

/* ── Horizon comparison ─────────────────────────────────
   Breakpoint + gap mirror .tricky-grid so the two sections
   align edge-to-edge when scrolled past each other. */
.horizon-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
  margin-top: 8px;
}
@media (min-width: 640px) {
  .horizon-grid { grid-template-columns: 1fr 1fr; gap: 18px; }
}
.horizon-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 14px 12px;
  background: rgb(var(--surface) / 0.04);
  border: 1px solid rgb(var(--border-subtle) / 0.08);
  border-radius: 8px;
}
.horizon-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 2px;
}
.horizon-name {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: rgb(var(--ink-1));
  margin: 0;
  letter-spacing: -0.005em;
}
.horizon-caption {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.5;
  color: rgb(var(--ink-2));
  margin: 0;
}
.horizon-note {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  line-height: 1.6;
  color: rgb(var(--ink-3));
  margin: 6px 0 0;
  text-transform: uppercase;
}

/* ── Dashboard preview — three portrait phone screenshots.
   Mirrors .horizon-grid / .tricky-grid card chrome (surface/0.04 bg,
   border/0.08, 8 px radius) so the section reads as one design
   language with the rest of the landing. 1-col on mobile, 3-col on
   tablet+. Shots keep their portrait aspect ratio inside a darker
   inset so the phone UI breathes against the section. */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
  margin-top: 8px;
}
@media (min-width: 640px) {
  .dashboard-grid { grid-template-columns: repeat(3, 1fr); gap: 14px; }
}
@media (min-width: 768px) {
  .dashboard-grid { gap: 18px; }
}
.dashboard-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  padding: 14px 14px 12px;
  background: rgb(var(--surface) / 0.04);
  border: 1px solid rgb(var(--border-subtle) / 0.08);
  border-radius: 8px;
}
.dashboard-shot {
  background: rgb(var(--surface-raised) / 0.4);
  border-radius: 6px;
  overflow: hidden;
  aspect-ratio: 1048 / 2340;
}
.dashboard-shot img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.dashboard-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 2px;
}
.dashboard-name {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 15px;
  font-weight: 600;
  color: rgb(var(--ink-1));
  margin: 0;
  letter-spacing: -0.005em;
}
.dashboard-caption {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.5;
  color: rgb(var(--ink-2));
  margin: 0;
}

/* ── Tricky comparison ──────────────────────────────────── */
.tricky-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
  margin-top: 8px;
}
@media (min-width: 640px) {
  .tricky-grid { grid-template-columns: 1fr 1fr; gap: 18px; }
}
.tricky-caveat {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  line-height: 1.6;
  letter-spacing: 0.04em;
  color: rgb(var(--ink-3));
  margin: 14px 0 0;
}
.tricky-card {
  display: flex;
  flex-direction: column;
  background: rgb(var(--surface) / 0.04);
  border: 1px solid rgb(var(--border-subtle) / 0.08);
  border-radius: 8px;
  overflow: hidden;
  text-decoration: none;
  color: rgb(var(--ink-1));
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}
.tricky-card:hover {
  border-color: rgb(var(--border-subtle) / 0.16);
  background: rgb(var(--surface) / 0.08);
}
.tricky-card-warn:hover { border-color: rgb(var(--warn) / 0.6); }
.tricky-card-good:hover { border-color: rgb(var(--good) / 0.6); }

.tricky-photo {
  position: relative;
  aspect-ratio: 3 / 2;
  background: rgb(var(--surface-raised) / 0.4);
  overflow: hidden;
}
.tricky-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.tricky-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.12em;
  font-weight: 600;
  padding: 5px 9px;
  border-radius: 3px;
  border: 1px solid transparent;
  backdrop-filter: blur(4px);
}
.tricky-badge-warn {
  background: rgb(var(--warn) / 0.18);
  border-color: rgb(var(--warn) / 0.5);
  color: rgb(var(--warn));
}
.tricky-badge-good {
  background: rgb(var(--good) / 0.18);
  border-color: rgb(var(--good) / 0.5);
  color: rgb(var(--good));
}
.tricky-text {
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tricky-name {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 17px;
  font-weight: 600;
  color: rgb(var(--ink-1));
  margin: 0;
}
.tricky-caption {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: rgb(var(--ink-2));
  margin: 0;
}
.tricky-cta {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.12em;
  color: rgb(var(--accent));
  text-transform: uppercase;
  margin-top: 2px;
}

/* ── FAQ — mirrors guide-content details/summary so the FAQ on /
   and the FAQ inside /guide read as one design language. */
.faq-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}
.faq-item {
  background: rgb(var(--surface) / 0.04);
  border: 1px solid rgb(var(--border-subtle) / 0.08);
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 0.2s;
}
.faq-q {
  padding: 13px 16px;
  cursor: pointer;
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--ink-1));
  list-style: none;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
}
.faq-q::-webkit-details-marker { display: none; }
.faq-q::before {
  content: '+';
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 14px;
  color: rgb(var(--accent));
  opacity: 0.7;
  border: 1px solid rgb(var(--accent) / 0.3);
  border-radius: 3px;
  flex-shrink: 0;
  transition: opacity 0.2s;
}
.faq-item[open] .faq-q::before { content: '−'; opacity: 1; }
.faq-q:hover { background: rgb(var(--accent) / 0.04); }
.faq-item[open] .faq-q {
  border-bottom: 1px solid rgb(var(--border-subtle) / 0.08);
}
.faq-a {
  padding: 14px 16px;
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: rgb(var(--ink-1) / 0.85);
  margin: 0;
}

/* ── Email ──────────────────────────────────────────────── */
.home-email {
  gap: 10px;
}
.home-email-body {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.55;
  color: rgb(var(--ink-2));
  margin: 0;
}

/* ── Data sources — same chrome as guide tables / FAQ items so the
   landing reads as one design language with /guide. */
.sources-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 4px 0 0;
}
.sources-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 13px 16px;
  background: rgb(var(--surface) / 0.04);
  border: 1px solid rgb(var(--border-subtle) / 0.08);
  border-radius: 8px;
}
.sources-label {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.14em;
  color: rgb(var(--ink-1) / 0.62);
  text-transform: uppercase;
  font-weight: 500;
  margin: 0;
}
.sources-body {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.55;
  color: rgb(var(--ink-2));
  margin: 0;
}

/* ── Footer ─────────────────────────────────────────────── */
.home-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding-top: 24px;
  border-top: 1px solid rgb(var(--border-subtle) / 0.3);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  color: rgb(var(--ink-3));
}
.home-footer-links {
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}
.home-footer a {
  color: rgb(var(--ink-3));
  text-decoration: none;
}
.home-footer a:hover { color: rgb(var(--ink-1)); }
</style>
