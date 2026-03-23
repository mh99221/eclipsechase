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
const is3D = ref(true)
const showPOIs = ref(true)
let map: any = null
let mapboxgl: any = null
const poiMarkers: any[] = []

// POI categories with icons and colors
const POI_CATEGORIES: Record<string, { icon: string; color: string; label: string }> = {
  parking: { icon: 'P', color: '#3b82f6', label: 'Parking' },
  fuel: { icon: '⛽', color: '#f97316', label: 'Gas station' },
  restaurant: { icon: '🍽', color: '#ef4444', label: 'Restaurant' },
  cafe: { icon: '☕', color: '#a855f7', label: 'Café' },
  toilet: { icon: 'WC', color: '#6b7280', label: 'Toilets' },
  shelter: { icon: '⌂', color: '#22c55e', label: 'Shelter' },
  information: { icon: 'i', color: '#0ea5e9', label: 'Info' },
  hotel: { icon: '🛏', color: '#ec4899', label: 'Accommodation' },
}

// Mapbox POI layer filter expressions for each category
const POI_FILTERS: Record<string, string[]> = {
  parking: ['parking', 'parking_garage'],
  fuel: ['fuel'],
  restaurant: ['restaurant'],
  cafe: ['cafe'],
  toilet: ['toilet'],
  shelter: ['shelter', 'hut'],
  information: ['information', 'visitor_center'],
  hotel: ['hotel', 'hostel', 'guest_house', 'motel', 'camp_site'],
}

function toggle3D() {
  if (!map) return
  is3D.value = !is3D.value
  if (is3D.value) {
    map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 })
    map.easeTo({ pitch: 60, bearing: props.sunAzimuth - 180, duration: 1000 })
  } else {
    map.setTerrain(null)
    map.easeTo({ pitch: 0, bearing: 0, duration: 1000 })
  }
}

function togglePOIs() {
  showPOIs.value = !showPOIs.value
  for (const m of poiMarkers) {
    m.getElement().style.display = showPOIs.value ? '' : 'none'
  }
}

function queryAndAddPOIs() {
  if (!map || !mapboxgl) return

  // Query rendered features from Mapbox's built-in POI layers
  const poiLayers = map.getStyle()?.layers
    ?.filter((l: any) => l.id.includes('poi') && l.type === 'symbol')
    ?.map((l: any) => l.id) || []

  if (!poiLayers.length) return

  const features = map.queryRenderedFeatures(undefined, { layers: poiLayers })

  // Deduplicate by name+coordinates
  const seen = new Set<string>()
  const uniqueFeatures: any[] = []
  for (const f of features) {
    const coords = f.geometry.coordinates
    const key = `${f.properties.name || ''}|${coords[0].toFixed(4)},${coords[1].toFixed(4)}`
    if (seen.has(key)) continue
    seen.add(key)
    uniqueFeatures.push(f)
  }

  for (const feature of uniqueFeatures) {
    const maki = feature.properties.maki || feature.properties.type || ''
    const name = feature.properties.name || feature.properties.name_en || ''

    // Match to our categories
    let category: string | null = null
    for (const [cat, types] of Object.entries(POI_FILTERS)) {
      if (types.some(t => maki.includes(t) || name.toLowerCase().includes(t))) {
        category = cat
        break
      }
    }
    if (!category) continue

    const cat = POI_CATEGORIES[category]!
    const coords = feature.geometry.coordinates

    const el = document.createElement('div')
    el.className = 'poi-marker'
    el.title = name || cat.label
    el.style.cssText = `
      width: 24px; height: 24px; border-radius: 50%;
      background: ${cat.color}; color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; line-height: 1;
      border: 2px solid #050810;
      box-shadow: 0 1px 4px rgba(0,0,0,0.5);
      cursor: pointer; z-index: 5;
      font-family: system-ui, sans-serif;
    `
    el.textContent = cat.icon

    const popup = new mapboxgl.Popup({
      offset: 14,
      closeButton: false,
      maxWidth: '200px',
      className: 'eclipse-popup',
    }).setHTML(`
      <div style="font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #e2e8f0; padding: 4px;">
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
          <span style="width: 16px; height: 16px; border-radius: 50%; background: ${cat.color}; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #fff; flex-shrink: 0;">${cat.icon}</span>
          <span style="font-family: 'Syne', sans-serif; font-weight: 600; font-size: 13px;">${name || cat.label}</span>
        </div>
        <p style="color: #94a3b8; margin: 0; font-size: 11px;">${cat.label}</p>
      </div>
    `)

    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat(coords)
      .setPopup(popup)
      .addTo(map)
    poiMarkers.push(marker)
  }
}

