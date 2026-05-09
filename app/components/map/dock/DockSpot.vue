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

const { t } = useI18n()

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
    <DockHeader :eyebrow="t('v0.map.selected')" :dot-var="status" />

    <div class="title">{{ spot.name }}</div>

    <div class="strip">
      <DockStat :label="t('v0.map.stat_totality')" :value="totalityLabel" tone="totality" mono />
      <DockStat :label="t('v0.map.stat_cloud')" :value="cloudLabel" />
      <!-- `title` makes the score self-documenting on hover (desktop)
           and long-press (mobile). 0–100, derived from cloud cover —
           higher = clearer. -->
      <div :title="t('dock.score_tooltip', { score: scoreLabel })">
        <DockStat :label="`${t('v0.map.stat_score')} ⓘ`" :value="scoreLabel" :tone="status" />
      </div>
    </div>

    <div class="actions">
      <button class="btn-ghost btn-ghost--cta-pair" type="button" @click="emit('horizon-open')">{{ t('dock.btn_horizon') }}</button>
      <button class="btn-cta" type="button" @click="emit('open-field-card')">{{ t('v0.map.open_field_card') }}</button>
    </div>
  </div>
</template>

<style scoped>
/* `.title`, `.strip`, `.btn-ghost` come from MapDock's shared style. */
.actions { display: flex; gap: 8px; }
.btn-cta {
  flex: 1;
  padding: 8px 14px;
  border: 0;
  background: rgb(var(--accent));
  color: rgb(var(--accent-ink));
  border-radius: 8px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.14em;
  cursor: pointer;
  text-transform: uppercase;
  transition: background 0.15s;
}
.btn-cta:hover { background: rgb(var(--accent-strong)); }
</style>
