<script setup lang="ts">
/**
 * Mini Iceland map showing the user's input pin, the totality path
 * band, and (if available) the nearest pre-computed horizon grid
 * point. Renders Mapbox once on mount and tears down on unmount.
 *
 * Centered on the user's input with a zoom level wide enough to show
 * the path edges. Pitch is locked at 0 — this is a context map, not a
 * 3D viewer like SpotLocationMap.
 */
import 'mapbox-gl/dist/mapbox-gl.css'
import { addEclipsePathLayers } from '~/utils/mapLayers'
import type { CheckResult } from '~/types/check'

const props = defineProps<{ result: CheckResult }>()

const config = useRuntimeConfig()
const mapContainer = ref<HTMLElement | null>(null)
const mapError = ref('')
let map: any = null

onMounted(async () => {
  if (!mapContainer.value) return
  const token = (config.public.mapboxToken as string) || ''
  if (!token) {
    mapError.value = 'Map token not configured.'
    return
  }
  try {
    const mod = await import('mapbox-gl')
    const mapboxgl: any = mod.default ?? mod
    mapboxgl.accessToken = token

    map = new mapboxgl.Map({
      container: mapContainer.value,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [props.result.input.lng, props.result.input.lat],
      zoom: 7.6,
      attributionControl: false,
      cooperativeGestures: true,  // require ⌘/Ctrl-scroll to zoom — no scroll-trap
    })

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right')

    map.on('load', () => {
      // Totality path overlay
      try {
        addEclipsePathLayers(map)
      } catch (e: any) {
        console.warn('[CheckMiniMap] failed to add path layers:', e?.message)
      }

      // User input marker — red dot with the "you" label
      const userEl = document.createElement('div')
      userEl.className = 'check-map-marker check-map-marker--user'
      userEl.setAttribute('aria-label', 'Your input location')
      new mapboxgl.Marker({ element: userEl, anchor: 'center' })
        .setLngLat([props.result.input.lng, props.result.input.lat])
        .addTo(map)

      // Nearest horizon grid point — small accent dot, only if we
      // actually have one (input outside the pre-computed grid → null).
      const ngp = props.result.horizon.nearestGridPoint
      if (ngp && ngp.distanceMeters > 50) {
        const gridEl = document.createElement('div')
        gridEl.className = 'check-map-marker check-map-marker--grid'
        gridEl.setAttribute('aria-label', 'Nearest pre-computed grid point')
        new mapboxgl.Marker({ element: gridEl, anchor: 'center' })
          .setLngLat([ngp.lng, ngp.lat])
          .addTo(map)
      }
    })

    map.on('error', (e: any) => {
      if (e?.error?.message?.includes('token')) {
        mapError.value = 'Map token invalid.'
      }
    })
  } catch (e: any) {
    console.error('[CheckMiniMap] init failed:', e)
    mapError.value = 'Failed to load map.'
  }
})

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<template>
  <div class="check-map-wrap">
    <div ref="mapContainer" class="check-map" />
    <p v-if="mapError" class="check-map-error">{{ mapError }}</p>
  </div>
</template>

<style scoped>
.check-map-wrap {
  position: relative;
  width: 100%;
  height: 260px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgb(var(--border-subtle) / 0.08);
  background: rgb(var(--surface) / 0.04);
}
.check-map {
  width: 100%;
  height: 100%;
}
.check-map-error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 16px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  color: rgb(var(--ink-1) / 0.62);
  background: rgb(var(--surface) / 0.04);
}

/* Markers are styled via :global so Mapbox can inject them outside
   the scoped component tree. */
:global(.check-map-marker--user) {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ef4444;
  border: 3px solid #fff;
  box-shadow: 0 0 0 2px rgb(239 68 68 / 0.45), 0 2px 8px rgba(0, 0, 0, 0.6);
}
:global(.check-map-marker--grid) {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: rgb(var(--accent));
  border: 2px solid #0a0a0a;
  opacity: 0.85;
}
</style>
