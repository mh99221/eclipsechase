<script setup lang="ts">
definePageMeta({ middleware: ['pro-gate'] })

import mapboxgl from 'mapbox-gl'
import { CLOUD_COVER_LEVELS, CLOUD_COVER_NO_DATA } from '~/utils/eclipse'
import { PROFILES, useRecommendation } from '~/composables/useRecommendation'
import type { ProfileId } from '~/composables/useRecommendation'

const { t } = useI18n()
const route = useRoute()
const focusSpot = (route.query.spot as string) || null
const profileParam = (route.query.profile as string) || null

// Restore map position from query params (passed from spot detail "Back to map")
const restoreCenter = route.query.mlat && route.query.mlng
  ? [parseFloat(route.query.mlng as string), parseFloat(route.query.mlat as string)] as [number, number]
  : null
const restoreZoom = route.query.mzoom ? parseFloat(route.query.mzoom as string) : null

useHead({
  title: () => t('map.title'),
  meta: [
    { name: 'description', content: () => t('map.description') },
  ],
})

// Fetch all data in parallel (independent requests)
const [{ data: stationsData }, { data: spotsData, error: spotsError }, { data: cloudData, refresh: refreshCloud }] = await Promise.all([
  useFetch('/api/weather/stations'),
  useFetch('/api/spots'),
  useFetch('/api/weather/cloud-cover'),
])
const showSpotError = ref(!!spotsError.value)

// Merge station metadata with cloud cover
const stations = computed(() => {
  const stationList = stationsData.value?.stations || []
  const cloudCover = cloudData.value?.cloud_cover || []

  const coverByStation = new Map<string, number | null>()
  for (const cc of cloudCover) {
    coverByStation.set(cc.station_id, cc.cloud_cover)
  }

  return stationList.map((s: any) => ({
    station_id: s.id,
    name: s.name,
    lat: s.lat,
    lng: s.lng,
    region: s.region,
    cloud_cover: coverByStation.get(s.id) ?? null,
  }))
})

// Auto-refresh cloud cover every 15 minutes
let refreshTimer: ReturnType<typeof setInterval>
onMounted(() => {
  refreshTimer = setInterval(() => refreshCloud(), 15 * 60 * 1000)
})
onUnmounted(() => {
  clearInterval(refreshTimer)
})

// Profile-based ranking
const selectedProfile = ref<ProfileId | null>(
  PROFILES.some(p => p.id === profileParam) ? profileParam as ProfileId : null,
)
const profileMenuOpen = ref(false)

const { coords, request: requestGps } = useLocation()
onMounted(() => {
  if (selectedProfile.value) requestGps()
})

const allSpots = computed(() => spotsData.value?.spots || [])
const stationList = computed(() => stationsData.value?.stations || [])
const cloudCoverData = computed(() => cloudData.value?.cloud_cover || null)

const { ranked } = useRecommendation(
  allSpots,
  cloudCoverData,
  stationList,
  coords,
  selectedProfile,
)

const rankedForMap = computed(() => {
  if (!selectedProfile.value) return undefined
  let rank = 0
  return ranked.value.map((r) => {
    if (!r.filtered) rank++
    return { slug: r.spot.slug, rank: r.filtered ? 999 : rank, score: r.score, filtered: r.filtered }
  })
})

const activeProfileName = computed(() => PROFILES.find(p => p.id === selectedProfile.value)?.name || null)

// Close profile menu on Escape or click outside
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && profileMenuOpen.value) {
    profileMenuOpen.value = false
  }
}
function handleClickOutside() {
  if (profileMenuOpen.value) profileMenuOpen.value = false
}
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  document.addEventListener('click', handleClickOutside)
})
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('click', handleClickOutside)
})

// Legend from shared constants
const legendItems = [
  ...CLOUD_COVER_LEVELS.map(l => ({ label: l.label, cloudCover: l.max })),
  { label: CLOUD_COVER_NO_DATA.label, cloudCover: null as number | null },
]

// Traffic / road conditions layer
const showTraffic = ref(false)
const trafficData = ref<{ conditions: any[] } | null>(null)
const segmentsData = ref<{ segments: any[] } | null>(null)
const roadsGeojson = ref<any>(null)

const trafficMarkers = ref<OverlayMarker[]>([])
let trafficZoomHandler: (() => void) | null = null

function getTrafficColor(condition: string): string {
  switch (condition) {
    case 'good': return '#22c55e'
    case 'difficult': return '#f97316'
    case 'closed': return '#ef4444'
    default: return '#6b7280'
  }
}

// Zoom-based visibility for overlay markers (traffic, cameras)
interface OverlayMarker { marker: any; minZoom: number }

function computeOverlayMinZooms(points: Array<{ lat: number; lng: number }>): number[] {
  if (!points.length) return []
  const dists = points.map((p, i) => {
    let min = Infinity
    for (let j = 0; j < points.length; j++) {
      if (i === j) continue
      const d = Math.sqrt((p.lat - points[j].lat) ** 2 + (p.lng - points[j].lng) ** 2)
      if (d < min) min = d
    }
    return { idx: i, dist: min }
  })
  const sorted = [...dists].sort((a, b) => b.dist - a.dist)
  const zooms = new Array<number>(points.length)
  for (let i = 0; i < sorted.length; i++) {
    const pct = i / sorted.length
    zooms[sorted[i].idx] = pct < 0.25 ? 6 : pct < 0.50 ? 7 : pct < 0.75 ? 8 : 9
  }
  return zooms
}

function applyOverlayVisibility(items: OverlayMarker[], zoom: number) {
  for (const { marker, minZoom } of items) {
    const el = marker.getElement()
    const visible = zoom >= minZoom
    el.style.visibility = visible ? '' : 'hidden'
    el.style.pointerEvents = visible ? '' : 'none'
  }
}

const TRAFFIC_LABELS: Record<string, string> = {
  good: 'Passable',
  difficult: 'Difficult',
  closed: 'Closed',
  unknown: 'Unknown',
}

