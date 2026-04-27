<script setup lang="ts">
defineProps<{
  /** Stable identifier for analytics/QA — surfaces as data-screen on the root. */
  screen: string
  /** Drop the bottom 90px clearance (e.g. when the page itself is full-bleed). */
  noBottom?: boolean
  /** Drop the top 90px clearance (e.g. when the BrandBar isn't shown). */
  noTop?: boolean
}>()
</script>

<template>
  <main
    :data-screen="screen"
    class="page-shell"
    :class="{ 'no-top': noTop, 'no-bottom': noBottom }"
  >
    <slot />
  </main>
</template>

<style scoped>
.page-shell {
  background: rgb(var(--bg));
  color: rgb(var(--ink-1));
  min-height: 100vh;
  padding-top: 90px;
  padding-bottom: 90px;
}
.page-shell.no-top    { padding-top: 0; }
.page-shell.no-bottom { padding-bottom: 0; }
</style>
