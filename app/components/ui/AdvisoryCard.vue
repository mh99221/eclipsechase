<script setup lang="ts">
defineProps<{
  level: 'bad' | 'warn' | 'info'
  title: string
  body?: string
}>()

function glyph(level: 'bad' | 'warn' | 'info'): string {
  return level === 'bad' ? '!' : level === 'warn' ? '⚠' : 'i'
}
</script>

<template>
  <div class="advisory" :data-level="level">
    <div class="advisory-icon" aria-hidden="true">{{ glyph(level) }}</div>
    <div class="advisory-body">
      <div class="advisory-title">{{ title }}</div>
      <div v-if="body" class="advisory-text">{{ body }}</div>
    </div>
  </div>
</template>

<style scoped>
.advisory {
  display: grid;
  /* Icon column widened from 28→36 px so the 24 px icon (with its
     10 px left margin) fits without overflowing into the gap. Gap
     bumped to 14 px so the title isn't right up against the icon. */
  grid-template-columns: 36px 1fr;
  gap: 14px;
  align-items: flex-start;
  padding: 12px 12px 12px 0;
  background: rgb(var(--surface) / 0.04);
  border: 1px solid rgb(var(--border-subtle) / 0.08);
  border-radius: 8px;
}
.advisory[data-level='bad']  { border-left: 3px solid rgb(var(--bad)); }
.advisory[data-level='warn'] { border-left: 3px solid rgb(var(--warn)); }
.advisory[data-level='info'] { border-left: 3px solid rgb(var(--accent)); }

.advisory-icon {
  width: 24px;
  height: 24px;
  border-radius: 99px;
  border: 1.5px solid currentColor;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  font-weight: 700;
  margin-left: 10px;
  margin-top: 1px;
}
.advisory[data-level='bad']  .advisory-icon { color: rgb(var(--bad)); }
.advisory[data-level='warn'] .advisory-icon { color: rgb(var(--warn)); }
.advisory[data-level='info'] .advisory-icon { color: rgb(var(--accent)); }

.advisory-body { min-width: 0; padding-right: 8px; }
.advisory-title {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13.5px;
  font-weight: 600;
  color: rgb(var(--ink-1));
  margin-bottom: 3px;
}
.advisory-text {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 12.5px;
  color: rgb(var(--ink-1) / 0.62);
  line-height: 1.45;
}
</style>
