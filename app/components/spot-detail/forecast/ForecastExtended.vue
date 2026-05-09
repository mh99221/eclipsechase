<script setup lang="ts">
/**
 * Extended-deterministic forecast (T-15 → T-7). Pulls Open-Meteo's 16-day
 * ECMWF IFS HRES forecast at the spot's lat/lng via the server proxy.
 *
 * Behaviour:
 * - When the 16-day horizon reaches Aug 12 (T-15 onward in real life,
 *   simulated via ?asOf= preview), render the totality-hour slot with
 *   total cloud cover, low/mid/high split (matters because high cirrus
 *   often allows viewing while low/mid do not, per spec §7), wind, temp,
 *   and precipitation probability. Plus a "confidence: low" note since
 *   the spec calls out that 7+-day cloud forecast skill is around 50%.
 * - Before T-15 (today, T-105), the horizon doesn't reach Aug 12 yet —
 *   render a graceful "horizon: <date>" line plus a sample from the end
 *   of the current horizon so QA-via-preview-mode users see live data.
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
  'ifs_hres',
)

const totality = computed(() => forecast.value?.totality_slot ?? null)
const latest = computed(() => forecast.value?.latest_slot ?? null)
const horizonEnd = computed(() => forecast.value?.horizon_end ?? null)

// Format dates as "Aug 12" / "May 14" — short, locale-safe (Intl uses the
// browser locale; the rest of the spot detail page is bilingual EN/IS).
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

// Total-cloud band label — same banding as the histogram + map markers.
const totalLabel = computed(() =>
  totality.value ? t(cloudLevel(totality.value.cloud_cover).labelKey) : null,
)
const totalColor = computed(() =>
  totality.value ? cloudColor(totality.value.cloud_cover) : null,
)
</script>

<template>
  <Card>
    <CardTitle>{{ t('v0.forecast.extended_title') }}</CardTitle>

    <div v-if="pending && !forecast" class="ext-loading" aria-busy="true">
      {{ t('v0.forecast.extended_loading') }}
    </div>

    <!-- Totality reachable: render full forecast for Aug 12 17:00 UTC. -->
    <template v-else-if="totality">
      <div class="ext-target">
        <span class="ext-target-label">{{ t('v0.forecast.extended_target') }}</span>
        <span class="ext-target-date">{{ targetDate }} · 17:00 UTC</span>
      </div>

      <!-- Total cloud cover headline — same big-number treatment as
           ForecastReliable's "now" strip so the two cards rhyme. -->
      <div class="ext-headline">
        <span class="ext-dot" :style="{ background: totalColor ?? 'transparent' }" />
        <div>
          <div class="ext-value">
            <template v-if="totality.cloud_cover != null">
              {{ Math.round(totality.cloud_cover) }}<span class="ext-unit">%</span>
            </template>
            <template v-else>—</template>
          </div>
          <div class="ext-band">{{ totalLabel }}</div>
        </div>
        <div class="ext-eyebrow">{{ t('v0.forecast.extended_total_eyebrow') }}</div>
      </div>

      <!-- Cloud-layer breakdown. Order: low (worst for eclipse) → mid → high
           (cirrus, often still allows viewing). The footer note flags this. -->
      <div class="ext-layers">
        <div class="ext-layers-eyebrow">{{ t('v0.forecast.extended_layers_eyebrow') }}</div>
        <div
          v-for="layer in [
            { key: 'low',  pct: totality.cloud_cover_low,  noteKey: 'extended_layer_low_note' },
            { key: 'mid',  pct: totality.cloud_cover_mid,  noteKey: 'extended_layer_mid_note' },
            { key: 'high', pct: totality.cloud_cover_high, noteKey: 'extended_layer_high_note' },
          ]"
          :key="layer.key"
          class="ext-layer-row"
        >
          <span class="ext-layer-label">{{ t(`v0.forecast.extended_layer_${layer.key}`) }}</span>
          <span class="ext-layer-bar">
            <span
              class="ext-layer-fill"
              :data-layer="layer.key"
              :style="{ width: `${layer.pct ?? 0}%` }"
            />
          </span>
          <span class="ext-layer-pct">
            <template v-if="layer.pct != null">{{ Math.round(layer.pct) }}%</template>
            <template v-else>—</template>
          </span>
          <span class="ext-layer-note">{{ t(`v0.forecast.${layer.noteKey}`) }}</span>
        </div>
      </div>

      <!-- Secondary stats: wind, temp, precip prob — each conditional so a
           null from upstream doesn't render "null m/s". -->
      <div class="ext-secondary">
        <div v-if="totality.wind_speed != null" class="ext-secondary-stat">
          <span class="ext-secondary-value">{{ totality.wind_speed.toFixed(1) }}<span class="ext-secondary-unit">m/s</span></span>
          <span class="ext-secondary-label">{{ t('v0.forecast.extended_wind') }}</span>
        </div>
        <div v-if="totality.temperature != null" class="ext-secondary-stat">
          <span class="ext-secondary-value">{{ Math.round(totality.temperature) }}<span class="ext-secondary-unit">°C</span></span>
          <span class="ext-secondary-label">{{ t('v0.forecast.extended_temp') }}</span>
        </div>
        <div v-if="totality.precipitation_probability != null" class="ext-secondary-stat">
          <span class="ext-secondary-value">{{ Math.round(totality.precipitation_probability) }}<span class="ext-secondary-unit">%</span></span>
          <span class="ext-secondary-label">{{ t('v0.forecast.extended_precip') }}</span>
        </div>
      </div>

      <p class="ext-confidence">{{ t('v0.forecast.extended_confidence') }}</p>
      <p class="ext-attribution">{{ t('v0.forecast.openmeteo_attribution') }}</p>
    </template>

    <!-- Totality not yet reachable. Show horizon end + (when available) a
         sample from the latest slot so preview/dev mode renders live data
         instead of an empty card. -->
    <template v-else-if="forecast">
      <div class="ext-horizon">
        <p class="ext-horizon-line">
          {{ t('v0.forecast.extended_horizon_too_short', {
            horizon: horizonEndShort ?? '—',
            target: targetDate,
          }) }}
        </p>
        <div v-if="latest" class="ext-sample">
          <div class="ext-sample-eyebrow">
            {{ t('v0.forecast.extended_sample_eyebrow', { date: latestShort ?? '—' }) }}
          </div>
          <div class="ext-sample-row">
            <template v-if="latest.cloud_cover != null">
              <span class="ext-sample-pct">{{ Math.round(latest.cloud_cover) }}%</span>
              <span class="ext-sample-band">{{ t(cloudLevel(latest.cloud_cover).labelKey) }}</span>
            </template>
            <template v-else>
              <span class="ext-sample-pct">—</span>
            </template>
          </div>
          <p class="ext-sample-disclaimer">{{ t('v0.forecast.extended_sample_disclaimer') }}</p>
        </div>
      </div>
      <p class="ext-attribution">{{ t('v0.forecast.openmeteo_attribution') }}</p>
    </template>

    <div v-else class="ext-error">
      {{ t('v0.forecast.extended_error') }}
    </div>
  </Card>
</template>

<style scoped>
.ext-loading,
.ext-error {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  color: rgb(var(--ink-1) / 0.42);
  padding: 8px 0;
}

.ext-target {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgb(var(--border-subtle) / 0.08);
  margin-bottom: 14px;
}
.ext-target-label {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--ink-1) / 0.42);
}
.ext-target-date {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: rgb(var(--ink-1));
}

/* Headline mirrors ForecastReliable's now-strip so the two cards read as
   siblings — same dot, same big number, same eyebrow on the right. */
