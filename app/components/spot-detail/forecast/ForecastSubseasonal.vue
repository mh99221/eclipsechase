<script setup lang="ts">
/**
 * Sub-seasonal outlook (T-30 → T-15). Pulls Open-Meteo's 46-day six-hourly
 * ECMWF IFS04 forecast at the spot's lat/lng.
 *
 * The spec calls for "weekly probability bands" but Open-Meteo's free
 * tier only ships deterministic values — ensemble spread requires the
 * Standard Plan. So this card renders the single deterministic Aug 12
 * value (when the 46-day horizon reaches it, T-46 onward in real life)
 * with a footnote noting that probability bands light up on paid tier.
 *
 * Today (T-105), the 46-day horizon ends mid-June — way before Aug 12.
 * Card renders a "horizon doesn't yet reach Aug 12" line plus a sample
 * from the latest available slot so preview/dev mode has something to
 * show. No cloud_cover_low/mid/high either — the EC46 endpoint only
 * gives total cloud.
 */
import { useOpenMeteoForecast } from '~/composables/useOpenMeteoForecast'
import { cloudColor, cloudLevel } from '~/utils/eclipse'

const props = defineProps<{
  spot: { lat: number; lng: number; slug: string }
}>()

const { t } = useI18n()

const { data: forecast, pending } = useOpenMeteoForecast(
  () => props.spot.lat,
  () => props.spot.lng,
  'ec46',
)

const totality = computed(() => forecast.value?.totality_slot ?? null)
const latest = computed(() => forecast.value?.latest_slot ?? null)
const horizonEnd = computed(() => forecast.value?.horizon_end ?? null)

const targetDate = computed(() => formatShortDate('2026-08-12T17:00:00Z'))
const horizonEndShort = computed(() =>
  horizonEnd.value ? formatShortDate(horizonEnd.value) : null,
)
const latestShort = computed(() =>
  latest.value ? formatShortDate(latest.value.valid_time) : null,
)

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

const totalLabel = computed(() =>
  totality.value ? t(cloudLevel(totality.value.cloud_cover).labelKey) : null,
)
const totalColor = computed(() =>
  totality.value ? cloudColor(totality.value.cloud_cover) : null,
)
</script>

<template>
  <Card>
    <CardTitle>{{ t('v0.forecast.subseasonal_title') }}</CardTitle>

    <div v-if="pending && !forecast" class="sub-loading" aria-busy="true">
      {{ t('v0.forecast.subseasonal_loading') }}
    </div>

    <template v-else-if="totality">
      <div class="sub-target">
        <span class="sub-target-label">{{ t('v0.forecast.subseasonal_target') }}</span>
        <span class="sub-target-date">{{ targetDate }} · ~17:00 UTC</span>
      </div>

      <!-- Single deterministic headline. The "± confidence band requires
           Pro+paid-tier" note immediately below sets expectations: this is
           a sub-seasonal point estimate, not a probability. -->
      <div class="sub-headline">
        <span class="sub-dot" :style="{ background: totalColor ?? 'transparent' }" />
        <div>
          <div class="sub-value">
            <template v-if="totality.cloud_cover != null">
              {{ Math.round(totality.cloud_cover) }}<span class="sub-unit">%</span>
            </template>
            <template v-else>—</template>
          </div>
          <div class="sub-band">{{ totalLabel }}</div>
        </div>
        <div class="sub-eyebrow">{{ t('v0.forecast.subseasonal_total_eyebrow') }}</div>
      </div>

      <p class="sub-confidence">{{ t('v0.forecast.subseasonal_confidence') }}</p>
      <p class="sub-attribution">{{ t('v0.forecast.openmeteo_attribution') }}</p>
    </template>

    <template v-else-if="forecast">
      <div class="sub-horizon">
        <p class="sub-horizon-line">
          {{ t('v0.forecast.subseasonal_horizon_too_short', {
            horizon: horizonEndShort ?? '—',
            target: targetDate,
          }) }}
        </p>
        <div v-if="latest" class="sub-sample">
          <div class="sub-sample-eyebrow">
            {{ t('v0.forecast.subseasonal_sample_eyebrow', { date: latestShort ?? '—' }) }}
          </div>
          <div class="sub-sample-row">
            <template v-if="latest.cloud_cover != null">
              <span class="sub-sample-pct">{{ Math.round(latest.cloud_cover) }}%</span>
              <span class="sub-sample-band">{{ t(cloudLevel(latest.cloud_cover).labelKey) }}</span>
            </template>
            <template v-else>
              <span class="sub-sample-pct">—</span>
            </template>
          </div>
          <p class="sub-sample-disclaimer">{{ t('v0.forecast.subseasonal_sample_disclaimer') }}</p>
        </div>
      </div>
      <p class="sub-attribution">{{ t('v0.forecast.openmeteo_attribution') }}</p>
    </template>

    <div v-else class="sub-error">
      {{ t('v0.forecast.subseasonal_error') }}
    </div>
  </Card>
</template>

<style scoped>
.sub-loading,
.sub-error {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  color: rgb(var(--ink-1) / 0.42);
  padding: 8px 0;
}

.sub-target {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgb(var(--border-subtle) / 0.08);
  margin-bottom: 14px;
}
.sub-target-label {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--ink-1) / 0.42);
}
.sub-target-date {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: rgb(var(--ink-1));
}

.sub-headline {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgb(var(--border-subtle) / 0.08);
  margin-bottom: 14px;
}
.sub-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 3px rgb(var(--surface) / 0.04);
}
.sub-value {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 24px;
  font-weight: 700;
  color: rgb(var(--ink-1));
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.sub-unit {
  font-size: 13px;
  font-weight: 500;
  color: rgb(var(--ink-1) / 0.42);
  margin-left: 1px;
}
.sub-band {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 12px;
  color: rgb(var(--ink-1) / 0.62);
  margin-top: 4px;
}
.sub-eyebrow {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--ink-1) / 0.42);
  text-align: right;
}

.sub-confidence,
.sub-attribution {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9.5px;
  letter-spacing: 0.08em;
  color: rgb(var(--ink-1) / 0.42);
  margin: 0;
  line-height: 1.5;
}
.sub-confidence { margin-bottom: 6px; }

.sub-horizon {
  padding: 4px 0 14px;
}
.sub-horizon-line {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.5;
  color: rgb(var(--ink-1) / 0.78);
  margin: 0 0 14px;
}
.sub-sample {
  border-top: 1px solid rgb(var(--border-subtle) / 0.08);
  padding-top: 12px;
}
.sub-sample-eyebrow {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--ink-1) / 0.42);
  margin-bottom: 6px;
}
.sub-sample-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.sub-sample-pct {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: rgb(var(--ink-1));
  font-variant-numeric: tabular-nums;
}
.sub-sample-band {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 12px;
  color: rgb(var(--ink-1) / 0.62);
}
.sub-sample-disclaimer {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 11px;
  font-style: italic;
  color: rgb(var(--ink-1) / 0.42);
  margin: 6px 0 0;
}
</style>
