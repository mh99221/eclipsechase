<script setup lang="ts">
import { computed } from 'vue'
import DockHeader from './DockHeader.vue'
import DockStat from './DockStat.vue'
import { cloudToStatus } from '~/utils/v0'
import type { DockWeatherCtx } from './types'

const props = defineProps<{ ctx: DockWeatherCtx }>()

const status = computed(() => cloudToStatus(props.ctx.cloud))

const glyphLabel = computed(() => {
  const c = props.ctx.cloud
  if (c == null) return 'No data'
  if (c < 30) return 'Clear'
  if (c < 60) return 'Partial'
  return 'Overcast'
})

const cloudLabel = computed(() => props.ctx.cloud == null ? '—' : `${props.ctx.cloud}%`)
const visLabel = computed(() => props.ctx.visibilityKm == null ? '—' : `${props.ctx.visibilityKm} km`)
const updatedLabel = computed(() => {
  const m = props.ctx.updatedMinutes
  if (m == null) return '—'
  if (m < 1) return 'Now'
  return `${m} min`
})

const blurb = computed(() => {
  const c = props.ctx.cloud
  if (c == null) return 'Awaiting recent observation from this station.'
  if (c < 30) return 'Clear sky window expected through C2.'
  if (c < 60) return 'Broken cloud — track high-pressure pockets nearby.'
  return 'High overcast risk — review Plan B alternates.'
})
</script>

<template>
  <div>
    <DockHeader eyebrow="Weather" :dot-var="status" :meta="glyphLabel" />

    <div class="title">{{ ctx.name }}</div>

    <div class="strip">
      <DockStat label="Cloud" :value="cloudLabel" :tone="status" />
      <DockStat label="Visibility" :value="visLabel" />
      <DockStat label="Updated" :value="updatedLabel" tone="dim" mono />
    </div>

    <p class="blurb">Live · {{ blurb }}</p>
  </div>
</template>

<style scoped>
.title {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: rgb(var(--ink-1));
  margin-bottom: 10px;
}
.strip {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
  padding: 10px 0;
  border-top: 1px solid rgb(var(--border-subtle) / 0.08);
  border-bottom: 1px solid rgb(var(--border-subtle) / 0.08);
  margin-bottom: 12px;
}
.blurb {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 12px;
  line-height: 1.45;
  color: rgb(var(--ink-1) / 0.62);
  margin: 0;
}
</style>
