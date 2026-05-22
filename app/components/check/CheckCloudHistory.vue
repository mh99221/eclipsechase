<script setup lang="ts">
/**
 * 10-year cloud cover bars for the checked coordinates. Thin wrapper
 * around HistoricalWeatherChart so we keep the same visual encoding as
 * curated spots, plus a footer noting which ERA5 cell the data was
 * sampled from + distance from the user's input.
 */
import type { CheckResult, CheckResultCloudCell } from '~/types/check'

const props = defineProps<{ result: CheckResult }>()

// HistoricalWeatherChart expects the same structural shape as
// CheckResultCloudCell — `years[]`, `clear_years`, etc. We pass the
// cell straight through; Vue/TS will accept it via structural typing.
const history = computed<CheckResultCloudCell | null>(() => {
  const cloud = props.result.cloudHistory
  if (!cloud) return null
  return cloud.cell
})

const sampleDistanceKm = computed(() => {
  const d = props.result.cloudHistory?.sampledAt.distanceMeters
  if (d == null) return null
  return d / 1000
})

const sampleLat = computed(() => props.result.cloudHistory?.sampledAt.lat ?? null)
const sampleLng = computed(() => props.result.cloudHistory?.sampledAt.lng ?? null)
</script>

<template>
  <section v-if="history">
    <HistoricalWeatherChart :history="history" />
    <p
      v-if="sampleDistanceKm != null && sampleLat != null && sampleLng != null"
      class="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3"
    >
      Sampled from ERA5 grid cell
      {{ Math.abs(sampleLat).toFixed(2) }}°{{ sampleLat >= 0 ? 'N' : 'S' }},
      {{ Math.abs(sampleLng).toFixed(2) }}°{{ sampleLng >= 0 ? 'E' : 'W' }}
      ({{ sampleDistanceKm.toFixed(1) }} km from your input)
    </p>
  </section>
</template>
