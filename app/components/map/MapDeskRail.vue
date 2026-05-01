<script setup lang="ts">
import MapChipStack from './MapChipStack.vue'
import MapDock from './dock/MapDock.vue'
import type {
  DockMode,
  DockSpotData,
  DockWeatherCtx,
  DockRoadsCtx,
  DockCamCtx,
  DockHorizonCtx,
} from './dock/types'

defineProps<{
  // Layer-toggle chip state (overlay row only — profile selector is
  // mounted separately in the page top-right).
  showWeather: boolean
  showTraffic: boolean
  showCameras: boolean
  // Dock state
  mode: DockMode
  spot: DockSpotData | null
  weatherCtx: DockWeatherCtx | null
  roadsCtx: DockRoadsCtx | null
  camCtx: DockCamCtx | null
  horizonCtx: DockHorizonCtx | null
}>()

const emit = defineEmits<{
  // Chip
  'update:showWeather':     [boolean]
  'update:showTraffic':     [boolean]
  'update:showCameras':     [boolean]
  // Dock
  'horizon-open':    []
  'open-field-card': []
  'cam-step':        [dir: 1 | -1]
  'close':           []
}>()
</script>

<template>
  <aside class="desk-rail" aria-label="Map controls">
    <div class="rail-section">
      <MapChipStack
        variant="rail"
        rows="overlays"
        :selected-profile="null"
        :show-weather="showWeather"
        :show-traffic="showTraffic"
        :show-cameras="showCameras"
        @update:show-weather="emit('update:showWeather', $event)"
        @update:show-traffic="emit('update:showTraffic', $event)"
        @update:show-cameras="emit('update:showCameras', $event)"
      />
    </div>
    <div class="rail-divider" />
    <div class="rail-dock">
      <MapDock
        variant="rail"
        :mode="mode"
        :spot="spot"
        :weather-ctx="weatherCtx"
        :roads-ctx="roadsCtx"
        :cam-ctx="camCtx"
        :horizon-ctx="horizonCtx"
        @horizon-open="emit('horizon-open')"
        @open-field-card="emit('open-field-card')"
        @cam-step="(d) => emit('cam-step', d)"
        @close="emit('close')"
      />
    </div>
  </aside>
</template>

<style scoped>
.desk-rail {
  /* Hidden below md (768 px). The mobile chrome (chip stack at top + bottom dock)
     handles small screens. We do this in component CSS rather than via Tailwind's
     `md:block` so we don't depend on JIT-generated utilities. */
  display: none;
}
@media (min-width: 768px) {
  .desk-rail {
    position: fixed;
    top: 60px; /* below BrandBar */
    left: 0;
    bottom: 0;
    width: 416px;
    z-index: 10;
    display: flex;
    flex-direction: column;
    /* Solid fallback first, then theme-aware var override. The fallback
       ensures the rail is visible even when --bg-elevated is briefly
       unresolved (e.g. before main.css custom properties land). */
    background: rgba(13, 19, 32, 0.96);
    background: rgb(var(--bg-elevated, 13 19 32) / 0.96);
    border-right: 1px solid rgba(255, 255, 255, 0.08);
    border-right-color: rgb(var(--border-subtle, 255 255 255) / 0.4);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    overflow-y: auto;
    scrollbar-width: thin;
  }
}
.rail-section {
  padding: 14px 12px 10px;
}
/* Neutralise the mobile chip-stack's absolute positioning when used
   inside the rail. We can't rely on the chip-stack's own variant
   styles in dev because Vite occasionally serves stale scoped CSS
   when HMR is broken; the deep override is robust. */
.rail-section :deep(.chip-stack) {
  position: static !important;
  top: auto !important;
  left: auto !important;
  right: auto !important;
}
.rail-section :deep(.chip-stack .row) {
  flex-wrap: wrap;
  overflow-x: visible;
}
.rail-divider {
  height: 1px;
  background: rgb(var(--border-subtle) / 0.16);
  margin: 0 12px;
}
.rail-dock {
  flex: 1;
  min-height: 0;
}

@media (max-width: 900px) {
  .desk-rail {
    width: 364px;
  }
}
</style>