watch(mapContainer, async (el) => {
  if (!el || map) return

  const token = config.public.mapboxToken as string
  if (!token) {
    mapError.value = 'No Mapbox token configured'
    return
  }

  try {
    mapboxgl = (await import('mapbox-gl')).default
    mapboxgl.accessToken = token

    map = new mapboxgl.Map({
      container: el,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [props.lng, props.lat],
      zoom: 14,
      pitch: is3D.value ? 60 : 0,
      bearing: is3D.value ? props.sunAzimuth - 180 : 0,
      attributionControl: false,
      antialias: true,
    })

    map.addControl(new mapboxgl.NavigationControl({ showCompass: true, visualizePitch: true }), 'top-right')

    map.on('load', () => {
      if (!map) return

      // 3D terrain
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      })
      if (is3D.value) {
        map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 })
      }

      // Sky atmosphere
      map.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 24.0],
          'sky-atmosphere-sun-intensity': 5,
        },
      })

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

      // Query POIs after tiles render
      map.once('idle', () => {
        queryAndAddPOIs()
      })
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
  poiMarkers.forEach(m => m.remove())
  poiMarkers.length = 0
  map?.remove()
  map = null
  mapboxgl = null
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
    <div v-if="mapError" class="w-full rounded border border-void-border bg-void-surface flex items-center justify-center text-slate-500 font-mono text-sm" style="height: 400px;">
      {{ mapError }}
    </div>
    <div v-else class="relative">
      <div
        ref="mapContainer"
        class="w-full rounded border border-void-border"
        style="height: 400px;"
      />
      <!-- Map controls overlay -->
      <div class="absolute bottom-3 left-3 flex gap-1.5 z-10">
        <button
          class="px-2.5 py-1.5 rounded text-[10px] font-mono uppercase tracking-wider transition-all"
          :class="is3D
            ? 'bg-corona/20 border border-corona/40 text-corona'
            : 'bg-void-deep/80 border border-void-border/60 text-slate-400 hover:text-slate-200'"
          @click="toggle3D"
        >
          {{ is3D ? '3D' : '2D' }}
        </button>
        <button
          class="px-2.5 py-1.5 rounded text-[10px] font-mono uppercase tracking-wider transition-all"
          :class="showPOIs
            ? 'bg-corona/20 border border-corona/40 text-corona'
            : 'bg-void-deep/80 border border-void-border/60 text-slate-400 hover:text-slate-200'"
          @click="togglePOIs"
        >
          POI
        </button>
      </div>
    </div>
    <template #fallback>
      <div class="w-full rounded border border-void-border bg-void-surface flex items-center justify-center text-slate-500 font-mono text-sm" style="height: 400px;">
        Loading map…
      </div>
    </template>
  </ClientOnly>
</template>

<style scoped>
:deep(.spot-map-marker) {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #f59e0b;
  border: 2px solid #0a0e17;
  box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.3), 0 2px 10px rgba(0, 0, 0, 0.6);
}

:deep(.poi-marker) {
  transition: transform 0.15s ease;
}

:deep(.poi-marker:hover) {
  transform: scale(1.2);
}

:deep(.mapboxgl-ctrl-compass) {
  background: rgba(10, 16, 32, 0.8) !important;
  border-color: rgba(26, 37, 64, 0.6) !important;
}
</style>
