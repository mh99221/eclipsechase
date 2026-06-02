<script setup lang="ts">
import { safeJsonLd } from '~/utils/jsonLd'
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
// Pro status drives whether this landing shows the conversion track
// (tricky/compare/free-FAQ) or the Pro track (status card + Pro email
// copy + filtered FAQ). The composable only runs `checkStatus` from
// pro-gate middleware on /dashboard, /map, /me — without this onMounted
// call, a returning Pro user hard-loading `/` would see the Free variant
// until they navigated to a gated route. Client-only; SSR keeps the
// Free shell so SEO crawls stay marketing-flavoured.
const { isPro, checkStatus } = useProStatus()
onMounted(() => {
  checkStatus()
})

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
            'location': {
              '@type': 'Place',
              'name': 'Western Iceland',
              'geo': { '@type': 'GeoCoordinates', 'latitude': 64.15, 'longitude': -21.94 },
              'address': { '@type': 'PostalAddress', 'addressCountry': 'IS', 'addressRegion': 'Western Iceland' },
            },
            'description': 'Total solar eclipse visible from Western Iceland. Maximum totality duration 2m 18s. Path crosses Westfjords, Snæfellsnes, and Reykjanes.',
            'url': siteUrl,
            'organizer': { '@type': 'Organization', 'name': 'EclipseChase.is', 'url': siteUrl },
          },
        ],
      }),
    },
  ],
}))

// `proHidden: true` drops the question once a visitor is a Pro user — the
// account question is framed around the purchase flow they've already
// completed, so it'd be noise to them. The other three (offline, accuracy,
// clouds) are still useful on eclipse day regardless of tier.
const faqItems = computed(() => {
  const all = [
    { q: t('v0.home.faq_q_account'), a: t('v0.home.faq_a_account'), proHidden: true },
    { q: t('v0.home.faq_q_offline'), a: t('v0.home.faq_a_offline') },
    { q: t('v0.home.faq_q_accuracy'), a: t('v0.home.faq_a_accuracy') },
    { q: t('v0.home.faq_q_clouds'), a: t('v0.home.faq_a_clouds') },
  ]
  return all.filter(item => !(isPro.value && item.proHidden))
})
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
          <NuxtLinkLocale to="/spots" class="btn-corona home-hero-cta">
            {{ t('v0.home.hero_cta') }}
          </NuxtLinkLocale>
        </div>
      </section>

      <!-- Trust strip -->
      <p class="home-trust" aria-label="Data sources">
        <i18n-t keypath="v0.home.trust_strip" tag="span">
          <template #dem><strong>{{ t('v0.home.trust_strip_dem') }}</strong></template>
          <template #weather><strong>{{ t('v0.home.trust_strip_weather') }}</strong></template>
          <template #eclipse><strong>{{ t('v0.home.trust_strip_eclipse') }}</strong></template>
        </i18n-t>
      </p>

      <!-- Utility tile grid -->
      <section class="home-section" aria-label="Quick links">
        <HomeTileGrid />
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

      <!-- Dashboard preview — three phone screenshots of the live map
           (scoring / horizon / road cam). Sits between methodology (how
           we check) and the Free vs Pro offer so the page goes:
           tradeoff → methodology → product in action → offer. -->
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

      <!-- Unique-opportunity band — fact-driven urgency. The 170-year
           scarcity is genuinely true (next Iceland totality is 2196), so it
           reinforces the data-led voice rather than reading as hype. Sits
           between the dashboard preview and the offer as the emotional
           bridge into conversion. Visible to everyone — rarity applies to
           Pro users too — and the CTA points to the free /spots browse. -->
      <section class="home-section home-opportunity" aria-labelledby="opportunity-heading">
        <p class="home-eyebrow">{{ t('v0.home.opportunity_eyebrow') }}</p>
        <h2 id="opportunity-heading" class="home-h2">{{ t('v0.home.opportunity_title') }}</h2>
        <i18n-t keypath="v0.home.opportunity_body" tag="p" class="home-body">
          <template #emphasis><strong>{{ t('v0.home.opportunity_emphasis') }}</strong></template>
        </i18n-t>
        <div>
          <NuxtLinkLocale to="/spots" class="btn-corona home-opportunity-cta">
            {{ t('v0.home.opportunity_cta') }}
          </NuxtLinkLocale>
        </div>
      </section>

      <!-- Pro status card — Pro-only. Sits where the Free-vs-Pro CTA would
           render for free users, so the page rhythm stays the same once you
           upgrade: dashboard preview → confirmation that you have it →
           email signup → data sources. Mirrors the .compare-cta surface
           but swaps the amber CTA border for --good (green) to signal an
           active/positive state, not a conversion. -->
      <section v-if="isPro" class="home-section home-pro-status" aria-labelledby="pro-status-heading">
        <div class="pro-status-card">
          <div class="pro-status-header">
            <span class="pro-status-dot" aria-hidden="true"></span>
            <p class="pro-status-eyebrow">{{ t('v0.home.pro_status_eyebrow') }}</p>
          </div>
          <h2 id="pro-status-heading" class="pro-status-title">{{ t('v0.home.pro_status_title') }}</h2>
          <p class="pro-status-body">{{ t('v0.home.pro_status_body') }}</p>
          <NuxtLinkLocale to="/map" class="btn-corona pro-status-cta">
            {{ t('v0.home.pro_status_cta') }}
          </NuxtLinkLocale>
        </div>
      </section>

      <!-- Free vs Pro comparison: non-Pro only -->
      <section v-if="!isPro" class="home-section home-compare" aria-labelledby="compare-heading">
        <p class="home-eyebrow">{{ t('v0.home.pro_compare_eyebrow') }}</p>
        <h2 id="compare-heading" class="home-h2">{{ t('v0.home.pro_compare_title') }}</h2>
        <p class="home-body">{{ t('v0.home.pro_compare_body') }}</p>

        <Card class="compare-card-landing">
          <ProCompareTable />
        </Card>

        <div class="compare-cta">
          <p class="compare-urgency">{{ t('v0.home.pro_compare_urgency') }}</p>
          <p class="compare-price">{{ t('v0.home.pro_compare_price') }}</p>
          <p class="compare-price-note">{{ t('v0.home.pro_compare_price_note') }}</p>
          <NuxtLinkLocale to="/pro" class="btn-corona mt-2">
            {{ t('v0.home.pro_compare_cta') }}
          </NuxtLinkLocale>
          <p class="compare-restore">
            <span>{{ t('v0.home.pro_compare_restore_pre') }}</span>
            <NuxtLinkLocale to="/pro#restore" class="compare-restore-link">
              {{ t('v0.home.pro_compare_restore_cta') }}
            </NuxtLinkLocale>
          </p>
        </div>
      </section>

      <!-- FAQ — visible to everyone. faqItems drops the "account" question
           for Pro users since it's framed around the purchase flow. -->
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

      <!-- Eclipse updates email row. Pro users see a service-touchpoint
           framing ("Stay in the loop", supplements push); free users see
           the original acquisition copy. The signup form itself is the
           same endpoint either way. -->
      <section class="home-section home-email" aria-labelledby="email-heading">
        <h2 id="email-heading" class="home-h2-mono">
          {{ isPro ? t('v0.home.email_title_pro') : t('v0.home.email_title') }}
        </h2>
        <p class="home-email-body">
          {{ isPro ? t('v0.home.email_body_pro') : t('v0.home.email_body') }}
        </p>
        <EmailSignup
          compact
          :submit-label="isPro ? t('v0.home.email_cta_pro') : undefined"
        />
      </section>

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

