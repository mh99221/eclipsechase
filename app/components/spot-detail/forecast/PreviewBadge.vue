<script setup lang="ts">
import type { ForecastPhase } from '~/composables/useForecastPhase'

const props = defineProps<{
  phase: ForecastPhase
  daysUntil: number
}>()

const { t } = useI18n()

// Negative days mean we've simulated past-eclipse, which is a meaningless
// state for this app — clamp display so the badge reads naturally.
const tMinus = computed(() => Math.max(0, Math.round(props.daysUntil)))
</script>

<template>
  <div class="preview-badge" role="status">
    <span class="preview-dot" />
    <span class="preview-label">
      {{ t('v0.forecast.preview_eyebrow') }}
      <span class="preview-detail">· T-{{ tMinus }} · {{ t(`v0.forecast.phase_label_${phase}`) }}</span>
    </span>
  </div>
</template>

<style scoped>
/* High-visibility amber strip — sits above the PhaseNotice eyebrow so it
   looks like a one-off banner rather than part of the design. The dotted
   left border + striped repeating gradient marks it as "non-production
   surface" without needing copy. */
.preview-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  margin-bottom: 8px;
  background: repeating-linear-gradient(
    -45deg,
    rgb(var(--accent) / 0.08) 0,
    rgb(var(--accent) / 0.08) 6px,
    rgb(var(--accent) / 0.16) 6px,
    rgb(var(--accent) / 0.16) 12px
  );
  border-left: 3px solid rgb(var(--accent));
  border-radius: 4px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(var(--accent-strong));
}

.preview-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgb(var(--accent));
  flex-shrink: 0;
  /* Slow blink so the eye doesn't habituate — at this size the pulse is
     subtle but reads as "live preview state" if you glance at it. */
  animation: preview-pulse 2.4s ease-in-out infinite;
}
.preview-label {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.preview-detail {
  color: rgb(var(--ink-1) / 0.62);
  letter-spacing: 0.1em;
}

@keyframes preview-pulse {
  0%, 100% { opacity: 0.6; }
  50%      { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .preview-dot { animation: none; opacity: 0.85; }
}
</style>
