<script setup lang="ts">
import { formatDuration, REGION_LABELS, SPOT_TYPE_LABELS } from '~/utils/eclipse'
import { PROFILES, useRecommendation } from '~/composables/useRecommendation'
import type { ProfileId, RankedSpot } from '~/composables/useRecommendation'
import type { SpotPhoto } from '~/types/spots'

const { isPro } = useProStatus()
const { coords } = useLocation()

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

// Profile selection
const selectedProfile = ref<ProfileId | null>(null)
const showProPrompt = ref(false)

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
  clear: 'text-green-400 border-green-400/30 bg-green-400/10',
  marginal: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  risky: 'text-orange-400 border-orange-400/30 bg-orange-400/10',
  blocked: 'text-red-400 border-red-400/30 bg-red-400/10',
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
    <div class="section-container max-w-5xl py-8 sm:py-12">
      <p class="font-mono text-xs tracking-[0.3em] text-corona/60 uppercase mb-3">Eclipse 2026</p>
      <h1 class="font-display text-3xl sm:text-4xl font-bold text-white mb-6">Viewing Spots</h1>

      <!-- Profile selector -->
      <div class="mb-6">
        <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-3">Find your best spot</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="profile in PROFILES"
            :key="profile.id"
            class="px-3 py-1.5 rounded border text-xs font-mono tracking-wider transition-all"
            :class="
              isPro
                ? selectedProfile === profile.id
                  ? 'border-corona bg-corona/10 text-corona'
                  : 'border-void-border/40 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                : 'border-void-border/30 text-slate-500 opacity-50 cursor-not-allowed'
            "
            @click="selectProfile(profile.id)"
          >
            <template v-if="!isPro">&#x1F512; </template>{{ profile.name }}
          </button>
          <button
            v-if="selectedProfile"
            class="px-3 py-1.5 rounded border border-void-border/40 text-xs font-mono tracking-wider text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-all"
            @click="clearProfile"
          >
            Clear
          </button>
        </div>
      </div>

      <!-- Pro upgrade prompt (shown when free user clicks a profile) -->
      <div
        v-if="showProPrompt"
        class="mb-6 px-4 py-3 rounded bg-amber-900/15 border border-amber-700/20 flex items-center justify-between gap-4"
      >
        <p class="text-xs font-mono text-amber-400/80">
          Profile-based scoring is a Pro feature.
          <NuxtLink to="/pro" class="text-corona hover:text-corona-bright transition-colors ml-1">
            Get Pro Access
          </NuxtLink>
        </p>
        <button
          class="text-slate-500 hover:text-slate-300 transition-colors text-xs font-mono shrink-0"
          @click="dismissProPrompt"
        >
          Dismiss
        </button>
      </div>

      <!-- Thin results warning -->
      <div
        v-if="selectedProfile && thinResults"
        class="mb-6 px-3 py-2.5 rounded bg-amber-900/15 border border-amber-700/20 text-xs font-mono text-amber-400/80"
      >
        Few spots match this profile. Consider trying a different one for more options.
      </div>

      <!-- Spot grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <NuxtLink
          v-for="item in displayItems"
          :key="item.spot.id"
          :to="`/spots/${item.spot.slug}`"
          class="group bg-void-surface border border-void-border/40 rounded overflow-hidden hover:border-corona/30 transition-all"
          :class="{ 'opacity-50': item.filtered }"
        >
          <div class="relative aspect-video bg-void-deep overflow-hidden">
            <img
              :src="getThumbUrl(item.spot)"
              :srcset="`${getThumbUrl(item.spot)} 600w, ${getHeroUrl(item.spot)} 1200w`"
              sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
              :alt="item.spot.name"
              loading="lazy"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <!-- Score badge (Pro + profile selected) -->
            <span
              v-if="selectedProfile && item.score >= 0"
              class="absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-mono font-bold text-white"
              :class="scoreColor(item.score)"
            >{{ item.score }}</span>
          </div>
          <div class="px-4 py-3">
            <div class="flex items-center gap-2 mb-1.5">
              <span
                v-if="item.spot.spot_type"
                class="text-[9px] font-mono tracking-[0.15em] uppercase px-1.5 py-0.5 rounded border"
                :class="item.spot.spot_type === 'drive-up' ? 'text-green-400 border-green-400/30' : 'text-amber-400 border-amber-400/30'"
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
            <h3 class="font-display text-base font-semibold text-white mb-1 group-hover:text-corona-bright transition-colors">{{ item.spot.name }}</h3>
            <div class="flex items-center justify-between">
              <span class="font-mono text-[10px] text-slate-500 uppercase tracking-wider">{{ REGION_LABELS[item.spot.region] || item.spot.region }}</span>
              <span class="font-display text-sm font-bold text-white">{{ formatDuration(item.spot.totality_duration_seconds) }}</span>
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>

    <footer class="border-t border-void-border/30 py-8">
      <div class="section-container text-center">
        <NuxtLink to="/" class="font-mono text-sm text-slate-500 hover:text-slate-300 transition-colors">
          &larr; Back to home
        </NuxtLink>
      </div>
    </footer>
  </div>
</template>
