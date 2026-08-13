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

// Site-wide archive notice. Rendered here rather than per-page so every
// route that uses the shared chrome states, above the fold, that what
// follows is a record of a past event rather than live guidance.
const { t } = useI18n()
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
    <div class="page-inner">
      <p class="archive-notice ec-banner-info" data-testid="archive-notice">
        {{ t('archive.notice') }}
      </p>
      <slot />
    </div>
  </main>
</template>

<style scoped>
.page-shell {
  background: rgb(var(--bg));
  color: rgb(var(--ink-1));
  min-height: 100vh;
  /* Match BrandBar's exact height so content sits flush below the bar
     without a dark gap. BrandBar = top-padding (max 14px / safe-area-top)
     + min-height 60px + bottom-padding 14px. Tracks the safe-area inset
     automatically on notched devices so we don't need a hardcoded number. */
  padding-top: calc(60px + max(14px, env(safe-area-inset-top)) + 14px);
  padding-bottom: 80px;
}
.page-shell.no-top    { padding-top: 0; }
.page-shell.no-bottom { padding-bottom: 0; }

/* Desktop sees the bottom nav swap for the masthead, so the 80px bottom
   pad becomes wasted space. Trim it on tablet+ for the gated pages. */
@media (min-width: 768px) {
  .page-shell { padding-bottom: 32px; }
  .page-shell.no-bottom { padding-bottom: 0; }
}

.page-inner {
  width: 100%;
}

/* Deliberately quiet: one line of small mono set inside the reading column,
   so it registers as a standing note rather than an alert competing with
   the page it introduces. */
.archive-notice {
  margin: 0 16px 20px;
  padding: 9px 12px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10.5px;
  line-height: 1.5;
  letter-spacing: 0.06em;
}
@media (min-width: 768px) {
  .archive-notice { margin: 0 24px 24px; }
}

/* Width modes — only kick in on tablet+ so mobile stays full-bleed. */
@media (min-width: 768px) {
  .page-shell.width-reading .page-inner { max-width: 768px; margin-left: auto; margin-right: auto; }
  .page-shell.width-wide .page-inner    { max-width: 1120px; margin-left: auto; margin-right: auto; }
  /* full: no constraint */
}
</style>
