<script setup lang="ts">
definePageMeta({ middleware: ['pro-gate'] })

import mapboxgl from 'mapbox-gl'
import { CLOUD_COVER_LEVELS, CLOUD_COVER_NO_DATA } from '~/utils/eclipse'
import { conditionPriority, getTrafficColor, getTrafficLabel } from '~/utils/traffic'
import type { TrafficCondition } from '~/utils/traffic'
import { PROFILES, useRecommendation } from '~/composables/useRecommendation'
import type { ProfileId } from '~/composables/useRecommendation'
import type {
  DockMode,
  DockWeatherCtx,
  DockRoadsCtx,
  DockCamCtx,
  DockHorizonCtx,
} from '~/components/map/dock/types'

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

// Fetch data lazily + client-only so the map chrome renders instantly.
// /map is Pro-gated (middleware redirects non-Pro users), so SSR would
// just emit a redirect — no point pre-fetching on the server. Markers
// and cloud-cover overlays populate reactively as each response lands.
const { data: stationsData } = useFetch('/api/weather/stations', { lazy: true, server: false })
const { data: spotsData, error: spotsError } = useFetch('/api/spots', { lazy: true, server: false })
const { data: cloudData, refresh: refreshCloud } = useFetch('/api/weather/cloud-cover', { lazy: true, server: false })
const { data: historicalWeatherData } = useFetch<{ spots: Record<string, { clear_years: number; total_years: number; avg_cloud_cover: number | null }> }>(
  '/eclipse-data/historical-weather.json',
  { lazy: true, server: false, key: 'historical-weather' },
)
// Dismissable error banner — driven by spotsError ref but user can close it.
const showSpotError = ref(false)
watch(spotsError, (err) => { if (err) showSpotError.value = true })

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

// v0 mobile chrome — chip stack at top + bottom dock.
// Seeded from ?spot= URL param so deep links open with a selection.
// `showWeatherV0` toggles the cloud-cover weather glyphs (the per-station
// markers that paint Iceland with sun / partly / overcast icons).
const showWeatherV0 = ref(true)
const selectedSlug = ref<string | null>(focusSpot)

// Dock can be fully dismissed via the close button. Any subsequent map
// interaction (spot pin, station, road, cam, or bare-map tap) brings
// it back automatically. Starts visible so the first paint shows the
// SELECTED card (or the "tap anywhere" empty state).
const dockDismissed = ref(false)

const selectedSpotData = computed(() => {
  if (!selectedSlug.value) return null
  return spotsData.value?.spots?.find((s: any) => s.slug === selectedSlug.value) ?? null
})
function spotHistoricalCloud(slug: string): number | null {
  return historicalWeatherData.value?.spots?.[slug]?.avg_cloud_cover ?? null
}

// ─── Map dock state ───
// Mobile-only bottom dock that swaps content between five modes
// (SPOT / WEATHER / ROADS / CAM / HORIZON). Mode is driven by what the
// user taps on the map; ctx for each mode is populated below from the
// tap target's data. Types live in app/components/map/dock/types.ts so
// the dock components and this page agree on shape.
const dockMode = ref<DockMode>('spot')
const dockWeatherCtx = ref<DockWeatherCtx | null>(null)
const dockRoadsCtx = ref<DockRoadsCtx | null>(null)
const dockCamCtx = ref<DockCamCtx | null>(null)
const dockHorizonCtx = ref<DockHorizonCtx | null>(null)

// Spot data shaped for DockSpot — uses historical 16-yr Aug-12 cloud
// (matches the prior SelectedLightbox behaviour) so the SPOT mode shows
// a stable climatology number rather than today's nearest-station cloud.
const dockSpot = computed(() => {
  const s = selectedSpotData.value
  if (!s) return null
  return {
    slug: s.slug,
    name: s.name,
    lat: s.lat,
    lng: s.lng,
    totality_duration_seconds: s.totality_duration_seconds || 0,
    cloud: spotHistoricalCloud(s.slug),
  }
})

function onSpotSelect(slug: string) {
  selectedSlug.value = slug
  dockMode.value = 'spot'
  dockDismissed.value = false
}

function onWeatherSelect(station: any) {
  // Mirror existing legend: cloud_cover may be null when no observation
  // is available for this station. Visibility is on the API but rarely
  // reported; we surface it when present, otherwise null.
  dockWeatherCtx.value = {
    name: station.name,
    cloud: station.cloud_cover ?? null,
    visibilityKm: station.visibility ?? null,
    updatedMinutes: null,
  }
  dockMode.value = 'weather'
  dockDismissed.value = false
}

function onRoadSelect(ctx: DockRoadsCtx) {
  dockRoadsCtx.value = ctx
  dockMode.value = 'roads'
  dockDismissed.value = false
}

function onCamSelect(cam: { id: number; name: string; images: Array<{ url: string; description: string }> }) {
  // Use the description from the first image as the dir line; the cam
  // itself doesn't carry a separate direction field.
  const startIdx = camIndexById.get(cam.id) ?? 0
  dockCamCtx.value = {
    id: cam.id,
    name: cam.name,
    dir: cam.images[startIdx]?.description || cam.images[0]?.description || '',
    images: cam.images,
    idx: startIdx,
  }
  dockMode.value = 'cam'
  dockDismissed.value = false
}
function onCamStep(dir: 1 | -1) {
  if (!dockCamCtx.value) return
  const total = dockCamCtx.value.images.length
  if (total === 0) return
  const next = ((dockCamCtx.value.idx + dir) % total + total) % total
  dockCamCtx.value.idx = next
  camIndexById.set(dockCamCtx.value.id, next)
}

