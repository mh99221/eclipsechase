<script setup lang="ts">
import Card from '~/components/ui/Card.vue'
import { formatDuration } from '~/utils/eclipse'
import { azimuthCompass } from '~/utils/v0'
import type { HorizonVerdict } from '~/types/horizon'

const props = defineProps<{
  totalitySeconds: number
  totalityStart: string | null   // 'HH:MM:SS' UTC, or ISO
  sunAltitude: number | null
  sunAzimuth: number | null
  horizonVerdict: HorizonVerdict | null
  horizonScanCount?: number
}>()

const startLabel = computed(() => {
  if (!props.totalityStart) return null
  // Accept either 'HH:MM:SS' or ISO; emit just the time portion in UTC.
  if (/^\d{2}:\d{2}:\d{2}$/.test(props.totalityStart)) return props.totalityStart
  try {
    const d = new Date(props.totalityStart)
    return d.toISOString().slice(11, 19)
  } catch {
    return props.totalityStart
  }
})

const verdictUpper = computed(() => props.horizonVerdict ? props.horizonVerdict.toUpperCase() : '—')
</script>

<template>
  <div class="stat-strip">
    <Card>
      <div class="lbl">{{ $t('v0.spot_detail.stat_totality') }}</div>
      <div class="v-totality">{{ formatDuration(totalitySeconds) }}</div>
      <div v-if="startLabel" class="sub">STARTS · {{ startLabel }}</div>
    </Card>
    <Card>
      <div class="lbl">{{ $t('v0.spot_detail.stat_sun_alt') }}</div>
      <div class="v-sun">{{ sunAltitude != null ? `${sunAltitude.toFixed(1)}°` : '—' }}</div>
      <div v-if="sunAzimuth != null" class="sub">{{ azimuthCompass(sunAzimuth) }} · {{ Math.round(sunAzimuth) }}°</div>
    </Card>
    <Card>
      <div class="lbl">{{ $t('v0.spot_detail.stat_horizon') }}</div>
      <div class="v-horizon" :data-verdict="horizonVerdict ?? 'unknown'">{{ verdictUpper }}</div>
      <div v-if="horizonScanCount" class="sub">{{ horizonScanCount }} PT SCAN</div>
    </Card>
  </div>
</template>

<style scoped>
.stat-strip {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  gap: 6px;
  margin-bottom: 12px;
}
.lbl {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.17em;
  color: rgb(var(--ink-1) / 0.42);
  text-transform: uppercase;
}
.v-totality, .v-sun, .v-horizon {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  margin-top: 4px;
  letter-spacing: -0.005em;
}
.v-totality { font-size: 26px; color: rgb(var(--totality)); }
.v-sun      { font-size: 22px; color: rgb(var(--ink-1)); }
.v-horizon  { font-size: 18px; }
.v-horizon[data-verdict='clear']    { color: rgb(var(--good)); }
.v-horizon[data-verdict='marginal'] { color: rgb(var(--warn)); }
.v-horizon[data-verdict='risky']    { color: rgb(var(--warn)); }
.v-horizon[data-verdict='blocked']  { color: rgb(var(--bad)); }
.v-horizon[data-verdict='unknown']  { color: rgb(var(--ink-1) / 0.42); }
.sub {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  color: rgb(var(--ink-1) / 0.62);
  margin-top: 2px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
</style>
