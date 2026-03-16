<script setup lang="ts">
import mapboxgl from 'mapbox-gl'
import { cloudColor, cloudLevel, formatDuration, weatherSvgHtml } from '~/utils/eclipse'
import { addEclipsePathLayers } from '~/utils/mapLayers'

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
  rankedSpots?: Array<{
    slug: string
    rank: number
    score: number
    filtered: boolean
  }>
  focusSpot?: string | null
  initialCenter?: [number, number] | null
  initialZoom?: number | null
}>()

const router = useRouter()
const config = useRuntimeConfig()
const mapContainer = ref<HTMLElement | null>(null)
let map: mapboxgl.Map | null = null
const mapExposed = shallowRef<mapboxgl.Map | null>(null)
interface ZoomMarker {
  marker: mapboxgl.Marker
  minZoom: number
}

const markers: ZoomMarker[] = []
const spotMarkers: ZoomMarker[] = []
const spotMarkersBySlug = new Map<string, mapboxgl.Marker>()

// Assign a minZoom to each point based on nearest-neighbor distance.
// Isolated points appear at low zoom; clustered ones only when zoomed in.
function computeMinZooms(points: Array<{ lat: number; lng: number }>): number[] {
  if (!points.length) return []
  const dists = points.map((p, i) => {
    let min = Infinity
    for (let j = 0; j < points.length; j++) {
      if (i === j) continue
      const d = Math.sqrt((p.lat - points[j]!.lat) ** 2 + (p.lng - points[j]!.lng) ** 2)
      if (d < min) min = d
    }
    return { idx: i, dist: min }
  })
  const sorted = [...dists].sort((a, b) => b.dist - a.dist)
  const zooms = new Array<number>(points.length)
  const total = sorted.length
  for (let i = 0; i < total; i++) {
    const pct = i / total
    let z: number
    if (pct < 0.30) z = 5        // top 30% visible from zoom 5
    else if (pct < 0.55) z = 6   // next 25% from zoom 6
    else if (pct < 0.80) z = 7   // next 25% from zoom 7
    else z = 8                    // last 20% from zoom 8
    zooms[sorted[i]!.idx] = z
  }
  return zooms
}

/** Find nearest station's cloud cover for a given lat/lng */
function nearestCloudCover(lat: number, lng: number): number | null {
  if (!props.stations?.length) return null
  let best: number | null = null
  let bestDist = Infinity
  for (const s of props.stations) {
    if (s.cloud_cover == null) continue
    const d = (s.lat - lat) ** 2 + (s.lng - lng) ** 2
    if (d < bestDist) {
      bestDist = d
      best = s.cloud_cover
    }
  }
  return best
}

function setMarkerVisibility(items: ZoomMarker[], zoom: number) {
  for (const { marker, minZoom } of items) {
    const visible = zoom >= minZoom
    const el = marker.getElement()
    el.style.visibility = visible ? '' : 'hidden'
    el.style.pointerEvents = visible ? '' : 'none'
  }
}

let lastZoomBucket = -1

function applyZoomVisibility() {
  if (!map) return
  const zoom = map.getZoom()
  const bucket = Math.floor(zoom)
  if (bucket === lastZoomBucket) return
  lastZoomBucket = bucket
  setMarkerVisibility(markers, zoom)
  setMarkerVisibility(spotMarkers, zoom)
}

function addEclipsePath() {
  if (!map) return
  addEclipsePathLayers(map)
}

function resetZoomBucket() { lastZoomBucket = -1 }