function onHorizonOpen() {
  const s = dockSpot.value
  if (!s) return
  dockHorizonCtx.value = { lat: s.lat, lng: s.lng, spotName: s.name }
  dockMode.value = 'horizon'
  dockDismissed.value = false
}

function onDockClose() {
  // Fully dismiss the dock. Any subsequent map interaction will bring
  // it back via the onSpotSelect / onWeatherSelect / onRoadSelect /
  // onCamSelect / handleMapClick handlers (each clears `dockDismissed`).
  // Also clears the bare-map crosshair so a HORIZON-mode tap doesn't
  // leave its pin behind on the map.
  dockDismissed.value = true
  if (horizonMarker) { horizonMarker.remove(); horizonMarker = null }
}

function onOpenFieldCard() {
  const s = dockSpot.value
  if (!s) return
  // Pass current map view so /spots → "back to map" returns here.
  const mapInst = eclipseMapRef.value?.map
  if (mapInst) {
    const c = mapInst.getCenter()
    const z = mapInst.getZoom().toFixed(1)
    router.push(`/spots/${s.slug}?mlat=${c.lat.toFixed(4)}&mlng=${c.lng.toFixed(4)}&mzoom=${z}`)
  } else {
    router.push(`/spots/${s.slug}`)
  }
}

const router = useRouter()

