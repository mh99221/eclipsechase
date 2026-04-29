<script setup lang="ts">
import { computed } from 'vue'
import DockHeader from './DockHeader.vue'
import DockStat from './DockStat.vue'
import type { DockRoadsCtx } from './types'

const props = defineProps<{ ctx: DockRoadsCtx }>()

interface RoadStyling {
  dot: 'good' | 'warn' | 'bad'
  tone: 'good' | 'warn' | 'bad' | 'ink'
  grade: string
  drive: string
  driveTone: 'good' | 'bad' | 'ink'
  alt: string
}

const styling = computed<RoadStyling>(() => {
  switch (props.ctx.cond) {
    case 'good':
      return { dot: 'good', tone: 'good', grade: 'Paved', drive: 'Yes', driveTone: 'good', alt: '—' }
    case 'difficult':
      return { dot: 'warn', tone: 'warn', grade: 'Gravel', drive: 'Yes', driveTone: 'good', alt: '+18 min' }
    case 'closed':
      return { dot: 'bad', tone: 'bad', grade: 'Closed', drive: 'No', driveTone: 'bad', alt: '+18 min' }
    default:
      return { dot: 'warn', tone: 'ink', grade: '—', drive: '—', driveTone: 'ink', alt: '—' }
  }
})
</script>

<template>
  <div>
    <DockHeader eyebrow="Roads" :dot-var="styling.dot" meta="Live" />

    <div class="title" :data-tone="styling.tone">{{ ctx.label }}</div>
    <div class="detail">{{ ctx.detail }}</div>

    <div class="strip">
      <DockStat label="Grade" :value="styling.grade" mono />
      <DockStat label="Drive 4WD" :value="styling.drive" :tone="styling.driveTone" mono />
      <DockStat label="Alt route" :value="styling.alt" mono />
    </div>

    <button class="btn-ghost" type="button">OPEN IN NAVIGATION ↗</button>
  </div>
</template>

<style scoped>
.title {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin-bottom: 4px;
  color: rgb(var(--ink-1));
}
.title[data-tone='good'] { color: rgb(var(--good)); }
.title[data-tone='warn'] { color: rgb(var(--warn)); }
.title[data-tone='bad']  { color: rgb(var(--bad)); }
.detail {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  color: rgb(var(--ink-1) / 0.62);
  margin-bottom: 12px;
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
.btn-ghost {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid rgb(var(--border-subtle) / 0.16);
  background: transparent;
  border-radius: 8px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: rgb(var(--ink-1));
  cursor: pointer;
  text-transform: uppercase;
  transition: background 0.15s;
}
.btn-ghost:hover { background: rgb(var(--surface) / 0.5); }
</style>
