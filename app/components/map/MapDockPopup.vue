<script setup lang="ts">
import { computed } from 'vue'
import MapDock from './dock/MapDock.vue'
import type {
  DockMode,
  DockSpotData,
  DockWeatherCtx,
  DockRoadsCtx,
  DockCamCtx,
  DockHorizonCtx,
} from './dock/types'

const props = defineProps<{
  mode: DockMode
  spot: DockSpotData | null
  weatherCtx: DockWeatherCtx | null
  roadsCtx: DockRoadsCtx | null
  camCtx: DockCamCtx | null
  horizonCtx: DockHorizonCtx | null
  /** True when the user has dismissed the popup; parent re-clears on next selection. */
  dismissed: boolean
}>()

const emit = defineEmits<{
  'horizon-open':    []
  'open-field-card': []
  'cam-step':        [dir: 1 | -1]
  'close':           []
}>()

// Only show the popup when the current mode has actual content. No idle
// "tap anywhere" empty state — popups appear in response to action.
const hasContent = computed(() => {
  if (props.dismissed) return false
  switch (props.mode) {
    case 'spot':    return props.spot !== null
    case 'weather': return props.weatherCtx !== null
    case 'roads':   return props.roadsCtx !== null
    case 'cam':     return props.camCtx !== null
    case 'horizon': return props.horizonCtx !== null
    default:        return false
  }
})
</script>

<template>
  <Transition name="dock-popup">
    <div v-if="hasContent" class="dock-popup" :data-mode="mode" role="region" aria-label="Selection details">
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
  </Transition>
</template>

<style scoped>
.dock-popup {
  /* Hidden below md (mobile uses its own bottom-anchored dock). */
  display: none;
}
@media (min-width: 768px) {
  .dock-popup {
    display: block;
    position: fixed;
    /* Lift well above the Mapbox attribution badge (~24 px tall, ~10 px
       inset from viewport edge) at bottom-right. */
    bottom: 44px;
    right: 14px;
    z-index: 12;
    /* Solid fallback first, then theme-aware var override — same defensive
       pattern other map cards use so the popup is visible even when
       --bg-elevated is briefly unresolved during cold loads. */
    background: rgba(13, 19, 32, 0.96);
    background: rgb(var(--bg-elevated, 13 19 32) / 0.96);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-color: rgb(var(--border-subtle, 255 255 255) / 0.4);
    border-radius: 14px;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    box-shadow: 0 24px 48px -16px rgba(0, 0, 0, 0.55), 0 4px 12px -4px rgba(0, 0, 0, 0.35);
    overflow: hidden;
  }
  /* Adaptive sizing per mode — content density varies a lot:
     - SPOT/WEATHER/ROADS: compact text + stat strip
     - CAM: image carousel needs room for the 4:3 frame
     - HORIZON: 320 px chart + caption + button row */
  .dock-popup[data-mode='spot']    { width: 360px; }
  .dock-popup[data-mode='weather'] { width: 320px; }
  .dock-popup[data-mode='roads']   { width: 320px; }
  .dock-popup[data-mode='cam']     { width: 380px; }
  .dock-popup[data-mode='horizon'] { width: 416px; }
}

/* Enter / leave animation — pops up from bottom with a slight scale. */
.dock-popup-enter-active,
.dock-popup-leave-active {
  transition: opacity 0.18s ease, transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.dock-popup-enter-from,
.dock-popup-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}
</style>
