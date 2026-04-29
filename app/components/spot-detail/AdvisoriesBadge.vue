<script setup lang="ts">
import type { AdvisoryLevel } from '~/composables/useAdvisories'

defineProps<{
  count: number
  level: AdvisoryLevel
  expanded: boolean
}>()
const emit = defineEmits<{ toggle: [] }>()
</script>

<template>
  <button
    type="button"
    class="advisory-badge"
    :data-level="level"
    :aria-expanded="expanded"
    aria-controls="advisories-list"
    @click="emit('toggle')"
  >
    <span class="advisory-badge-glyph" aria-hidden="true">!</span>
    <span class="advisory-badge-label">Advisories ({{ count }})</span>
    <svg
      class="advisory-badge-chevron"
      :data-expanded="expanded"
      width="10"
      height="10"
      viewBox="0 0 10 10"
      aria-hidden="true"
    >
      <path
        d="M2 4l3 3 3-3"
        stroke="currentColor"
        stroke-width="1.5"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </button>
</template>

<style scoped>
.advisory-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: rgb(var(--surface) / 0.04);
  border: 1px solid rgb(var(--border-subtle) / 0.08);
  border-radius: 99px;
  cursor: pointer;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgb(var(--ink-1) / 0.62);
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  /* 32px desktop, bumps to 44 on mobile so it's a real tap target. */
  min-height: 32px;
}
.advisory-badge:hover {
  background: rgb(var(--surface) / 0.08);
  color: rgb(var(--ink-1));
}
.advisory-badge:focus-visible {
  outline: 2px solid rgb(var(--accent));
  outline-offset: 2px;
}

/* Severity colour cue — border + glyph + label tinted with the highest
   level present in the advisories list. */
.advisory-badge[data-level='bad'] {
  border-color: rgb(var(--bad) / 0.5);
  color: rgb(var(--bad));
}
.advisory-badge[data-level='warn'] {
  border-color: rgb(var(--warn) / 0.5);
  color: rgb(var(--warn));
}
.advisory-badge[data-level='info'] {
  border-color: rgb(var(--accent) / 0.5);
  color: rgb(var(--accent));
}

.advisory-badge-glyph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 99px;
  border: 1.25px solid currentColor;
  font-size: 9px;
  font-weight: 700;
}

.advisory-badge-chevron {
  transition: transform 0.18s ease-out;
}
.advisory-badge-chevron[data-expanded='true'] {
  transform: rotate(180deg);
}

@media (prefers-reduced-motion: reduce) {
  .advisory-badge-chevron { transition: none; }
}

@media (max-width: 480px) {
  .advisory-badge { min-height: 36px; padding: 8px 12px; }
}
</style>
