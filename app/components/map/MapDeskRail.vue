<script setup lang="ts">
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
  'close':           []
}>()
</script>

<template>
  <aside class="desk-rail" aria-label="Map controls">
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
.rail-dock {
  flex: 1;
  min-height: 0;
}
@media (min-width: 768px) {
  /* Clear the absolutely-positioned status pill that floats over the
     rail's top-left corner (status-stack at top:74, ~28 px tall + gap). */
  .rail-dock {
    padding-top: 50px;
  }
}

@media (max-width: 900px) {
  .desk-rail {
    width: 364px;
  }
}
</style>
