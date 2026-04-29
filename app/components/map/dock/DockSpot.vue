<script setup lang="ts">
import { computed } from 'vue'
import DockHeader from './DockHeader.vue'
import DockStat from './DockStat.vue'
import { formatDuration } from '~/utils/eclipse'
import { cloudToStatus } from '~/utils/v0'
import type { DockSpotData } from './types'

const props = defineProps<{ spot: DockSpotData }>()
const emit = defineEmits<{
  'horizon-open': []
  'open-field-card': []
}>()

const status = computed(() => cloudToStatus(props.spot.cloud))
const score = computed(() => {
  if (props.spot.cloud == null) return null
  return Math.max(0, Math.min(100, 100 - props.spot.cloud))
})
const totalityLabel = computed(() => formatDuration(props.spot.totality_duration_seconds))
const cloudLabel = computed(() => props.spot.cloud == null ? '—' : `${props.spot.cloud}%`)
const scoreLabel = computed(() => score.value == null ? '—' : String(score.value))
</script>

<template>
  <div>
    <DockHeader
      eyebrow="Selected"
      :dot-var="status"
      :meta="`${totalityLabel} totality`"
    />

    <div class="title">{{ spot.name }}</div>

    <div class="strip">
      <DockStat label="Totality" :value="totalityLabel" tone="totality" mono />
      <DockStat label="Cloud" :value="cloudLabel" />
      <DockStat label="Score" :value="scoreLabel" :tone="status" />
    </div>

    <div class="actions">
      <button class="btn-ghost btn-ghost--cta-pair" type="button" @click="emit('horizon-open')">HORIZON</button>
      <button class="btn-cta" type="button" @click="emit('open-field-card')">OPEN FIELD CARD →</button>
    </div>
  </div>
</template>

<style scoped>
/* `.title`, `.strip`, `.btn-ghost` come from MapDock's shared style. */
.actions { display: flex; gap: 8px; }
.btn-cta {
  flex: 1;
  padding: 12px;
  border: 0;
  background: rgb(var(--accent));
  color: rgb(var(--accent-ink));
  border-radius: 8px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.15em;
  cursor: pointer;
  min-height: 44px;
  text-transform: uppercase;
  transition: background 0.15s;
}
.btn-cta:hover { background: rgb(var(--accent-strong)); }
</style>
