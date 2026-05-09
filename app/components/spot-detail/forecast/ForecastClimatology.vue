<script setup lang="ts">
import { cloudLevel } from '~/utils/eclipse'

interface SpotHistory {
  years: Array<{ year: number; cloud_cover: number }>
  clear_years?: number
  partly_years?: number
  overcast_years?: number
  total_years?: number
  avg_cloud_cover?: number
}

const props = defineProps<{
  history: SpotHistory | null
}>()

const { t } = useI18n()

const hasData = computed(() => (props.history?.years?.length ?? 0) > 0)
const avgLabel = computed(() =>
  props.history?.avg_cloud_cover != null
    ? t(cloudLevel(props.history.avg_cloud_cover).labelKey)
    : null,
)
</script>

<template>
  <Card>
    <CardTitle>{{ t('v0.spot_detail.card_cloud_cover') }}</CardTitle>

    <template v-if="hasData">
      <!-- Summary stat row above the histogram. Both numbers come straight
           from historical-weather.json — no derivation, no rounding. -->
      <div class="climo-summary">
        <div class="climo-stat">
          <div class="climo-stat-value">{{ history?.avg_cloud_cover }}<span class="climo-stat-unit">%</span></div>
          <div class="climo-stat-label">{{ t('v0.forecast.climatology_avg') }}</div>
        </div>
        <div class="climo-stat">
          <div class="climo-stat-value">
            {{ history?.clear_years ?? 0 }}<span class="climo-stat-unit">/{{ history?.total_years ?? 10 }}</span>
          </div>
          <div class="climo-stat-label">{{ t('v0.forecast.climatology_clear') }}</div>
        </div>
        <div v-if="avgLabel" class="climo-stat climo-stat-band">
          <div class="climo-stat-value climo-band">{{ avgLabel }}</div>
          <div class="climo-stat-label">{{ t('v0.forecast.climatology_band') }}</div>
        </div>
      </div>

      <CloudHistogram :years="history!.years" />

      <p class="climo-footer">{{ t('v0.forecast.climatology_attribution') }}</p>
    </template>

    <div v-else class="climo-missing">
      {{ t('v0.forecast.climatology_missing') }}
    </div>
  </Card>
</template>

<style scoped>
/* Three-stat row — avg cloud, clear-years count, narrative band. The band
   stat hides on very narrow viewports to avoid wrapping into a fourth
   column when the digits are wide (e.g. "Mostly clear"). */
.climo-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  padding: 4px 0 14px;
  border-bottom: 1px solid rgb(var(--border-subtle) / 0.08);
  margin-bottom: 14px;
}
@media (min-width: 380px) {
  .climo-summary { grid-template-columns: 1fr 1fr 1fr; }
}
.climo-stat-band { display: none; }
@media (min-width: 380px) {
  .climo-stat-band { display: block; }
}

.climo-stat-value {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: rgb(var(--ink-1));
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.climo-stat-value.climo-band {
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--ink-1) / 0.85);
  padding-top: 4px;
}
.climo-stat-unit {
  font-size: 12px;
  font-weight: 500;
  color: rgb(var(--ink-1) / 0.42);
  margin-left: 1px;
}
.climo-stat-label {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--ink-1) / 0.42);
  margin-top: 6px;
}

.climo-footer {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9.5px;
  letter-spacing: 0.08em;
  color: rgb(var(--ink-1) / 0.42);
  margin: 14px 0 0;
  line-height: 1.5;
}

.climo-missing {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  color: rgb(var(--ink-1) / 0.42);
  padding: 8px 0;
}
</style>
