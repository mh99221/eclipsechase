<script setup lang="ts">
/**
 * Phase-aware container for the Weather tab. Owns: phase resolution, Pro
 * status check, and child-component switch. Climatology is always shown
 * (free for everyone — it's the SEO hook + free-tier teaser per spec §8).
 * The phase-specific live forecast is Pro-gated.
 *
 * In climatology phase Pro users see the Reliable card too, because the
 * vedur.is short-range forecast is the best available signal until
 * Open-Meteo paid kicks in — even though it's not the eclipse-day
 * forecast, the Reliable card flags that explicitly via its disclaimer.
 *
 * ForecastEclipseDay sits above the phase-specific card and is the one
 * that shows the actual Aug-12 number. It is deliberately NOT phase-gated:
 * it keys off whether the data exists rather than off the calendar, since
 * vedur's horizon reaches eclipse day earlier than the phase boundaries
 * imply.
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

    <!-- RETIRED 2026-08-13: this block used to be Pro-gated (v-if="isPro"),
         with an UpgradeForecastCard shown to free users otherwise. Pro no
         longer exists — isPro() is now permanently false for everyone, so
         the gate was deleted rather than repointed. Without it this whole
         section, including the frozen eclipse-day archive, never rendered
         for any visitor. See docs/superpowers/plans/2026-08-13-eclipsechase-sunset.md. -->

    <!-- The actual Aug-12 number, shown as soon as vedur's horizon
         reaches eclipse day (which is well before the 48 h live card
         below can see it). Self-hides when that data doesn't exist
         yet, so it costs nothing in the earlier phases. -->
    <ForecastEclipseDay :spot="spot" />

    <ForecastSubseasonal v-if="phase === 'subseasonal'" :spot="spot" />
    <ForecastExtended v-else-if="phase === 'extended'" :spot="spot" />
    <ForecastNowcast v-else-if="phase === 'nowcast'" :spot="spot" />
    <!-- Reliable phase + climatology phase fall-through both render the
         live short-range forecast. The component itself swaps in a
         "this is local conditions, not the eclipse-day forecast" line
         when the phase is climatology. -->
    <ForecastReliable v-else :spot="spot" />
  </div>
</template>

<style scoped>
.forecast-section {
  display: contents;
}
.spacer-8 { height: 8px; }
</style>
