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

      // Bullseye matching /map's selected pin. Mapbox wraps the
      // marker in its own div and overrides positioning, so the
      // inner dot needs to be a real child element — a pseudo
      // ::after gets stripped/repositioned.
      const userEl = document.createElement('div')
      userEl.className = 'check-map-marker check-map-marker--user'
      userEl.setAttribute('aria-label', 'Your input location')
      const userInner = document.createElement('div')
      userInner.className = 'check-map-marker--user-dot'
      userEl.appendChild(userInner)
      new mapboxgl.Marker({ element: userEl, anchor: 'center' })
        .setLngLat([props.result.input.lng, props.result.input.lat])
        .addTo(map)

      // Nearest horizon grid point — small accent dot, only if we
      // actually have one (input outside the pre-computed grid → null).
      const ngp = props.result.horizon.nearestGridPoint
      if (ngp && ngp.distanceMeters > 50) {
        const gridEl = document.createElement('div')
        gridEl.className = 'check-map-marker check-map-marker--grid'
        gridEl.setAttribute('aria-label', 'Nearest pre-computed horizon grid point')
        gridEl.title = `Horizon grid sample · ${Math.round(ngp.distanceMeters)} m away`
        new mapboxgl.Marker({ element: gridEl, anchor: 'center' })
          .setLngLat([ngp.lng, ngp.lat])
          .addTo(map)
      }

      // ERA5 cloud-history cell — outlined 0.25° square + centre dot so
      // it reads as a region the cloud average covers, not a point. The
      // user can see how coarse the cloud climatology grid is compared
      // to their input.
      const cloud = props.result.cloudHistory
      if (cloud) {
        const cLat = cloud.sampledAt.lat
        const cLng = cloud.sampledAt.lng
        const half = 0.125  // half of 0.25° ERA5 cell
        const polygon = {
          type: 'FeatureCollection' as const,
          features: [{
            type: 'Feature' as const,
            properties: {},
            geometry: {
              type: 'Polygon' as const,
              coordinates: [[
                [cLng - half, cLat - half],
                [cLng + half, cLat - half],
                [cLng + half, cLat + half],
                [cLng - half, cLat + half],
                [cLng - half, cLat - half],
              ]],
            },
          }],
        }
        map.addSource('check-era5-cell', { type: 'geojson', data: polygon })
        map.addLayer({
          id: 'check-era5-cell-fill',
          type: 'fill',
          source: 'check-era5-cell',
          paint: { 'fill-color': '#38bdf8', 'fill-opacity': 0.06 },
        })
        map.addLayer({
          id: 'check-era5-cell-outline',
          type: 'line',
          source: 'check-era5-cell',
          paint: {
            'line-color': '#38bdf8',
            'line-opacity': 0.55,
            'line-width': 1.25,
            'line-dasharray': [3, 2],
          },
        })

        const cloudEl = document.createElement('div')
        cloudEl.className = 'check-map-marker check-map-marker--era5'
        cloudEl.setAttribute('aria-label', 'ERA5 cloud-history sample cell')
        cloudEl.title = `ERA5 cloud sample · 0.25° cell centred ${
          Math.round(cloud.sampledAt.distanceMeters / 100) / 10
        } km away`
        new mapboxgl.Marker({ element: cloudEl, anchor: 'center' })
          .setLngLat([cLng, cLat])
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
  <div class="check-map-legend">
    <span class="legend-item">
      <span class="legend-dot legend-dot--user" />
      <span>Your input</span>
    </span>
    <span v-if="result.horizon.nearestGridPoint && result.horizon.nearestGridPoint.distanceMeters > 50" class="legend-item">
      <span class="legend-dot legend-dot--grid" />
      <span>Horizon sample</span>
    </span>
    <span v-if="result.cloudHistory" class="legend-item">
      <span class="legend-dot legend-dot--era5" />
      <span>ERA5 cloud cell (0.25°)</span>
    </span>
    <span class="legend-item">
      <span class="legend-bar legend-bar--path" />
      <span>Totality path</span>
    </span>
  </div>
</template>

<style scoped>
.check-map-wrap {
  position: relative;
  width: 100%;
  height: 520px;
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

.check-map-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 10px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--ink-1) / 0.62);
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.legend-dot {
  display: inline-block;
  border-radius: 50%;
  flex-shrink: 0;
}
.legend-dot--user {
  width: 12px;
  height: 12px;
  background: rgb(var(--map-marker-bg));
  border: 2px solid #D85848;
  box-shadow: 0 0 0 1px rgba(216, 88, 72, 0.35);
  position: relative;
}
.legend-dot--user::after {
  content: '';
  position: absolute;
  inset: 2px;
  border-radius: 50%;
  background: #D85848;
}
.legend-dot--grid {
  width: 8px;
  height: 8px;
  background: #78D888;
  border: 1.5px solid #0a0a0a;
}
.legend-dot--era5 {
  width: 8px;
  height: 8px;
  background: #38bdf8;
  border: 1.5px solid #0a0a0a;
}
.legend-bar {
  display: inline-block;
  width: 16px;
  height: 3px;
  border-radius: 2px;
  flex-shrink: 0;
}
.legend-bar--path {
  background: #fbbf24;
  opacity: 0.7;
}

/* Mapbox injects these outside the scoped component tree, so they
   need :global. User pin mirrors the selected-spot pin on /map
   exactly (26 px outer, --map-marker-bg fill, 11 px red inner). */
:global(.check-map-marker--user) {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgb(var(--map-marker-bg));
  border: 2px solid #D85848;
  box-shadow: 0 0 14px rgba(216, 88, 72, 0.5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
:global(.check-map-marker--user-dot) {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #D85848;
}
:global(.check-map-marker--grid) {
  /* Horizon-grid sample point — green to read as a positive "this
     is the spot we actually evaluated" anchor distinct from the
     red user pin. */
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #78D888;
  border: 2px solid #0a0a0a;
  opacity: 0.9;
}
:global(.check-map-marker--era5) {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #38bdf8;
  border: 2px solid #0a0a0a;
  opacity: 0.85;
}
</style>
