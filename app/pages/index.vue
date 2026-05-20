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
const { isPro } = useProStatus()

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

const faqItems = computed(() => [
  { q: t('v0.home.faq_q_account'), a: t('v0.home.faq_a_account') },
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
          <p class="home-tagline">{{ t('v0.home.tagline') }}</p>
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

      <!-- Iceland-tricky section: non-Pro only -->
      <section v-if="!isPro" class="home-section home-tricky" aria-labelledby="tricky-heading">
        <p class="home-eyebrow">{{ t('v0.home.tricky_eyebrow') }}</p>
        <h2 id="tricky-heading" class="home-h2">{{ t('v0.home.tricky_title') }}</h2>
        <p class="home-body">{{ t('v0.home.tricky_body') }}</p>

        <div class="tricky-grid">
          <NuxtLinkLocale
            to="/spots/latrabjarg-cliffs"
            class="tricky-card tricky-card-warn"
          >
            <div class="tricky-photo">
              <img
                src="/images/spots/latrabjarg-cliffs-hero-thumb.webp"
                alt="Atlantic puffin on the cliff edge at Látrabjarg, Westfjords"
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

      <!-- Free vs Pro comparison: non-Pro only -->
      <section v-if="!isPro" class="home-section home-compare" aria-labelledby="compare-heading">
        <p class="home-eyebrow">{{ t('v0.home.pro_compare_eyebrow') }}</p>
        <h2 id="compare-heading" class="home-h2">{{ t('v0.home.pro_compare_title') }}</h2>
        <p class="home-body">{{ t('v0.home.pro_compare_body') }}</p>

        <Card class="compare-card-landing">
          <ProCompareTable />
        </Card>

        <div class="compare-cta">
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

      <!-- FAQ: non-Pro only -->
      <section v-if="!isPro" class="home-section home-faq" aria-labelledby="faq-heading">
        <p class="home-eyebrow">{{ t('v0.home.faq_eyebrow') }}</p>
        <h2 id="faq-heading" class="home-h2">{{ t('v0.home.faq_title') }}</h2>

        <div class="faq-list">
          <details v-for="(item, i) in faqItems" :key="i" class="faq-item">
            <summary class="faq-q">{{ item.q }}</summary>
            <p class="faq-a">{{ item.a }}</p>
          </details>
        </div>
      </section>

      <!-- Eclipse updates email row -->
      <section class="home-section home-email" aria-labelledby="email-heading">
        <h2 id="email-heading" class="home-h2-mono">{{ t('v0.home.email_title') }}</h2>
        <p class="home-email-body">{{ t('v0.home.email_body') }}</p>
        <EmailSignup compact />
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
