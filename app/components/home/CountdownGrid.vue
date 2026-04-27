<script setup lang="ts">
const { remaining } = useCountdown()

const cells = computed(() => [
  { v: String(remaining.value.days), u: 'Days' },
  { v: String(remaining.value.hours).padStart(2, '0'), u: 'Hours' },
  { v: String(remaining.value.minutes).padStart(2, '0'), u: 'Minutes' },
  { v: String(remaining.value.seconds).padStart(2, '0'), u: 'Seconds' },
])
</script>

<template>
  <div class="countdown-grid" role="timer" aria-live="polite" aria-atomic="true">
    <template v-for="(c, i) in cells" :key="c.u">
      <div class="cell">
        <div class="cell-v">{{ c.v }}</div>
        <div class="cell-u">{{ c.u }}</div>
      </div>
      <div v-if="i < cells.length - 1" class="divider" aria-hidden="true" />
    </template>
  </div>
</template>

<style scoped>
.countdown-grid {
  display: flex;
  padding: 0 8px 28px;
}
.cell {
  flex: 1;
  text-align: center;
}
.cell-v {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 44px;
  font-weight: 700;
  color: rgb(var(--ink-1));
  letter-spacing: -0.023em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.cell-u {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9.5px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: rgb(var(--ink-1) / 0.62);
  margin-top: 6px;
}
.divider {
  width: 1px;
  background: rgb(var(--border-subtle) / 0.08);
  margin: 8px 0;
}

/* Desktop overrides — after base rules. */
@media (min-width: 768px) {
  .countdown-grid { padding: 0 24px 40px; }
  .cell-v { font-size: 64px; }
  .cell-u { font-size: 11px; margin-top: 10px; letter-spacing: 0.2em; }
}
</style>
