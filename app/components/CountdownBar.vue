<script setup lang="ts">
const { t } = useI18n()
const { remaining } = useCountdown()

function padZero(n: number): string {
  return n.toString().padStart(2, '0')
}

const units = computed(() => [
  { value: remaining.value.days >= 100 ? remaining.value.days.toString() : padZero(remaining.value.days), label: t('countdown.days'), primary: true },
  { value: padZero(remaining.value.hours), label: t('countdown.hours'), primary: false },
  { value: padZero(remaining.value.minutes), label: t('countdown.minutes'), primary: false },
  { value: padZero(remaining.value.seconds), label: t('countdown.seconds'), primary: false },
])
</script>

<template>
  <div class="countdown-row my-8">
    <template v-for="(unit, idx) in units" :key="idx">
      <!-- Dot separator -->
      <span v-if="idx > 0" class="countdown-dot" />

      <div class="countdown-unit">
        <span class="countdown-value" :class="{ 'countdown-value--primary': unit.primary }">
          {{ unit.value }}
        </span>
        <span
          class="countdown-label"
          :class="unit.primary ? 'text-slate-400' : 'text-slate-500'"
        >
          {{ unit.label }}
        </span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.countdown-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

@media (min-width: 640px) {
  .countdown-row {
    gap: 20px;
  }
}

@media (min-width: 768px) {
  .countdown-row {
    gap: 28px;
  }
}

.countdown-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(245, 158, 11, 0.3);
  flex-shrink: 0;
  margin-bottom: 18px;
  animation: dot-pulse 3s ease-in-out infinite;
}

.countdown-unit {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

@media (min-width: 640px) {
  .countdown-unit {
    gap: 8px;
  }
}

.countdown-value {
  font-family: 'Syne', system-ui, sans-serif;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #e2e8f0;
  font-size: 36px;
  line-height: 1;
  letter-spacing: -0.03em;
  position: relative;
}

@media (min-width: 640px) {
  .countdown-value {
    font-size: 52px;
  }
}

@media (min-width: 768px) {
  .countdown-value {
    font-size: 68px;
  }
}

.countdown-value--primary {
  color: #f1f5f9;
  text-shadow: 0 0 30px rgba(245, 158, 11, 0.12);
}

.countdown-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.25em;
}

@media (min-width: 640px) {
  .countdown-label {
    font-size: 12px;
  }
}

@keyframes dot-pulse {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.3); }
}
</style>
