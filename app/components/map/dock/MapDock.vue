<script setup lang="ts">
import DockCloseButton from './DockCloseButton.vue'
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

withDefaults(defineProps<{
  mode: DockMode
  spot: DockSpotData | null
  weatherCtx: DockWeatherCtx | null
  roadsCtx: DockRoadsCtx | null
  camCtx: DockCamCtx | null
  horizonCtx: DockHorizonCtx | null
  /** Layout variant.
   *  `mobile` (default) — bottom-anchored card with gradient veil, used by /map on mobile.
   *  `rail`           — flush card inside the desktop left rail; no veil, no border-radius. */
  variant?: 'mobile' | 'rail'
}>(), { variant: 'mobile' })

const emit = defineEmits<{
  'horizon-open':    []
  'open-field-card': []
  'cam-step':        [dir: 1 | -1]
  /** DockHorizon snap-point — forwarded so the parent can drop a
   *  "data sampled here" marker on the map. */
  'snap-point':      [{ lat: number; lng: number; distance_m: number } | null]
  /** Close button — parent dismisses whatever mode is active and
   *  returns to the default SPOT card. No-op visually in spot mode. */
  'close':           []
}>()
</script>

<template>
  <div class="dock-veil" :data-variant="variant">
    <div class="dock-card" :data-variant="variant" role="region" aria-label="Map dock">
      <DockCloseButton @close="emit('close')" />
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
          @snap-point="(p) => emit('snap-point', p)"
        />
        <div v-else class="dock-empty">
          Tap a pin or anywhere on the map.
        </div>
      </div>
    </div>
  </div>
</template>

<!--
  Shared dock styles — non-scoped so each mode component (DockSpot,
  DockWeather, DockRoads, DockCam, DockHorizon) can use the same
  `.title`, `.strip`, `.btn-ghost` classes without redeclaring CSS.
  All selectors are namespaced under `.dock-card` so they don't leak.
-->
<style>
.dock-card .title {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: rgb(var(--ink-1));
  margin-bottom: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/* Status tone for the title (ROADS shows the road condition in colour;
   HORIZON shows the verdict). Defaults to ink-1 from .title above. */
.dock-card .title[data-tone='good'] { color: rgb(var(--good)); }
.dock-card .title[data-tone='warn'] { color: rgb(var(--warn)); }
.dock-card .title[data-tone='bad']  { color: rgb(var(--bad)); }
/* Tighter bottom margin when a `.detail` / `.subtitle` sits beneath. */
.dock-card .title--with-sub { margin-bottom: 4px; }
/* HORIZON's verdict is a sentence rather than a name — slightly smaller. */
.dock-card .title--small { font-size: 17px; margin-bottom: 2px; }
.dock-card .strip {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
  padding: 10px 0;
  border-top: 1px solid rgb(var(--border-subtle) / 0.08);
  border-bottom: 1px solid rgb(var(--border-subtle) / 0.08);
  margin-bottom: 12px;
}
.dock-card .btn-ghost {
  padding: 12px 14px;
  border: 1px solid rgb(var(--border-subtle) / 0.16);
  background: transparent;
  border-radius: 8px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: rgb(var(--ink-1));
  text-align: center;
  text-transform: uppercase;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s;
}
.dock-card .btn-ghost:hover { background: rgb(var(--surface) / 0.5); }
.dock-card .btn-ghost--disabled { opacity: 0.4; pointer-events: none; }
/* SPOT mode pairs a fixed-width HORIZON button with a flex-1 CTA.
   Compact vertical padding so the button row stays trim — font size
   is unchanged. */
.dock-card .btn-ghost--cta-pair { padding: 8px 14px; flex: none; }
/* ROADS uses one full-width button. */
.dock-card .btn-ghost--full { width: 100%; }
/* HORIZON has a 2-button row that splits available width 50/50. */
.dock-card .btn-ghost--half { flex: 1; }
</style>

<style scoped>
.dock-veil[data-variant='mobile'] {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 40px 14px 16px;
  /* Bottom-anchored gradient fades the map below the dock. Theme-aware
     via `--map-pane` — dark over the dark map style, cream over light. */
  background: linear-gradient(180deg, rgb(var(--map-pane) / 0) 0%, rgb(var(--map-pane) / 0.88) 60%, rgb(var(--map-pane) / 0.96) 100%);
  pointer-events: none;
  z-index: 5;
}
/* Rail variant: no veil, no positioning — the parent rail places it. */
.dock-veil[data-variant='rail'] {
  pointer-events: auto;
}
.dock-card {
  /* `relative` is the anchor for the absolute-positioned DockCloseButton
     which sits 10px from the top-right of the card. */
  position: relative;
  pointer-events: auto;
  overflow: hidden;
}
.dock-card[data-variant='mobile'] {
  background: rgb(var(--map-pane-strong) / 0.92);
  border: 1px solid rgb(var(--border-subtle) / 0.08);
  border-radius: 14px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
/* Rail variant: flush card; the rail itself provides the surface. */
.dock-card[data-variant='rail'] {
  background: transparent;
  border: 0;
  border-radius: 0;
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
