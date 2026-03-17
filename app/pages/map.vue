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
const [{ data: stationsData }, { data: spotsData }, { data: cloudData, refresh: refreshCloud }] = await Promise.all([
  useFetch('/api/weather/stations'),
  useFetch('/api/spots'),
  useFetch('/api/weather/cloud-cover'),
])

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
      maxWidth: '220px',
      className: 'eclipse-popup',
    }).setHTML(`
      <div style="font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #e2e8f0; padding: 4px;">
        <div style="font-family: 'Syne', sans-serif; font-weight: 600; font-size: 14px; margin-bottom: 4px; color: ${color};">${TRAFFIC_LABELS[c.condition] || 'Road condition'}</div>
        ${c.roadName ? `<div style="color: #94a3b8; margin-bottom: 4px;">${c.roadName}</div>` : ''}
        <div style="color: #cbd5e1;">${c.description}</div>
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
    if (!trafficData.value) {
      const data = await $fetch<{ conditions: any[] }>('/api/traffic/conditions')
      trafficData.value = data
    }
    addTrafficMarkers(mapInstance)
  } else {
    removeTrafficMarkers()
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
      maxWidth: '300px',
      className: 'eclipse-popup',
    }).setHTML(`
      <div style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:#e2e8f0;padding:4px;">
        <div style="display:flex;align-items:baseline;justify-content:space-between;gap:6px;margin-bottom:2px;">
          <div style="font-family:'Syne',sans-serif;font-weight:600;font-size:14px;color:#7dd3fc;">${cam.name}</div>
          ${hasMultiple ? `<span id="${uid}-counter" style="font-size:11px;color:#475569;white-space:nowrap;">1/${imgs.length}</span>` : ''}
        </div>
        <div style="color:#475569;font-size:11px;margin-bottom:6px;">${descHtml}</div>
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
})
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

        <div class="pointer-events-auto flex items-center gap-3">
          <!-- Profile selector -->
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
    </div>

    <!-- Map layer toggles -->
    <div class="absolute bottom-20 sm:bottom-6 right-16 sm:right-20 z-10 flex gap-2">
      <button
        class="font-mono text-xs tracking-wider px-2.5 py-1.5 rounded transition-all border"
        :class="showCameras
          ? 'text-blue-400 bg-void-deep/90 border-blue-400/40'
          : 'text-slate-400 bg-void-deep/90 border-void-border/50 hover:text-slate-200'"
        @click="showCameras = !showCameras"
      >
        {{ showCameras ? t('map.cams_on') : t('map.cams_off') }}
      </button>
      <button
        class="font-mono text-xs tracking-wider px-2.5 py-1.5 rounded transition-all border"
        :class="showTraffic
          ? 'text-corona bg-void-deep/90 border-corona/40'
          : 'text-slate-400 bg-void-deep/90 border-void-border/50 hover:text-slate-200'"
        @click="showTraffic = !showTraffic"
      >
        {{ showTraffic ? t('map.roads_on') : t('map.roads_off') }}
      </button>
    </div>

    <!-- Legend panel -->
    <div class="absolute bottom-20 sm:bottom-10 left-4 sm:left-6 z-10 bg-void-deep/90 backdrop-blur-sm border border-void-border/50 rounded px-3 py-2.5 sm:px-4 sm:py-3 max-h-[calc(100dvh-160px)] overflow-y-auto text-[11px] sm:text-xs">
      <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2.5">{{ t('map.cloud_cover') }}</p>
      <div class="flex flex-col gap-1 sm:gap-1.5">
        <div
          v-for="item in legendItems"
          :key="item.label"
          class="flex items-center gap-2"
        >
          <WeatherIcon :cloud-cover="item.cloudCover" :size="20" class="shrink-0" />
          <span class="text-xs font-mono text-slate-400">{{ item.label }}</span>
        </div>
      </div>

      <div class="mt-3 pt-2.5 border-t border-void-border/40">
        <div class="flex items-center gap-2 mb-1">
          <span class="w-3.5 h-3.5 rounded-full border-2 border-corona bg-void-deep flex items-center justify-center shrink-0">
            <span class="w-1.5 h-1.5 rounded-full bg-corona" />
          </span>
          <span class="text-xs font-mono text-slate-400">{{ t('map.viewing_spot') }}</span>
        </div>
        <div class="flex items-center gap-2 mb-1">
          <span class="w-4 h-0 border-t border-dashed border-corona/40" />
          <span class="text-xs font-mono text-slate-400">{{ t('map.totality_path') }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-4 h-0 border-t-2 border-corona-bright/60" />
          <span class="text-xs font-mono text-slate-400">{{ t('map.centerline') }}</span>
        </div>
      </div>

      <!-- Road conditions legend (shown when Roads ON) -->
      <div v-if="showTraffic" class="mt-3 pt-2.5 border-t border-void-border/40">
        <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2">{{ t('map.road_warnings') }}</p>
        <div class="flex items-center gap-2 mb-1">
          <span class="w-3 h-3 rounded-full border-2 border-orange-500 bg-void-deep shrink-0" />
          <span class="text-xs font-mono text-slate-400">{{ t('map.hazard') }}</span>
        </div>
        <div class="flex items-center gap-2 mb-1">
          <span class="w-3 h-3 rounded-full border-2 border-red-500 bg-void-deep shrink-0" />
          <span class="text-xs font-mono text-slate-400">{{ t('map.closed') }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full border-2 border-gray-500 bg-void-deep shrink-0" />
          <span class="text-xs font-mono text-slate-400">{{ t('map.other') }}</span>
        </div>
      </div>

      <!-- Camera legend (shown when Cams ON) -->
      <div v-if="showCameras" class="mt-3 pt-2.5 border-t border-void-border/40">
        <div class="flex items-center gap-2">
          <span class="w-4 h-4 rounded-full border-2 border-ice bg-void-deep flex items-center justify-center shrink-0">
            <svg width="8" height="8" viewBox="0 0 16 16" fill="none" class="shrink-0">
              <circle cx="8" cy="8" r="5" stroke="#7dd3fc" stroke-width="1.5" fill="none" />
              <circle cx="8" cy="8" r="2" fill="#7dd3fc" />
            </svg>
          </span>
          <span class="text-xs font-mono text-slate-400">{{ t('map.road_camera') }}</span>
        </div>
      </div>
    </div>

    <!-- Offline download manager -->
    <div class="absolute top-32 left-4 sm:left-6 z-10 w-64 hidden sm:block">
      <OfflineManager :map="eclipseMapRef?.map" />
    </div>
  </div>
</template>
