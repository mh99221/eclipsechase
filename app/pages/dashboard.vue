<script setup lang="ts">
import { bestRegion } from '~/utils/weather'
import { cloudLevel, regionLabel } from '~/utils/eclipse'

definePageMeta({ middleware: ['pro-gate'] })

useHead({ title: 'Dashboard' })

// Defense in depth: even with SSR off + middleware redirect, hold the
// real markup behind `isPro` so a free user navigating SPA-style can
// never glimpse the dashboard while the redirect is in flight.
const { isPro, loading: proLoading } = useProStatus()
const showContent = computed(() => isPro.value && !proLoading.value)

useCountdown()

// Weather data (lazy: render page immediately, show skeleton while loading)
const { data: cloudData, status: cloudStatus } = useLazyFetch('/api/weather/cloud-cover')
const { data: stationsData } = useLazyFetch('/api/weather/stations')

// Compute best region
const weatherBest = computed(() => {
  const stations = stationsData.value?.stations
  const cloud = cloudData.value?.cloud_cover
  if (!stations || !cloud) return null
  return bestRegion(stations, cloud)
})

const weatherLoading = computed(() => cloudStatus.value === 'pending')

const { t } = useI18n()
</script>

<template>
  <PageShell screen="home">
    <!-- Hold the real markup behind isPro so a free user can never glimpse
         dashboard content while pro-gate's redirect to /pro is in flight.
         Combined with `ssr: false` for /dashboard in nuxt.config, this
         kills the "flash of dashboard content" on hard reloads. -->
    <div v-if="showContent">
      <Eyebrow align="center" tone="accent" class="home-eyebrow">{{ t('v0.home.eyebrow') }}</Eyebrow>

      <CountdownGrid />

      <section class="conditions">
        <Eyebrow>{{ t('v0.home.best_conditions_now') }}</Eyebrow>

        <div v-if="weatherLoading" class="conditions-card is-loading" aria-busy="true">
          <div class="cell-l">
            <div class="skeleton-line w-2/5" />
            <div class="skeleton-line w-3/5" />
          </div>
        </div>

        <div v-else-if="weatherBest" class="conditions-card">
          <div class="cell-l">
            <div class="conditions-name">{{ regionLabel(weatherBest.region) }}</div>
            <div class="conditions-sub">
              {{ weatherBest.avgCloudCover }}% cloud cover · {{ cloudLevel(weatherBest.avgCloudCover).label }}
            </div>
          </div>
          <NuxtLinkLocale to="/map" class="conditions-cta">{{ t('v0.home.view_map_cta') }}</NuxtLinkLocale>
        </div>

        <div v-else class="conditions-card is-empty">
          <div class="cell-l">
            <div class="conditions-sub">Conditions unavailable.</div>
          </div>
        </div>
      </section>

      <Checklist />

      <ClientOnly><OfflineBanner /></ClientOnly>

      <AppFooter />
    </div>
  </PageShell>
</template>

<style scoped>
.home-eyebrow {
  padding: 28px 16px 18px;
  letter-spacing: 0.36em;
}

.conditions {
  padding: 0 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.conditions-card {
  background: rgb(var(--surface) / 0.04);
  border: 1px solid rgb(var(--border-subtle) / 0.08);
  border-radius: 10px;
  padding: 16px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  min-height: 64px;
}
.conditions-card.is-loading,
.conditions-card.is-empty {
  display: block;
}
.cell-l { min-width: 0; flex: 1; }

.conditions-name {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 22px;
  font-weight: 500;
  color: rgb(var(--ink-1));
}
.conditions-sub {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  color: rgb(var(--ink-1) / 0.62);
  margin-top: 4px;
}
.conditions-cta {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: rgb(var(--accent));
  letter-spacing: 0.1em;
  white-space: nowrap;
  text-decoration: none;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
}
.conditions-cta:hover { color: rgb(var(--accent-strong)); }

.skeleton-line {
  height: 12px;
  background: rgb(var(--border-subtle) / 0.16);
  border-radius: 3px;
  margin-bottom: 6px;
  animation: skel-pulse 1.4s ease-in-out infinite;
}
.skeleton-line.w-2\/5 { width: 40%; }
.skeleton-line.w-3\/5 { width: 60%; }
@keyframes skel-pulse {
  0%, 100% { opacity: 0.6; }
  50%      { opacity: 0.3; }
}
@media (prefers-reduced-motion: reduce) {
  .skeleton-line { animation: none; }
}

/* ═══════════════════════════════════════════════════
   Desktop overrides — kept at the end of the style
   block so cascade beats the base rules above.
   ═══════════════════════════════════════════════════ */
@media (min-width: 768px) {
  .home-eyebrow {
    padding: 48px 24px 24px;
    font-size: 12px;
    letter-spacing: 0.48em;
  }
  .conditions { padding: 0 24px 32px; }
  .conditions-card { padding: 20px 24px; min-height: 80px; }
  .conditions-name { font-size: 26px; }
  .conditions-cta { font-size: 13px; }
  /* legacy-updates desktop overrides handled at the rule itself, above */
}
</style>