.ext-headline {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgb(var(--border-subtle) / 0.08);
  margin-bottom: 14px;
}
.ext-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 3px rgb(var(--surface) / 0.04);
}
.ext-value {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 24px;
  font-weight: 700;
  color: rgb(var(--ink-1));
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.ext-unit {
  font-size: 13px;
  font-weight: 500;
  color: rgb(var(--ink-1) / 0.42);
  margin-left: 1px;
}
.ext-band {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 12px;
  color: rgb(var(--ink-1) / 0.62);
  margin-top: 4px;
}
.ext-eyebrow {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--ink-1) / 0.42);
  text-align: right;
}

/* Cloud-layer breakdown table. Three rows, each: label | bar | % | note.
   The bars use semantic-ish colours: low = bad (overcast blocks view),
   mid = warn, high = good (cirrus often viewable). Direct `data-layer`
   styling so the legend + bar tints stay in lockstep. */
.ext-layers {
  margin-bottom: 14px;
}
.ext-layers-eyebrow {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--ink-1) / 0.42);
  margin-bottom: 8px;
}
.ext-layer-row {
  display: grid;
  grid-template-columns: 36px 1fr 36px;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
}
.ext-layer-label {
  color: rgb(var(--ink-1) / 0.62);
  text-transform: uppercase;
  letter-spacing: 0.12em;
}
.ext-layer-bar {
  height: 8px;
  background: rgb(var(--ink-1) / 0.06);
  border-radius: 2px;
  overflow: hidden;
  position: relative;
}
.ext-layer-fill {
  display: block;
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease-out;
}
.ext-layer-fill[data-layer='low']  { background: rgb(var(--bad)); }
.ext-layer-fill[data-layer='mid']  { background: rgb(var(--warn)); }
.ext-layer-fill[data-layer='high'] { background: rgb(var(--good)); }
.ext-layer-pct {
  text-align: right;
  color: rgb(var(--ink-1) / 0.85);
  font-variant-numeric: tabular-nums;
}
.ext-layer-note {
  grid-column: 1 / -1;
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 11px;
  color: rgb(var(--ink-1) / 0.42);
  text-transform: none;
  letter-spacing: 0;
  padding-left: 44px;
  margin-top: -2px;
  margin-bottom: 4px;
}

