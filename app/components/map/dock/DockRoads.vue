<script setup lang="ts">
import { computed } from 'vue'
import DockHeader from './DockHeader.vue'
import type { DockRoadsCtx, TrafficCondition } from './types'

const props = defineProps<{ ctx: DockRoadsCtx }>()

const { t } = useI18n()

const dotByCond: Record<TrafficCondition, 'good' | 'warn' | 'bad'> = {
  good: 'good',
  difficult: 'warn',
  closed: 'bad',
  unknown: 'warn',
}
const toneByCond: Record<TrafficCondition, 'good' | 'warn' | 'bad' | 'ink'> = {
  good: 'good',
  difficult: 'warn',
  closed: 'bad',
  unknown: 'ink',
}

const dot = computed(() => dotByCond[props.ctx.cond] ?? 'warn')
const tone = computed(() => toneByCond[props.ctx.cond] ?? 'ink')

const updatedLabel = computed(() => {
  const ts = props.ctx.updatedAt
  if (!ts) return null
  const ageMs = Date.now() - new Date(ts).getTime()
  if (!Number.isFinite(ageMs) || ageMs < 0) return null
  const min = Math.round(ageMs / 60000)
  if (min < 1) return t('dock.roads_updated_just_now')
  if (min < 60) return t('dock.roads_updated_min_ago', { min })
  const hr = Math.round(min / 60)
  return t('dock.roads_updated_hr_ago', { hr })
})
</script>

<template>
  <div>
    <DockHeader :eyebrow="t('dock.roads_eyebrow')" :dot-var="dot" />

    <div class="title title--with-sub" :data-tone="tone">{{ ctx.label }}</div>
    <div class="detail">{{ ctx.detail }}</div>
    <div v-if="updatedLabel" class="updated">{{ updatedLabel }}</div>

    <button class="btn-ghost btn-ghost--full" type="button">{{ t('dock.roads_btn_navigate') }}</button>
  </div>
</template>

<style scoped>
/* `.title`, `.btn-ghost` come from MapDock's shared style. */
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
  margin-bottom: 12px;
}
</style>
