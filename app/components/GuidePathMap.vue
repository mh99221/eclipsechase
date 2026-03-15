<script setup lang="ts">
import mapboxgl from 'mapbox-gl'
import { addEclipsePathLayers } from '~/utils/mapLayers'
import { REGION_LABELS } from '~/utils/eclipse'

const config = useRuntimeConfig()
const mapContainer = ref<HTMLElement | null>(null)
let map: mapboxgl.Map | null = null

const REGION_MARKERS: { key: string; lng: number; lat: number }[] = [
  { key: 'westfjords', lng: -22.8, lat: 65.8 },
  { key: 'snaefellsnes', lng: -23.5, lat: 64.85 },
  { key: 'borgarfjordur', lng: -21.5, lat: 64.7 },
  { key: 'reykjanes', lng: -22.2, lat: 63.95 },
  { key: 'reykjavik', lng: -21.9, lat: 64.15 },
]

onMounted(() => {
  if (!mapContainer.value) return

  mapboxgl.accessToken = config.public.mapboxToken as string

  map = new mapboxgl.Map({
    container: mapContainer.value,
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [-22.5, 65.0],
    zoom: 5.5,
    interactive: false,
    attributionControl: false,
  })

  map.on('load', () => {
    if (!map) return

    addEclipsePathLayers(map, { borderWidth: 1, centerlineOpacity: 0.8 })

    // Region labels as markers
    for (const region of REGION_MARKERS) {
      const el = document.createElement('div')
      el.className = 'guide-map-label'
      el.textContent = REGION_LABELS[region.key] || region.key

      new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([region.lng, region.lat])
        .addTo(map)
    }
  })
})

onUnmounted(() => {
  map?.remove()
  map = null
})
</script>

<template>
  <ClientOnly>
    <div
      ref="mapContainer"
      class="w-full rounded border border-void-border"
      style="height: 400px;"
    />
    <template #fallback>
      <div
        class="w-full rounded border border-void-border bg-void-surface flex items-center justify-center text-slate-500 font-mono text-sm"
        style="height: 400px;"
      >
        Loading map…
      </div>
    </template>
  </ClientOnly>
</template>

<style scoped>
:deep(.guide-map-label) {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  color: #94a3b8;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8), 0 0 2px rgba(0, 0, 0, 0.6);
  pointer-events: none;
  white-space: nowrap;
  letter-spacing: 0.04em;
}
</style>
