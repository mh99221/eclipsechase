<script setup lang="ts">
definePageMeta({ middleware: ['pro-gate'] })

import mapboxgl from 'mapbox-gl'
import { CLOUD_COVER_LEVELS, CLOUD_COVER_NO_DATA } from '~/utils/eclipse'
import { conditionPriority, getTrafficColor, getTrafficLabel } from '~/utils/traffic'
import type { TrafficCondition, TrafficConditionItem } from '~/utils/traffic'
import { PROFILES, useRecommendation } from '~/composables/useRecommendation'
import type { ProfileId } from '~/composables/useRecommendation'
import type {
  DockMode,
  DockWeatherCtx,
  DockRoadsCtx,
  DockCamCtx,
  DockHorizonCtx,
} from '~/components/map/dock/types'
import MapDockPopup from '~/components/map/MapDockPopup.vue'
import MapStatusStack from '~/components/map/MapStatusStack.vue'
import MapLegend from '~/components/map/MapLegend.vue'
import MapOfflineCard from '~/components/map/MapOfflineCard.vue'
import MapChipStack from '~/components/map/MapChipStack.vue'
import MapMobileStatusPill from '~/components/map/MapMobileStatusPill.vue'
import MapStatusSheet from '~/components/map/MapStatusSheet.vue'

const { t, locale } = useI18n()
const route = useRoute()
const { authHeaders } = useProStatus()
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
const { data: spotsData, error: spotsError } = useFetch('/api/spots', {
  query: { locale: locale.value },
  lazy: true,
  server: false,
  key: `map-spots-${locale.value}`,
})
const { data: cloudData, refresh: refreshCloud } = useFetch<{
  cloud_cover: Array<{
    station_id: string
    cloud_cover: number | null
    forecast_valid_at: string | null
  }>
  stale: boolean
  fetched_at: string | null
}>('/api/weather/cloud-cover', { lazy: true, server: false })
const { data: historicalWeatherData } = useFetch<{ spots: Record<string, { clear_years: number; total_years: number; avg_cloud_cover: number | null }> }>(
  '/eclipse-data/historical-weather.json',
  { lazy: true, server: false, key: 'historical-weather' },
)
// Dismissable error banner — driven by spotsError ref but user can close it.
const showSpotError = ref(false)
watch(spotsError, (err) => { if (err) showSpotError.value = true })

