<script setup lang="ts">
defineProps<{
  label: string
  value: string
  /** Status palette for the value — defaults to ink-1. */
  tone?: 'ink' | 'good' | 'warn' | 'bad' | 'totality' | 'dim'
  /** When true: mono 13px tabular. When false: Inter Tight 16px tabular. */
  mono?: boolean
}>()
</script>

<template>
  <div class="st">
    <div class="st-l">{{ label }}</div>
    <div class="st-v" :data-tone="tone ?? 'ink'" :data-mono="mono ?? false">{{ value }}</div>
  </div>
</template>

<style scoped>
.st { min-width: 0; }
.st-l {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.1em;
  color: rgb(var(--ink-1) / 0.42);
  text-transform: uppercase;
}
.st-v {
  margin-top: 2px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 16px;
  color: rgb(var(--ink-1));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.st-v[data-mono='true'] {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 13px;
}
.st-v[data-tone='good']     { color: rgb(var(--good)); }
.st-v[data-tone='warn']     { color: rgb(var(--warn)); }
.st-v[data-tone='bad']      { color: rgb(var(--bad)); }
.st-v[data-tone='totality'] { color: rgb(var(--totality)); }
.st-v[data-tone='dim']      { color: rgb(var(--ink-1) / 0.62); }
</style>
