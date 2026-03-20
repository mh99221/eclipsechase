<script setup lang="ts">
const props = defineProps<{
  lat: number
  lng: number
  sunAzimuth: number
  spotName: string
}>()

const config = useRuntimeConfig()
const mapContainer = ref<HTMLElement | null>(null)
const mapError = ref('')
let map: any = null

watch(mapContainer, async (el) => {
  if (!el || map) return

  const token = config.public.mapboxToken as string
  if (!token) {
    mapError.value = 'No Mapbox token configured'
    return
  }

  try {
    const mapboxgl = (await import('mapbox-gl')).default
    mapboxgl.accessToken = token

    map = new mapboxgl.Map({
      container: el,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [props.lng, props.lat],
      zoom: 13,
      attributionControl: false,
    })

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

    map.on('load', () => {
      if (!map) return

      // Sun direction wedge (±20° from sun azimuth, extending ~2km)
      const wedgeGeoJSON = createDirectionWedge(props.lat, props.lng, props.sunAzimuth, 2000, 20)
      map.addSource('sun-direction', { type: 'geojson', data: wedgeGeoJSON })
      map.addLayer({
        id: 'sun-direction-fill',
        type: 'fill',
        source: 'sun-direction',
        paint: {
          'fill-color': '#f59e0b',
          'fill-opacity': 0.08,
        },
      })
      map.addLayer({
        id: 'sun-direction-line',
        type: 'line',
        source: 'sun-direction',
        paint: {
          'line-color': '#f59e0b',
          'line-width': 1.5,
          'line-opacity': 0.4,
          'line-dasharray': [4, 3],
        },
      })

      // Sun direction label at the tip of the wedge
      const tipPoint = movePoint(props.lat, props.lng, props.sunAzimuth, 2000)
      map.addSource('sun-label', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [tipPoint[1], tipPoint[0]] },
          properties: { label: `Sun ☀ ${Math.round(props.sunAzimuth)}°` },
        },
      })
      map.addLayer({
        id: 'sun-label-text',
        type: 'symbol',
        source: 'sun-label',
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 11,
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
          'text-offset': [0, -0.8],
          'text-anchor': 'bottom',
        },
        paint: {
          'text-color': '#f59e0b',
          'text-halo-color': '#0a0e17',
          'text-halo-width': 1.5,
        },
      })

      // Spot marker
      const markerEl = document.createElement('div')
      markerEl.className = 'spot-map-marker'
      new mapboxgl.Marker({ element: markerEl, anchor: 'center' })
        .setLngLat([props.lng, props.lat])
        .addTo(map!)
    })

    map.on('error', (e: any) => {
      console.error('[SpotLocationMap] Mapbox error:', e)
      mapError.value = 'Map failed to load'
    })
  } catch (err: any) {
    console.error('[SpotLocationMap]', err)
    mapError.value = err.message || 'Map failed to load'
  }
})

onUnmounted(() => {
  map?.remove()
  map = null
})

// Move a point along a bearing by a distance in meters
function movePoint(lat: number, lng: number, bearing: number, distanceM: number): [number, number] {
  const R = 6371000
  const d = distanceM / R
  const brng = (bearing * Math.PI) / 180
  const lat1 = (lat * Math.PI) / 180
  const lng1 = (lng * Math.PI) / 180

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng),
  )
  const lng2 = lng1 + Math.atan2(
    Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
    Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
  )

  return [(lat2 * 180) / Math.PI, (lng2 * 180) / Math.PI]
}

// Create a GeoJSON polygon for a direction wedge
function createDirectionWedge(lat: number, lng: number, azimuth: number, radiusM: number, halfAngle: number) {
  const points: [number, number][] = [[lng, lat]] // center
  const steps = 20
  for (let i = 0; i <= steps; i++) {
    const angle = azimuth - halfAngle + (2 * halfAngle * i) / steps
    const [pLat, pLng] = movePoint(lat, lng, angle, radiusM)
    points.push([pLng, pLat])
  }
  points.push([lng, lat]) // close

  return {
    type: 'Feature' as const,
    geometry: { type: 'Polygon' as const, coordinates: [points] },
    properties: {},
  }
}
</script>

<template>
  <ClientOnly>
    <div v-if="mapError" class="w-full rounded border border-void-border bg-void-surface flex items-center justify-center text-slate-500 font-mono text-sm" style="height: 280px;">
      {{ mapError }}
    </div>
    <div
      v-else
      ref="mapContainer"
      class="w-full rounded border border-void-border"
      style="height: 280px;"
    />
    <template #fallback>
      <div class="w-full rounded border border-void-border bg-void-surface flex items-center justify-center text-slate-500 font-mono text-sm" style="height: 280px;">
        Loading map…
      </div>
    </template>
  </ClientOnly>
</template>

<style scoped>
:deep(.spot-map-marker) {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #f59e0b;
  border: 2px solid #0a0e17;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.25), 0 2px 8px rgba(0, 0, 0, 0.5);
}
</style>
