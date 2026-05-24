<script setup lang="ts">
/**
 * Three-up stat strip below the result hero. Same visual language as
 * spot-detail/StatStrip but tailored to the /check shape (totality
 * duration + 10-yr cloud + horizon clearance).
 *
 * Renders a different mix depending on whether the input is inside
 * the path / has horizon data. Falls back to em-dash for missing
 * values rather than hiding cards, so the strip stays the same shape
 * across all result variants.
 */
import Card from '~/components/ui/Card.vue'
import WeatherIcon from '~/components/WeatherIcon.vue'
import type { CheckResult } from '~/types/check'
import { formatDuration } from '~/utils/eclipse'
import { cloudToStatus } from '~/utils/v0'

const { t } = useI18n()
const props = defineProps<{ result: CheckResult }>()

const totalityLabel = computed(() => {
  if (!props.result.totality.insidePath) return '—'
  const s = props.result.totality.durationSeconds
  return s != null ? formatDuration(s) : '—'
})

const cloudPct = computed(() => props.result.cloudHistory?.cell.avg_cloud_cover ?? null)
const cloudStatus = computed(() => cloudToStatus(cloudPct.value))
const cloudLabel = computed(() => cloudPct.value == null ? '—' : `${Math.round(cloudPct.value)}%`)

const horizonValue = computed(() => {
  const h = props.result.horizon
  if (h.verdict === 'unknown' || h.clearanceDegrees == null) return '—'
  return `${Math.abs(h.clearanceDegrees).toFixed(1)}°`
})
const horizonTone = computed(() => {
  const v = props.result.horizon.verdict
  if (v === 'clear') return 'good'
  if (v === 'marginal') return 'warn'
  if (v === 'risky' || v === 'blocked') return 'bad'
  return 'neutral'
})
</script>

<template>
  <div class="strip">
    <Card>
      <div class="lbl">{{ t('check.stat_totality') }}</div>
      <div class="v" data-tone="totality">{{ totalityLabel }}</div>
    </Card>
    <Card>
      <div class="lbl">{{ t('check.stat_cloud') }}</div>
      <div class="v with-icon">
        <WeatherIcon :cloud-cover="cloudPct" :size="20" />
        <span :data-status="cloudStatus">{{ cloudLabel }}</span>
      </div>
    </Card>
    <Card>
      <div class="lbl">{{ t('check.stat_horizon') }}</div>
      <div class="v" :data-tone="horizonTone">{{ horizonValue }}</div>
    </Card>
  </div>
</template>

<style scoped>
.strip {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 6px;
}
@media (max-width: 480px) {
  /* Stack to two rows on small phones so labels don't truncate. */
  .strip {
    grid-template-columns: 1fr 1fr;
  }
  .strip > :nth-child(3) {
    grid-column: 1 / -1;
  }
}
.lbl {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.17em;
  color: rgb(var(--ink-1) / 0.42);
  text-transform: uppercase;
}
.v {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 22px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  margin-top: 6px;
  letter-spacing: -0.005em;
  color: rgb(var(--ink-1));
}
.v[data-tone='totality'] { color: rgb(var(--totality)); }
.v[data-tone='good']     { color: rgb(var(--good)); }
.v[data-tone='warn']     { color: rgb(var(--warn)); }
.v[data-tone='bad']      { color: rgb(var(--bad)); }
.v.with-icon {
  display: flex;
  align-items: center;
  gap: 6px;
}
.v.with-icon span[data-status='good']     { color: rgb(var(--good)); }
.v.with-icon span[data-status='marginal'] { color: rgb(var(--warn)); }
.v.with-icon span[data-status='bad']      { color: rgb(var(--bad)); }
</style>