.ext-secondary {
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
  padding-top: 4px;
  margin-bottom: 12px;
}
.ext-secondary-stat {
  display: flex;
  flex-direction: column;
}
.ext-secondary-value {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: rgb(var(--ink-1));
  font-variant-numeric: tabular-nums;
}
.ext-secondary-unit {
  font-size: 10px;
  font-weight: 500;
  color: rgb(var(--ink-1) / 0.42);
  margin-left: 3px;
}
.ext-secondary-label {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--ink-1) / 0.42);
  margin-top: 4px;
}

.ext-confidence,
.ext-attribution {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9.5px;
  letter-spacing: 0.08em;
  color: rgb(var(--ink-1) / 0.42);
  margin: 0;
  line-height: 1.5;
}
.ext-confidence { margin-bottom: 6px; }

.ext-horizon {
  padding: 4px 0 14px;
}
.ext-horizon-line {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.5;
  color: rgb(var(--ink-1) / 0.78);
  margin: 0 0 14px;
}
.ext-sample {
  border-top: 1px solid rgb(var(--border-subtle) / 0.08);
  padding-top: 12px;
}
.ext-sample-eyebrow {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--ink-1) / 0.42);
  margin-bottom: 6px;
}
.ext-sample-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.ext-sample-pct {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: rgb(var(--ink-1));
  font-variant-numeric: tabular-nums;
}
.ext-sample-band {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 12px;
  color: rgb(var(--ink-1) / 0.62);
}
.ext-sample-disclaimer {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 11px;
  font-style: italic;
  color: rgb(var(--ink-1) / 0.42);
  margin: 6px 0 0;
}
</style>
