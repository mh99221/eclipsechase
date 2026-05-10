<script setup lang="ts">
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

const { t } = useI18n()

// Cell-coverage enum → translated value. Falls through to the raw
// value if a coverage code we haven't mapped shows up (defensive
// against future schema changes).
const COVERAGE_KEYS: Record<string, string> = {
  good:    'logistics.coverage_good',
  limited: 'logistics.coverage_limited',
  none:    'logistics.coverage_none',
}

// spot_type enum → translated value. Same fallback behaviour.
const SPOT_TYPE_KEYS: Record<string, string> = {
  'drive-up':       'logistics.type_drive_up',
  'short-walk':     'logistics.type_short_walk',
  'moderate-hike':  'logistics.type_moderate_hike',
  'serious-hike':   'logistics.type_serious_hike',
}

const rows = computed(() => {
  const r: Array<[string, string]> = []
  if (props.spot.trail_distance_km != null && props.spot.trail_time_minutes != null) {
    r.push([
      t('logistics.row_trail'),
      t('logistics.trail_value', {
        distance: props.spot.trail_distance_km,
        time: props.spot.trail_time_minutes,
      }),
    ])
  }
  if (props.spot.parking_info) {
    r.push([t('logistics.row_parking'), props.spot.parking_info])
  }
  if (props.spot.has_services != null) {
    r.push([
      t('logistics.row_services'),
      t(props.spot.has_services ? 'logistics.services_on_site' : 'logistics.services_none'),
    ])
  }
  if (props.spot.cell_coverage) {
    const key = COVERAGE_KEYS[props.spot.cell_coverage]
    r.push([t('logistics.row_signal'), key ? t(key) : props.spot.cell_coverage])
  }
  if (props.spot.terrain_notes) {
    r.push([t('logistics.row_terrain'), props.spot.terrain_notes])
  }
  if (props.spot.spot_type) {
    const key = SPOT_TYPE_KEYS[props.spot.spot_type]
    r.push([t('logistics.row_access'), key ? t(key) : props.spot.spot_type])
  }
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
