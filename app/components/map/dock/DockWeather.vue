<script setup lang="ts">
import { computed } from 'vue'
import DockHeader from './DockHeader.vue'
import DockStat from './DockStat.vue'
import { cloudToStatus } from '~/utils/v0'
import type { DockWeatherCtx } from './types'

const props = defineProps<{ ctx: DockWeatherCtx }>()

const status = computed(() => cloudToStatus(props.ctx.cloud))

const cloudLabel = computed(() => props.ctx.cloud == null ? '—' : `${props.ctx.cloud}%`)
const visLabel = computed(() => props.ctx.visibilityKm == null ? '—' : `${props.ctx.visibilityKm} km`)
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

    <div class="strip">
      <DockStat label="Cloud" :value="cloudLabel" :tone="status" />
      <DockStat label="Visibility" :value="visLabel" />
      <DockStat label="Updated" :value="updatedLabel" tone="dim" mono />
    </div>
  </div>
</template>

<style scoped>
/* `.title` and `.strip` come from MapDock's shared style. */
</style>