function updateMarkers() {
  markers.forEach(({ marker }) => marker.remove())
  markers.length = 0

  if (!map || !props.stations) return

  const minZooms = computeMinZooms(props.stations.map(s => ({ lat: s.lat, lng: s.lng })))

  for (let i = 0; i < props.stations.length; i++) {
    const station = props.stations[i]!
    const color = cloudColor(station.cloud_cover)

    const el = document.createElement('div')
    el.className = 'station-marker'
    el.setAttribute('role', 'button')
    el.setAttribute('aria-label', `${station.name} weather station${station.cloud_cover != null ? `, ${station.cloud_cover}% cloud cover` : ''}`)
    el.style.cssText = `cursor: pointer; line-height: 0; opacity: 0.6; z-index: 0; filter: drop-shadow(0 0 6px ${color}55) drop-shadow(0 0 14px ${color}30);`
    el.innerHTML = weatherSvgHtml(station.cloud_cover, 42)

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

    markers.push({ marker, minZoom: minZooms[i]! })
  }
  resetZoomBucket()
  applyZoomVisibility()
}

function updateSpotMarkers() {
  spotMarkers.forEach(({ marker }) => marker.remove())
  spotMarkers.length = 0
  spotMarkersBySlug.clear()

  if (!map || !props.spots) return

  const minZooms = computeMinZooms(props.spots.map(s => ({ lat: s.lat, lng: s.lng })))

  // Build rank lookup
  const rankMap = new Map<string, { rank: number; score: number; filtered: boolean }>()
  if (props.rankedSpots) {
    for (const r of props.rankedSpots) {
      rankMap.set(r.slug, r)
    }
  }
  const hasRanking = rankMap.size > 0

  for (let i = 0; i < props.spots.length; i++) {
    const spot = props.spots[i]!
    const rankInfo = rankMap.get(spot.slug)
    const isFiltered = hasRanking && rankInfo?.filtered
    const isTop3 = hasRanking && rankInfo && !rankInfo.filtered && rankInfo.rank <= 3

    const el = document.createElement('div')
    el.className = 'spot-marker'
    el.setAttribute('role', 'button')
    el.setAttribute('aria-label', `${spot.name} viewing spot, ${formatDuration(spot.totality_duration_seconds)} totality${hasRanking && rankInfo && !rankInfo.filtered ? `, rank ${rankInfo.rank}` : ''}`)

    if (isFiltered) {
      // Dimmed marker for filtered spots
      el.style.cssText = `
        width: 22px; height: 22px; border-radius: 50%;
        background: #050810; border: 2px solid #475569;
        opacity: 0.4; cursor: pointer; z-index: 10;
        display: flex; align-items: center; justify-content: center;
      `
      const inner = document.createElement('div')
      inner.style.cssText = 'width: 6px; height: 6px; border-radius: 50%; background: #475569;'
      el.appendChild(inner)
    } else if (hasRanking && rankInfo) {
      // Ranked marker with number
      const size = isTop3 ? 30 : 26
      const borderColor = isTop3 ? '#f59e0b' : '#d97706'
      const shadow = isTop3 ? '0 0 14px rgba(245, 158, 11, 0.4)' : '0 0 8px rgba(245, 158, 11, 0.2)'
      el.style.cssText = `
        width: ${size}px; height: ${size}px; border-radius: 50%;
        background: #050810; border: 2px solid ${borderColor};
        box-shadow: ${shadow}; cursor: pointer; z-index: 10;
        display: flex; align-items: center; justify-content: center;
        font-family: 'IBM Plex Mono', monospace; font-size: ${isTop3 ? 13 : 11}px;
        font-weight: 700; color: ${isTop3 ? '#fbbf24' : '#d97706'};
      `
      el.textContent = String(rankInfo.rank)
    } else {
      // Default amber dot (no ranking)
      el.style.cssText = `
        width: 26px; height: 26px; border-radius: 50%;
        background: #050810; border: 2px solid #f59e0b;
        box-shadow: 0 0 12px rgba(245, 158, 11, 0.3); cursor: pointer; z-index: 10;
        display: flex; align-items: center; justify-content: center;
      `
      const inner = document.createElement('div')
      inner.style.cssText = 'width: 8px; height: 8px; border-radius: 50%; background: #f59e0b;'
      el.appendChild(inner)
    }

    // Build popup HTML with weather icon
    const spotCloud = nearestCloudCover(spot.lat, spot.lng)
    const weatherIcon = weatherSvgHtml(spotCloud, 28)
    const weatherLabel = cloudLevel(spotCloud).label
    const weatherColor = cloudColor(spotCloud)

    const scoreHtml = hasRanking && rankInfo && !rankInfo.filtered
      ? `<div style="margin-top: 4px; color: ${rankInfo.score >= 80 ? '#22c55e' : rankInfo.score >= 50 ? '#fbbf24' : '#ef4444'};">Score: ${rankInfo.score}/100</div>`
      : ''

    const popup = new mapboxgl.Popup({
      offset: 14,
      closeButton: false,
      className: 'eclipse-popup',
    }).setHTML(`
      <div style="font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #e2e8f0; padding: 4px; cursor: pointer;" data-slug="${spot.slug}">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
          <div style="font-family: 'Syne', sans-serif; font-weight: 600; font-size: 14px; color: #fbbf24;">${spot.name}</div>
          <div style="flex-shrink: 0; line-height: 0;">${weatherIcon}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <span>Totality: ${formatDuration(spot.totality_duration_seconds)}</span>
          <span style="color: ${weatherColor}; font-size: 11px;">${weatherLabel}</span>
        </div>
        ${scoreHtml}
        <div style="margin-top: 6px; color: #f59e0b; font-size: 11px;">Click for details →</div>
      </div>
    `)

    popup.on('open', () => {
      popup.getElement()?.addEventListener('click', () => {
        const center = map!.getCenter()
        const zoom = map!.getZoom().toFixed(1)
        router.push(`/spots/${spot.slug}?mlat=${center.lat.toFixed(4)}&mlng=${center.lng.toFixed(4)}&mzoom=${zoom}`)
      })
    })

    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat([spot.lng, spot.lat])
      .setPopup(popup)
      .addTo(map)

    // Top-3 ranked spots always visible; others use computed minZoom
    const spotMinZoom = (hasRanking && isTop3) ? 5 : minZooms[i]!
    spotMarkers.push({ marker, minZoom: spotMinZoom })
    spotMarkersBySlug.set(spot.slug, marker)
  }
  resetZoomBucket()
  applyZoomVisibility()
}

