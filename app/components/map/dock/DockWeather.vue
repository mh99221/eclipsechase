<script setup lang="ts">
import { computed } from 'vue'
import DockHeader from './DockHeader.vue'
import DockStat from './DockStat.vue'
import { cloudToStatus } from '~/utils/v0'
import type { DockWeatherCtx } from './types'

const props = defineProps<{ ctx: DockWeatherCtx }>()

const status = computed(() => cloudToStatus(props.ctx.cloud))

const cloudLabel = computed(() => props.ctx.cloud == null ? '—' : `${props.ctx.cloud}%`)
const updatedLabel = computed(() => {
  const m = props.ctx.updatedMinutes
  if (m == null) return '—'
  if (m < 1) return 'Now'
  return `${m} min`
})
</script>

<template>
  <div>
    <DockHeader eyebrow="Weather" :dot-var="status" />

    <div class="title">{{ ctx.name }}</div>

    <div class="strip strip--two">
      <DockStat label="Cloud" :value="cloudLabel" :tone="status" />
      <DockStat label="Updated" :value="updatedLabel" tone="dim" mono />
    </div>
  </div>
</template>

<style scoped>
/* `.title` and base `.strip` (3-col) come from MapDock's shared style;
   WEATHER only has 2 stats, so override the column count locally.
   The doubled-class selector beats the shared `.dock-card .strip`
   (same specificity) regardless of stylesheet order. */
.strip.strip--two { grid-template-columns: 1fr 1fr; }
</style>
