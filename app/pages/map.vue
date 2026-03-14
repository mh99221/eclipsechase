<script setup lang="ts">
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
  title: 'Weather Map — EclipseChase.is',
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
  ...CLOUD_COVER_LEVELS.map(l => ({ label: l.label, color: l.color })),
  { label: CLOUD_COVER_NO_DATA.label, color: CLOUD_COVER_NO_DATA.color },
]
</script>

<template>
  <div class="relative w-full h-screen bg-void-deep">
    <h1 class="sr-only">Weather Map — Eclipse Viewing Conditions in Iceland</h1>

    <!-- Map -->
    <ClientOnly>
      <EclipseMap
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

    <!-- Legend panel -->
    <div class="absolute bottom-20 sm:bottom-6 left-4 sm:left-6 z-10 bg-void-deep/90 backdrop-blur-sm border border-void-border/50 rounded px-3 py-2.5 sm:px-4 sm:py-3 max-h-[calc(100dvh-160px)] overflow-y-auto text-[11px] sm:text-xs">
      <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2.5">Cloud Cover</p>
      <div class="flex flex-col gap-1 sm:gap-1.5">
        <div
          v-for="item in legendItems"
          :key="item.label"
          class="flex items-center gap-2"
        >
          <span
            class="w-2.5 h-2.5 rounded-full shrink-0"
            :style="{ background: item.color, boxShadow: `0 0 6px ${item.color}44` }"
            aria-hidden="true"
          />
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
  </div>
</template>
