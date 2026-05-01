<script setup lang="ts">
import Pill from '~/components/ui/Pill.vue'
import { PROFILES, type ProfileId } from '~/composables/useRecommendation'

const { t } = useI18n()

withDefaults(defineProps<{
  selectedProfile: ProfileId | null
  showWeather: boolean
  showTraffic: boolean
  showCameras: boolean
  /** Layout variant.
   *  `mobile` (default) — absolutely positioned at the top of the map.
   *  `rail`           — flush inside the desktop left rail, no positioning.
   *  `topright`       — single horizontal row anchored top-right (md+ only). */
  variant?: 'mobile' | 'rail' | 'topright'
  /** Which rows to render. Default 'all' for mobile compatibility.
   *  `profiles` — only the profile selector row (ALL / Photographer / …).
   *  `overlays` — only the layer-toggle row (WEATHER / ROADS / ROAD CAMS). */
  rows?: 'all' | 'profiles' | 'overlays'
}>(), { variant: 'mobile', rows: 'all' })

const emit = defineEmits<{
  'update:selectedProfile': [ProfileId | null]
  'update:showWeather':     [boolean]
  'update:showTraffic':     [boolean]
  'update:showCameras':     [boolean]
}>()
</script>

<template>
  <div class="chip-stack" :data-variant="variant" aria-label="Map filters">
    <div v-if="rows !== 'overlays'" class="row">
      <span class="row-label">{{ t('map.viewer_profile') }}:</span>
      <Pill
        :active="selectedProfile === null"
        size="sm"
        surface="glass"
        @click="emit('update:selectedProfile', null)"
      >ALL</Pill>
      <Pill
        v-for="p in PROFILES"
        :key="p.id"
        :active="selectedProfile === p.id"
        size="sm"
        surface="glass"
        @click="emit('update:selectedProfile', p.id)"
      >{{ p.name.toUpperCase() }}</Pill>
    </div>
    <div v-if="rows !== 'profiles'" class="row">
      <span class="row-label">{{ t('map.filters') }}:</span>
      <Pill
        :active="showWeather"
        size="sm"
        surface="glass"
        @click="emit('update:showWeather', !showWeather)"
      >WEATHER</Pill>
      <Pill
        :active="showTraffic"
        size="sm"
        surface="glass"
        @click="emit('update:showTraffic', !showTraffic)"
      >ROADS</Pill>
      <Pill
        :active="showCameras"
        size="sm"
        surface="glass"
        @click="emit('update:showCameras', !showCameras)"
      >ROAD CAMS</Pill>
    </div>
  </div>
</template>

<style scoped>
/* Position rules below are variant-scoped — see [data-variant] selectors. */
.chip-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
  z-index: 5;
}
.chip-stack[data-variant='mobile'] {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
}
.chip-stack[data-variant='rail'] {
  position: static !important;
  top: auto;
  left: auto;
  right: auto;
}
.row {
  display: flex;
  gap: 6px;
  pointer-events: auto;
}
.row-label {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--ink-3));
  white-space: nowrap;
  align-self: center;
  pointer-events: none;
  /* Default: hidden. Only the topright variant surfaces the labels —
     mobile has no room and the rail variant has been retired. */
  display: none;
}
.chip-stack[data-variant='topright'] .row-label {
  display: inline-block;
  margin-right: 6px;
  color: rgb(var(--ink-1) / 0.78);
  /* No pill background — plain text. Subtle shadow keeps the label
     legible over varied Mapbox tiles. */
  text-shadow: 0 0 6px rgba(0, 0, 0, 0.65);
}
.chip-stack[data-variant='mobile'] .row {
  overflow-x: auto;
  scrollbar-width: none;
}
.chip-stack[data-variant='mobile'] .row::-webkit-scrollbar { display: none; }
/* Rail variant wraps chips into multiple rows when the rail is narrow. */
.chip-stack[data-variant='rail'] .row {
  flex-wrap: wrap;
}

/* Top-right variant — single horizontal row anchored to the top-right
   corner of the map area. Hidden below md (mobile uses the chip stack
   at the top of the map). */
.chip-stack[data-variant='topright'] {
  display: none;
}
@media (min-width: 768px) {
  .chip-stack[data-variant='topright'] {
    display: flex;
    position: absolute;
    /* Symmetric edge spacing: 24 px from both the top of the map (below
       the 60 px BrandBar) and the right edge. Mirrors the status pill
       at top:84 / left:24. */
    top: 84px;
    right: 24px;
    align-items: flex-end;
    pointer-events: none;
  }
  /* Default flex-direction: column (from base rule) stacks profiles row
     above the overlays row. Each `.row` stays internally horizontal. */
  .chip-stack[data-variant='topright'] .row {
    flex-wrap: nowrap;
    pointer-events: auto;
    align-items: center;
  }
}
</style>