// Close profile menu on Escape or click outside.
// Also: ← / → step the dock CAM carousel; Esc returns the dock to
// SPOT mode (or closes it entirely when nothing is selected).
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && profileMenuOpen.value) {
    profileMenuOpen.value = false
    return
  }
  if (dockMode.value === 'cam' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    onCamStep(e.key === 'ArrowLeft' ? -1 : 1)
    e.preventDefault()
    return
  }
  if (e.key === 'Escape' && dockMode.value !== 'spot') {
    dockMode.value = 'spot'
    if (horizonMarker) { horizonMarker.remove(); horizonMarker = null }
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
interface TrafficCondition { lat: number; lng: number; condition: string; roadName?: string; description: string }

const showTraffic = ref(false)

// Module-scoped caches for the traffic overlay's companion data
// (segments + full road geometry). `useMapOverlay` owns the primary
// `conditions` array; these two are consumed by `addRoadPolylines` /
// `buildEnrichedRoads` and survive re-toggles alongside it.
let trafficSegmentsCache: { segments: any[] } | null = null
let trafficRoadsCache: any = null

function normaliseCond(raw: string): TrafficCondition {
  if (raw === 'good' || raw === 'difficult' || raw === 'closed') return raw
  return 'unknown'
}

function buildTrafficMarker(c: TrafficCondition, map: mapboxgl.Map): mapboxgl.Marker {
  const color = getTrafficColor(c.condition)
  const el = document.createElement('div')
  el.className = 'traffic-marker'
  el.setAttribute('role', 'button')
  el.setAttribute('tabindex', '0')
  el.setAttribute('aria-label', `${c.roadName || 'Road'}: ${c.description}`)
  el.style.cssText = `
    width: 18px; height: 18px; border-radius: 50%;
    background: #050810; border: 2px solid ${color};
    box-shadow: 0 0 8px ${color}40;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
  `
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
      <h3 style="font-family: 'Manrope', sans-serif; font-weight: 600; font-size: 14px; margin: 0 0 4px; color: ${color};">${getTrafficLabel(c.condition)}</h3>
      ${c.roadName ? `<p style="color: #94a3b8; margin: 0 0 4px;">${c.roadName}</p>` : ''}
      <p style="color: #cbd5e1; margin: 0;">${c.description}</p>
    </div>
  `)

  const marker = new mapboxgl.Marker({ element: el })
    .setLngLat([c.lng, c.lat])
    .addTo(map)

  // Mobile drives the dock instead of opening a popup. Listener is bound
  // once at marker creation; the condition snapshot is captured here
  // since hazard data is static across renders. stopPropagation defends
  // against the click also reaching Mapbox's bare-map handler.
  if (!isMobile.value) marker.setPopup(popup)
  el.addEventListener('click', (e) => {
    e.stopPropagation()
    if (!isMobile.value) return
    onRoadSelect({
      cond: normaliseCond(c.condition),
      label: getTrafficLabel(c.condition),
      detail: c.roadName ? `${c.roadName} · ${c.description}` : c.description,
    })
  })
  return marker
}

/** Normalize a road name for fuzzy matching: lowercase, strip diacritics, trim */
function normalizeRoadName(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

// Cached enriched GeoJSON — rebuilt only when segments data changes
let enrichedRoadsCache: any = null

/** Build enriched GeoJSON by joining road geometry with segment condition data */
function buildEnrichedRoads(): any {
  if (!trafficRoadsCache || !trafficSegmentsCache?.segments?.length) return null

  // Build a lookup: normalized road name → worst condition
  const conditionLookup = new Map<string, string>()
  for (const seg of trafficSegmentsCache.segments) {
    const key = normalizeRoadName(seg.sectionName || seg.roadName)
    const existing = conditionLookup.get(key)
    if (!existing || conditionPriority(seg.condition) > conditionPriority(existing)) {
      conditionLookup.set(key, seg.condition)
    }
  }

  // Shallow-clone features array, only copying properties we mutate
  const features = trafficRoadsCache.features.map((f: any) => {
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
    // Skip if click landed on a marker (hazard/camera/spot) to avoid double popups
    const target = e.originalEvent?.target as HTMLElement | null
    if (target?.closest('.traffic-marker, .camera-marker, .spot-marker, .station-marker')) return
    const f = e.features[0]
    const condition = f.properties.condition || 'unknown'
    const color = getTrafficColor(condition)
    const name = f.properties.roadName || f.properties.roadRef || 'Road'
    const refLabel = f.properties.roadRef ? `${name} (${f.properties.roadRef})` : name

    if (isMobile.value) {
      onRoadSelect({
        cond: normaliseCond(condition),
        label: getTrafficLabel(condition),
        detail: refLabel,
      })
      return
    }

    new mapboxgl.Popup({
      offset: 10,
      closeButton: false,
      maxWidth: 'min(220px, 85vw)',
      className: 'eclipse-popup',
    })
      .setLngLat(e.lngLat)
      .setHTML(`
        <div style="font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #e2e8f0; padding: 4px;">
          <h3 style="font-family: 'Manrope', sans-serif; font-weight: 600; font-size: 14px; margin: 0 0 4px; color: ${color};">${getTrafficLabel(condition)}</h3>
          <p style="color: #94a3b8; margin: 0;">${refLabel}</p>
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

// We need access to the map instance — watch for it via the EclipseMap component ref
const eclipseMapRef = ref<any>(null)

// Road cameras — carousel state + full-screen lightbox
interface CameraImage { url: string; description: string }
interface CameraData { id: string; name: string; lat: number; lng: number; images: CameraImage[] }

const activeLightboxCamera = ref<CameraData | null>(null)
const lightboxStartIndex = ref(0)

// Per-camera carousel index, keyed by camera id (CameraData.id is a
// number from the Vegagerðin API). Lives at module scope so it survives
// popup close/reopen (Mapbox reuses the popup DOM on reopen) and so the
// dock CAM mode picks up the same index as the desktop popup.
const camIndexById = new Map<number, number>()

function buildCameraPopupHTML(cam: CameraData, currentIndex: number): string {
  const imgs = cam.images
  const hasMultiple = imgs.length > 1
  const cur = imgs[currentIndex] ?? imgs[0]!

  // Theme-aware colours (dark → cream auto-swap via CSS custom props).
  // Button/dot accent stays ice #7dd3fc — constant across themes.
  // The bare CSS-var triples need explicit alphas: --border-subtle is
  // `255 255 255` in dark / `17 20 28` in light, intended for /0.x tints.
  const btnBg = 'rgb(var(--surface-raised))'
  const border = 'rgb(var(--border-subtle) / 0.4)'
  const meta = 'rgb(var(--ink-3))'
  const body = 'rgb(var(--ink-2))'

  const dotsHtml = imgs.map((_, i) => `
    <span style="width:7px;height:7px;border-radius:50%;background:${i === currentIndex ? '#7dd3fc' : border};transition:background 0.2s;"></span>
  `).join('')

  const navHtml = !hasMultiple ? '' : `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;">
      <button data-cam-action="prev" style="background:${btnBg};border:1px solid ${border};border-radius:4px;color:#7dd3fc;cursor:pointer;font-size:16px;padding:4px 12px;font-family:'IBM Plex Mono',monospace;line-height:1.2;" aria-label="Previous image">&#8249;</button>
      <div style="display:flex;align-items:center;gap:5px;">${dotsHtml}</div>
      <button data-cam-action="next" style="background:${btnBg};border:1px solid ${border};border-radius:4px;color:#7dd3fc;cursor:pointer;font-size:16px;padding:4px 12px;font-family:'IBM Plex Mono',monospace;line-height:1.2;" aria-label="Next image">&#8250;</button>
    </div>
  `

  return `
    <div style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:${body};padding:4px;">
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:6px;margin-bottom:2px;">
        <h3 style="font-family:'Manrope',sans-serif;font-weight:600;font-size:14px;color:#7dd3fc;margin:0;">${cam.name}</h3>
        ${hasMultiple ? `<span style="font-size:11px;color:${meta};white-space:nowrap;" aria-live="polite">${currentIndex + 1}/${imgs.length}</span>` : ''}
      </div>
      <p style="color:${meta};font-size:11px;margin:0 0 6px;">${cur?.description ?? ''}</p>
      <div style="position:relative;overflow:hidden;border-radius:3px;">
        <img
          data-cam-action="open"
          src="${cur?.url ?? ''}"
          alt="${cur?.description || cam.name}"
          style="width:100%;border-radius:3px;border:1px solid ${border};aspect-ratio:4/3;object-fit:cover;cursor:zoom-in;"
          loading="lazy"
          onerror="this.style.display='none'"
        />
      </div>
      ${navHtml}
      <div style="text-align:center;margin-top:4px;">
        <span data-cam-action="open" style="color:${meta};font-size:10px;cursor:pointer;border-bottom:1px solid ${border};">Click image to enlarge</span>
      </div>
    </div>
  `
}

/** Attach a single delegated click handler to a camera popup that
 *  dispatches the three actions (prev / next / open-lightbox) by
 *  reading a `data-cam-action` attribute. Handler is idempotent so it
 *  can be called from `popup.on('open', …)` without leaking. */
function wireCameraPopup(popup: mapboxgl.Popup, cam: CameraData) {
  const el = popup.getElement() as HTMLElement & { __camWired?: boolean } | null
  if (!el || el.__camWired) return
  el.__camWired = true
  el.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement | null)?.closest('[data-cam-action]') as HTMLElement | null
    if (!target) return
    e.stopPropagation()
    const action = target.dataset.camAction
    const cur = camIndexById.get(cam.id) ?? 0
    const total = cam.images.length
    if (action === 'prev') {
      const next = (cur - 1 + total) % total
      camIndexById.set(cam.id, next)
      popup.setHTML(buildCameraPopupHTML(cam, next))
    } else if (action === 'next') {
      const next = (cur + 1) % total
      camIndexById.set(cam.id, next)
      popup.setHTML(buildCameraPopupHTML(cam, next))
    } else if (action === 'open') {
      lightboxStartIndex.value = cur
      activeLightboxCamera.value = cam
    }
  })
}

