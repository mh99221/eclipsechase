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
  props.ctx.cloud == null ? 'No reading' : `${props.ctx.cloud}% cloud`,
)

const updatedLabel = computed(() => {
  const m = props.ctx.updatedMinutes
  if (m == null) return null
  if (m < 1) return 'Updated just now'
  if (m < 60) return `Updated ${m} min ago`
  const hr = Math.round(m / 60)
  return `Updated ${hr} h ago`
})
</script>

<template>
  <div>
    <DockHeader eyebrow="Weather" :dot-var="status" />

    <div class="title title--with-sub" :data-tone="tone">{{ title }}</div>
    <div class="detail">{{ ctx.name }}</div>
    <div v-if="updatedLabel" class="updated">{{ updatedLabel }}</div>
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
