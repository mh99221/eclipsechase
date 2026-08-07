<script setup lang="ts">
/**
 * The actual Aug-12 cloud forecast for this spot's nearest station.
 *
 * This exists because ForecastReliable only ever fetches a rolling
 * now→now+48 h window, so it structurally cannot show eclipse day until
 * we're within 2 days of it — even though vedur publishes forecast slots
 * reaching Aug 12 well before that. This card asks the cloud-cover
 * endpoint for the slot nearest the eclipse instant instead, so the
 * number people actually care about shows up as soon as it exists.
 *
 * Renders nothing at all when the endpoint reports `available: false`
 * (vedur's horizon hasn't reached Aug 12 yet). Showing an empty shell
 * would imply the data is missing for this spot specifically, when in
 * fact it doesn't exist for anywhere yet.
 */
import { useNearestStation } from '~/composables/useNearestStation'
import { cloudColor, cloudLevel } from '~/utils/eclipse'

interface CloudCoverRow {
  station_id: string
  cloud_cover: number | null
  forecast_valid_at: string | null
}

const props = defineProps<{
  spot: { lat: number; lng: number; slug: string }
}>()

const { t } = useI18n()

const { nearest } = useNearestStation(
  () => props.spot.lat,
  () => props.spot.lng,
)

// Shares a key with any other consumer of the eclipse-mode reading so a
// spot page + prefetch don't double-fetch.
const { data, pending } = useFetch<{
  cloud_cover: CloudCoverRow[]
  stale: boolean
  fetched_at: string | null
  available: boolean
}>('/api/weather/cloud-cover', {
  query: { mode: 'eclipse' },
  lazy: true,
  server: false,
  key: 'cloud-cover-eclipse',
})

const row = computed<CloudCoverRow | null>(() => {
  if (!data.value?.available || !nearest.value) return null
  return data.value.cloud_cover.find(c => c.station_id === nearest.value!.id) ?? null
})

const cloud = computed(() => row.value?.cloud_cover ?? null)
const label = computed(() => t(cloudLevel(cloud.value).labelKey))
const color = computed(() => cloudColor(cloud.value))

// Render only once we have a real number to show for this spot.
const show = computed(() => !pending.value && row.value != null && cloud.value != null)

const validForLabel = computed(() => {
  if (!row.value?.forecast_valid_at) return null
  const d = new Date(row.value.forecast_valid_at)
  if (Number.isNaN(d.getTime())) return null
  const hhmm = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
  return t('v0.forecast.eclipse_day_valid_for', { time: hhmm })
})
</script>

<template>
  <div v-if="show" class="eclipse-day-wrap">
    <Card>
      <CardTitle>{{ t('v0.forecast.eclipse_day_title') }}</CardTitle>

      <div class="totality-strip">
        <span class="totality-dot" :style="{ background: color }" />
        <div class="totality-stack">
          <div class="totality-value">
            {{ cloud }}<span class="totality-unit">%</span>
          </div>
          <div class="totality-label">{{ label }}</div>
        </div>
        <div class="totality-meta">
          <div class="totality-meta-eyebrow">{{ t('v0.forecast.eclipse_day_at_totality') }}</div>
          <div v-if="validForLabel" class="totality-valid">{{ validForLabel }}</div>
        </div>
      </div>

      <p class="eclipse-day-attribution">
        {{ t('v0.forecast.eclipse_day_attribution', { station: nearest!.name }) }}
      </p>
    </Card>
  </div>
</template>

<style scoped>
/* Owns its own bottom gap so ForecastSection doesn't need a conditional
   spacer for a card that may not render at all. */
.eclipse-day-wrap {
  margin-bottom: 8px;
}

/* Mirrors ForecastReliable's .now-strip so the two cards read as a pair
   — same geometry, different subject (eclipse day vs. next 48 h). */
.totality-strip {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 14px;
  padding: 4px 0 12px;
}
.totality-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 3px rgb(var(--surface) / 0.04);
}
.totality-stack { line-height: 1; }
.totality-value {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 24px;
  font-weight: 700;
  color: rgb(var(--ink-1));
  font-variant-numeric: tabular-nums;
}
.totality-unit {
  font-size: 13px;
  font-weight: 500;
  color: rgb(var(--ink-1) / 0.42);
  margin-left: 1px;
}
.totality-label {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 12px;
  color: rgb(var(--ink-1) / 0.62);
  margin-top: 4px;
}
.totality-meta { text-align: right; }
.totality-meta-eyebrow {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--accent));
}
.totality-valid {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.08em;
  color: rgb(var(--ink-1) / 0.42);
  margin-top: 4px;
}

.eclipse-day-attribution {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9.5px;
  letter-spacing: 0.08em;
  color: rgb(var(--ink-1) / 0.42);
  margin: 0;
  line-height: 1.5;
  border-top: 1px solid rgb(var(--border-subtle) / 0.08);
  padding-top: 10px;
}
</style>
