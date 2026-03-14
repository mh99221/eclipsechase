<script setup lang="ts">
import mapboxgl from 'mapbox-gl'
import { cloudColor, formatDuration } from '~/utils/eclipse'

const props = defineProps<{
  stations?: Array<{
    station_id: string
    name: string
    lat: number
    lng: number
    region: string
    cloud_cover?: number | null
    temp?: number | null
    wind_speed?: number | null
    wind_dir?: string | null
  }>
  spots?: Array<{
    id: string
    name: string
    slug: string
    lat: number
    lng: number
    region: string
    totality_duration_seconds: number
    has_services: boolean
    cell_coverage: string
  }>
}>()

const router = useRouter()
const config = useRuntimeConfig()
const mapContainer = ref<HTMLElement | null>(null)
let map: mapboxgl.Map | null = null
const markers: mapboxgl.Marker[] = []
const spotMarkers: mapboxgl.Marker[] = []

function addEclipsePath() {
  if (!map) return

  map.addSource('eclipse-path', {
    type: 'geojson',
    data: '/eclipse-data/path.geojson',
  })

  // Totality path fill
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

  // Totality path border
  map.addLayer({
    id: 'totality-border',
    type: 'line',
    source: 'eclipse-path',
    filter: ['==', ['get', 'type'], 'totality_path'],
    paint: {
      'line-color': '#f59e0b',
      'line-opacity': 0.4,
      'line-width': 1.5,
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
      'line-opacity': 0.6,
      'line-width': 2,
    },
  })
}

function updateMarkers() {
  // Remove existing markers
  markers.forEach(m => m.remove())
  markers.length = 0

  if (!map || !props.stations) return

  for (const station of props.stations) {
    const color = cloudColor(station.cloud_cover)

    const el = document.createElement('div')
    el.className = 'station-marker'
    el.style.cssText = `
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: ${color};
      border: 2px solid rgba(5, 8, 16, 0.8);
      box-shadow: 0 0 8px ${color}66;
      cursor: pointer;
    `

    const popup = new mapboxgl.Popup({
      offset: 12,
      closeButton: false,
      className: 'eclipse-popup',
    }).setHTML(`
      <div style="font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #e2e8f0; padding: 4px;">
        <div style="font-family: 'Syne', sans-serif; font-weight: 600; font-size: 14px; margin-bottom: 6px;">${station.name}</div>
        ${station.cloud_cover != null ? `<div style="color: ${color};">Cloud cover: ${station.cloud_cover}%</div>` : ''}
        ${station.temp != null ? `<div>Temp: ${station.temp}°C</div>` : ''}
        ${station.wind_speed != null ? `<div>Wind: ${station.wind_speed} m/s ${station.wind_dir || ''}</div>` : ''}
      </div>
    `)

    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat([station.lng, station.lat])
      .setPopup(popup)
      .addTo(map)

    markers.push(marker)
  }
}

function updateSpotMarkers() {
  spotMarkers.forEach(m => m.remove())
  spotMarkers.length = 0

  if (!map || !props.spots) return

  for (const spot of props.spots) {
    const el = document.createElement('div')
    el.className = 'spot-marker'
    el.style.cssText = `
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #050810;
      border: 2px solid #f59e0b;
      box-shadow: 0 0 12px rgba(245, 158, 11, 0.3);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    `
    // Inner dot
    const inner = document.createElement('div')
    inner.style.cssText = 'width: 6px; height: 6px; border-radius: 50%; background: #f59e0b;'
    el.appendChild(inner)

    const popup = new mapboxgl.Popup({
      offset: 14,
      closeButton: false,
      className: 'eclipse-popup',
    }).setHTML(`
      <div style="font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #e2e8f0; padding: 4px; cursor: pointer;" data-slug="${spot.slug}">
        <div style="font-family: 'Syne', sans-serif; font-weight: 600; font-size: 14px; margin-bottom: 4px; color: #fbbf24;">${spot.name}</div>
        <div>Totality: ${formatDuration(spot.totality_duration_seconds)}</div>
        <div style="margin-top: 6px; color: #f59e0b; font-size: 11px;">Click for details →</div>
      </div>
    `)

    // Single listener on popup open — uses { once: true } per open cycle
    // to avoid accumulating listeners
    popup.on('open', () => {
      const popupEl = popup.getElement()
      popupEl?.addEventListener('click', () => {
        router.push(`/spots/${spot.slug}`)
      }, { once: true })
    })

    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat([spot.lng, spot.lat])
      .setPopup(popup)
      .addTo(map)

    spotMarkers.push(marker)
  }
}

watch(() => props.stations, updateMarkers, { deep: true })
watch(() => props.spots, updateSpotMarkers)

onMounted(() => {
  if (!mapContainer.value) return

  mapboxgl.accessToken = config.public.mapboxToken as string

  map = new mapboxgl.Map({
    container: mapContainer.value,
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [-23.5, 65.0],
    zoom: 6,
    minZoom: 5,
    maxZoom: 12,
    attributionControl: false,
  })

  map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
  map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right')

  map.on('load', () => {
    addEclipsePath()
    updateMarkers()
    updateSpotMarkers()
  })
})

onUnmounted(() => {
  markers.forEach(m => m.remove())
  spotMarkers.forEach(m => m.remove())
  map?.remove()
  map = null
})
</script>

<template>
  <div ref="mapContainer" class="w-full h-full" />
</template>

<style>
/* Mapbox popup overrides for dark theme */
.eclipse-popup .mapboxgl-popup-content {
  background: #0a1020;
  border: 1px solid rgba(26, 37, 64, 0.6);
  border-radius: 4px;
  padding: 8px 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.eclipse-popup .mapboxgl-popup-tip {
  border-top-color: #0a1020;
}
</style>
