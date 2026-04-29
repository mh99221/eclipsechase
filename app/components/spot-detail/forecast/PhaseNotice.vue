<script setup lang="ts">
import type { ForecastPhase } from '~/composables/useForecastPhase'

const props = defineProps<{
  phase: ForecastPhase
  daysUntil: number
}>()

const { t } = useI18n()

// Round daysUntil for display — fractional days look noisy in the eyebrow.
// Negative on/after eclipse day, but the page is only meaningful pre-eclipse
// so we don't bother formatting the past case.
const tMinus = computed(() => Math.max(0, Math.round(props.daysUntil)))
</script>

<template>
  <div class="phase-notice">
    <Eyebrow tone="accent">
      {{ t('v0.forecast.phase_eyebrow', { days: tMinus }) }} · {{ t(`v0.forecast.phase_label_${phase}`) }}
    </Eyebrow>
    <p class="phase-body">{{ t(`v0.forecast.phase_notice_${phase}`) }}</p>
  </div>
</template>

<style scoped>
.phase-notice {
  padding: 0 4px 4px;
}
.phase-body {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 12.5px;
  line-height: 1.5;
  color: rgb(var(--ink-1) / 0.62);
  margin: 6px 0 0;
}
</style>
