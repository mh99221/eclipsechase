<script setup lang="ts">
/**
 * 10-year cloud cover for the checked coordinates. Wraps the
 * spot-detail ForecastClimatology component directly so the card
 * matches the Weather tab pixel-for-pixel: Card chrome, CardTitle,
 * 3-stat row (avg / clear-years / typical band), histogram, and
 * the same ERA5 attribution footer.
 *
 * The ERA5 grid cell readout (lat/lng + distance) stays as a small
 * mono caption below the card because it's /check-specific.
 */
import ForecastClimatology from '~/components/spot-detail/forecast/ForecastClimatology.vue'
import type { CheckResult } from '~/types/check'
import { formatLatLng } from '~/utils/eclipse'

const { t } = useI18n()
const props = defineProps<{ result: CheckResult }>()

// Filter to non-null years and remap into the SpotHistory shape that
// ForecastClimatology expects.
const history = computed(() => {
  const cell = props.result.cloudHistory?.cell
  if (!cell || cell.total_years === 0) return null
  return {
    years: cell.years.filter((y): y is { year: number; cloud_cover: number } => y.cloud_cover != null),
    clear_years: cell.clear_years,
    partly_years: cell.partly_years,
    overcast_years: cell.overcast_years,
    total_years: cell.total_years,
    avg_cloud_cover: cell.avg_cloud_cover ?? undefined,
  }
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
    <ForecastClimatology :history="history" />
    <p v-if="sample" class="check-sample-note">
      {{ t('check.era5_sample_note', {
        coords: formatLatLng(sample.lat, sample.lng, 2),
        distance: sample.distanceKm.toFixed(1),
      }) }}
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