function addTrafficMarkers(map: any) {
  removeTrafficMarkers()
  const conditions = trafficData.value?.conditions || []
  const minZooms = computeOverlayMinZooms(conditions.map((c: any) => ({ lat: c.lat, lng: c.lng })))
  for (let ci = 0; ci < conditions.length; ci++) {
    const c = conditions[ci]
    const color = getTrafficColor(c.condition)
    const el = document.createElement('div')
    el.className = 'traffic-marker'
    el.setAttribute('role', 'button')
    el.setAttribute('tabindex', '0')
    el.setAttribute('aria-label', `${c.roadName}: ${c.description}`)
    el.style.cssText = `
      width: 18px; height: 18px; border-radius: 50%;
      background: #050810; border: 2px solid ${color};
      box-shadow: 0 0 8px ${color}40;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
    `
    // Warning triangle icon
    el.innerHTML = `<svg width="9" height="9" viewBox="0 0 16 16" fill="${color}">
      <path d="M8 1L15 14H1L8 1Z" fill="none" stroke="${color}" stroke-width="1.5"/>
      <circle cx="8" cy="11" r="1" fill="${color}"/>
      <rect x="7.25" y="5.5" width="1.5" height="3.5" rx="0.75" fill="${color}"/>
    </svg>`

    const popup = new mapboxgl.Popup({
      offset: 14,
      closeButton: false,
      maxWidth: 'min(220px, 85vw)',
      className: 'eclipse-popup',
    }).setHTML(`
      <div style="font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #e2e8f0; padding: 4px;">
        <h3 style="font-family: 'Syne', sans-serif; font-weight: 600; font-size: 14px; margin: 0 0 4px; color: ${color};">${TRAFFIC_LABELS[c.condition] || 'Road condition'}</h3>
        ${c.roadName ? `<p style="color: #94a3b8; margin: 0 0 4px;">${c.roadName}</p>` : ''}
        <p style="color: #cbd5e1; margin: 0;">${c.description}</p>
      </div>
    `)

    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat([c.lng, c.lat])
      .setPopup(popup)
      .addTo(map)
    trafficMarkers.value.push({ marker, minZoom: minZooms[ci] })
  }
  applyOverlayVisibility(trafficMarkers.value, map.getZoom())
  trafficZoomHandler = () => applyOverlayVisibility(trafficMarkers.value, map.getZoom())
  map.on('zoom', trafficZoomHandler)
}

