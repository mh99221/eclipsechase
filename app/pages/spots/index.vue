<script setup lang="ts">
import { formatDuration, REGION_LABELS, SPOT_TYPE_LABELS } from '~/utils/eclipse'
import { PROFILES, useRecommendation } from '~/composables/useRecommendation'
import type { ProfileId, RankedSpot } from '~/composables/useRecommendation'
import type { SpotPhoto } from '~/types/spots'

const { isPro } = useProStatus()
const { coords } = useLocation()
const route = useRoute()
const router = useRouter()

const { data } = await useFetch('/api/spots')

const rawSpots = computed(() => {
  const list = data.value?.spots || []
  return [...list].sort((a: any, b: any) => (b.totality_duration_seconds || 0) - (a.totality_duration_seconds || 0))
})

// Weather + stations — lazy, client-only (avoid server fetch / free-user overhead)
const { data: rawWeatherData } = useFetch<{ cloud_cover: Array<{ station_id: string; cloud_cover: number | null }> }>('/api/weather/cloud-cover', { lazy: true, server: false })
const { data: rawStationsData } = useFetch<{ stations: Array<{ id: string; lat: number; lng: number }> }>('/api/weather/stations', { lazy: true, server: false })

const weatherData = computed(() => rawWeatherData.value?.cloud_cover || null)
const stationsData = computed(() => rawStationsData.value?.stations || null)

// Profile selection — persisted in URL so it survives navigation
// (e.g. click a spot detail, press back → the profile is still selected)
const initialProfile = typeof route.query.profile === 'string' ? route.query.profile : null
const selectedProfile = ref<ProfileId | null>(
  PROFILES.some(p => p.id === initialProfile) ? (initialProfile as ProfileId) : null,
)
const showProPrompt = ref(false)

// State → URL: keep the query param in sync without polluting history (replace, not push)
watch(selectedProfile, (val) => {
  if (!import.meta.client) return
  const query = { ...route.query }
  if (val) query.profile = val
  else delete query.profile
  router.replace({ path: route.path, query })
})

function selectProfile(id: ProfileId) {
  if (!isPro.value) {
    showProPrompt.value = true
    return
  }
  selectedProfile.value = selectedProfile.value === id ? null : id
}

function clearProfile() {
  selectedProfile.value = null
}

function dismissProPrompt() {
  showProPrompt.value = false
}

// Recommendation engine
const { ranked, thinResults } = useRecommendation(
  rawSpots,
  weatherData,
  stationsData,
  coords,
  selectedProfile,
)

// Final display list — always RankedSpot[]
const displayItems = computed<RankedSpot[]>(() => {
  return ranked.value
})

// Helpers
function getHeroUrl(spot: any): string {
  const raw = spot.photos
  if (raw) {
    const photos = typeof raw === 'string' ? JSON.parse(raw) : Array.isArray(raw) ? raw : []
    const hero = photos.find((p: SpotPhoto) => p.is_hero) || photos[0]
    if (hero) return `/images/spots/${hero.filename}`
  }
  return `/images/spots/${spot.slug}-hero.webp`
}

function getThumbUrl(spot: any): string {
  return getHeroUrl(spot).replace(/\.webp$/, '-thumb.webp')
}

function getHorizonVerdict(spot: any): string | null {
  const raw = spot.horizon_check
  if (!raw) return null
  const hc = typeof raw === 'string' ? JSON.parse(raw) : raw
  return hc?.verdict || null
}

const verdictColor: Record<string, string> = {
  clear: 'ec-chip-green',
  marginal: 'ec-chip-yellow',
  risky: 'ec-chip-orange',
  blocked: 'ec-chip-red',
}