// Merge station metadata with cloud-cover forecast. vedur's automatic
// stations don't observe cloud cover — `cloud_cover` is always the next
// future forecast slot, and `forecast_valid_at` is its valid time.
const stations = computed(() => {
  const stationList = stationsData.value?.stations || []
  const cloudCover = cloudData.value?.cloud_cover || []

  const byStation = new Map<string, { cloud_cover: number | null; forecast_valid_at: string | null }>()
  for (const cc of cloudCover) {
    byStation.set(cc.station_id, {
      cloud_cover: cc.cloud_cover,
      forecast_valid_at: cc.forecast_valid_at,
    })
  }

  return stationList.map((s: any) => {
    const merged = byStation.get(s.id)
    return {
      station_id: s.id,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      region: s.region,
      cloud_cover: merged?.cloud_cover ?? null,
      forecast_valid_at: merged?.forecast_valid_at ?? null,
    }
  })
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

const activeProfileName = computed(() => {
  const p = PROFILES.find(p => p.id === selectedProfile.value)
  return p ? t(p.nameKey) : null
})

// v0 mobile chrome — chip stack at top + bottom dock.
// Seeded from ?spot= URL param so deep links open with a selection.
// `showWeatherV0` toggles the cloud-cover weather glyphs (the per-station
// markers that paint Iceland with sun / partly / overcast icons).
const showWeatherV0 = ref(true)
const selectedSlug = ref<string | null>(focusSpot)
// Selection ids per overlay type — used by EclipseMap to highlight the
// matching marker (station) and by traffic/cam marker click handlers
// (via toggleSelectedAttr) to apply the [data-selected] state for CSS.
const selectedStationId = ref<string | null>(null)
const selectedCamId = ref<number | null>(null)
const selectedTrafficKey = ref<string | null>(null)

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
  // cloud_cover + forecast_valid_at come from the nearest future forecast
  // slot. vedur's automatic stations don't observe cloud cover, so this
  // is always a forecast — never a live reading. Both can be null.
  dockWeatherCtx.value = {
    name: station.name,
    cloud: station.cloud_cover ?? null,
    forecastValidAt: station.forecast_valid_at ?? null,
  }
  selectedStationId.value = station.station_id ?? null
  dockMode.value = 'weather'
  dockDismissed.value = false
}

function onRoadSelect(ctx: DockRoadsCtx, key: string | null = null) {
  dockRoadsCtx.value = ctx
  selectedTrafficKey.value = key
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
  selectedCamId.value = cam.id
  dockMode.value = 'cam'
  dockDismissed.value = false
}
function onCamStep(dir: 1 | -1) {
  if (!dockCamCtx.value) return
  const total = dockCamCtx.value.images.length
  if (total === 0) return
  const next = ((dockCamCtx.value.idx + dir) % total + total) % total
  dockCamCtx.value.idx = next
  camIndexById.set(Number(dockCamCtx.value.id), next)
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
  // Drop any [data-selected] highlights — close = nothing selected.
  selectedSlug.value = null
  selectedStationId.value = null
  selectedCamId.value = null
  selectedTrafficKey.value = null
  if (horizonMarker) { horizonMarker.remove(); horizonMarker = null }
}

// Selection-highlight watchers: flip [data-selected] on the matching
// marker DOM element so CSS can render a glowing ring without
// recreating any markers. Registries are populated in
// build{Traffic,Camera}Marker.
watch(selectedTrafficKey, (next, prev) => {
  if (prev) trafficMarkerEls.get(prev)?.removeAttribute('data-selected')
  if (next) trafficMarkerEls.get(next)?.setAttribute('data-selected', 'true')
})
watch(selectedCamId, (next, prev) => {
  if (prev != null) cameraMarkerEls.get(prev)?.removeAttribute('data-selected')
  if (next != null) cameraMarkerEls.get(next)?.setAttribute('data-selected', 'true')
})

function onOpenFieldCard() {
  const s = dockSpot.value
  if (!s) return
  // Pass current map view so /spots → "back to map" returns here.
  // `localePath` prefixes the locale prefix when one applies (e.g. `/is/`),
  // so this navigates to the IS spot page when the user is on /is/map
  // instead of falling back to /spots/* which would drop them into EN.
  const path = localePath(`/spots/${s.slug}`)
  const mapInst = eclipseMapRef.value?.map
  if (mapInst) {
    const c = mapInst.getCenter()
    const z = mapInst.getZoom().toFixed(1)
    router.push(`${path}?mlat=${c.lat.toFixed(4)}&mlng=${c.lng.toFixed(4)}&mzoom=${z}`)
  } else {
    router.push(path)
  }
}

const router = useRouter()
const localePath = useLocalePath()

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

// Legend from shared constants — labels resolve through useI18n() so
// the legend follows the active locale.
const legendItems = computed(() => [
  ...CLOUD_COVER_LEVELS.map(l => ({ label: t(l.labelKey), cloudCover: l.max as number | null })),
  { label: t(CLOUD_COVER_NO_DATA.labelKey), cloudCover: null as number | null },
])

// Traffic / road conditions layer

const showTraffic = ref(false)

// Module-scoped caches for the traffic overlay's companion data
// (segments + full road geometry). `useMapOverlay` owns the primary
// `conditions` array; these two are consumed by `addRoadPolylines` /
// `buildEnrichedRoads` and survive re-toggles alongside it.
let trafficSegmentsCache: { segments: any[] } | null = null
let trafficRoadsCache: any = null

// Marker DOM element registries — used by selection watchers to flip
// the [data-selected] attribute on the previously-selected marker
// without recreating any markers.
const trafficMarkerEls = new Map<string, HTMLElement>()
const cameraMarkerEls = new Map<number, HTMLElement>()

function trafficKey(c: TrafficConditionItem): string {
  return `${c.lat.toFixed(5)},${c.lng.toFixed(5)}`
}

function normaliseCond(raw: string): TrafficCondition {
  if (raw === 'good' || raw === 'difficult' || raw === 'closed') return raw
  return 'unknown'
}

function buildTrafficMarker(c: TrafficConditionItem, map: mapboxgl.Map): mapboxgl.Marker {
  const color = getTrafficColor(c.condition)
  const el = document.createElement('div')
  el.className = 'traffic-marker'
  el.setAttribute('role', 'button')
  el.setAttribute('tabindex', '0')
  el.setAttribute('aria-label', `${c.roadName || 'Road'}: ${c.description}`)
  el.style.cssText = `
    width: 18px; height: 18px; border-radius: 50%;
    background: rgb(var(--map-marker-bg)); border: 2px solid ${color};
    box-shadow: 0 0 8px ${color}40;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
  `
  el.innerHTML = `<svg width="9" height="9" viewBox="0 0 16 16" fill="${color}">
    <path d="M8 1L15 14H1L8 1Z" fill="none" stroke="${color}" stroke-width="1.5"/>
    <circle cx="8" cy="11" r="1" fill="${color}"/>
    <rect x="7.25" y="5.5" width="1.5" height="3.5" rx="0.75" fill="${color}"/>
  </svg>`

  const marker = new mapboxgl.Marker({ element: el })
    .setLngLat([c.lng, c.lat])
    .addTo(map)

  // Register the marker element under a stable key so the selection
  // watcher can flip [data-selected] when the dock-popup target changes.
  const key = trafficKey(c)
  trafficMarkerEls.set(key, el)
  if (selectedTrafficKey.value === key) el.dataset.selected = 'true'

  // Click drives the dock popup (mobile + desktop). stopPropagation
  // defends against the click also reaching Mapbox's bare-map handler.
  el.addEventListener('click', (e) => {
    e.stopPropagation()
    onRoadSelect({
      cond: normaliseCond(c.condition),
      label: getTrafficLabel(c.condition),
      detail: c.roadName ? `${c.roadName} · ${c.description}` : c.description,
      updatedAt: c.updatedAt ?? null,
    }, key)
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

  // Build a lookup: normalized road name → { worst condition, updatedAt }.
  // Worst condition wins on collisions; we keep its timestamp alongside.
  const segLookup = new Map<string, { condition: string; updatedAt: string | null }>()
  for (const seg of trafficSegmentsCache.segments) {
    const key = normalizeRoadName(seg.sectionName || seg.roadName)
    const existing = segLookup.get(key)
    if (!existing || conditionPriority(seg.condition) > conditionPriority(existing.condition)) {
      segLookup.set(key, { condition: seg.condition, updatedAt: seg.updatedAt ?? null })
    }
  }

  // Shallow-clone features array, only copying properties we mutate
  const features = trafficRoadsCache.features.map((f: any) => {
    const normName = normalizeRoadName(f.properties.roadName || '')
    const normRef = f.properties.roadRef ? normalizeRoadName(f.properties.roadRef) : ''

    let matched = 'unknown'
    let matchedUpdated: string | null = null
    for (const [segKey, info] of segLookup) {
      if ((normName && (segKey.includes(normName) || normName.includes(segKey))) ||
          (normRef && segKey.includes(normRef))) {
        if (conditionPriority(info.condition) > conditionPriority(matched)) {
          matched = info.condition
          matchedUpdated = info.updatedAt
        }
      }
    }

    return {
      ...f,
      properties: { ...f.properties, condition: matched, updated_at: matchedUpdated },
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
    const name = f.properties.roadName || f.properties.roadRef || 'Road'
    const refLabel = f.properties.roadRef ? `${name} (${f.properties.roadRef})` : name

    // Drive the dock popup — no more inline Mapbox popup at the click point.
    onRoadSelect({
      cond: normaliseCond(condition),
      label: getTrafficLabel(condition),
      detail: refLabel,
      updatedAt: f.properties.updated_at ?? null,
    })
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
interface CameraData { id: number; name: string; lat: number; lng: number; images: CameraImage[] }

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
        <span data-cam-action="open" style="color:${meta};font-size:10px;cursor:pointer;border-bottom:1px solid ${border};">${t('map_extra.click_to_enlarge')}</span>
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
    background: rgb(var(--map-marker-bg)); border: 2px solid #7dd3fc;
    box-shadow: 0 0 8px rgba(125, 211, 252, 0.25);
    cursor: pointer; display: flex; align-items: center; justify-content: center;
  `
  el.innerHTML = `<svg width="10" height="10" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="5" stroke="#7dd3fc" stroke-width="1.5" fill="none"/>
    <circle cx="8" cy="8" r="2" fill="#7dd3fc"/>
  </svg>`

  const marker = new mapboxgl.Marker({ element: el })
    .setLngLat([cam.lng, cam.lat])
    .addTo(map)

  // Register so the selection watcher can flip [data-selected].
  cameraMarkerEls.set(cam.id, el)
  if (selectedCamId.value === cam.id) el.dataset.selected = 'true'

  // Click drives the dock popup. stopPropagation defends against the
  // click also reaching Mapbox's bare-map handler.
  el.addEventListener('click', (e) => {
    e.stopPropagation()
    onCamSelect(cam)
  })
  return marker
}

useMapOverlay<CameraData>({
  active: showCameras,
  mapRef: eclipseMapRef,
  fetchData: async () => {
    const { cameras } = await $fetch<{ cameras: CameraData[] }>('/api/cameras', {
      headers: await authHeaders(),
    })
    return cameras
  },
  buildMarker: (cam, { map }) => buildCameraMarker(cam, map),
  onDeactivate: () => {
    cameraMarkerEls.clear()
    selectedCamId.value = null
  },
})

useMapOverlay<TrafficConditionItem>({
  active: showTraffic,
  mapRef: eclipseMapRef,
  fetchData: async () => {
    const headers = await authHeaders()
    const [conditionsRes, segmentsRes, roadsRes] = await Promise.all([
      $fetch<{ conditions: TrafficConditionItem[] }>('/api/traffic/conditions', { headers }),
      trafficSegmentsCache ? Promise.resolve(trafficSegmentsCache) : $fetch<{ segments: any[] }>('/api/traffic/segments', { headers }),
      trafficRoadsCache ? Promise.resolve(trafficRoadsCache) : $fetch('/eclipse-data/roads.geojson'),
    ])
    trafficSegmentsCache = segmentsRes
    trafficRoadsCache = roadsRes
    return conditionsRes.conditions
  },
  buildMarker: (c, { map }) => buildTrafficMarker(c, map),
  onActivate: (map) => addRoadPolylines(map),
  onDeactivate: (map) => {
    removeRoadPolylines(map)
    trafficMarkerEls.clear()
    selectedTrafficKey.value = null
  },
})

// ─── Mobile Peek Sheet ───
// peek (just fits the 3 control buttons), full (legend visible)
const sheetSnapPoints = [110, 400] as const
const sheetHeight = ref<number>(sheetSnapPoints[0])
const sheetDragging = ref(false)
const sheetStartY = ref(0)
const sheetStartHeight = ref(0)

function sheetTouchStart(e: TouchEvent) {
  const t = e.touches[0]
  if (!t) return
  sheetDragging.value = true
  sheetStartY.value = t.clientY
  sheetStartHeight.value = sheetHeight.value
}
function sheetTouchMove(e: TouchEvent) {
  if (!sheetDragging.value) return
  const t = e.touches[0]
  if (!t) return
  const dy = sheetStartY.value - t.clientY
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
const tileProgress = ref({ loaded: 0, total: 0 })
const tileProgressPct = computed(() => {
  const { loaded, total } = tileProgress.value
  // Cap at 100 — see OfflineManager.vue; raw count can outrun the estimate.
  return total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0
})
// Cap the displayed numerator too so the running progress reads
// "1338 / 1338" once Mapbox starts pre-fetching neighbour tiles past
// our deliberate sweep, not "1403 / 1338".
const tileProgressLoadedDisplay = computed(() => {
  const { loaded, total } = tileProgress.value
  return Math.min(loaded, total)
})
const offlineManagerMobile = ref<any>(null)
const offlineManagerDesktop = ref<any>(null)
const statusSheetRef = ref<any>(null)
const offlineManagerRef = computed(() => offlineManagerMobile.value || offlineManagerDesktop.value)

const statusSheetOpen = ref(false)
function onTileProgress(p: { loaded: number; total: number }) {
  tileProgress.value = p
}
function onDownloadingChange(active: boolean) {
  tileDownloading.value = active
  if (!active) tileProgress.value = { loaded: 0, total: 0 }
}
function cancelTileDownload() {
  // Only one variant is mounted per viewport (mobile vs. desktop slot);
  // the other ref is null and the optional chain is a no-op. The status
  // sheet hosts the mobile OfflineManager when open, so cancel that too.
  offlineManagerMobile.value?.cancel?.()
  offlineManagerDesktop.value?.cancel?.()
  statusSheetRef.value?.cancel?.()
}
// Status-stack input (desktop only).
const { isWeatherStale } = useOfflineStatus()
const weatherFetchedAt = computed(() => cloudData.value?.fetched_at ?? null)
const weatherStale = computed(() => cloudData.value?.stale === true || isWeatherStale.value)

// Manual refresh — wired to the status-stack/status-sheet refresh buttons.
// `refreshCloud` returns a promise from the underlying useFetch; we flip
// `weatherRefreshing` while it's in flight so the spinner can render.
const weatherRefreshing = ref(false)
async function refreshWeather() {
  if (weatherRefreshing.value) return
  weatherRefreshing.value = true
  try { await refreshCloud() }
  finally { weatherRefreshing.value = false }
}

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
    selectedProfile.value = profileIds[idx + 1] ?? null
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
        :selected-slug="dockMode === 'spot' ? selectedSlug : null"
        :selected-station-id="dockMode === 'weather' ? selectedStationId : null"
        :suppress-popups="true"
        class="absolute inset-0 z-0"
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

    <!-- v0 mobile chrome — chip stack at top, dock at bottom.
         Both the mobile and desktop MapChipStack instances live in the
         DOM (CSS swaps them by breakpoint). We mark whichever isn't
         visually active as aria-hidden + inert so screen readers and
         keyboard users only see one set of filters at a time. -->
    <div
      class="mobile-chip-anchor"
      aria-hidden="false"
      data-variant="mobile"
    >
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

    <!-- Mobile-only status pill — combined weather freshness + tile cache,
         tappable to open the status sheet. Desktop has MapStatusStack +
         MapOfflineCard at the corners instead. -->
    <MapMobileStatusPill
      :weather-fetched-at="weatherFetchedAt"
      :weather-stale="weatherStale"
      @open="statusSheetOpen = true"
    />

    <!-- Map dock — mobile-only bottom card that swaps content between
         five modes (SPOT / WEATHER / ROADS / CAM / HORIZON). -->
    <div
      v-if="!dockDismissed"
      class="mobile-dock-anchor"
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

    <!-- Network status banner (only visible when offline or data is stale).
         Positioned below the topright chip stack on desktop (top:84 +
         ~70 px stack height ≈ 160) and below the mobile chip stack on
         mobile (top:72 + ~70 px stack height ≈ 150). Single safe value
         that clears both. -->
    <div class="offline-banner-wrap absolute left-0 right-0 z-10 pointer-events-none">
      <div class="offline-banner-anchor pointer-events-auto px-4 sm:px-6">
        <OfflineBanner />
      </div>
    </div>

    <!-- ═══ Desktop bottom-right popup — appears only on selection ═══ -->
    <MapDockPopup
      :mode="dockMode"
      :spot="dockSpot"
      :weather-ctx="dockWeatherCtx"
      :roads-ctx="dockRoadsCtx"
      :cam-ctx="dockCamCtx"
      :horizon-ctx="dockHorizonCtx"
      :dismissed="dockDismissed"
      @horizon-open="onHorizonOpen"
      @open-field-card="onOpenFieldCard"
      @cam-step="onCamStep"
      @close="onDockClose"
    />

    <!-- ═══ Desktop top-right: profile selector + layer toggles, stacked ═══
         Wrapped so the desktop instance can carry its own data-variant /
         aria-hidden coordination with the mobile instance above. -->
    <div class="desktop-chip-anchor" data-variant="desktop">
      <MapChipStack
        variant="topright"
        rows="all"
        :selected-profile="selectedProfile"
        :show-weather="showWeatherV0"
        :show-traffic="showTraffic"
        :show-cameras="showCameras"
        @update:selected-profile="selectedProfile = $event; if (selectedProfile) requestGps()"
        @update:show-weather="showWeatherV0 = $event"
        @update:show-traffic="showTraffic = $event"
        @update:show-cameras="showCameras = $event"
      />
    </div>

    <!-- ═══ Desktop top-right status stack — weather freshness only ═══ -->
    <MapStatusStack
      :weather-fetched-at="weatherFetchedAt"
      :weather-stale="weatherStale"
      :refreshing="weatherRefreshing"
      @refresh="refreshWeather"
    />

    <!-- ═══ Desktop bottom-left: legend + offline manager ═══ -->
    <div class="map-legend-anchor">
      <MapLegend
        :legend-items="legendItems"
        :show-traffic="showTraffic"
        :show-cameras="showCameras"
      />
      <div class="offline-manager-slot">
        <MapOfflineCard :map="eclipseMapRef?.map" @downloading="onDownloadingChange" @progress="onTileProgress" ref="offlineManagerDesktop" />
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
                {{ t(profile.nameKey) }}
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
            <OfflineManager :map="eclipseMapRef?.map" @downloading="onDownloadingChange" @progress="onTileProgress" ref="offlineManagerMobile" />
          </div>
        </div>
      </div>
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
        {{ t('offline.tiles_progress', { loaded: tileProgressLoadedDisplay, total: tileProgress.total, progress: tileProgressPct }) }}
      </p>
      <div class="w-full max-w-xs h-2 bg-bg rounded-full overflow-hidden mb-6">
        <div
          class="h-full bg-accent transition-all duration-200"
          :style="{ width: `${tileProgressPct}%` }"
        />
      </div>
      <button
        class="font-mono text-xs text-ink-3 hover:text-ink-2 transition-colors"
        @click="cancelTileDownload"
      >
        {{ t('offline.cancel') }}
      </button>
    </div>

    <!-- Mobile status sheet — opened by MapMobileStatusPill. Hosts the
         full OfflineManager UI (cache button, status table, clear cache)
         alongside the weather freshness section. -->
    <MapStatusSheet
      ref="statusSheetRef"
      :open="statusSheetOpen"
      :map="eclipseMapRef?.map"
      :weather-fetched-at="weatherFetchedAt"
      :weather-stale="weatherStale"
      :refreshing="weatherRefreshing"
      @close="statusSheetOpen = false"
      @refresh="refreshWeather"
      @downloading="onDownloadingChange"
      @progress="onTileProgress"
    />

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
        <span>{{ t('map_extra.error_spot_load') }}</span>
        <button
          class="text-status-red hover:opacity-75 transition-opacity shrink-0"
          :aria-label="t('map_extra.error_dismiss')"
          @click="showSpotError = false"
        >
          ✕
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Mobile-only chrome anchors. Component-level visibility (vs. Tailwind
   `md:hidden`) so the layout is robust to JIT-utility quirks in dev.
   The inactive breakpoint variant is `display: none`, which removes
   it from layout, the focus order, and the accessibility tree — so
   keyboard users and screen readers only encounter one MapChipStack
   even though both render in the template. */
.mobile-chip-anchor {
  position: absolute;
  top: 72px;
  left: 0;
  right: 0;
  z-index: 10;
  pointer-events: none;
}
/* Hide the desktop chip stack on mobile (the existing rule below at
   line 1289 hides the mobile chip stack on tablet+). */
@media (max-width: 767px) {
  .desktop-chip-anchor { display: none; }
}
/* Banner sits below both the mobile chip stack (top 72 + ~70 px) and
   the desktop topright chip stack (top 84 + ~70 px). 160 clears both
   with breathing room. */
.offline-banner-wrap {
  top: 160px;
}
.mobile-dock-anchor {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(69px + max(28px, env(safe-area-inset-bottom)));
  z-index: 20;
  pointer-events: none;
}
@media (min-width: 768px) {
  .mobile-chip-anchor,
  .mobile-dock-anchor { display: none; }
}

/* Legend + offline manager anchor: bottom-left of the map. The rail is
   gone now that the dock content lives in a bottom-right popup, so the
   legend reclaims the corner. Hidden on mobile via the legend's own
   scoped CSS; offline manager only renders inside this wrapper. */
.map-legend-anchor {
  position: absolute;
  /* Mapbox logo + attribution have been re-anchored to bottom-center
     (see the global style block below), so the bottom-left corner is
     ours again — drop back down to the edge with breathing room. */
  left: 14px;
  bottom: 14px;
  z-index: 10;
  display: flex;
  align-items: flex-end;
  gap: 12px;
}
@media (max-width: 767px) {
  .map-legend-anchor { display: none; }
}
</style>

<!-- Non-scoped: Mapbox markers live OUTSIDE the Vue template tree
     (attached directly to the canvas container via `.addTo(map)`),
     so scoped CSS can't reach them. -->
<style>
.traffic-marker[data-selected='true'],
.camera-marker[data-selected='true'] {
  box-shadow: 0 0 0 3px #D85848, 0 0 14px 4px rgba(216, 88, 72, 0.45);
  transform: scale(1.18);
  transition: box-shadow 0.18s ease, transform 0.18s ease;
  z-index: 3;
}

/* Light theme — Mapbox swaps to light tiles, so the cloud-cover SVG
   glyphs (greens/ambers/reds) wash out on cream. Add a subtle dark
   drop-shadow halo so each marker reads as a distinct mark on the
   warmer base map. The dark theme keeps its existing glow. */
html.light .station-marker,
html.light .spot-marker,
html.light .traffic-marker,
html.light .camera-marker {
  filter: drop-shadow(0 0 1px rgba(17, 20, 28, 0.55));
}

/* Re-anchor Mapbox's bottom controls to bottom-center so the legend +
   offline-maps cards (bottom-left) and the dock popup (bottom-right)
   reclaim the full corners. The default Mapbox container slots are
   `.mapboxgl-ctrl-bottom-left` (logo) and `.mapboxgl-ctrl-bottom-right`
   (attribution); we slide both toward the centre using fixed-width
   transforms so they sit side-by-side at the bottom middle. */
.mapboxgl-ctrl-bottom-left,
.mapboxgl-ctrl-bottom-right {
  bottom: 0;
}
.mapboxgl-ctrl-bottom-left {
  left: 50%;
  right: auto;
  transform: translateX(-100%);
}
.mapboxgl-ctrl-bottom-right {
  right: auto;
  left: 50%;
}
</style>


