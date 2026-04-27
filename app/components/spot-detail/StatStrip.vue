<script setup lang="ts">
import Card from '~/components/ui/Card.vue'
import { formatDuration } from '~/utils/eclipse'
import type { HorizonVerdict } from '~/types/horizon'

const props = defineProps<{
  totalitySeconds: number
  sunAltitude: number | null
  horizonVerdict: HorizonVerdict | null
}>()

const verdictUpper = computed(() => props.horizonVerdict ? props.horizonVerdict.toUpperCase() : '—')
</script>

<template>
  <div class="stat-strip">
    <Card>
      <div class="lbl">{{ $t('v0.spot_detail.stat_totality') }}</div>
      <div class="v-totality">{{ formatDuration(totalitySeconds) }}</div>
    </Card>
    <Card>
      <div class="lbl">{{ $t('v0.spot_detail.stat_sun_alt') }}</div>
      <div class="v-sun">{{ sunAltitude != null ? `${sunAltitude.toFixed(1)}°` : '—' }}</div>
    </Card>
    <Card>
      <div class="lbl">{{ $t('v0.spot_detail.stat_horizon') }}</div>
      <div class="v-horizon" :data-verdict="horizonVerdict ?? 'unknown'">{{ verdictUpper }}</div>
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
  margin-top: 6px;
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
</style>
