<script setup lang="ts">
import { SPOT_TYPE_LABELS } from '~/utils/eclipse'

const props = defineProps<{
  /** Raw spot row — only the relevant fields are read. */
  spot: {
    parking_info?: string | null
    cell_coverage?: string | null
    terrain_notes?: string | null
    has_services?: boolean | null
    spot_type?: string | null
    trail_distance_km?: number | null
    trail_time_minutes?: number | null
  }
}>()

const coverageLabels: Record<string, string> = {
  good:    'Vodafone 4G · strong',
  limited: 'Patchy · check carrier',
  none:    'No signal',
}

const rows = computed(() => {
  const r: Array<[string, string]> = []
  if (props.spot.trail_distance_km != null && props.spot.trail_time_minutes != null) {
    r.push(['Trail', `${props.spot.trail_distance_km} km · ${props.spot.trail_time_minutes} min`])
  }
  if (props.spot.parking_info)  r.push(['Parking',   props.spot.parking_info])
  if (props.spot.has_services != null) {
    r.push(['Services', props.spot.has_services ? 'On site / nearby' : 'None nearby'])
  }
  if (props.spot.cell_coverage) r.push(['Signal',    coverageLabels[props.spot.cell_coverage] ?? props.spot.cell_coverage])
  if (props.spot.terrain_notes) r.push(['Terrain',   props.spot.terrain_notes])
  if (props.spot.spot_type)     r.push(['Access',    SPOT_TYPE_LABELS[props.spot.spot_type] ?? props.spot.spot_type])
  return r
})
</script>

<template>
  <div class="logistics">
    <div v-for="([k, v], i) in rows" :key="i" class="row">
      <span class="k">{{ k }}</span>
      <span class="v">{{ v }}</span>
    </div>
  </div>
</template>

<style scoped>
.logistics { display: flex; flex-direction: column; }
.row {
  display: grid;
  grid-template-columns: 92px 1fr;
  gap: 14px;
  padding: 11px 0;
}
.row + .row { border-top: 1px solid rgb(var(--border-subtle) / 0.08); }
.k {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  color: rgb(var(--ink-1) / 0.42);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding-top: 1px;
}
.v {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  color: rgb(var(--ink-1));
  line-height: 1.45;
}
</style>