function focusOnSpot(slug: string) {
  if (!map) return
  const marker = spotMarkersBySlug.get(slug)
  if (!marker) return

  const lngLat = marker.getLngLat()
  map.flyTo({ center: lngLat, zoom: 10, duration: 1500 })
  // Open popup after fly animation
  setTimeout(() => marker.togglePopup(), 1600)
}

watch(() => props.stations, updateMarkers, { deep: true })
watch(() => props.spots, updateSpotMarkers)
watch(() => props.rankedSpots, updateSpotMarkers, { deep: true })

onMounted(() => {
  if (!mapContainer.value) return

  mapboxgl.accessToken = config.public.mapboxToken as string

  map = new mapboxgl.Map({
    container: mapContainer.value,
    style: 'mapbox://styles/mapbox/dark-v11',
    center: props.initialCenter || [-23.5, 65.0],
    zoom: props.initialZoom ?? 6,
    minZoom: 5,
    maxZoom: 12,
    attributionControl: false,
  })

  map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right')
  map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right')

  map.on('load', () => {
    addEclipsePath()
    updateMarkers()
    updateSpotMarkers()

    if (props.focusSpot) {
      focusOnSpot(props.focusSpot)
    }
  })

  map.on('zoom', applyZoomVisibility)
  mapExposed.value = map
})

defineExpose({ map: mapExposed })

onUnmounted(() => {
  markers.forEach(({ marker }) => marker.remove())
  spotMarkers.forEach(({ marker }) => marker.remove())
  map?.remove()
  map = null
  mapExposed.value = null
})
</script>

<template>
  <div ref="mapContainer" class="w-full h-full" role="application" aria-label="Interactive weather map of western Iceland showing eclipse viewing conditions" />
</template>

<style>
/* Mapbox popup overrides for dark theme */
.eclipse-popup {
  z-index: 20 !important;
}

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
