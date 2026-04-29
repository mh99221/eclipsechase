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
import type { HorizonCheck } from '~/types/horizon'

interface SpotHistory {
  years: Array<{ year: number; cloud_cover: number }>
  clear_years?: number
  partly_years?: number
  overcast_years?: number
  total_years?: number
  avg_cloud_cover?: number
}

const props = defineProps<{
  spot: {
    lat: number
    lng: number
    slug: string
    // Optional, only consumed by ForecastNowcast for the per-spot
    // totality countdown. Falls back to path's earliest C2 if absent.
    totality_start?: string | null
    totality_duration_seconds?: number | null
  }
  history: SpotHistory | null
  // Horizon-check verdict drives the top-of-tab advisory: when terrain
  // blocks (or near-blocks) the sun at totality, the cloud forecast story
  // is misleading on its own. Optional because not every spot has been
  // scanned and the tab still works without it.
  horizonCheck?: HorizonCheck | null
}>()

const emit = defineEmits<{
  // Bubbled up to /spots/[slug].vue so the page can swap the active tab
  // when the user taps "See Sky tab" in the advisory.
  (e: 'tab-change', tab: 'overview' | 'sky' | 'weather' | 'plan'): void
}>()

const { phase, daysUntil, isPreview } = useForecastPhase()
const { isPro } = useProStatus()

// Only `risky` and `blocked` warrant interrupting with a banner. `clear`
// and `marginal` verdicts are subtle enough that the StatStrip badge
// (visible across all tabs) is a sufficient signal.
const showHorizonAdvisory = computed(() => {
  const v = props.horizonCheck?.verdict
  return v === 'risky' || v === 'blocked'
})
</script>

<template>
  <div class="forecast-section">
    <!-- Preview badge — only visible when ?asOf= is active. Production
         never sees it (the override is harmless but the badge keeps testers
         honest about what they're seeing). -->
    <PreviewBadge v-if="isPreview" :phase="phase" :days-until="daysUntil" />

    <!-- Horizon advisory pre-empts the rest of the tab when terrain
         blocks/risks the sun at totality. Cloud forecasts don't help if
         the geometry is wrong, so this needs to read first. -->
    <template v-if="showHorizonAdvisory && horizonCheck">
      <HorizonAdvisory
        :verdict="horizonCheck.verdict"
        :clearance="horizonCheck.clearance_degrees"
        @view-sky="emit('tab-change', 'sky')"
      />
      <div class="spacer-8" />
    </template>

    <PhaseNotice :phase="phase" :days-until="daysUntil" />
    <div class="spacer-8" />

    <ForecastClimatology :history="history" />
    <div class="spacer-8" />

    <!-- Phase-specific card, Pro-gated. -->
    <template v-if="isPro">
      <ForecastSubseasonal v-if="phase === 'subseasonal'" :spot="spot" />
      <ForecastExtended v-else-if="phase === 'extended'" :spot="spot" />
      <ForecastNowcast v-else-if="phase === 'nowcast'" :spot="spot" />
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
