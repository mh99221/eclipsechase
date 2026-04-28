<script setup lang="ts">
defineProps<{
  variant?: 'plain' | 'dot' | 'dash'
  align?: 'left' | 'center'
  tone?: 'dim' | 'accent' | 'faint'
}>()
</script>

<template>
  <div
    class="eyebrow"
    :data-variant="variant ?? 'plain'"
    :data-align="align ?? 'left'"
    :data-tone="tone ?? 'dim'"
  >
    <span v-if="variant === 'dot'">● </span>
    <span v-else-if="variant === 'dash'">— </span>
    <slot />
  </div>
</template>

<style scoped>
.eyebrow {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.eyebrow[data-tone='dim']    { color: rgb(var(--ink-1) / 0.62); }
.eyebrow[data-tone='accent'] { color: rgb(var(--accent)); }
.eyebrow[data-tone='faint']  { color: rgb(var(--ink-1) / 0.42); }
.eyebrow[data-align='center'] { text-align: center; }
</style>
