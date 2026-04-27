<script setup lang="ts">
import { bestRegion } from '~/utils/weather'
import { cloudLevel, regionLabel } from '~/utils/eclipse'

definePageMeta({ middleware: ['pro-gate'] })

useHead({ title: 'Dashboard' })

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

// News updates from Nuxt Content (lazy: don't block navigation)
const { data: updates, status: updatesStatus } = useLazyAsyncData('dashboard-updates', () =>
  queryContent('updates').sort({ date: -1 }).limit(5).find(),
)
const updatesLoading = computed(() => updatesStatus.value === 'pending')

const { t } = useI18n()
</script>

<template>
  <PageShell screen="home">
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
        <NuxtLink to="/map" class="conditions-cta">{{ t('v0.home.view_map_cta') }}</NuxtLink>
      </div>

      <div v-else class="conditions-card is-empty">
        <div class="cell-l">
          <div class="conditions-sub">Conditions unavailable.</div>
        </div>
      </div>
    </section>

    <Checklist />

    <!-- Legacy updates feed — preserved below the v0-spec'd content per
         the no-feature-removal constraint. TODO(v0-spec): relocate or fold
         into a dedicated /updates route. -->
    <section v-if="!updatesLoading && updates?.length" class="legacy-updates">
      <Eyebrow>LATEST UPDATES</Eyebrow>
      <ul class="updates-list">
        <li v-for="post in updates" :key="post._path" class="update-row">
          <NuxtLink :to="post._path" class="update-link">
            <span class="update-date">{{ post.date }}</span>
            <span class="update-title">{{ post.title }}</span>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <ClientOnly><OfflineBanner /></ClientOnly>
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

.legacy-updates {
  padding: 8px 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-top: 1px solid rgb(var(--border-subtle) / 0.08);
  margin-top: 8px;
  padding-top: 24px;
}
.updates-list {
  list-style: none;
  margin: 0;
  padding: 0;
  background: rgb(var(--surface) / 0.04);
  border: 1px solid rgb(var(--border-subtle) / 0.08);
  border-radius: 10px;
  overflow: hidden;
}
.update-row + .update-row {
  border-top: 1px solid rgb(var(--border-subtle) / 0.08);
}
.update-link {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 12px 18px;
  text-decoration: none;
  color: inherit;
  min-height: 44px;
}
.update-date {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.1em;
  color: rgb(var(--ink-1) / 0.42);
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}
.update-title {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 14px;
  color: rgb(var(--ink-1));
}
</style>