/* ── Pro status card ────────────────────────────────────────
   Same surface as .compare-cta (surface/0.04 bg, 12 px radius,
   centered text) so the Free / Pro variants of the landing read as
   the same design language. Border swaps amber → --good to signal
   active/positive state. .btn-corona reuses the established CTA
   styling so we don't fork a one-off button for one section. */
.home-pro-status {
  gap: 0;
}
.pro-status-card {
  padding: 24px 18px;
  border: 1px solid rgb(var(--good) / 0.45);
  background: rgb(var(--surface) / 0.04);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}
@media (min-width: 768px) {
  .pro-status-card { padding: 32px; }
}
.pro-status-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 2px;
}
.pro-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgb(var(--good));
  box-shadow: 0 0 8px rgb(var(--good) / 0.5);
  display: inline-block;
}
.pro-status-eyebrow {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.16em;
  color: rgb(var(--good));
  text-transform: uppercase;
  margin: 0;
  font-weight: 500;
}
.pro-status-title {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 20px;
  font-weight: 600;
  color: rgb(var(--ink-1));
  margin: 0;
  line-height: 1.25;
  letter-spacing: -0.005em;
  max-width: 28ch;
}
@media (min-width: 768px) {
  .pro-status-title { font-size: 24px; }
}
.pro-status-body {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.55;
  color: rgb(var(--ink-2));
  margin: 0;
  max-width: 48ch;
}
.pro-status-cta {
  margin-top: 10px;
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

/* ── Free vs Pro table — body shared with /pro via <ProCompareTable>.
   The landing wraps it in a Card so the soft surface/border matches
   the other landing cards. Slight top-margin gives breathing room
   under the section body copy. */
.compare-card-landing {
  margin-top: 4px;
}

/* Teaser price card on the landing. Mirrors the .price-card surface on
   /pro (surface/0.04 bg, accent/0.22 border, 12 px radius) so the two
   pricing surfaces feel like the same product family. */
.compare-cta {
  margin-top: 18px;
  padding: 24px 18px;
  border: 1px solid rgb(var(--accent) / 0.22);
  background: rgb(var(--surface) / 0.04);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}
@media (min-width: 768px) {
  .compare-cta { padding: 32px; }
}
.compare-urgency {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: rgb(var(--ink-2));
  margin: 0 0 6px;
  max-width: 420px;
}
.compare-price {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 20px;
  font-weight: 600;
  color: rgb(var(--ink-1));
  margin: 0;
}
.compare-price-note {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.5;
  color: rgb(var(--ink-2));
  margin: 0;
  max-width: 380px;
}
.compare-restore {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 12px;
  color: rgb(var(--ink-3));
  margin: 4px 0 0;
}
.compare-restore-link {
  color: rgb(var(--ink-2));
  text-decoration: underline;
  text-underline-offset: 2px;
  margin-left: 4px;
}
.compare-restore-link:hover { color: rgb(var(--ink-1)); }

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
