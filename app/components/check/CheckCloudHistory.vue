<script setup lang="ts">
/**
 * 10-year cloud cover bars for the checked coordinates. Thin wrapper
 * around HistoricalWeatherChart so we keep the same visual encoding
 * as curated spots, plus a sampling-note in the small-mono style
 * used for grid-snap callouts across the rest of the site.
 */
import type { CheckResult, CheckResultCloudCell } from '~/types/check'

const props = defineProps<{ result: CheckResult }>()

const history = computed<CheckResultCloudCell | null>(() => {
  return props.result.cloudHistory?.cell ?? null
})

const sample = computed(() => {
  const s = props.result.cloudHistory?.sampledAt
  if (!s) return null
  return {
    distanceKm: s.distanceMeters / 1000,
    lat: s.lat,
    lng: s.lng,
  }
})
</script>

<template>
  <section v-if="history">
    <HistoricalWeatherChart :history="history" />
    <p v-if="sample" class="check-sample-note">
      Sampled from ERA5 grid cell
      {{ Math.abs(sample.lat).toFixed(2) }}° {{ sample.lat >= 0 ? 'N' : 'S' }} ·
      {{ Math.abs(sample.lng).toFixed(2) }}° {{ sample.lng >= 0 ? 'E' : 'W' }}
      <span class="check-sample-divider">·</span>
      {{ sample.distanceKm.toFixed(1) }} km from your input
    </p>
  </section>
</template>

<style scoped>
.check-sample-note {
  margin-top: 10px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(var(--ink-1) / 0.42);
}
.check-sample-divider {
  margin: 0 4px;
  color: rgb(var(--ink-1) / 0.28);
}
</style>
