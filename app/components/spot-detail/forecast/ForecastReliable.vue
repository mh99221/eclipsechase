<script setup lang="ts">
import { useNearestStation } from '~/composables/useNearestStation'
import { useForecastPhase } from '~/composables/useForecastPhase'
import { cloudColor, cloudLevel } from '~/utils/eclipse'

interface ForecastSlot {
  valid_time: string
  cloud_cover: number | null
  precip_prob?: number | null
}

interface ForecastStation {
  id: string
  name: string
  lat: number
  lng: number
  region: string | null
  forecasts: ForecastSlot[]
}

interface ForecastResponse {
  stations: ForecastStation[]
  hours: number
  stale: boolean
  fetched_at: string
}

const props = defineProps<{
  spot: { lat: number; lng: number; slug: string }
}>()

const { t } = useI18n()
const { phase } = useForecastPhase()

// Resolve nearest station for this spot (drives both attribution and the
// filter into forecast-timeline's grouped response).
const { nearest } = useNearestStation(
  () => props.spot.lat,
  () => props.spot.lng,
)

// Lazy + client-only — same pattern as the other lazy fetches on the spot
// detail page so the critical path isn't blocked. forecast-timeline is
// already cron-fed, so it's a fast Supabase read.
const { data: forecastData, pending } = useFetch<ForecastResponse>(
  '/api/weather/forecast-timeline?hours=48',
  { lazy: true, server: false, key: 'forecast-48h' },
)

const stationForecasts = computed(() => {
  if (!forecastData.value || !nearest.value) return null
  return (
    forecastData.value.stations.find(s => s.id === nearest.value!.id) ?? null
  )
})

// "Now" = first forecast slot. Vedur's HARMONIE updates 4×/day with
// 3-hourly steps, so "now" is at most ~90 min stale even when fresh.
const nowSlot = computed<ForecastSlot | null>(
  () => stationForecasts.value?.forecasts[0] ?? null,
)
const nowCloud = computed(() => nowSlot.value?.cloud_cover ?? null)
const nowLabel = computed(() => cloudLevel(nowCloud.value).label)
const nowColor = computed(() => cloudColor(nowCloud.value))

const stale = computed(() => forecastData.value?.stale ?? false)
const hasData = computed(
  () => (stationForecasts.value?.forecasts.length ?? 0) > 0,
)

// In climatology phase, the 48 h timeline is for THIS WEEK, not Aug 12 —
// label it that way so users don't conflate it with the eclipse forecast.
// At T-7 onward, the timeline starts overlapping the eclipse window so
// the disclaimer drops.
const showClimatologyDisclaimer = computed(() => phase.value === 'climatology')
</script>

<template>
  <Card>
    <CardTitle>{{ t('v0.forecast.reliable_title') }}</CardTitle>

    <!-- Loading skeleton — single line, matches the .now-strip layout
         below to avoid layout jumps when data arrives. -->
    <div v-if="pending && !forecastData" class="reliable-loading" aria-busy="true">
      {{ t('v0.forecast.reliable_loading') }}
    </div>

    <template v-else-if="hasData">
      <!-- Now strip: a single big number for the cloud cover at the
           nearest station "right now" (= first forecast slot). The
           coloured dot mirrors the histogram's banding so users can scan
           between the two cards. -->
      <div class="now-strip">
        <span class="now-dot" :style="{ background: nowColor }" />
        <div class="now-stack">
          <div class="now-value">
            <template v-if="nowCloud != null">
              {{ nowCloud }}<span class="now-unit">%</span>
            </template>
            <template v-else>—</template>
          </div>
          <div class="now-label">{{ nowLabel }}</div>
        </div>
        <div class="now-meta">
          <div class="now-meta-eyebrow">{{ t('v0.forecast.reliable_now') }}</div>
          <div v-if="stale" class="now-stale">{{ t('v0.forecast.reliable_stale') }}</div>
        </div>
      </div>

      <!-- Sub-card eyebrow that re-frames the timeline for the current
           phase. In climatology phase this is "next 48 h at this spot —
           NOT an eclipse-day forecast"; in reliable/nowcast phase the
           same timeline overlaps the actual eclipse window. -->
      <div class="next-section">
        <div class="next-eyebrow">
          {{ t('v0.forecast.reliable_next_label') }}
          <span v-if="showClimatologyDisclaimer" class="next-disclaimer">
            · {{ t('v0.forecast.reliable_climatology_disclaimer') }}
          </span>
        </div>
        <ForecastTimeline :forecasts="stationForecasts!.forecasts" />
      </div>

      <p class="reliable-attribution">
        {{ t('v0.forecast.reliable_attribution', { station: stationForecasts!.name }) }}
      </p>
    </template>

    <div v-else class="reliable-missing">
      {{ t('v0.forecast.reliable_missing') }}
    </div>
  </Card>
</template>

<style scoped>
.reliable-loading,
.reliable-missing {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  color: rgb(var(--ink-1) / 0.42);
  padding: 8px 0;
}

/* Now strip: dot + value + label, with the eyebrow stacked on the right. */
.now-strip {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 14px;
  padding: 4px 0 14px;
  border-bottom: 1px solid rgb(var(--border-subtle) / 0.08);
  margin-bottom: 14px;
}
.now-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  /* Slight halo so the dot reads against any surface tint. */
  box-shadow: 0 0 0 3px rgb(var(--surface) / 0.04);
}
.now-stack { line-height: 1; }
.now-value {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 24px;
  font-weight: 700;
  color: rgb(var(--ink-1));
  font-variant-numeric: tabular-nums;
}
.now-unit {
  font-size: 13px;
  font-weight: 500;
  color: rgb(var(--ink-1) / 0.42);
  margin-left: 1px;
}
.now-label {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 12px;
  color: rgb(var(--ink-1) / 0.62);
  margin-top: 4px;
}
.now-meta {
  text-align: right;
}
.now-meta-eyebrow {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--ink-1) / 0.42);
}
.now-stale {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(var(--warn));
  margin-top: 4px;
}

.next-section { margin-bottom: 14px; }
.next-eyebrow {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--ink-1) / 0.62);
  margin-bottom: 8px;
}
/* Sentence-case hint sits in the same row but reads as a description,
   not part of the eyebrow label. Counter the parent's uppercase. */
.next-disclaimer {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 11px;
  letter-spacing: 0;
  text-transform: none;
  color: rgb(var(--ink-1) / 0.45);
}
.next-disclaimer {
  text-transform: none;
  letter-spacing: 0;
  color: rgb(var(--ink-1) / 0.42);
}

.reliable-attribution {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9.5px;
  letter-spacing: 0.08em;
  color: rgb(var(--ink-1) / 0.42);
  margin: 0;
  line-height: 1.5;
}
</style>