/** Normalize a road name for fuzzy matching: lowercase, strip diacritics, trim */
function normalizeRoadName(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

// Cached enriched GeoJSON — rebuilt only when segments data changes
let enrichedRoadsCache: any = null

/** Build enriched GeoJSON by joining road geometry with segment condition data */
function buildEnrichedRoads(): any {
  if (!roadsGeojson.value || !segmentsData.value?.segments?.length) return null

  // Build a lookup: normalized road name → worst condition
  const conditionLookup = new Map<string, string>()
  for (const seg of segmentsData.value.segments) {
    const key = normalizeRoadName(seg.sectionName || seg.roadName)
    const existing = conditionLookup.get(key)
    if (!existing || conditionPriority(seg.condition) > conditionPriority(existing)) {
      conditionLookup.set(key, seg.condition)
    }
  }

  // Shallow-clone features array, only copying properties we mutate
  const features = roadsGeojson.value.features.map((f: any) => {
    const normName = normalizeRoadName(f.properties.roadName || '')
    const normRef = f.properties.roadRef ? normalizeRoadName(f.properties.roadRef) : ''

    let matched = 'unknown'
    for (const [segKey, condition] of conditionLookup) {
      if ((normName && (segKey.includes(normName) || normName.includes(segKey))) ||
          (normRef && segKey.includes(normRef))) {
        if (conditionPriority(condition) > conditionPriority(matched)) {
          matched = condition
        }
      }
    }

    return {
      ...f,
      properties: { ...f.properties, condition: matched },
    }
  })

  return { type: 'FeatureCollection', features }
}

// Named handlers for proper cleanup
let roadClickHandler: ((e: any) => void) | null = null
let roadEnterHandler: (() => void) | null = null
let roadLeaveHandler: (() => void) | null = null

/** Add road condition polylines to the map */
function addRoadPolylines(map: any) {
  removeRoadPolylines(map)

  enrichedRoadsCache = buildEnrichedRoads()
  if (!enrichedRoadsCache) return

  map.addSource('road-conditions', { type: 'geojson', data: enrichedRoadsCache })

  map.addLayer({
    id: 'road-conditions-line',
    type: 'line',
    source: 'road-conditions',
    paint: {
      'line-color': [
        'match', ['get', 'condition'],
        'good', '#22c55e',
        'difficult', '#f97316',
        'closed', '#ef4444',
        '#6b7280',
      ],
      'line-width': ['interpolate', ['linear'], ['zoom'], 5, 1.5, 8, 3, 12, 5],
      'line-opacity': 0.6,
    },
    layout: { 'line-cap': 'round', 'line-join': 'round' },
  }, map.getLayer('traffic-marker') ? 'traffic-marker' : undefined)

  // Transparent wider hitbox layer for click
  map.addLayer({
    id: 'road-conditions-hit',
    type: 'line',
    source: 'road-conditions',
    paint: { 'line-color': 'transparent', 'line-width': 14 },
  })

  // Click handler — store reference for cleanup
  roadClickHandler = (e: any) => {
    if (!e.features?.length) return
    const f = e.features[0]
    const condition = f.properties.condition || 'unknown'
    const color = getTrafficColor(condition)
    const name = f.properties.roadName || f.properties.roadRef || 'Road'

    new mapboxgl.Popup({
      offset: 10,
      closeButton: false,
      maxWidth: 'min(220px, 85vw)',
      className: 'eclipse-popup',
    })
      .setLngLat(e.lngLat)
      .setHTML(`
        <div style="font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #e2e8f0; padding: 4px;">
          <h3 style="font-family: 'Syne', sans-serif; font-weight: 600; font-size: 14px; margin: 0 0 4px; color: ${color};">${TRAFFIC_LABELS[condition] || 'Unknown'}</h3>
          <p style="color: #94a3b8; margin: 0;">${name}${f.properties.roadRef ? ` (${f.properties.roadRef})` : ''}</p>
        </div>
      `)
      .addTo(map)
  }
  roadEnterHandler = () => { map.getCanvas().style.cursor = 'pointer' }
  roadLeaveHandler = () => { map.getCanvas().style.cursor = '' }

  map.on('click', 'road-conditions-hit', roadClickHandler)
  map.on('mouseenter', 'road-conditions-hit', roadEnterHandler)
  map.on('mouseleave', 'road-conditions-hit', roadLeaveHandler)
}

function removeRoadPolylines(map: any) {
  if (!map) return
  // Remove event handlers first
  if (roadClickHandler) { map.off('click', 'road-conditions-hit', roadClickHandler); roadClickHandler = null }
  if (roadEnterHandler) { map.off('mouseenter', 'road-conditions-hit', roadEnterHandler); roadEnterHandler = null }
  if (roadLeaveHandler) { map.off('mouseleave', 'road-conditions-hit', roadLeaveHandler); roadLeaveHandler = null }
  try {
    if (map.getLayer('road-conditions-hit')) map.removeLayer('road-conditions-hit')
    if (map.getLayer('road-conditions-line')) map.removeLayer('road-conditions-line')
    if (map.getSource('road-conditions')) map.removeSource('road-conditions')
  } catch { /* ignore if already removed */ }
  enrichedRoadsCache = null
}

function conditionPriority(c: string): number {
  switch (c) {
    case 'closed': return 3
    case 'difficult': return 2
    case 'good': return 1
    default: return 0
  }
}

function removeTrafficMarkers() {
  if (trafficZoomHandler && eclipseMapRef.value?.map) {
    eclipseMapRef.value.map.off('zoom', trafficZoomHandler)
    trafficZoomHandler = null
  }
  for (const { marker } of trafficMarkers.value) {
    marker.remove()
  }
  trafficMarkers.value = []
}

// We need access to the map instance — watch for it via the EclipseMap component ref
const eclipseMapRef = ref<any>(null)

watch(showTraffic, async (val) => {
  const mapInstance = eclipseMapRef.value?.map
  if (!mapInstance) return
  if (val) {
    // Fetch point conditions + segments + road geometry in parallel
    const [conditionsRes, segmentsRes, geojsonRes] = await Promise.all([
      trafficData.value ? Promise.resolve(trafficData.value) : $fetch<{ conditions: any[] }>('/api/traffic/conditions'),
      segmentsData.value ? Promise.resolve(segmentsData.value) : $fetch<{ segments: any[] }>('/api/traffic/segments'),
      roadsGeojson.value ? Promise.resolve(roadsGeojson.value) : $fetch('/eclipse-data/roads.geojson'),
    ])
    trafficData.value = conditionsRes
    segmentsData.value = segmentsRes
    roadsGeojson.value = geojsonRes
    addRoadPolylines(mapInstance)
    addTrafficMarkers(mapInstance)
  } else {
    removeTrafficMarkers()
    removeRoadPolylines(mapInstance)
  }
})

// Road cameras — global carousel nav + lightbox
const camCurrentIndex: Record<string, number> = {}
const camImageRegistry: Record<string, { name: string; images: Array<{ url: string; description: string }> }> = {}
if (import.meta.client) {
  // Carousel navigation
  ;(window as any).__camNav = (uid: string, total: number, dir: number) => {
    const prev = camCurrentIndex[uid] || 0
    const next = ((prev + dir) % total + total) % total
    camCurrentIndex[uid] = next

    for (let i = 0; i < total; i++) {
      const img = document.getElementById(`${uid}-img-${i}`)
      const desc = document.getElementById(`${uid}-desc-${i}`)
      const dot = document.getElementById(`${uid}-dot-${i}`)
      if (img) img.style.display = i === next ? 'block' : 'none'
      if (desc) desc.style.display = i === next ? 'inline' : 'none'
      if (dot) dot.style.background = i === next ? '#7dd3fc' : '#1a2540'
    }
    const counter = document.getElementById(`${uid}-counter`)
    if (counter) counter.textContent = `${next + 1}/${total}`
  }

  // Fullscreen lightbox
  ;(window as any).__camOpen = (uid: string) => {
    const reg = camImageRegistry[uid]
    if (!reg?.images?.length) return
    const imgs = reg.images
    const idx = camCurrentIndex[uid] || 0

    // Create overlay
    const overlay = document.createElement('div')
    overlay.id = 'cam-lightbox'
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:99999;
      background:radial-gradient(ellipse at 50% 0%, #0a1628 0%, #050810 70%);
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      cursor:default;padding:20px;
    `

    let currentLb = idx
    function renderLightbox() {
      const cur = imgs[currentLb]
      overlay.innerHTML = `
        <!-- Top bar -->
        <div style="position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:20px 24px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="5" stroke="#7dd3fc" stroke-width="1.5" fill="none"/>
              <circle cx="8" cy="8" r="2" fill="#7dd3fc"/>
            </svg>
            <span style="font-family:'Syne',sans-serif;font-weight:600;font-size:16px;color:#f1f5f9;">${reg.name}</span>
            <span style="font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#475569;">Road camera</span>
          </div>
          <button id="lb-close" style="background:#0a1020;border:1px solid #1a2540;border-radius:4px;color:#94a3b8;cursor:pointer;font-family:'IBM Plex Mono',monospace;font-size:12px;padding:6px 14px;transition:color 0.2s;">
            Close
          </button>
        </div>

        <!-- Image -->
        <div style="position:relative;max-width:90vw;max-height:70vh;">
          <img src="${cur.url}" alt="${cur.description}" style="max-width:90vw;max-height:70vh;border-radius:4px;border:1px solid #1a2540;object-fit:contain;display:block;" />
          ${imgs.length > 1 ? `
            <button id="lb-prev" style="position:absolute;left:8px;top:50%;transform:translateY(-50%);background:rgba(5,8,16,0.8);backdrop-filter:blur(4px);border:1px solid #1a2540;border-radius:4px;color:#7dd3fc;cursor:pointer;width:40px;height:40px;font-size:20px;display:flex;align-items:center;justify-content:center;">&#8249;</button>
            <button id="lb-next" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:rgba(5,8,16,0.8);backdrop-filter:blur(4px);border:1px solid #1a2540;border-radius:4px;color:#7dd3fc;cursor:pointer;width:40px;height:40px;font-size:20px;display:flex;align-items:center;justify-content:center;">&#8250;</button>
          ` : ''}
        </div>

        <!-- Bottom info -->
        <div style="margin-top:16px;text-align:center;">
          <div style="font-family:'IBM Plex Mono',monospace;font-size:13px;color:#94a3b8;">${cur.description || ''}</div>
          ${imgs.length > 1 ? `
            <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:12px;">
              ${imgs.map((_: any, i: number) => `
                <span style="width:8px;height:8px;border-radius:50%;background:${i === currentLb ? '#7dd3fc' : '#1a2540'};transition:background 0.2s;"></span>
              `).join('')}
              <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:#475569;margin-left:6px;">${currentLb + 1}/${imgs.length}</span>
            </div>
          ` : ''}
        </div>
      `
      overlay.querySelector('#lb-close')?.addEventListener('click', (e) => { e.stopPropagation(); closeLightbox() })
      overlay.querySelector('#lb-prev')?.addEventListener('click', (e) => { e.stopPropagation(); currentLb = (currentLb - 1 + imgs.length) % imgs.length; renderLightbox() })
      overlay.querySelector('#lb-next')?.addEventListener('click', (e) => { e.stopPropagation(); currentLb = (currentLb + 1) % imgs.length; renderLightbox() })
    }

    renderLightbox()
    function closeLightbox() { overlay.remove(); document.removeEventListener('keydown', keyHandler) }
    function keyHandler(e: KeyboardEvent) {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') { currentLb = (currentLb - 1 + imgs.length) % imgs.length; renderLightbox() }
      if (e.key === 'ArrowRight') { currentLb = (currentLb + 1) % imgs.length; renderLightbox() }
    }
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeLightbox() })
    document.addEventListener('keydown', keyHandler)
    document.body.appendChild(overlay)
  }
}

const showCameras = ref(false)
const cameraData = ref<{ cameras: any[] } | null>(null)
const cameraMarkers = ref<OverlayMarker[]>([])
let cameraZoomHandler: (() => void) | null = null

function addCameraMarkers(map: any) {
  removeCameraMarkers()
  const cameras = cameraData.value?.cameras || []
  const camMinZooms = computeOverlayMinZooms(cameras.map((c: any) => ({ lat: c.lat, lng: c.lng })))
  for (let ci = 0; ci < cameras.length; ci++) {
    const cam = cameras[ci]
    // Camera pin: circle matching spot marker style, with camera lens icon
    const el = document.createElement('div')
    el.className = 'camera-marker'
    el.setAttribute('role', 'button')
    el.setAttribute('tabindex', '0')
    el.setAttribute('aria-label', `${cam.name} road camera`)
    el.style.cssText = `
      width: 20px; height: 20px; border-radius: 50%;
      background: #050810; border: 2px solid #7dd3fc;
      box-shadow: 0 0 8px rgba(125, 211, 252, 0.25);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
    `
    // Camera lens SVG — simple aperture icon
    el.innerHTML = `<svg width="10" height="10" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="5" stroke="#7dd3fc" stroke-width="1.5" fill="none"/>
      <circle cx="8" cy="8" r="2" fill="#7dd3fc"/>
    </svg>`

    // Popup with carousel + lightbox
    const uid = `cam-${cam.id}`
    const imgs = cam.images as Array<{ url: string; description: string }>
    const hasMultiple = imgs.length > 1
    camImageRegistry[uid] = { name: cam.name, images: imgs }

    const imagesHtml = imgs.map((img: { url: string; description: string }, i: number) => `
      <img
        id="${uid}-img-${i}"
        src="${img.url}"
        alt="${img.description || cam.name}"
        style="width:100%;border-radius:3px;border:1px solid #1a2540;display:${i === 0 ? 'block' : 'none'};aspect-ratio:4/3;object-fit:cover;cursor:zoom-in;"
        loading="lazy"
        onclick="window.__camOpen('${uid}')"
        onerror="this.style.display='none'"
      />
    `).join('')

    const descHtml = imgs.map((img: { url: string; description: string }, i: number) => `
      <span id="${uid}-desc-${i}" style="display:${i === 0 ? 'inline' : 'none'};">${img.description || ''}</span>
    `).join('')

    // Navigation: prev/next buttons flanking the image, sized for touch
    const navHtml = !hasMultiple ? '' : `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;">
        <button onclick="window.__camNav('${uid}',${imgs.length},-1)" style="background:#0a1020;border:1px solid #1a2540;border-radius:4px;color:#7dd3fc;cursor:pointer;font-size:16px;padding:4px 12px;font-family:'IBM Plex Mono',monospace;line-height:1.2;">&#8249;</button>
        <div style="display:flex;align-items:center;gap:5px;">
          ${imgs.map((_: any, i: number) => `
            <span id="${uid}-dot-${i}" style="width:7px;height:7px;border-radius:50%;background:${i === 0 ? '#7dd3fc' : '#1a2540'};transition:background 0.2s;"></span>
          `).join('')}
        </div>
        <button onclick="window.__camNav('${uid}',${imgs.length},1)" style="background:#0a1020;border:1px solid #1a2540;border-radius:4px;color:#7dd3fc;cursor:pointer;font-size:16px;padding:4px 12px;font-family:'IBM Plex Mono',monospace;line-height:1.2;">&#8250;</button>
      </div>
    `

    const popup = new mapboxgl.Popup({
      offset: 14,
      closeButton: false,
      maxWidth: 'min(300px, 85vw)',
      className: 'eclipse-popup',
    }).setHTML(`
      <div style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:#e2e8f0;padding:4px;">
        <div style="display:flex;align-items:baseline;justify-content:space-between;gap:6px;margin-bottom:2px;">
          <h3 style="font-family:'Syne',sans-serif;font-weight:600;font-size:14px;color:#7dd3fc;margin:0;">${cam.name}</h3>
          ${hasMultiple ? `<span id="${uid}-counter" style="font-size:11px;color:#475569;white-space:nowrap;" aria-live="polite">1/${imgs.length}</span>` : ''}
        </div>
        <p style="color:#475569;font-size:11px;margin:0 0 6px;">${descHtml}</p>
        <div style="position:relative;overflow:hidden;border-radius:3px;">
          ${imagesHtml}
        </div>
        ${navHtml}
        <div style="text-align:center;margin-top:4px;">
          <span onclick="window.__camOpen('${uid}')" style="color:#475569;font-size:10px;cursor:pointer;border-bottom:1px solid #1a2540;">Click image to enlarge</span>
        </div>
      </div>
    `)

    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat([cam.lng, cam.lat])
      .setPopup(popup)
      .addTo(map)
    cameraMarkers.value.push({ marker, minZoom: camMinZooms[ci] })
  }
  applyOverlayVisibility(cameraMarkers.value, map.getZoom())
  cameraZoomHandler = () => applyOverlayVisibility(cameraMarkers.value, map.getZoom())
  map.on('zoom', cameraZoomHandler)
}

function removeCameraMarkers() {
  if (cameraZoomHandler && eclipseMapRef.value?.map) {
    eclipseMapRef.value.map.off('zoom', cameraZoomHandler)
    cameraZoomHandler = null
  }
  for (const { marker } of cameraMarkers.value) {
    marker.remove()
  }
  cameraMarkers.value = []
}

watch(showCameras, async (val) => {
  const mapInstance = eclipseMapRef.value?.map
  if (!mapInstance) return
  if (val) {
    if (!cameraData.value) {
      const data = await $fetch<{ cameras: any[] }>('/api/cameras')
      cameraData.value = data
    }
    addCameraMarkers(mapInstance)
  } else {
    removeCameraMarkers()
  }
})

onUnmounted(() => {
  removeTrafficMarkers()
  removeCameraMarkers()
  if (horizonMarker) { horizonMarker.remove(); horizonMarker = null }
})

// ─── Mobile Peek Sheet ───
const sheetSnapPoints = [64, 400] // peek (controls visible), full (legend visible)
const sheetHeight = ref(sheetSnapPoints[0])
const sheetDragging = ref(false)
const sheetStartY = ref(0)
const sheetStartHeight = ref(0)

function sheetTouchStart(e: TouchEvent) {
  sheetDragging.value = true
  sheetStartY.value = e.touches[0].clientY
  sheetStartHeight.value = sheetHeight.value
}
function sheetTouchMove(e: TouchEvent) {
  if (!sheetDragging.value) return
  const dy = sheetStartY.value - e.touches[0].clientY
  sheetHeight.value = Math.max(sheetSnapPoints[0], Math.min(sheetSnapPoints[1] + 40, sheetStartHeight.value + dy))
}
function sheetTouchEnd() {
  sheetDragging.value = false
  const mid = (sheetSnapPoints[0] + sheetSnapPoints[1]) / 2
  sheetHeight.value = sheetHeight.value > mid ? sheetSnapPoints[1] : sheetSnapPoints[0]
}

// End drag even if finger moves off the handle element
onMounted(() => {
  document.addEventListener('touchend', sheetTouchEnd)
  document.addEventListener('touchcancel', sheetTouchEnd)
})
onUnmounted(() => {
  document.removeEventListener('touchend', sheetTouchEnd)
  document.removeEventListener('touchcancel', sheetTouchEnd)
})
function sheetToggle() {
  sheetHeight.value = sheetHeight.value <= sheetSnapPoints[0] ? sheetSnapPoints[1] : sheetSnapPoints[0]
}

// ─── Dynamic Horizon Check (Pro: click anywhere on map) ───
const { isPro } = useProStatus()
const horizonCheckCoords = ref<{ lat: number; lng: number } | null>(null)
let horizonMarker: any = null

function handleMapClick(coords: { lat: number; lng: number }) {
  if (!isPro.value) return

  // Place crosshair marker
  const mapInstance = eclipseMapRef.value?.map
  if (mapInstance) {
    if (horizonMarker) horizonMarker.remove()

    const el = document.createElement('div')
    el.style.cssText = `
      width: 24px; height: 24px; position: relative;
    `
    el.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="3 2" fill="none" opacity="0.7"/>
      <line x1="12" y1="2" x2="12" y2="7" stroke="#f59e0b" stroke-width="1.5" opacity="0.5"/>
      <line x1="12" y1="17" x2="12" y2="22" stroke="#f59e0b" stroke-width="1.5" opacity="0.5"/>
      <line x1="2" y1="12" x2="7" y2="12" stroke="#f59e0b" stroke-width="1.5" opacity="0.5"/>
      <line x1="17" y1="12" x2="22" y2="12" stroke="#f59e0b" stroke-width="1.5" opacity="0.5"/>
      <circle cx="12" cy="12" r="2" fill="#f59e0b"/>
    </svg>`

    horizonMarker = new mapboxgl.Marker({ element: el })
      .setLngLat([coords.lng, coords.lat])
      .addTo(mapInstance)
  }

  // Trigger panel (use a key to force re-mount when clicking new location)
  horizonCheckCoords.value = null
  nextTick(() => {
    horizonCheckCoords.value = coords
  })
}

function closeHorizonCheck() {
  horizonCheckCoords.value = null
  if (horizonMarker) {
    horizonMarker.remove()
    horizonMarker = null
  }
}

const profileIds = PROFILES.map(p => p.id)

function cycleProfile() {
  const idx = selectedProfile.value ? profileIds.indexOf(selectedProfile.value) : -1
  if (idx < profileIds.length - 1) {
    selectedProfile.value = profileIds[idx + 1]
    if (selectedProfile.value) requestGps()
  } else {
    selectedProfile.value = null
  }
}

// Profile icons for mobile sheet
const PROFILE_ICON_DEFAULT = 'M8 4a2 2 0 110 4 2 2 0 010-4zm-4 8c0-1.5 1.8-3 4-3s4 1.5 4 3v1H4v-1z'
const profileIcons: Record<ProfileId, string> = {
  photographer: 'M3 5h2l1-2h4l1 2h2a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1V6a1 1 0 011-1zm5 7a3 3 0 100-6 3 3 0 000 6z',
  family: 'M9 5a2 2 0 11-4 0 2 2 0 014 0zm3 1a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM7 9c-2.2 0-4 1-4 2.5V13h8v-1.5C11 10 9.2 9 7 9zm4.5.5c-0.6 0-1.2.2-1.7.5.8.6 1.2 1.4 1.2 2.5V13H14v-1c0-1.2-1.1-2.5-2.5-2.5z',
  hiker: 'M7 3a2 2 0 110 4 2 2 0 010-4zm2 5H5l-1 5h1.5l.5-3 1.5 3h1.5l1.5-3 .5 3H13l-1-5h-3zm-5 6l-1 2h1l1-2H4zm6 0l1 2h1l-1-2h-1z',
  skychaser: 'M8 2l1.5 3.5L13 7l-3.5 1.5L8 12l-1.5-3.5L3 7l3.5-1.5L8 2z',
  firsttimer: 'M8 2a6 6 0 100 12A6 6 0 008 2zm0 2a1.5 1.5 0 011.5 1.5c0 .5-.2.9-.5 1.2-.3.3-.5.5-.5 1.1H6.5c0-1 .4-1.4.7-1.7.2-.2.3-.4.3-.6A.5.5 0 007 5.5 1.5 1.5 0 018 4zm-.5 7h1v1h-1v-1z',
}
</script>

<template>
  <div class="relative w-full h-screen bg-void-deep">
    <h1 class="sr-only">Weather Map — Eclipse Viewing Conditions in Iceland</h1>

    <!-- Map -->
    <ClientOnly>
      <EclipseMap
        ref="eclipseMapRef"
        :stations="stations"
        :spots="spotsData?.spots || []"
        :ranked-spots="rankedForMap"
        :focus-spot="focusSpot"
        :initial-center="restoreCenter"
        :initial-zoom="restoreZoom"
        class="absolute inset-0"
        @map-click="handleMapClick"
      />
      <template #fallback>
        <div class="absolute inset-0 flex items-center justify-center">
          <p class="text-sm font-mono text-slate-500 animate-pulse">{{ t('map.loading') }}</p>
        </div>
      </template>
    </ClientOnly>

    <!-- Top bar -->
    <div class="absolute top-0 left-0 right-0 z-10 pointer-events-none">
      <div class="flex items-center justify-between px-4 sm:px-6 py-4">
        <NuxtLink to="/" aria-label="EclipseChase — Home" class="pointer-events-auto flex items-center gap-2.5 group">
          <svg class="w-8 h-8" viewBox="0 0 128 128" fill="none" aria-hidden="true">
            <circle cx="64" cy="64" r="36" fill="#050810" />
            <circle cx="64" cy="64" r="36" stroke="#f59e0b" stroke-width="3" opacity="0.8" />
            <circle cx="96" cy="48" r="4" fill="#f59e0b" />
          </svg>
          <span class="font-display font-semibold text-base tracking-wide text-slate-300 group-hover:text-white transition-colors">
            ECLIPSECHASE
          </span>
        </NuxtLink>

        <!-- User menu + Desktop profile selector (hidden on mobile — moved to bottom sheet) -->
        <div class="pointer-events-auto hidden sm:flex items-center gap-3">
          <UserMenu />
          <div class="relative" @click.stop>
            <button
              class="text-xs font-mono tracking-wider px-2.5 py-1.5 rounded transition-all"
              :class="activeProfileName
                ? 'text-corona bg-void-deep/80 border border-corona/40'
                : 'text-slate-400 hover:text-slate-200'"
              :aria-expanded="profileMenuOpen"
              aria-haspopup="true"
              aria-controls="profile-menu"
              @click="profileMenuOpen = !profileMenuOpen"
            >
              {{ activeProfileName || t('map.profile') }}
              <span class="ml-1 text-[10px]" aria-hidden="true">{{ profileMenuOpen ? '▲' : '▼' }}</span>
            </button>
            <div
              v-if="profileMenuOpen"
              id="profile-menu"
              role="menu"
              class="absolute right-0 top-full mt-1 bg-void-deep/95 backdrop-blur-sm border border-void-border/60 rounded py-1 min-w-[140px] z-20"
            >
              <button
                v-for="profile in PROFILES"
                :key="profile.id"
                role="menuitem"
                class="w-full text-left px-3 py-1.5 text-xs font-mono transition-colors"
                :class="selectedProfile === profile.id ? 'text-corona' : 'text-slate-400 hover:text-slate-200'"
                @click="selectedProfile = selectedProfile === profile.id ? null : profile.id as ProfileId; profileMenuOpen = false; if (selectedProfile) requestGps()"
              >
                {{ profile.name }}
              </button>
              <button
                v-if="selectedProfile"
                role="menuitem"
                class="w-full text-left px-3 py-1.5 text-xs font-mono text-slate-500 hover:text-slate-300 border-t border-void-border/40 mt-1 pt-1.5 transition-colors"
                @click="selectedProfile = null; profileMenuOpen = false"
              >
                {{ t('map.clear_profile') }}
              </button>
            </div>
          </div>
        </div>
      </div>
      <!-- Offline banner (only visible when offline or stale) -->
      <div class="pointer-events-auto px-4 sm:px-6">
        <OfflineBanner />
      </div>
    </div>

    <!-- ═══ Desktop: layer toggles + legend (hidden on mobile) ═══ -->
    <div class="hidden sm:flex absolute bottom-6 right-20 z-10 gap-2">
      <button
        :aria-pressed="showCameras"
        :aria-label="showCameras ? t('map.cams_on') : t('map.cams_off')"
        class="font-mono text-xs tracking-wider px-2.5 py-1.5 rounded transition-all border"
        :class="showCameras
          ? 'text-blue-400 bg-void-deep/90 border-blue-400/40'
          : 'text-slate-400 bg-void-deep/90 border-void-border/50 hover:text-slate-200'"
        @click="showCameras = !showCameras"
      >
        {{ showCameras ? t('map.cams_on') : t('map.cams_off') }}
      </button>
      <button
        :aria-pressed="showTraffic"
        :aria-label="showTraffic ? t('map.roads_on') : t('map.roads_off')"
        class="font-mono text-xs tracking-wider px-2.5 py-1.5 rounded transition-all border"
        :class="showTraffic
          ? 'text-corona bg-void-deep/90 border-corona/40'
          : 'text-slate-400 bg-void-deep/90 border-void-border/50 hover:text-slate-200'"
        @click="showTraffic = !showTraffic"
      >
        {{ showTraffic ? t('map.roads_on') : t('map.roads_off') }}
      </button>
    </div>

    <div class="hidden sm:block absolute bottom-10 left-6 z-10 bg-void-deep/90 backdrop-blur-sm border border-void-border/50 rounded px-4 py-3 max-h-[calc(100dvh-160px)] overflow-y-auto text-xs">
      <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-2.5">{{ t('map.cloud_cover') }}</p>
      <div class="flex flex-col gap-1.5">
        <div v-for="item in legendItems" :key="item.label" class="flex items-center gap-2">
          <WeatherIcon :cloud-cover="item.cloudCover" :size="20" class="shrink-0" />
          <span class="text-xs font-mono text-slate-300">{{ item.label }}</span>
        </div>
      </div>
      <div class="mt-3 pt-2.5 border-t border-void-border/40">
        <div class="flex items-center gap-2 mb-1">
          <span class="w-3.5 h-3.5 rounded-full border-2 border-corona bg-void-deep flex items-center justify-center shrink-0">
            <span class="w-1.5 h-1.5 rounded-full bg-corona" />
          </span>
          <span class="text-xs font-mono text-slate-300">{{ t('map.viewing_spot') }}</span>
        </div>
        <div class="flex items-center gap-2 mb-1">
          <span class="w-4 h-0 border-t border-dashed border-corona/40" />
          <span class="text-xs font-mono text-slate-300">{{ t('map.totality_path') }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-4 h-0 border-t-2 border-corona-bright/60" />
          <span class="text-xs font-mono text-slate-300">{{ t('map.centerline') }}</span>
        </div>
      </div>
      <div v-if="showTraffic" class="mt-3 pt-2.5 border-t border-void-border/40">
        <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-2">{{ t('map.road_conditions') }}</p>
        <div class="flex items-center gap-2 mb-1">
          <span class="w-4 h-0 border-t-2 border-green-500" />
          <span class="text-xs font-mono text-slate-300">{{ t('map.road_good') }}</span>
        </div>
        <div class="flex items-center gap-2 mb-1">
          <span class="w-4 h-0 border-t-2 border-orange-500" />
          <span class="text-xs font-mono text-slate-300">{{ t('map.road_difficult') }}</span>
        </div>
        <div class="flex items-center gap-2 mb-1">
          <span class="w-4 h-0 border-t-2 border-red-500" />
          <span class="text-xs font-mono text-slate-300">{{ t('map.road_closed') }}</span>
        </div>
        <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400 mt-2 mb-2">{{ t('map.road_warnings') }}</p>
        <div class="flex items-center gap-2 mb-1">
          <span class="w-3 h-3 rounded-full border-2 border-orange-500 bg-void-deep shrink-0" />
          <span class="text-xs font-mono text-slate-300">{{ t('map.hazard') }}</span>
        </div>
        <div class="flex items-center gap-2 mb-1">
          <span class="w-3 h-3 rounded-full border-2 border-red-500 bg-void-deep shrink-0" />
          <span class="text-xs font-mono text-slate-300">{{ t('map.closed') }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full border-2 border-gray-500 bg-void-deep shrink-0" />
          <span class="text-xs font-mono text-slate-300">{{ t('map.other') }}</span>
        </div>
      </div>
      <div v-if="showCameras" class="mt-3 pt-2.5 border-t border-void-border/40">
        <div class="flex items-center gap-2">
          <span class="w-4 h-4 rounded-full border-2 border-ice bg-void-deep flex items-center justify-center shrink-0">
            <svg width="8" height="8" viewBox="0 0 16 16" fill="none" class="shrink-0">
              <circle cx="8" cy="8" r="5" stroke="#7dd3fc" stroke-width="1.5" fill="none" />
              <circle cx="8" cy="8" r="2" fill="#7dd3fc" />
            </svg>
          </span>
          <span class="text-xs font-mono text-slate-300">{{ t('map.road_camera') }}</span>
        </div>
      </div>
    </div>

    <!-- ═══ Mobile: Peek Sheet (bottom drawer with pull-up) ═══ -->
    <div
      class="sm:hidden absolute left-0 right-0 bottom-0 z-10"
      :style="{ height: sheetHeight + 'px' }"
      :class="sheetDragging ? '' : 'transition-[height] duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]'"
    >
      <div class="h-full bg-void-deep/95 backdrop-blur-md border-t border-void-border/40 rounded-t-xl flex flex-col overflow-hidden">
        <!-- Drag handle -->
        <div
          role="button"
          tabindex="0"
          :aria-label="sheetHeight > sheetSnapPoints[0] + 20 ? 'Collapse map legend' : 'Expand map legend'"
          :aria-expanded="sheetHeight > sheetSnapPoints[0] + 20"
          class="flex flex-col items-center pt-2 pb-1 cursor-grab active:cursor-grabbing shrink-0"
          @touchstart="sheetTouchStart"
          @touchmove.prevent="sheetTouchMove"
          @click="sheetToggle"
          @keydown.enter="sheetToggle"
          @keydown.space.prevent="sheetToggle"
        >
          <div class="w-10 h-1 rounded-full bg-slate-600/60" />
        </div>

        <!-- Always-visible controls row: Profile (left) + Cams/Roads (right) -->
        <div class="flex items-center gap-2 px-4 pb-2 shrink-0">
          <!-- Profile cycle button -->
          <button
            :aria-label="activeProfileName ? `Profile: ${activeProfileName}` : t('map.profile')"
            class="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded border font-mono text-[11px] tracking-wider transition-all active:scale-95"
            :class="selectedProfile
              ? 'border-corona/30 bg-corona/8 text-corona'
              : 'border-void-border/30 bg-void/40 text-slate-500'"
            @click="cycleProfile"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path :d="selectedProfile ? profileIcons[selectedProfile] : PROFILE_ICON_DEFAULT" :fill="selectedProfile ? '#f59e0b' : '#475569'" />
            </svg>
            {{ activeProfileName || t('map.profile') }}
          </button>
          <!-- Cams toggle -->
          <button
            :aria-pressed="showCameras"
            :aria-label="showCameras ? t('map.cams_on') : t('map.cams_off')"
            class="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded border font-mono text-[11px] tracking-wider transition-all active:scale-95"
            :class="showCameras
              ? 'border-ice/30 bg-ice/8 text-ice'
              : 'border-void-border/30 bg-void/40 text-slate-500'"
            @click="showCameras = !showCameras"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5" :stroke="showCameras ? '#7dd3fc' : '#475569'" stroke-width="1.5" fill="none" /><circle cx="8" cy="8" r="2" :fill="showCameras ? '#7dd3fc' : '#475569'" /></svg>
            {{ showCameras ? t('map.cams_on') : t('map.cams_off') }}
          </button>
          <!-- Roads toggle -->
          <button
            :aria-pressed="showTraffic"
            :aria-label="showTraffic ? t('map.roads_on') : t('map.roads_off')"
            class="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded border font-mono text-[11px] tracking-wider transition-all active:scale-95"
            :class="showTraffic
              ? 'border-corona/30 bg-corona/8 text-corona'
              : 'border-void-border/30 bg-void/40 text-slate-500'"
            @click="showTraffic = !showTraffic"
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M8 1L15 14H1L8 1Z" :stroke="showTraffic ? '#f59e0b' : '#475569'" stroke-width="1.5" fill="none" /></svg>
            {{ showTraffic ? t('map.roads_on') : t('map.roads_off') }}
          </button>
        </div>

        <!-- Expanded content (visible when pulled up) -->
        <div v-show="sheetHeight > sheetSnapPoints[0] + 20" class="flex-1 overflow-y-auto px-4 pb-4 border-t border-void-border/30 pt-3">
          <!-- Profile selector (full chip list) -->
          <div class="mb-3 pb-3 border-b border-void-border/30">
            <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-2">{{ t('map.viewer_profile') }}</p>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="profile in PROFILES"
                :key="profile.id"
                class="flex items-center gap-1.5 px-2.5 py-1.5 rounded border font-mono text-[11px] transition-all"
                :class="selectedProfile === profile.id
                  ? 'border-corona/40 bg-corona/10 text-corona'
                  : 'border-void-border/30 bg-void/40 text-slate-500'"
                @click="selectedProfile = selectedProfile === profile.id ? null : profile.id as ProfileId; if (selectedProfile) requestGps()"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" class="shrink-0">
                  <path :d="profileIcons[profile.id]" :fill="selectedProfile === profile.id ? '#f59e0b' : '#475569'" />
                </svg>
                {{ profile.name }}
              </button>
            </div>
          </div>

          <!-- Two-column layout: Cloud cover (left) + Map legend (right) -->
          <div class="grid grid-cols-2 gap-4">
            <!-- Left column: Cloud cover -->
            <div>
              <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-2.5">{{ t('map.cloud_cover') }}</p>
              <div class="flex flex-col gap-1.5">
                <div v-for="item in legendItems" :key="item.label" class="flex items-center gap-2">
                  <WeatherIcon :cloud-cover="item.cloudCover" :size="18" class="shrink-0" />
                  <span class="text-[11px] font-mono text-slate-400">{{ item.label }}</span>
                </div>
              </div>
            </div>
            <!-- Right column: Map legend -->
            <div>
              <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-2.5">{{ t('map.map_legend') }}</p>
              <div class="flex flex-col gap-2">
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full border-2 border-corona bg-void-deep shrink-0" />
                  <span class="text-[11px] font-mono text-slate-300">{{ t('map.viewing_spot') }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-4 h-0 border-t border-dashed border-corona/40" />
                  <span class="text-[11px] font-mono text-slate-300">{{ t('map.totality_path') }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-4 h-0 border-t-2 border-corona-bright/60" />
                  <span class="text-[11px] font-mono text-slate-300">{{ t('map.centerline') }}</span>
                </div>
                <!-- Conditional: road conditions + warnings -->
                <template v-if="showTraffic">
                  <div class="mt-1.5 pt-1.5 border-t border-void-border/30">
                    <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1.5">{{ t('map.road_conditions') }}</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="w-4 h-0 border-t-2 border-green-500" />
                    <span class="text-[11px] font-mono text-slate-300">{{ t('map.road_good') }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="w-4 h-0 border-t-2 border-orange-500" />
                    <span class="text-[11px] font-mono text-slate-300">{{ t('map.road_difficult') }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="w-4 h-0 border-t-2 border-red-500" />
                    <span class="text-[11px] font-mono text-slate-300">{{ t('map.road_closed') }}</span>
                  </div>
                  <div class="mt-1.5">
                    <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1.5">{{ t('map.road_warnings') }}</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full border-2 border-orange-500 bg-void-deep shrink-0" />
                    <span class="text-[11px] font-mono text-slate-300">{{ t('map.hazard') }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full border-2 border-red-500 bg-void-deep shrink-0" />
                    <span class="text-[11px] font-mono text-slate-300">{{ t('map.closed') }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full border-2 border-gray-500 bg-void-deep shrink-0" />
                    <span class="text-[11px] font-mono text-slate-300">{{ t('map.other') }}</span>
                  </div>
                </template>
                <!-- Conditional: camera -->
                <div v-if="showCameras" class="flex items-center gap-2" :class="{ 'mt-1.5 pt-1.5 border-t border-void-border/30': !showTraffic }">
                  <span class="w-3.5 h-3.5 rounded-full border-2 border-ice bg-void-deep flex items-center justify-center shrink-0">
                    <svg width="7" height="7" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5" stroke="#7dd3fc" stroke-width="1.5" fill="none" /><circle cx="8" cy="8" r="2" fill="#7dd3fc" /></svg>
                  </span>
                  <span class="text-[11px] font-mono text-slate-300">{{ t('map.road_camera') }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Offline download manager -->
    <div class="absolute top-32 left-4 sm:left-6 z-10 w-64 hidden sm:block">
      <OfflineManager :map="eclipseMapRef?.map" />
    </div>

    <!-- Pro hint: click to check horizon -->
    <div
      v-if="isPro && !horizonCheckCoords"
      class="absolute z-10 bottom-4 left-1/2 -translate-x-1/2 sm:bottom-6 pointer-events-none"
    >
      <div class="px-3 py-1.5 rounded bg-void-deep/80 backdrop-blur-sm border border-corona/20 text-[11px] font-mono text-corona/70">
        {{ t('horizon.click_hint') }}
      </div>
    </div>

    <!-- Dynamic Horizon Check panel (Pro: click anywhere on map) -->
    <Transition name="fade">
      <div
        v-if="horizonCheckCoords"
        class="absolute z-20 sm:bottom-6 sm:left-6 bottom-20 left-2 right-2 sm:right-auto sm:w-96"
      >
        <DynamicHorizonCheck
          :key="`${horizonCheckCoords.lat},${horizonCheckCoords.lng}`"
          :lat="horizonCheckCoords.lat"
          :lng="horizonCheckCoords.lng"
          @close="closeHorizonCheck"
        />
      </div>
    </Transition>

    <!-- Spot data error banner -->
    <Transition name="fade">
      <div
        v-if="showSpotError"
        class="absolute top-16 left-1/2 -translate-x-1/2 z-20 px-4 py-2.5 rounded bg-red-900/80 backdrop-blur-sm border border-red-700/40 text-xs font-mono text-red-300 flex items-center gap-3 shadow-lg max-w-sm"
      >
        <span>Could not load viewing spots.</span>
        <button
          class="text-red-400 hover:text-red-200 transition-colors shrink-0"
          aria-label="Dismiss error"
          @click="showSpotError = false"
        >
          ✕
        </button>
      </div>
    </Transition>
  </div>
</template>