function scoreColor(score: number): string {
  if (score >= 80) return 'bg-green-500'
  if (score >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

useHead({
  title: 'Viewing Spots — EclipseChase',
  meta: [
    { name: 'description', content: 'Browse 28 curated eclipse viewing spots across western Iceland for the August 12, 2026 total solar eclipse.' },
  ],
})
</script>

<template>
  <div class="relative noise min-h-screen pt-[72px]">
    <div class="section-container max-w-3xl py-8 sm:py-12">
      <p class="font-mono text-xs tracking-[0.3em] text-accent/60 uppercase mb-3">Eclipse 2026</p>
      <h1 class="font-display text-3xl sm:text-4xl font-bold text-ink-1 mb-6">Viewing Spots</h1>

      <!-- Profile selector -->
      <div class="mb-6">
        <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3 mb-3">Find your best spot</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="profile in PROFILES"
            :key="profile.id"
            class="px-3 py-1.5 rounded border text-xs font-mono tracking-wider transition-all"
            :class="
              isPro
                ? selectedProfile === profile.id
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border-subtle/40 text-ink-3 hover:border-slate-500 hover:text-ink-2'
                : 'border-border-subtle/30 text-ink-3 opacity-50 cursor-not-allowed'
            "
            @click="selectProfile(profile.id)"
          >
            <template v-if="!isPro">&#x1F512; </template>{{ profile.name }}
          </button>
          <button
            v-if="selectedProfile"
            class="px-3 py-1.5 rounded border border-border-subtle/40 text-xs font-mono tracking-wider text-ink-3 hover:text-ink-2 hover:border-slate-500 transition-all"
            @click="clearProfile"
          >
            Clear
          </button>
        </div>
      </div>

      <!-- Pro upgrade prompt (shown when free user clicks a profile) -->
      <div
        v-if="showProPrompt"
        class="mb-6 px-4 py-3 ec-banner-warn flex items-center justify-between gap-4"
      >
        <p class="text-xs font-mono">
          Profile-based scoring is a Pro feature.
          <NuxtLink to="/pro" class="text-accent hover:text-accent-strong transition-colors ml-1">
            Get Pro Access
          </NuxtLink>
        </p>
        <button
          class="text-ink-3 hover:text-ink-2 transition-colors text-xs font-mono shrink-0"
          @click="dismissProPrompt"
        >
          Dismiss
        </button>
      </div>

      <!-- Thin results warning -->
      <div
        v-if="selectedProfile && thinResults"
        class="mb-6 px-3 py-2.5 ec-banner-warn text-xs font-mono"
      >
        Few spots match this profile. Consider trying a different one for more options.
      </div>

      <!-- Spot grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <NuxtLink
          v-for="item in displayItems"
          :key="item.spot.id"
          :to="`/spots/${item.spot.slug}`"
          class="group bg-surface border border-border-subtle/40 rounded overflow-hidden hover:border-accent/30 transition-all"
          :class="{ 'opacity-50': item.filtered }"
        >
          <div class="relative aspect-video bg-surface-raised overflow-hidden">
            <img
              :src="getThumbUrl(item.spot)"
              :srcset="`${getThumbUrl(item.spot)} 600w, ${getHeroUrl(item.spot)} 1200w`"
              sizes="(max-width: 639px) 100vw, 384px"
              :alt="item.spot.name"
              loading="lazy"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <!-- Score badge (Pro + profile selected) -->
            <span
              v-if="selectedProfile && item.score >= 0"
              class="absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-mono font-bold text-ink-1"
              :class="scoreColor(item.score)"
            >{{ item.score }}</span>
          </div>
          <div class="px-4 py-3">
            <div class="flex items-center gap-2 mb-1.5">
              <span
                v-if="item.spot.spot_type"
                class="text-[9px] font-mono tracking-[0.15em] uppercase px-1.5 py-0.5 rounded border"
                :class="item.spot.spot_type === 'drive-up' ? 'ec-chip-green' : 'ec-chip-amber'"
              >{{ SPOT_TYPE_LABELS[item.spot.spot_type] || item.spot.spot_type }}</span>
              <span
                v-if="getHorizonVerdict(item.spot)"
                class="text-[9px] font-mono tracking-[0.15em] uppercase px-1.5 py-0.5 rounded border"
                :class="verdictColor[getHorizonVerdict(item.spot)!]"
              >{{ getHorizonVerdict(item.spot) }}</span>
              <!-- Weather icon when profile selected and data available -->
              <WeatherIcon
                v-if="selectedProfile && item.cloudCover != null"
                :cloud-cover="item.cloudCover"
                :size="16"
                class="ml-auto"
              />
            </div>
            <h3 class="font-display text-base font-semibold text-ink-1 mb-1 group-hover:text-accent-strong transition-colors">{{ item.spot.name }}</h3>
            <div class="flex items-center justify-between">
              <span class="font-mono text-[10px] text-ink-3 uppercase tracking-wider">{{ REGION_LABELS[item.spot.region] || item.spot.region }}</span>
              <span class="font-display text-sm font-bold text-ink-1">{{ formatDuration(item.spot.totality_duration_seconds) }}</span>
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>

    <AppFooter />
  </div>
</template>
