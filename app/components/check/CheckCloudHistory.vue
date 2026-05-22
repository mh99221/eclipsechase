<script setup lang="ts">
/**
 * 10-year cloud cover bars for the checked coordinates. Uses the
 * spot-detail CloudHistogram (lean bars + legend, no grey backdrop)
 * inside the site-standard Card surface so the visual weight matches
 * the rest of /check.
 */
import Card from '~/components/ui/Card.vue'
import CloudHistogram from '~/components/spot-detail/CloudHistogram.vue'
import type { CheckResult } from '~/types/check'

const props = defineProps<{ result: CheckResult }>()

const usableYears = computed(() => {
  const cell = props.result.cloudHistory?.cell
  if (!cell || cell.total_years === 0) return null
  // CloudHistogram expects non-null cloud_cover for every entry. Filter
  // out the rare year where Open-Meteo returned a hole.
  return cell.years
    .filter((y): y is { year: number; cloud_cover: number } => y.cloud_cover != null)
})

const summary = computed(() => {
  const cell = props.result.cloudHistory?.cell
  if (!cell) return null
  return {
    avg: cell.avg_cloud_cover,
    clearYears: cell.clear_years,
    totalYears: cell.total_years,
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
  <section v-if="usableYears && usableYears.length > 0">
    <Card>
      <div class="hist-head">
        <div class="hist-title">Historical cloud cover · Aug 12</div>
        <div v-if="summary" class="hist-summary">
          <span class="hist-strong">{{ summary.clearYears }}</span>
          <span class="hist-dim">/ {{ summary.totalYears }} years clear</span>
          <span class="hist-sep">·</span>
          <span class="hist-strong">{{ summary.avg ?? '—' }}%</span>
          <span class="hist-dim">avg</span>
        </div>
      </div>
      <CloudHistogram :years="usableYears" :height="80" />
      <p class="hist-caveat">
        ERA5 reanalysis at 17:45 UTC for 2016–2025. Past years are a rough
        guide only — always check the day-of forecast before planning.
      </p>
    </Card>
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
.hist-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 4px;
}
.hist-title {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--ink-1));
}
.hist-summary {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.hist-strong {
  color: rgb(var(--ink-1));
  font-weight: 600;
}
.hist-dim {
  color: rgb(var(--ink-1) / 0.62);
}
.hist-sep {
  color: rgb(var(--ink-1) / 0.32);
  margin: 0 2px;
}
.hist-caveat {
  margin-top: 10px;
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 11.5px;
  font-style: italic;
  color: rgb(var(--ink-1) / 0.62);
  line-height: 1.5;
}
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
