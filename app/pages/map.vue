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
  title: 'Weather Map',
  meta: [
    { name: 'description', content: 'Live weather conditions across western Iceland for the 2026 total solar eclipse.' },
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

const trafficMarkers = ref<any[]>([])

function getTrafficColor(condition: string): string {
  switch (condition) {
    case 'good': return '#22c55e'
    case 'difficult': return '#f97316'
    case 'closed': return '#ef4444'
    default: return '#6b7280'
  }
}

function addTrafficMarkers(map: any) {
  removeTrafficMarkers()
  const conditions = trafficData.value?.conditions || []
  for (const c of conditions) {
    const el = document.createElement('div')
    el.className = 'traffic-marker'
    el.style.width = '10px'
    el.style.height = '10px'
    el.style.borderRadius = '50%'
    el.style.backgroundColor = getTrafficColor(c.condition)
    el.style.border = '1px solid rgba(0,0,0,0.3)'
    el.title = `${c.roadName}: ${c.description}`

    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat([c.lng, c.lat])
      .addTo(map)
    trafficMarkers.value.push(marker)
  }
}

function removeTrafficMarkers() {
  for (const m of trafficMarkers.value) {
    m.remove()
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

// Road cameras layer
const showCameras = ref(false)
const cameraData = ref<{ cameras: any[] } | null>(null)
const cameraMarkers = ref<any[]>([])

function addCameraMarkers(map: any) {
  removeCameraMarkers()
  const cameras = cameraData.value?.cameras || []
  for (const cam of cameras) {
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

    // Popup matching spot/station style
    const popup = new mapboxgl.Popup({
      offset: 14,
      closeButton: false,
      maxWidth: '260px',
      className: 'eclipse-popup',
    }).setHTML(`
      <div style="font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #e2e8f0; padding: 4px;">
        <div style="font-family: 'Syne', sans-serif; font-weight: 600; font-size: 14px; margin-bottom: 2px; color: #7dd3fc;">${cam.name}</div>
        <div style="color: #475569; font-size: 11px; margin-bottom: 8px;">${cam.road}</div>
        <img
          src="${cam.images[0]?.url}"
          alt="${cam.name}"
          style="width: 100%; border-radius: 3px; border: 1px solid #1a2540; display: block;"
          loading="lazy"
          onerror="this.style.display='none'"
        />
        ${cam.images.length > 1 ? `<div style="color: #475569; font-size: 10px; margin-top: 6px;">${cam.images.length} angles at this location</div>` : ''}
      </div>
    `)

    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat([cam.lng, cam.lat])
      .setPopup(popup)
      .addTo(map)
    cameraMarkers.value.push(marker)
  }
}

function removeCameraMarkers() {
  for (const m of cameraMarkers.value) {
    m.remove()
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
          <p class="text-sm font-mono text-slate-500 animate-pulse">Loading map...</p>
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
              {{ activeProfileName || 'Profile' }}
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
                Clear profile
              </button>
            </div>
          </div>
          <span class="text-xs font-mono text-corona/70 tracking-wider hidden sm:inline">
            AUG 12 2026
          </span>
        </div>
      </div>
    </div>

    <!-- Map layer toggles -->
    <div class="absolute bottom-20 sm:bottom-6 right-4 sm:right-6 z-10 flex gap-2">
      <button
        class="font-mono text-xs tracking-wider px-2.5 py-1.5 rounded transition-all border"
        :class="showCameras
          ? 'text-blue-400 bg-void-deep/90 border-blue-400/40'
          : 'text-slate-400 bg-void-deep/90 border-void-border/50 hover:text-slate-200'"
        @click="showCameras = !showCameras"
      >
        Cams {{ showCameras ? 'ON' : 'OFF' }}
      </button>
      <button
        class="font-mono text-xs tracking-wider px-2.5 py-1.5 rounded transition-all border"
        :class="showTraffic
          ? 'text-corona bg-void-deep/90 border-corona/40'
          : 'text-slate-400 bg-void-deep/90 border-void-border/50 hover:text-slate-200'"
        @click="showTraffic = !showTraffic"
      >
        Roads {{ showTraffic ? 'ON' : 'OFF' }}
      </button>
    </div>

    <!-- Legend panel -->
    <div class="absolute bottom-20 sm:bottom-6 left-4 sm:left-6 z-10 bg-void-deep/90 backdrop-blur-sm border border-void-border/50 rounded px-3 py-2.5 sm:px-4 sm:py-3 max-h-[calc(100dvh-160px)] overflow-y-auto text-[11px] sm:text-xs">
      <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2.5">Cloud Cover</p>
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
          <span class="text-xs font-mono text-slate-400">Viewing spot</span>
        </div>
        <div class="flex items-center gap-2 mb-1">
          <span class="w-4 h-0 border-t border-dashed border-corona/40" />
          <span class="text-xs font-mono text-slate-400">Totality path</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-4 h-0 border-t-2 border-corona-bright/60" />
          <span class="text-xs font-mono text-slate-400">Centerline</span>
        </div>
      </div>
    </div>

    <!-- Offline download manager -->
    <div class="absolute top-20 right-4 sm:right-6 z-10 w-64 hidden sm:block">
      <OfflineManager :map="eclipseMapRef?.map" />
    </div>
  </div>
</template>
