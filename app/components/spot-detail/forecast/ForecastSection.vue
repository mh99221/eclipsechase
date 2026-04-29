<script setup lang="ts">
/**
 * Phase-aware container for the Weather tab. Owns: phase resolution, Pro
 * status check, and child-component switch. Climatology is always shown
 * (free for everyone — it's the SEO hook + free-tier teaser per spec §8).
 * The phase-specific live forecast is Pro-gated.
 *
 * In climatology phase (today, T-105) Pro users see the Reliable card too,
 * because vedur.is short-range forecast is the best available signal until
 * Open-Meteo paid kicks in July 1 — even though it's not the eclipse-day
 * forecast, the Reliable card flags that explicitly via its disclaimer.
 */
import { useForecastPhase } from '~/composables/useForecastPhase'

interface SpotHistory {
  years: Array<{ year: number; cloud_cover: number }>
  clear_years?: number
  partly_years?: number
  overcast_years?: number
  total_years?: number
  avg_cloud_cover?: number
}

defineProps<{
  spot: { lat: number; lng: number; slug: string }
  history: SpotHistory | null
}>()

const { phase, daysUntil, isPreview } = useForecastPhase()
const { isPro } = useProStatus()
</script>

<template>
  <div class="forecast-section">
    <!-- Preview badge — only visible when ?asOf= is active in dev or on a
         preview deploy with the env flag set. Production never sees it. -->
    <PreviewBadge v-if="isPreview" :phase="phase" :days-until="daysUntil" />

    <PhaseNotice :phase="phase" :days-until="daysUntil" />
    <div class="spacer-8" />

    <ForecastClimatology :history="history" />
    <div class="spacer-8" />

    <!-- Phase-specific card, Pro-gated. -->
    <template v-if="isPro">
      <ForecastSubseasonal v-if="phase === 'subseasonal'" />
      <ForecastExtended v-else-if="phase === 'extended'" />
      <ForecastNowcast v-else-if="phase === 'nowcast'" />
      <!-- Reliable phase + climatology phase fall-through both render the
           live short-range forecast. The component itself swaps in a
           "this is local conditions, not the eclipse-day forecast" line
           when the phase is climatology. -->
      <ForecastReliable v-else :spot="spot" />
    </template>
    <UpgradeForecastCard v-else :phase="phase" />
  </div>
</template>

<style scoped>
.forecast-section {
  display: contents;
}
.spacer-8 { height: 8px; }
</style>
