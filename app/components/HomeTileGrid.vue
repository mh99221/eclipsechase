<script setup lang="ts">
/**
 * Quick-links grid on the landing page.
 *
 * RETIRED 2026-08-13: the Map, Pro and Dashboard tiles are gone — those
 * routes no longer exist and Eclipse Pro is no longer for sale. What
 * remains are the two surviving destinations.
 *
 * Tile eyebrows re-use the nav.* labels so they follow the active locale.
 */
const { t } = useI18n()
</script>

<template>
  <div class="home-tile-grid">
    <NuxtLinkLocale
      data-testid="home-tile"
      class="tile"
      to="/spots"
    >
      <span class="tile-eyebrow">{{ t('nav.spots').toUpperCase() }}</span>
      <span class="tile-title">{{ t('v0.home.tile_spots_title') }}</span>
      <span class="tile-body">{{ t('v0.home.tile_spots_body') }}</span>
    </NuxtLinkLocale>

    <NuxtLinkLocale
      data-testid="home-tile"
      class="tile"
      to="/guide"
    >
      <span class="tile-eyebrow">{{ t('nav.guide').toUpperCase() }}</span>
      <span class="tile-title">{{ t('v0.home.tile_guide_title') }}</span>
      <span class="tile-body">{{ t('v0.home.tile_guide_body') }}</span>
    </NuxtLinkLocale>
  </div>
</template>

<style scoped>
.home-tile-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
@media (min-width: 768px) {
  .home-tile-grid { gap: 16px; }
}

.tile {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 18px 16px;
  /* --surface is a 255 255 255 RGB triplet meant to be used with alpha,
     matching the convention in Card.vue, AdvisoryCard.vue, etc. Using it
     without alpha rendered the tiles solid white in dark mode. */
  background: rgb(var(--surface) / 0.04);
  border: 1px solid rgb(var(--border-subtle) / 0.08);
  border-radius: 8px;
  text-decoration: none;
  color: rgb(var(--ink-1));
  transition: border-color 0.2s ease, background 0.2s ease;
  min-height: 124px;
}
.tile:hover {
  border-color: rgb(var(--border-subtle) / 0.16);
  background: rgb(var(--surface) / 0.08);
}

.tile-eyebrow {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.14em;
  color: rgb(var(--ink-1) / 0.62);
  font-weight: 500;
  text-transform: uppercase;
}
.tile-title {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: rgb(var(--ink-1));
}
.tile-body {
  font-size: 13px;
  line-height: 1.4;
  color: rgb(var(--ink-2));
}
</style>
