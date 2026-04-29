<script setup lang="ts">
import DockSpot from './DockSpot.vue'
import DockWeather from './DockWeather.vue'
import DockRoads from './DockRoads.vue'
import DockCam from './DockCam.vue'
import DockHorizon from './DockHorizon.vue'
import type {
  DockMode,
  DockSpotData,
  DockWeatherCtx,
  DockRoadsCtx,
  DockCamCtx,
  DockHorizonCtx,
} from './types'

defineProps<{
  mode: DockMode
  spot: DockSpotData | null
  weatherCtx: DockWeatherCtx | null
  roadsCtx: DockRoadsCtx | null
  camCtx: DockCamCtx | null
  horizonCtx: DockHorizonCtx | null
}>()

const emit = defineEmits<{
  'horizon-open':    []
  'open-field-card': []
  'cam-step':        [dir: 1 | -1]
}>()
</script>

<template>
  <div class="dock-veil">
    <div class="dock-card" role="region" aria-label="Map dock">
      <div class="dock-inner">
        <DockSpot
          v-if="mode === 'spot' && spot"
          :spot="spot"
          @horizon-open="emit('horizon-open')"
          @open-field-card="emit('open-field-card')"
        />
        <DockWeather
          v-else-if="mode === 'weather' && weatherCtx"
          :ctx="weatherCtx"
        />
        <DockRoads
          v-else-if="mode === 'roads' && roadsCtx"
          :ctx="roadsCtx"
        />
        <DockCam
          v-else-if="mode === 'cam' && camCtx"
          :ctx="camCtx"
          @cam-step="(d) => emit('cam-step', d)"
        />
        <DockHorizon
          v-else-if="mode === 'horizon' && horizonCtx"
          :ctx="horizonCtx"
        />
        <div v-else class="dock-empty">
          Tap a pin or anywhere on the map.
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dock-veil {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 40px 14px 16px;
  /* Bottom-anchored gradient fades the map below the dock. Stays dark in
     both themes — the dock layers over the dark Mapbox style by design. */
  background: linear-gradient(180deg, rgb(var(--glass) / 0) 0%, rgb(var(--glass) / 0.88) 60%, rgb(var(--glass) / 0.96) 100%);
  pointer-events: none;
  z-index: 5;
}
.dock-card {
  background: rgb(var(--glass-strong) / 0.92);
  border: 1px solid rgb(var(--border-subtle) / 0.08);
  border-radius: 14px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  pointer-events: auto;
  overflow: hidden;
}
.dock-inner { padding: 14px; }
.dock-empty {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-align: center;
  color: rgb(var(--ink-1) / 0.62);
  padding: 16px 0;
}
</style>
