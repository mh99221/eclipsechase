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
  <PageShell screen="home" width="reading">
    <div class="home-root">
      <!-- Compact hero — Starfield (dark only) + glyph + countdown + tagline.
           ~60vh on mobile so the tile grid peeks above the fold. -->
      <section class="home-hero" aria-label="Eclipse countdown">
        <div class="hidden dark:block">
          <Starfield />
        </div>
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
        <span aria-hidden="true">·</span>
        <a
          href="mailto:support@eclipsechase.is?subject=EclipseChase%20issue&body=Page%3A%20%0A%0AWhat%20happened%3A%20%0A%0AExpected%3A%20"
          rel="noopener"
        >{{ t('footer.report_issue') }}</a>
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
