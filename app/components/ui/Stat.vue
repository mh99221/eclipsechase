<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  sub?: string
  tone?: 'totality' | 'good' | 'warn' | 'bad' | 'ink'
  size?: 'sm' | 'md' | 'lg'   // sm=14, md=18, lg=26
}>()
</script>

<template>
  <div class="ui-stat">
    <div class="ui-stat-label">{{ label }}</div>
    <div class="ui-stat-value" :data-tone="tone ?? 'ink'" :data-size="size ?? 'md'">{{ value }}</div>
    <div v-if="sub" class="ui-stat-sub">{{ sub }}</div>
  </div>
</template>

<style scoped>
.ui-stat-label {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  letter-spacing: 0.17em;
  color: rgb(var(--ink-1) / 0.42);
  text-transform: uppercase;
}
.ui-stat-value {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  margin-top: 4px;
  color: rgb(var(--ink-1));
  letter-spacing: -0.005em;
}
.ui-stat-value[data-size='sm'] { font-size: 14px; }
.ui-stat-value[data-size='md'] { font-size: 18px; }
.ui-stat-value[data-size='lg'] { font-size: 26px; }
.ui-stat-value[data-tone='totality'] { color: rgb(var(--totality)); }
.ui-stat-value[data-tone='good']     { color: rgb(var(--good)); }
.ui-stat-value[data-tone='warn']     { color: rgb(var(--warn)); }
.ui-stat-value[data-tone='bad']      { color: rgb(var(--bad)); }

.ui-stat-sub {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9px;
  color: rgb(var(--ink-1) / 0.62);
  margin-top: 2px;
}
</style>
