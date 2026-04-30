<script setup lang="ts">
import { computed } from 'vue'
import DockHeader from './DockHeader.vue'
import DockStat from './DockStat.vue'
import type { DockRoadsCtx, TrafficCondition } from './types'

const props = defineProps<{ ctx: DockRoadsCtx }>()

interface RoadStyling {
  dot: 'good' | 'warn' | 'bad'
  tone: 'good' | 'warn' | 'bad' | 'ink'
  grade: string
  drive: string
  driveTone: 'good' | 'bad' | 'ink'
  alt: string
}

const STYLING_BY_COND: Record<TrafficCondition, RoadStyling> = {
  good:      { dot: 'good', tone: 'good', grade: 'Paved',  drive: 'Yes', driveTone: 'good', alt: '—' },
  difficult: { dot: 'warn', tone: 'warn', grade: 'Gravel', drive: 'Yes', driveTone: 'good', alt: '+18 min' },
  closed:    { dot: 'bad',  tone: 'bad',  grade: 'Closed', drive: 'No',  driveTone: 'bad',  alt: '+18 min' },
  unknown:   { dot: 'warn', tone: 'ink',  grade: '—',      drive: '—',   driveTone: 'ink',  alt: '—' },
}

const styling = computed<RoadStyling>(() => STYLING_BY_COND[props.ctx.cond] ?? STYLING_BY_COND.unknown)
</script>

<template>
  <div>
    <DockHeader eyebrow="Roads" :dot-var="styling.dot" />

    <div class="title title--with-sub" :data-tone="styling.tone">{{ ctx.label }}</div>
    <div class="detail">{{ ctx.detail }}</div>

    <div class="strip">
      <DockStat label="Grade" :value="styling.grade" mono />
      <DockStat label="Drive 4WD" :value="styling.drive" :tone="styling.driveTone" mono />
      <DockStat label="Alt route" :value="styling.alt" mono />
    </div>

    <button class="btn-ghost btn-ghost--full" type="button">OPEN IN NAVIGATION ↗</button>
  </div>
</template>

<style scoped>
/* `.title`, `.strip`, `.btn-ghost` come from MapDock's shared style. */
.detail {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  color: rgb(var(--ink-1) / 0.62);
  margin-bottom: 12px;
}
</style>
