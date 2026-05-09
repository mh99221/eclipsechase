<script setup lang="ts">
import StatusDot from '~/components/ui/StatusDot.vue'
import { formatDuration } from '~/utils/eclipse'
import { cloudToStatus } from '~/utils/v0'

const props = defineProps<{
  name: string
  slug: string
  totalitySeconds: number
  cloud: number | null
}>()

const status = computed(() => cloudToStatus(props.cloud))
const score = computed(() => {
  if (props.cloud == null) return null
  return Math.max(0, Math.min(100, 100 - props.cloud))
})
</script>

<template>
  <div class="lb-veil">
    <div class="lb-card">
      <div class="lb-head">
        <span class="lb-selected">
          <StatusDot :status="status" :size="7" />
          {{ $t('v0.map.selected') }}
        </span>
        <span class="lb-tot-label">{{ formatDuration(totalitySeconds).toUpperCase() }} TOTALITY</span>
      </div>
      <div class="lb-name">{{ name }}</div>
      <div class="lb-strip">
        <div>
          <div class="lb-stat-l">{{ $t('v0.map.stat_totality') }}</div>
          <div class="lb-stat-totality">{{ formatDuration(totalitySeconds) }}</div>
        </div>
        <div>
          <div class="lb-stat-l">{{ $t('v0.map.stat_cloud') }}</div>
          <div class="lb-stat-cloud">
            <template v-if="cloud != null">{{ cloud }}<span>%</span></template>
            <template v-else>—</template>
          </div>
        </div>
        <div>
          <div class="lb-stat-l">{{ $t('v0.map.stat_score') }}</div>
          <div class="lb-stat-score" :data-status="status">{{ score ?? '—' }}</div>
        </div>
      </div>
      <NuxtLinkLocale :to="`/spots/${slug}`" class="lb-cta">{{ $t('v0.map.open_field_card') }}</NuxtLinkLocale>
    </div>
  </div>
</template>

<style scoped>
.lb-veil {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 40px 14px 16px;
  /* Theme-aware via `--map-pane` — dark over the dark map style,
     cream over the light map style (EclipseMap.vue line 477). */
  background: linear-gradient(180deg, rgb(var(--map-pane) / 0) 0%, rgb(var(--map-pane) / 0.88) 60%, rgb(var(--map-pane) / 0.96) 100%);
  pointer-events: none;
  z-index: 5;
}
.lb-card {
  background: rgb(var(--map-pane-strong) / 0.92);
  border: 1px solid rgb(var(--border-subtle) / 0.08);
  border-radius: 14px;
  padding: 14px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  pointer-events: auto;
}
.lb-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 8px;
}
.lb-selected {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9.5px;
  color: rgb(var(--accent));
  letter-spacing: 0.16em;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.lb-tot-label {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  color: rgb(var(--ink-1) / 0.42);
  letter-spacing: 0.11em;
}
.lb-name {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 19px;
  font-weight: 700;
  color: rgb(var(--ink-1));
  letter-spacing: -0.01em;
  margin-bottom: 10px;
}
.lb-strip {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
  padding: 10px 0;
  border-top: 1px solid rgb(var(--border-subtle) / 0.08);
  border-bottom: 1px solid rgb(var(--border-subtle) / 0.08);
  margin-bottom: 12px;
}
.lb-stat-l {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  color: rgb(var(--ink-1) / 0.42);
  letter-spacing: 0.11em;
}
.lb-stat-totality, .lb-stat-cloud, .lb-stat-score {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 16px;
  font-weight: 700;
  margin-top: 2px;
  font-variant-numeric: tabular-nums;
}
.lb-stat-totality { color: rgb(var(--totality)); }
.lb-stat-cloud { color: rgb(var(--ink-1)); }
.lb-stat-cloud span {
  font-size: 11px;
  color: rgb(var(--ink-1) / 0.62);
  margin-left: 1px;
}
.lb-stat-score[data-status='good']     { color: rgb(var(--good)); }
.lb-stat-score[data-status='marginal'] { color: rgb(var(--warn)); }
.lb-stat-score[data-status='bad']      { color: rgb(var(--bad)); }
.lb-cta {
  display: block;
  width: 100%;
  padding: 12px;
  background: rgb(var(--accent));
  /* Text on the burnt-amber CTA. Light theme flips this to cream so
     the label stays readable on amber in both modes. */
  color: rgb(var(--accent-ink));
  border: 0;
  border-radius: 8px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
  min-height: 44px;
  text-transform: uppercase;
}
.lb-cta:hover {
  background: rgb(var(--accent-strong));
}
</style>
