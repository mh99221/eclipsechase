<script setup lang="ts">
const { t } = useI18n()
const { isPro } = useProStatus()
const { openUpsell } = useUpsell()

// Tile-eyebrow tokens — re-uses the nav.* labels so the eyebrow
// follows the active locale. PRO is a brand token and stays
// untranslated.
const proEyebrow = 'PRO'

function onMapTileClick(e: MouseEvent) {
  if (!isPro.value) {
    e.preventDefault()
    openUpsell({ source: 'tile' })
  }
}
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

    <NuxtLinkLocale
      data-testid="home-tile"
      data-testid-extra="home-tile-map"
      :to="isPro ? '/map' : '#'"
      class="tile"
      :class="{ locked: !isPro }"
      @click="onMapTileClick"
    >
      <span class="tile-eyebrow">{{ t('nav.map').toUpperCase() }}<span v-if="!isPro" class="tile-lock" aria-hidden="true">🔒</span></span>
      <span class="tile-title">{{ t('v0.home.tile_map_title') }}</span>
      <span class="tile-body">{{ t('v0.home.tile_map_body') }}</span>
    </NuxtLinkLocale>

    <NuxtLinkLocale
      v-if="!isPro"
      data-testid="home-tile"
      data-testid-extra="home-tile-pro"
      to="/pro"
      class="tile tile-accent"
    >
      <span class="tile-eyebrow">{{ proEyebrow }}</span>
      <span class="tile-title">{{ t('v0.home.tile_pro_title') }}</span>
      <span class="tile-body">{{ t('v0.home.tile_pro_body') }}</span>
    </NuxtLinkLocale>

    <NuxtLinkLocale
      v-else
      data-testid="home-tile"
      data-testid-extra="home-tile-dashboard"
      to="/dashboard"
      class="tile"
    >
      <span class="tile-eyebrow">{{ t('nav.home').toUpperCase() }}</span>
      <span class="tile-title">{{ t('v0.home.tile_dashboard_title') }}</span>
      <span class="tile-body">{{ t('v0.home.tile_dashboard_body') }}</span>
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
  .home-tile-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
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
  border: 1px solid rgb(var(--border-subtle) / 0.4);
  border-radius: 4px;
  text-decoration: none;
  color: rgb(var(--ink-1));
  transition: border-color 0.2s ease, background 0.2s ease;
  min-height: 124px;
}
.tile:hover {
  border-color: rgb(var(--border-subtle) / 0.8);
  background: rgb(var(--surface) / 0.08);
}
.tile.locked { color: rgb(var(--ink-2)); }
.tile-accent {
  border-color: rgb(var(--accent) / 0.5);
  background: rgb(var(--accent) / 0.06);
}
.tile-accent:hover {
  border-color: rgb(var(--accent));
  background: rgb(var(--accent) / 0.1);
}

.tile-eyebrow {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.16em;
  color: rgb(var(--ink-3));
  text-transform: uppercase;
}
.tile-lock {
  display: inline-block;
  margin-left: 3px;
  font-size: 10px;
  vertical-align: middle;
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
