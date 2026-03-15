<script setup lang="ts">
import mapboxgl from 'mapbox-gl'

const config = useRuntimeConfig()
const mapContainer = ref<HTMLElement | null>(null)
let map: mapboxgl.Map | null = null

const REGION_MARKERS = [
  { label: 'Westfjords', lng: -22.8, lat: 65.8 },
  { label: 'Snæfellsnes', lng: -23.5, lat: 64.85 },
  { label: 'Borgarfjörður', lng: -21.5, lat: 64.7 },
  { label: 'Reykjanes', lng: -22.2, lat: 63.95 },
  { label: 'Reykjavík', lng: -21.9, lat: 64.15 },
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

    // Eclipse path GeoJSON (same source as EclipseMap)
    map.addSource('eclipse-path', {
      type: 'geojson',
      data: '/eclipse-data/path.geojson',
    })

    // Totality fill
    map.addLayer({
      id: 'totality-fill',
      type: 'fill',
      source: 'eclipse-path',
      filter: ['==', ['get', 'type'], 'totality_path'],
      paint: {
        'fill-color': '#f59e0b',
        'fill-opacity': 0.08,
      },
    })

    // Totality border
    map.addLayer({
      id: 'totality-border',
      type: 'line',
      source: 'eclipse-path',
      filter: ['==', ['get', 'type'], 'totality_path'],
      paint: {
        'line-color': '#f59e0b',
        'line-opacity': 0.4,
        'line-width': 1,
        'line-dasharray': [4, 3],
      },
    })

    // Centerline
    map.addLayer({
      id: 'centerline',
      type: 'line',
      source: 'eclipse-path',
      filter: ['==', ['get', 'type'], 'centerline'],
      paint: {
        'line-color': '#fbbf24',
        'line-width': 2,
        'line-opacity': 0.8,
      },
    })

    // Region labels as markers
    for (const region of REGION_MARKERS) {
      const el = document.createElement('div')
      el.className = 'guide-map-label'
      el.textContent = region.label

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
