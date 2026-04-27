<script setup lang="ts">
defineProps<{
  /** Stable identifier for analytics/QA — surfaces as data-screen on the root. */
  screen: string
  /** Drop the bottom 90px clearance (e.g. when the page itself is full-bleed). */
  noBottom?: boolean
  /** Drop the top 90px clearance (e.g. when the BrandBar isn't shown). */
  noTop?: boolean
  /**
   * Layout mode for desktop content width.
   *  - `reading` (default): caps content at 768px, centered. Right for
   *     long-scroll editorial pages (guide, spot detail, dashboard).
   *  - `wide`: caps at 1120px. Right for grid pages (spots list).
   *  - `full`: no max-width; content runs edge-to-edge. Right for full-bleed
   *     pages like the live map.
   */
  width?: 'reading' | 'wide' | 'full'
}>()
</script>

<template>
  <main
    :data-screen="screen"
    class="page-shell"
    :class="[
      `width-${width ?? 'reading'}`,
      { 'no-top': noTop, 'no-bottom': noBottom },
    ]"
  >
    <div class="page-inner"><slot /></div>
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

/* Desktop sees the bottom nav swap for the masthead, so the 90px bottom
   pad becomes wasted space. Trim it on tablet+ for the gated pages. */
@media (min-width: 768px) {
  .page-shell { padding-bottom: 32px; }
  .page-shell.no-bottom { padding-bottom: 0; }
}

.page-inner {
  width: 100%;
}

/* Width modes — only kick in on tablet+ so mobile stays full-bleed. */
@media (min-width: 768px) {
  .page-shell.width-reading .page-inner { max-width: 768px; margin-left: auto; margin-right: auto; }
  .page-shell.width-wide .page-inner    { max-width: 1120px; margin-left: auto; margin-right: auto; }
  /* full: no constraint */
}
</style>