const showCameras = ref(false)

function buildCameraMarker(cam: CameraData, map: mapboxgl.Map): mapboxgl.Marker {
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
  el.innerHTML = `<svg width="10" height="10" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="5" stroke="#7dd3fc" stroke-width="1.5" fill="none"/>
    <circle cx="8" cy="8" r="2" fill="#7dd3fc"/>
  </svg>`

  const startIndex = camIndexById.get(cam.id) ?? 0

  const popup = new mapboxgl.Popup({
    offset: 14,
    closeButton: false,
    maxWidth: 'min(300px, 85vw)',
    className: 'eclipse-popup',
  }).setHTML(buildCameraPopupHTML(cam, startIndex))

  popup.on('open', () => wireCameraPopup(popup, cam))

  const marker = new mapboxgl.Marker({ element: el })
    .setLngLat([cam.lng, cam.lat])
    .addTo(map)

  // Mobile drives the dock CAM mode; desktop keeps the existing popup.
  // stopPropagation defends against the click also reaching Mapbox's
  // bare-map handler.
  if (!isMobile.value) marker.setPopup(popup)
  el.addEventListener('click', (e) => {
    e.stopPropagation()
    if (!isMobile.value) return
    onCamSelect(cam)
  })
  return marker
}

useMapOverlay<CameraData>({
  active: showCameras,
  mapRef: eclipseMapRef,
  fetchData: async () => {
    const { cameras } = await $fetch<{ cameras: CameraData[] }>('/api/cameras')
    return cameras
  },
  buildMarker: (cam, { map }) => buildCameraMarker(cam, map),
})

useMapOverlay<TrafficCondition>({
  active: showTraffic,
  mapRef: eclipseMapRef,
  fetchData: async () => {
    const [conditionsRes, segmentsRes, roadsRes] = await Promise.all([
      $fetch<{ conditions: TrafficCondition[] }>('/api/traffic/conditions'),
      trafficSegmentsCache ? Promise.resolve(trafficSegmentsCache) : $fetch<{ segments: any[] }>('/api/traffic/segments'),
      trafficRoadsCache ? Promise.resolve(trafficRoadsCache) : $fetch('/eclipse-data/roads.geojson'),
    ])
    trafficSegmentsCache = segmentsRes
    trafficRoadsCache = roadsRes
    return conditionsRes.conditions
  },
  buildMarker: (c, { map }) => buildTrafficMarker(c, map),
  onActivate: (map) => addRoadPolylines(map),
  onDeactivate: (map) => removeRoadPolylines(map),
})

// ─── Mobile Peek Sheet ───
const sheetSnapPoints = [110, 400] // peek (just fits the 3 control buttons), full (legend visible)
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

// Mobile vs desktop split. Mobile gets the bottom MapDock (no popups);
// desktop keeps Mapbox popups for now (dock-on-desktop is future work).
const isMobile = ref(false)
function updateIsMobile() { isMobile.value = window.innerWidth < 640 }
onMounted(() => { updateIsMobile(); window.addEventListener('resize', updateIsMobile) })
onUnmounted(() => { window.removeEventListener('resize', updateIsMobile) })

// ─── Bare-map tap → dock HORIZON mode ───
// On mobile, tapping anywhere on the map drops a crosshair and opens
// the HORIZON dock for that lat/lng (Pro only — the page is gated by
// pro-gate middleware, so we don't need a runtime check here).
let horizonMarker: any = null
onScopeDispose(() => { horizonMarker?.remove(); horizonMarker = null })

// ─── Offline tile download overlay ───
const tileDownloading = ref(false)
const offlineManagerMobile = ref<any>(null)
const offlineManagerDesktop = ref<any>(null)
const offlineManagerRef = computed(() => offlineManagerMobile.value || offlineManagerDesktop.value)

