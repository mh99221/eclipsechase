<script setup lang="ts">
const { t } = useI18n()
// `passed` flips permanently once 2026-08-12T17:46Z is behind us. Rather
// than let the clamped countdown sit at 00 · 00 · 00 · 00 — which reads as
// a broken timer — the component swaps to a past-tense statement.
const { remaining, passed } = useCountdown()

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
  <div v-if="passed" class="countdown-passed my-8">
    <p class="countdown-passed-label">{{ t('archive.hero_passed') }}</p>
    <p class="countdown-passed-detail">{{ t('archive.hero_passed_detail') }}</p>
    <NuxtLinkLocale to="/farewell" class="countdown-passed-link">
      {{ t('archive.hero_link') }}
    </NuxtLinkLocale>
  </div>

  <div v-else class="countdown-row my-8">
    <template v-for="(unit, idx) in units" :key="idx">
      <!-- Dot separator -->
      <span v-if="idx > 0" class="countdown-dot" />

      <div class="countdown-unit">
        <span class="countdown-value" :class="{ 'countdown-value--primary': unit.primary }">
          {{ unit.value }}
        </span>
        <span
          class="countdown-label"
          :class="unit.primary ? 'text-ink-3' : 'text-ink-3/70'"
        >
          {{ unit.label }}
        </span>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* Post-eclipse state. Occupies roughly the same vertical band as the
   digits so the hero composition doesn't collapse, but reads as a
   sentence rather than a timer. */
.countdown-passed {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}
.countdown-passed-label {
  font-family: 'Manrope', system-ui, sans-serif;
  font-weight: 700;
  font-size: 28px;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: rgb(var(--ink-1));
  margin: 0;
}
@media (min-width: 640px) {
  .countdown-passed-label { font-size: 40px; }
}
.countdown-passed-detail {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  line-height: 1.6;
  color: rgb(var(--ink-3));
  margin: 0;
  max-width: 30ch;
}
.countdown-passed-link {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgb(var(--accent));
  text-decoration: none;
  border-bottom: 1px solid rgb(var(--accent) / 0.35);
  padding-bottom: 2px;
  transition: color 0.2s, border-color 0.2s;
}
.countdown-passed-link:hover {
  color: rgb(var(--accent-strong));
  border-bottom-color: rgb(var(--accent-strong) / 0.6);
}

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
  background: rgb(var(--accent) / 0.35);
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
  font-family: 'Manrope', system-ui, sans-serif;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--ink-2));
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
  color: rgb(var(--ink-1));
  text-shadow: 0 0 30px rgb(var(--accent) / 0.18);
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
