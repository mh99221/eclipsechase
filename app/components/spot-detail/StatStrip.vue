<script setup lang="ts">
import Card from '~/components/ui/Card.vue'
import WeatherIcon from '~/components/WeatherIcon.vue'
import { formatDuration } from '~/utils/eclipse'
import { cloudToStatus } from '~/utils/v0'

const props = defineProps<{
  totalitySeconds: number
  /** 10-year Aug 12 historical mean cloud cover (0–100), or null if no data. */
  cloudPct: number | null
}>()

const cloudStatus = computed(() => cloudToStatus(props.cloudPct))
const cloudLabel = computed(() => props.cloudPct == null ? '—' : `${Math.round(props.cloudPct)}%`)
</script>

<template>
  <div class="stat-strip">
    <Card>
      <div class="lbl">{{ $t('v0.spot_detail.stat_totality') }}</div>
      <div class="v-totality">{{ formatDuration(totalitySeconds) }}</div>
    </Card>
    <Card>
      <div class="lbl">10-yr Aug 12</div>
      <div class="v-cloud">
        <WeatherIcon :cloud-cover="cloudPct" :size="22" />
        <span :data-status="cloudStatus">{{ cloudLabel }}</span>
      </div>
    </Card>
  </div>
</template>

<style scoped>
.stat-strip {
  display: grid;
  grid-template-columns: 1fr 1fr;
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
.v-totality, .v-cloud {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 22px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  margin-top: 6px;
  letter-spacing: -0.005em;
}
.v-totality { color: rgb(var(--totality)); }
.v-cloud {
  display: flex;
  align-items: center;
  gap: 6px;
  /* the icon owns its own colour; the percentage flips between
     good / warn / bad based on the same band as the spots list */
  color: rgb(var(--ink-1));
}
.v-cloud span[data-status='good'] { color: rgb(var(--good)); }
.v-cloud span[data-status='marginal'] { color: rgb(var(--warn)); }
.v-cloud span[data-status='bad'] { color: rgb(var(--bad)); }
</style>