function handleMapClick(coords: { lat: number; lng: number }) {
  // Place / move crosshair marker so the user sees what they tapped.
  const mapInstance = eclipseMapRef.value?.map
  if (mapInstance) {
    if (horizonMarker) horizonMarker.remove()

    const el = document.createElement('div')
    el.style.cssText = `width: 24px; height: 24px; position: relative;`
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

  // Drive the dock into HORIZON mode for the tapped lat/lng. spotName
  // is null because this is a bare-map tap, not a spot selection.
  dockHorizonCtx.value = { lat: coords.lat, lng: coords.lng, spotName: null }
  dockMode.value = 'horizon'
  dockDismissed.value = false
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
  <div class="relative w-full h-screen bg-surface-raised">
    <h1 class="sr-only">Weather Map — Eclipse Viewing Conditions in Iceland</h1>

    <!-- Map -->
    <ClientOnly>
      <EclipseMap
        ref="eclipseMapRef"
        :stations="showWeatherV0 ? stations : []"
        :spots="spotsData?.spots || []"
        :ranked-spots="rankedForMap"
        :historical="historicalWeatherData?.spots || null"
        :focus-spot="focusSpot"
        :initial-center="restoreCenter"
        :initial-zoom="restoreZoom"
        :selected-slug="selectedSlug"
        :suppress-popups="isMobile"
        class="absolute inset-0"
        @map-click="handleMapClick"
        @spot-select="onSpotSelect"
        @weather-select="onWeatherSelect"
      />
      <template #fallback>
        <div class="absolute inset-0 flex items-center justify-center">
          <p class="text-sm font-mono text-ink-3 animate-pulse">{{ t('map.loading') }}</p>
        </div>
      </template>
    </ClientOnly>

    <!-- v0 mobile chrome — chip stack at top, lightbox at bottom.
         Hidden on desktop; existing desktop floating controls remain in place. -->
    <div class="md:hidden absolute top-[72px] left-0 right-0 z-10 pointer-events-none">
      <MapChipStack
        :selected-profile="selectedProfile"
        :show-weather="showWeatherV0"
        :show-traffic="showTraffic"
        :show-cameras="showCameras"
        @update:selected-profile="selectedProfile = $event"
        @update:show-weather="showWeatherV0 = $event"
        @update:show-traffic="showTraffic = $event"
        @update:show-cameras="showCameras = $event"
      />
    </div>

    <!-- Map dock — mobile-only bottom card that swaps content between
         five modes (SPOT / WEATHER / ROADS / CAM / HORIZON). Lifted above
         BottomNav so it clears the safe-area + 5-tab strip:
            14px (pt) + 47px (icon+gap+label+gap+dot) + max(28, safe-area) (pb)
            + 8px gap = 69 + max(28px, safe-area). -->
    <div
      v-if="!dockDismissed"
      class="md:hidden fixed left-0 right-0 z-20 pointer-events-none"
      style="bottom: calc(69px + max(28px, env(safe-area-inset-bottom)));"
    >
      <MapDock
        :mode="dockMode"
        :spot="dockSpot"
        :weather-ctx="dockWeatherCtx"
        :roads-ctx="dockRoadsCtx"
        :cam-ctx="dockCamCtx"
        :horizon-ctx="dockHorizonCtx"
        @horizon-open="onHorizonOpen"
        @open-field-card="onOpenFieldCard"
        @cam-step="onCamStep"
        @close="onDockClose"
      />
    </div>

    <!-- Floats below the global top nav (72px, fixed, z-50). -->
    <div class="absolute top-[72px] left-0 right-0 z-10 pointer-events-none">
      <!-- Desktop top-right controls: layer toggles + Profile selector.
           Hidden on mobile (the bottom sheet provides the same controls). -->
      <div class="relative flex items-center justify-end gap-2 px-4 sm:px-6 py-3">
        <div class="pointer-events-auto hidden md:flex items-center gap-2">
          <button
            :aria-pressed="showCameras"
            :aria-label="showCameras ? t('map.cams_on') : t('map.cams_off')"
            class="font-mono text-xs tracking-wider px-2.5 py-1.5 rounded transition-all border"
            :class="showCameras
              ? 'ec-chip-blue bg-surface-raised/90'
              : 'text-ink-3 bg-surface-raised/90 border-border-subtle/50 hover:text-ink-1'"
            @click="showCameras = !showCameras"
          >
            {{ showCameras ? t('map.cams_on') : t('map.cams_off') }}
          </button>
          <button
            :aria-pressed="showTraffic"
            :aria-label="showTraffic ? t('map.roads_on') : t('map.roads_off')"
            class="font-mono text-xs tracking-wider px-2.5 py-1.5 rounded transition-all border"
            :class="showTraffic
              ? 'text-accent bg-surface-raised/90 border-accent/40'
              : 'text-ink-3 bg-surface-raised/90 border-border-subtle/50 hover:text-ink-1'"
            @click="showTraffic = !showTraffic"
          >
            {{ showTraffic ? t('map.roads_on') : t('map.roads_off') }}
          </button>
        </div>
        <div class="pointer-events-auto hidden md:block" @click.stop>
          <button
            class="text-xs font-mono tracking-wider px-2.5 py-1.5 rounded transition-all border"
            :class="activeProfileName
              ? 'text-accent bg-surface-raised/90 border-accent/40'
              : 'text-ink-3 bg-surface-raised/90 border-border-subtle/50 hover:text-ink-1'"
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
            class="absolute right-4 sm:right-6 top-full mt-1 bg-surface-raised/95 backdrop-blur-sm border border-border-subtle/60 rounded py-1 min-w-[140px] z-20"
          >
            <button
              v-for="profile in PROFILES"
              :key="profile.id"
              role="menuitem"
              class="w-full text-left px-3 py-1.5 text-xs font-mono transition-colors"
              :class="selectedProfile === profile.id ? 'text-accent' : 'text-ink-3 hover:text-ink-1'"
              @click="selectedProfile = selectedProfile === profile.id ? null : profile.id as ProfileId; profileMenuOpen = false; if (selectedProfile) requestGps()"
            >
              {{ profile.name }}
            </button>
            <button
              v-if="selectedProfile"
              role="menuitem"
              class="w-full text-left px-3 py-1.5 text-xs font-mono text-ink-3 hover:text-ink-2 border-t border-border-subtle/40 mt-1 pt-1.5 transition-colors"
              @click="selectedProfile = null; profileMenuOpen = false"
            >
              {{ t('map.clear_profile') }}
            </button>
          </div>
        </div>
      </div>
      <!-- Offline banner (only visible when offline or stale) -->
      <div class="pointer-events-auto px-4 sm:px-6">
        <OfflineBanner />
      </div>
    </div>

    <!-- ═══ Desktop: legend (hidden on mobile) ═══ -->
    <div class="hidden md:block absolute bottom-[84px] left-6 z-10 bg-surface-raised/90 backdrop-blur-sm border border-border-subtle/50 rounded px-4 py-3 max-h-[calc(100dvh-220px)] overflow-y-auto text-xs">
      <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3 mb-2.5">{{ t('map.cloud_cover') }}</p>
      <div class="flex flex-col gap-1.5">
        <div v-for="item in legendItems" :key="item.label" class="flex items-center gap-2">
          <WeatherIcon :cloud-cover="item.cloudCover" :size="20" class="shrink-0" />
          <span class="text-xs font-mono text-ink-2">{{ item.label }}</span>
        </div>
      </div>
      <div class="mt-3 pt-2.5 border-t border-border-subtle/40">
        <div class="flex items-center gap-2 mb-1">
          <span class="w-3.5 h-3.5 rounded-full border-2 border-accent bg-surface-raised flex items-center justify-center shrink-0">
            <span class="w-1.5 h-1.5 rounded-full bg-accent" />
          </span>
          <span class="text-xs font-mono text-ink-2">{{ t('map.viewing_spot') }}</span>
        </div>
        <div class="flex items-center gap-2 mb-1">
          <span class="w-4 h-0 border-t border-dashed border-accent/40" />
          <span class="text-xs font-mono text-ink-2">{{ t('map.totality_path') }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-4 h-0 border-t-2 border-accent-strong/60" />
          <span class="text-xs font-mono text-ink-2">{{ t('map.centerline') }}</span>
        </div>
      </div>
      <div v-if="showTraffic" class="mt-3 pt-2.5 border-t border-border-subtle/40">
        <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3 mb-2">{{ t('map.road_conditions') }}</p>
        <div class="flex items-center gap-2 mb-1">
          <span class="w-4 h-0 border-t-2 border-green-500" />
          <span class="text-xs font-mono text-ink-2">{{ t('map.road_good') }}</span>
        </div>
        <div class="flex items-center gap-2 mb-1">
          <span class="w-4 h-0 border-t-2 border-orange-500" />
          <span class="text-xs font-mono text-ink-2">{{ t('map.road_difficult') }}</span>
        </div>
        <div class="flex items-center gap-2 mb-1">
          <span class="w-4 h-0 border-t-2 border-red-500" />
          <span class="text-xs font-mono text-ink-2">{{ t('map.road_closed') }}</span>
        </div>
        <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3 mt-2 mb-2">{{ t('map.road_warnings') }}</p>
        <div class="flex items-center gap-2 mb-1">
          <span class="w-3 h-3 rounded-full border-2 border-orange-500 bg-surface-raised shrink-0" />
          <span class="text-xs font-mono text-ink-2">{{ t('map.hazard') }}</span>
        </div>
        <div class="flex items-center gap-2 mb-1">
          <span class="w-3 h-3 rounded-full border-2 border-red-500 bg-surface-raised shrink-0" />
          <span class="text-xs font-mono text-ink-2">{{ t('map.closed') }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full border-2 border-gray-500 bg-surface-raised shrink-0" />
          <span class="text-xs font-mono text-ink-2">{{ t('map.other') }}</span>
        </div>
      </div>
      <div v-if="showCameras" class="mt-3 pt-2.5 border-t border-border-subtle/40">
        <div class="flex items-center gap-2">
          <span class="w-4 h-4 rounded-full border-2 border-[#7dd3fc] bg-surface-raised flex items-center justify-center shrink-0">
            <svg width="8" height="8" viewBox="0 0 16 16" fill="none" class="shrink-0">
              <circle cx="8" cy="8" r="5" stroke="#7dd3fc" stroke-width="1.5" fill="none" />
              <circle cx="8" cy="8" r="2" fill="#7dd3fc" />
            </svg>
          </span>
          <span class="text-xs font-mono text-ink-2">{{ t('map.road_camera') }}</span>
        </div>
      </div>
    </div>

    <!--
      Mobile bottom sheet hidden — the v0 MapChipStack at the top of the
      map already exposes profile + cams + roads on mobile, making this
      pullable sheet redundant. Kept the markup so it can be re-enabled
      with a single class swap if we want a mobile legend later.
    -->
    <div
      class="hidden absolute left-0 right-0 bottom-16 z-10"
      :style="{ height: sheetHeight + 'px' }"
      :class="sheetDragging ? '' : 'transition-[height] duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]'"
    >
      <div class="h-full bg-surface-raised/95 backdrop-blur-md border-t border-border-subtle/40 rounded-t-xl flex flex-col overflow-hidden">
        <!-- Drag handle -->
        <div
          role="button"
          tabindex="0"
          :aria-label="sheetHeight > sheetSnapPoints[0] + 20 ? 'Collapse map legend' : 'Expand map legend'"
          :aria-expanded="sheetHeight > sheetSnapPoints[0] + 20"
          class="flex flex-col items-center pt-2.5 pb-2 cursor-grab active:cursor-grabbing shrink-0"
          @touchstart="sheetTouchStart"
          @touchmove.prevent="sheetTouchMove"
          @click="sheetToggle"
          @keydown.enter="sheetToggle"
          @keydown.space.prevent="sheetToggle"
        >
          <div class="w-10 h-1 rounded-full bg-slate-600/60" />
        </div>

        <!-- Always-visible controls row: Profile (left) + Cams/Roads (right).
             pt-4 gives visual separation from the drag handle; the peek snap
             (110 px) is sized to just fit this row + the handle. -->
        <div class="flex items-center gap-2 px-4 pt-4 pb-3 shrink-0">
          <!-- Profile cycle button -->
          <button
            :aria-label="activeProfileName ? `Profile: ${activeProfileName}` : t('map.profile')"
            class="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded border font-mono text-[11px] tracking-wider transition-all active:scale-95"
            :class="selectedProfile
              ? 'border-accent/30 bg-accent/8 text-accent'
              : 'border-border-subtle/30 bg-bg/40 text-ink-3'"
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
              ? 'border-[#7dd3fc]/30 bg-[#7dd3fc]/[0.08] text-[#7dd3fc]'
              : 'border-border-subtle/30 bg-bg/40 text-ink-3'"
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
              ? 'border-accent/30 bg-accent/8 text-accent'
              : 'border-border-subtle/30 bg-bg/40 text-ink-3'"
            @click="showTraffic = !showTraffic"
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M8 1L15 14H1L8 1Z" :stroke="showTraffic ? '#f59e0b' : '#475569'" stroke-width="1.5" fill="none" /></svg>
            {{ showTraffic ? t('map.roads_on') : t('map.roads_off') }}
          </button>
        </div>

        <!-- Expanded content (visible when pulled up) -->
        <div v-show="sheetHeight > sheetSnapPoints[0] + 20" class="flex-1 overflow-y-auto px-4 pb-4 border-t border-border-subtle/30 pt-3">
          <!-- Profile selector (full chip list) -->
          <div class="mb-3 pb-3 border-b border-border-subtle/30">
            <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3 mb-2">{{ t('map.viewer_profile') }}</p>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="profile in PROFILES"
                :key="profile.id"
                class="flex items-center gap-1.5 px-2.5 py-1.5 rounded border font-mono text-[11px] transition-all"
                :class="selectedProfile === profile.id
                  ? 'border-accent/40 bg-accent/10 text-accent'
                  : 'border-border-subtle/30 bg-bg/40 text-ink-3'"
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
              <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3 mb-2.5">{{ t('map.cloud_cover') }}</p>
              <div class="flex flex-col gap-1.5">
                <div v-for="item in legendItems" :key="item.label" class="flex items-center gap-2">
                  <WeatherIcon :cloud-cover="item.cloudCover" :size="18" class="shrink-0" />
                  <span class="text-[11px] font-mono text-ink-3">{{ item.label }}</span>
                </div>
              </div>
            </div>
            <!-- Right column: Map legend -->
            <div>
              <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3 mb-2.5">{{ t('map.map_legend') }}</p>
              <div class="flex flex-col gap-2">
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full border-2 border-accent bg-surface-raised shrink-0" />
                  <span class="text-[11px] font-mono text-ink-2">{{ t('map.viewing_spot') }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-4 h-0 border-t border-dashed border-accent/40" />
                  <span class="text-[11px] font-mono text-ink-2">{{ t('map.totality_path') }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="w-4 h-0 border-t-2 border-accent-strong/60" />
                  <span class="text-[11px] font-mono text-ink-2">{{ t('map.centerline') }}</span>
                </div>
                <!-- Conditional: road conditions + warnings -->
                <template v-if="showTraffic">
                  <div class="mt-1.5 pt-1.5 border-t border-border-subtle/30">
                    <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3 mb-1.5">{{ t('map.road_conditions') }}</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="w-4 h-0 border-t-2 border-green-500" />
                    <span class="text-[11px] font-mono text-ink-2">{{ t('map.road_good') }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="w-4 h-0 border-t-2 border-orange-500" />
                    <span class="text-[11px] font-mono text-ink-2">{{ t('map.road_difficult') }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="w-4 h-0 border-t-2 border-red-500" />
                    <span class="text-[11px] font-mono text-ink-2">{{ t('map.road_closed') }}</span>
                  </div>
                  <div class="mt-1.5">
                    <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3 mb-1.5">{{ t('map.road_warnings') }}</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full border-2 border-orange-500 bg-surface-raised shrink-0" />
                    <span class="text-[11px] font-mono text-ink-2">{{ t('map.hazard') }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full border-2 border-red-500 bg-surface-raised shrink-0" />
                    <span class="text-[11px] font-mono text-ink-2">{{ t('map.closed') }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full border-2 border-gray-500 bg-surface-raised shrink-0" />
                    <span class="text-[11px] font-mono text-ink-2">{{ t('map.other') }}</span>
                  </div>
                </template>
                <!-- Conditional: camera -->
                <div v-if="showCameras" class="flex items-center gap-2" :class="{ 'mt-1.5 pt-1.5 border-t border-border-subtle/30': !showTraffic }">
                  <span class="w-3.5 h-3.5 rounded-full border-2 border-[#7dd3fc] bg-surface-raised flex items-center justify-center shrink-0">
                    <svg width="7" height="7" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5" stroke="#7dd3fc" stroke-width="1.5" fill="none" /><circle cx="8" cy="8" r="2" fill="#7dd3fc" /></svg>
                  </span>
                  <span class="text-[11px] font-mono text-ink-2">{{ t('map.road_camera') }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Offline download (mobile) -->
          <div class="mt-3 pt-3 border-t border-border-subtle/30">
            <OfflineManager :map="eclipseMapRef?.map" @downloading="tileDownloading = $event" ref="offlineManagerMobile" />
          </div>
        </div>
      </div>
    </div>

    <!-- Offline download manager (desktop) -->
    <div class="absolute top-32 left-6 z-10 w-64 hidden md:block">
      <OfflineManager :map="eclipseMapRef?.map" @downloading="tileDownloading = $event" ref="offlineManagerDesktop" />
    </div>

    <!-- Full-screen download overlay -->
    <div
      v-if="tileDownloading"
      class="absolute inset-0 z-50 bg-surface-raised/95 flex flex-col items-center justify-center px-8"
    >
      <svg class="w-12 h-12 text-accent/40 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
      <p class="font-display text-xl font-semibold text-ink-1 mb-2">{{ t('offline.downloading') }}</p>
      <p class="font-mono text-xs text-ink-3 mb-6">
        {{ t('offline.tiles_progress', { loaded: offlineManagerRef?.loadedTiles ?? 0, total: offlineManagerRef?.totalTiles ?? 0, progress: offlineManagerRef?.progress ?? 0 }) }}
      </p>
      <div class="w-full max-w-xs h-2 bg-bg rounded-full overflow-hidden mb-6">
        <div
          class="h-full bg-accent transition-all duration-200"
          :style="{ width: `${offlineManagerRef?.progress ?? 0}%` }"
        />
      </div>
      <button
        class="font-mono text-xs text-ink-3 hover:text-ink-2 transition-colors"
        @click="offlineManagerRef?.cancel()"
      >
        {{ t('offline.cancel') }}
      </button>
    </div>

    <!-- Desktop-only: Pro click-to-check-horizon panel still renders the
         dynamic horizon overlay because the dock is mobile-only for now.
         When the desktop dock lands, this block goes away too. -->
    <Transition name="fade">
      <div
        v-if="dockMode === 'horizon' && dockHorizonCtx"
        class="hidden md:block absolute z-20 md:bottom-[80px] md:right-6 md:w-[640px] md:max-w-[calc(100vw-3rem)]"
      >
        <DynamicHorizonCheck
          :key="`${dockHorizonCtx.lat},${dockHorizonCtx.lng}`"
          :lat="dockHorizonCtx.lat"
          :lng="dockHorizonCtx.lng"
          @close="dockHorizonCtx = null; dockMode = 'spot'"
        />
      </div>
    </Transition>

    <!-- Camera lightbox (full-screen overlay, z-99999). Desktop-only —
         mobile uses the dock CAM mode. -->
    <ClientOnly>
      <CameraLightbox
        :camera="activeLightboxCamera"
        :start-index="lightboxStartIndex"
        @close="activeLightboxCamera = null"
      />
    </ClientOnly>

    <!-- Spot data error banner -->
    <Transition name="fade">
      <div
        v-if="showSpotError"
        class="absolute top-16 left-1/2 -translate-x-1/2 z-20 px-4 py-2.5 rounded bg-red-900/80 backdrop-blur-sm border border-red-700/40 text-xs font-mono text-red-300 flex items-center gap-3 shadow-lg max-w-sm"
      >
        <span>Could not load viewing spots.</span>
        <button
          class="text-status-red hover:opacity-75 transition-opacity shrink-0"
          aria-label="Dismiss error"
          @click="showSpotError = false"
        >
          ✕
        </button>
      </div>
    </Transition>
  </div>
</template>


