<script setup lang="ts">
import Pill from '~/components/ui/Pill.vue'
import { PROFILES, type ProfileId } from '~/composables/useRecommendation'

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
   *  `overlays` — only the layer-toggle row (WEATHER / ROADS / LIVE CAMS). */
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
      >LIVE CAMS</Pill>
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
    /* 60 (fixed BrandBar height) + 14 (gap) — clears the top nav. */
    top: 74px;
    right: 14px;
    flex-direction: row;
    pointer-events: none;
  }
  .chip-stack[data-variant='topright'] .row {
    flex-wrap: nowrap;
    pointer-events: auto;
  }
}
</style>
