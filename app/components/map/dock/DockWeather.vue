<script setup lang="ts">
import { computed } from 'vue'
import DockHeader from './DockHeader.vue'
import { cloudToStatus } from '~/utils/v0'
import type { DockWeatherCtx } from './types'

const props = defineProps<{ ctx: DockWeatherCtx }>()

const status = computed(() => cloudToStatus(props.ctx.cloud))
const tone = computed<'good' | 'warn' | 'bad' | 'ink'>(() =>
  props.ctx.cloud == null ? 'ink' : status.value,
)

const title = computed(() =>
  props.ctx.cloud == null ? 'No forecast' : `${props.ctx.cloud}% cloud`,
)

const forecastForLabel = computed(() => {
  if (!props.ctx.forecastValidAt) return null
  const d = new Date(props.ctx.forecastValidAt)
  if (Number.isNaN(d.getTime())) return null
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `Forecast for ${hh}:${mm}`
})
</script>

<template>
  <div>
    <DockHeader eyebrow="Forecast" :dot-var="status" />

    <div class="title title--with-sub" :data-tone="tone">{{ title }}</div>
    <div class="detail">{{ ctx.name }}</div>
    <div v-if="forecastForLabel" class="updated">{{ forecastForLabel }}</div>
  </div>
</template>

<style scoped>
/* `.title` comes from MapDock's shared style. */
.detail {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  color: rgb(var(--ink-1) / 0.62);
  margin-bottom: 4px;
}
.updated {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgb(var(--ink-1) / 0.42);
}
</style>
