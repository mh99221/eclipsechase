<script setup lang="ts">
definePageMeta({ middleware: ['pro-gate'] })

import { PROFILES, useRecommendation } from '~/composables/useRecommendation'
import type { ProfileId } from '~/composables/useRecommendation'
import { formatDuration, REGION_LABELS, SPOT_TYPE_LABELS } from '~/utils/eclipse'

const { t } = useI18n()

useHead({
  title: 'Find Your Spot',
  meta: [
    { name: 'description', content: 'Personalized eclipse viewing spot recommendations based on your style and live weather conditions.' },
  ],
})

// Fetch data in parallel
const [{ data: spotsData, status: spotsStatus, error: spotsError }, { data: stationsData }, { data: cloudData }] = await Promise.all([
  useFetch('/api/spots'),
  useFetch('/api/weather/stations'),
  useFetch('/api/weather/cloud-cover'),
])

const isLoading = computed(() => spotsStatus.value === 'pending')
const hasError = computed(() => !!spotsError.value)

// Location
const { coords, isGps, request: requestGps } = useLocation()
onMounted(() => requestGps())

// Profile selection
const selectedProfile = ref<ProfileId | null>(null)
const showAll = ref(false)

// Scoring
const spots = computed(() => spotsData.value?.spots || [])
const stations = computed(() => stationsData.value?.stations || [])
const cloudCover = computed(() => cloudData.value?.cloud_cover || null)

const { ranked, thinResults } = useRecommendation(
  spots,
  cloudCover,
  stations,
  coords,
  selectedProfile,
)

// Display helpers
const visibleSpots = computed(() => {
  if (showAll.value) return ranked.value
  return ranked.value.slice(0, 3)
})

const hiddenCount = computed(() => Math.max(0, ranked.value.length - 3))

const unfilteredCount = computed(() => ranked.value.filter(r => !r.filtered).length)
const activeProfile = computed(() => PROFILES.find(p => p.id === selectedProfile.value) || null)

// Suggest a different profile when thin results — never suggest the currently selected one
const suggestedProfile = computed(() => {
  if (!selectedProfile.value) return 'First-Timer'
  const fallback = selectedProfile.value === 'firsttimer' ? 'skychaser' : 'firsttimer'
  const profile = PROFILES.find(p => p.id === fallback)
  return profile?.name || 'First-Timer'
})
const scoreTooltipOpen = ref<string | null>(null)

function closeTooltip() { scoreTooltipOpen.value = null }

const locationLabel = computed(() => {
  if (!isGps.value) return null
  const [lat, lng] = coords.value
  const latStr = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}`
  const lngStr = `${Math.abs(lng).toFixed(2)}°${lng >= 0 ? 'E' : 'W'}`
  return `${latStr}, ${lngStr}`
})
onMounted(() => document.addEventListener('click', closeTooltip))
onUnmounted(() => document.removeEventListener('click', closeTooltip))

function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-400'
  if (score >= 50) return 'text-amber-400'
  return 'text-red-400'
}
</script>

<template>
  <div class="relative noise min-h-screen">
    <!-- Nav -->
    <nav class="flex items-center justify-between px-4 sm:px-10 py-5">
      <NuxtLink to="/" aria-label="EclipseChase — Home" class="flex items-center gap-2.5 group">
        <svg class="w-8 h-8" viewBox="0 0 128 128" fill="none" aria-hidden="true">
          <circle cx="64" cy="64" r="36" fill="#050810" />
          <circle cx="64" cy="64" r="36" stroke="#f59e0b" stroke-width="3" opacity="0.8" />
          <circle cx="96" cy="48" r="4" fill="#f59e0b" />
        </svg>
        <span class="font-display font-semibold text-base tracking-wide text-slate-300 group-hover:text-white transition-colors">
          ECLIPSECHASE
        </span>
      </NuxtLink>
      <div class="flex items-center gap-4">
        <UserMenu />
        <NuxtLink to="/map" class="text-xs font-mono text-slate-400 hover:text-corona transition-colors tracking-wider">
          MAP
        </NuxtLink>
      </div>
    </nav>

    <!-- Offline banner -->
    <div class="section-container max-w-3xl pt-2">
      <OfflineBanner />
    </div>

    <!-- Content -->
    <div class="section-container max-w-3xl py-6 sm:py-12">
      <!-- Header -->
      <div class="mb-8">
        <span class="font-mono text-xs tracking-[0.3em] text-corona/60 uppercase">
          {{ t('recommend.find_your_spot') }}
        </span>
        <h1 class="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mt-2 mb-3">
          {{ t('recommend.title') }}
        </h1>
        <p class="text-sm sm:text-base text-slate-400 max-w-xl">
          {{ t('recommend.subtitle') }}
        </p>
      </div>

      <!-- Profile selector -->
      <div class="relative mb-3">
        <div class="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide sm:flex-wrap sm:overflow-visible">
          <button
            v-for="profile in PROFILES"
            :key="profile.id"
            :aria-pressed="selectedProfile === profile.id"
            class="px-3 sm:px-4 py-2 sm:py-2.5 rounded-md text-xs sm:text-sm font-mono tracking-wide transition-all whitespace-nowrap shrink-0 sm:shrink"
            :class="selectedProfile === profile.id
              ? 'bg-corona/15 border-2 border-corona text-corona-bright'
              : 'bg-void-surface border border-void-border/50 text-slate-400 hover:text-slate-200 hover:border-slate-500'"
            @click="selectedProfile = selectedProfile === profile.id ? null : profile.id; showAll = false"
          >
            {{ profile.name }}
          </button>
        </div>
        <!-- Scroll fade hint (mobile only) -->
        <div class="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-void-deep to-transparent pointer-events-none sm:hidden" />
      </div>

      <!-- Active profile description -->
      <p
        v-if="activeProfile"
        class="mb-8 text-sm text-slate-400 font-mono"
      >
        {{ t(activeProfile.descriptionKey) }}
      </p>

      <!-- Thin results banner -->
      <div
        v-if="selectedProfile && thinResults"
        class="mb-6 px-4 py-3 rounded bg-amber-900/20 border border-amber-700/30 text-xs font-mono text-amber-400"
      >
        {{ t('recommend.thin_results', { count: unfilteredCount, suggested: suggestedProfile }) }}
      </div>

      <!-- Location indicator -->
      <div class="mb-6 text-xs font-mono text-slate-500">
        {{ isGps ? t('recommend.from_location') : t('recommend.from_reykjavik') }}
        <span v-if="locationLabel" class="text-slate-600"> ({{ locationLabel }})</span>
      </div>

      <!-- Results header -->
      <div class="mb-4">
        <p v-if="activeProfile" class="font-mono text-xs tracking-[0.2em] text-slate-500 uppercase">
          {{ t('recommend.top_picks', { profile: activeProfile.name }) }}
        </p>
        <p v-else class="font-mono text-xs tracking-[0.2em] text-slate-500 uppercase">
          {{ t('recommend.all_spots') }}
        </p>
      </div>

      <!-- Error state -->
      <div
        v-if="hasError"
        class="mb-6 px-4 py-3 rounded bg-red-900/20 border border-red-700/30 text-xs font-mono text-red-400"
      >
        Could not load viewing spots. Please try refreshing the page.
      </div>

      <!-- Loading skeleton -->
      <template v-if="isLoading">
        <div class="flex flex-col gap-3">
          <div v-for="i in 3" :key="i" class="bg-void-surface border border-void-border/40 rounded-lg p-4 animate-pulse">
            <div class="h-3 w-24 bg-slate-700/50 rounded mb-2" />
            <div class="h-5 w-48 bg-slate-700/50 rounded mb-2" />
            <div class="h-3 w-64 bg-slate-700/50 rounded" />
          </div>
        </div>
      </template>

      <!-- No profile prompt -->
      <p
        v-if="!selectedProfile && !isLoading && !hasError"
        class="mb-6 text-sm text-slate-500 font-mono"
      >
        {{ t('recommend.no_profile') }}
      </p>

      <!-- Spot cards -->
      <div v-if="!isLoading && !hasError" class="flex flex-col gap-3">
        <article
          v-for="(item, index) in visibleSpots"
          :key="item.spot.id"
          class="rounded-lg p-4 transition-all"
          :class="[
            item.filtered
              ? 'bg-void-surface/50 border border-void-border/20 opacity-50'
              : index === 0 && selectedProfile
                ? 'bg-corona/5 border border-corona/30'
                : 'bg-void-surface border border-void-border/40',
          ]"
        >
          <div class="flex justify-between items-start gap-4">
            <div class="flex-1 min-w-0">
              <!-- Rank + region -->
              <div class="flex items-center gap-2 mb-1.5">
                <span
                  v-if="selectedProfile && !item.filtered"
                  class="text-xs font-bold px-1.5 py-0.5 rounded"
                  :class="index < 3
                    ? 'bg-corona text-void-deep'
                    : 'bg-slate-700 text-slate-200'"
                >
                  #{{ index + 1 }}
                </span>
                <span
                  v-if="item.filtered"
                  class="text-xs font-mono text-slate-600"
                >
                  {{ t('recommend.filtered') }}
                </span>
                <span class="text-xs tracking-[0.15em] text-corona/60 uppercase font-mono">
                  {{ REGION_LABELS[item.spot.region] || item.spot.region }}
                </span>
              </div>

              <!-- Name -->
              <NuxtLink
                :to="`/spots/${item.spot.slug}`"
                class="font-display text-base sm:text-lg font-semibold text-white hover:text-corona-bright transition-colors"
              >
                {{ item.spot.name }}
              </NuxtLink>

              <!-- Summary -->
              <p class="text-xs sm:text-sm font-mono text-slate-400 mt-1">
                {{ formatDuration(item.spot.totality_duration_seconds) }} totality
                · {{ SPOT_TYPE_LABELS[item.spot.spot_type] || item.spot.spot_type }}
                <template v-if="item.weatherStatus">
                  · <WeatherIcon :cloud-cover="item.cloudCover" :size="20" class="inline-block align-middle" />
                  {{ item.weatherStatus }}
                </template>
              </p>

              <!-- Factor breakdown -->
              <div
                v-if="selectedProfile && !item.filtered"
                class="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs font-mono text-slate-500"
              >
                <span v-if="item.factors.weather">Weather: {{ Math.round(item.factors.weather * 100) }}%</span>
                <span>Duration: {{ Math.round(item.factors.duration * 100) }}%</span>
                <span v-if="item.distanceKm">{{ item.distanceKm }} km {{ t('recommend.distance') }}</span>
              </div>
            </div>

            <!-- Score -->
            <div
              v-if="selectedProfile && !item.filtered"
              class="text-right shrink-0"
            >
              <div class="font-display text-2xl sm:text-3xl font-bold" :class="scoreColor(item.score)">
                {{ item.score }}
              </div>
              <div class="relative inline-block">
                <button
                  class="text-[11px] font-mono text-slate-600 tracking-[0.1em] hover:text-slate-400 transition-colors cursor-help flex items-center gap-1"
                  :aria-expanded="scoreTooltipOpen === item.spot.id"
                  :aria-describedby="`score-tooltip-${item.spot.id}`"
                  @click.stop="scoreTooltipOpen = scoreTooltipOpen === item.spot.id ? null : item.spot.id"
                >
                  {{ t('recommend.score') }}
                  <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <div
                  v-if="scoreTooltipOpen === item.spot.id"
                  :id="`score-tooltip-${item.spot.id}`"
                  role="tooltip"
                  class="absolute right-0 bottom-full mb-2 w-56 bg-void-deep/95 backdrop-blur-sm border border-void-border/60 rounded px-3 py-2.5 z-30 text-left"
                  @click.stop
                >
                  <p class="text-xs font-mono text-slate-300 leading-relaxed mb-1.5">
                    {{ t('recommend.score_explanation') }}
                  </p>
                  <div v-if="activeProfile" class="text-[11px] font-mono text-slate-500 space-y-0.5">
                    <div>Weather: {{ Math.round(activeProfile.weights.weather * item.factors.weather * 100) }} pts <span class="text-slate-600">({{ Math.round(activeProfile.weights.weather * 100) }}%)</span></div>
                    <div>Duration: {{ Math.round(activeProfile.weights.duration * item.factors.duration * 100) }} pts <span class="text-slate-600">({{ Math.round(activeProfile.weights.duration * 100) }}%)</span></div>
                    <div>Services: {{ Math.round(activeProfile.weights.services * item.factors.services * 100) }} pts <span class="text-slate-600">({{ Math.round(activeProfile.weights.services * 100) }}%)</span></div>
                    <div>Access: {{ Math.round(activeProfile.weights.accessibility * item.factors.accessibility * 100) }} pts <span class="text-slate-600">({{ Math.round(activeProfile.weights.accessibility * 100) }}%)</span></div>
                    <div>Distance: {{ Math.round(activeProfile.weights.distance * item.factors.distance * 100) }} pts <span class="text-slate-600">({{ Math.round(activeProfile.weights.distance * 100) }}%)</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>

      <!-- Show more -->
      <div v-if="!showAll && hiddenCount > 0" class="mt-4">
        <button
          class="w-full py-3 rounded-lg border border-void-border/30 text-sm font-mono text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-all"
          @click="showAll = true"
        >
          {{ t('recommend.more_spots', { count: hiddenCount }) }}
        </button>
      </div>

      <!-- Action buttons (inline on desktop) -->
      <div v-if="selectedProfile" class="mt-8 hidden sm:flex gap-3">
        <NuxtLink
          :to="`/map?profile=${selectedProfile}`"
          class="px-5 py-2.5 bg-corona text-void-deep rounded-md text-sm font-semibold font-display hover:bg-corona-bright transition-colors"
        >
          {{ t('recommend.view_on_map') }}
        </NuxtLink>
      </div>
    </div>

    <!-- Floating "View on map" button (mobile only) -->
    <div
      v-if="selectedProfile"
      class="fixed bottom-5 left-4 right-4 z-20 sm:hidden"
    >
      <NuxtLink
        :to="`/map?profile=${selectedProfile}`"
        class="block w-full text-center px-5 py-3 bg-corona text-void-deep rounded-lg text-sm font-semibold font-display hover:bg-corona-bright transition-colors shadow-lg shadow-corona/20"
      >
        {{ t('recommend.view_on_map') }}
      </NuxtLink>
    </div>

    <!-- Footer -->
    <footer class="border-t border-void-border/30 py-8 mt-12 sm:mb-0 mb-16">
      <div class="section-container flex items-center justify-between">
        <NuxtLink to="/map" class="font-mono text-sm text-slate-500 hover:text-slate-300 transition-colors">
          &larr; Back to map
        </NuxtLink>
        <div class="flex gap-4">
          <NuxtLink to="/privacy" class="font-mono text-xs text-slate-500 hover:text-slate-300 transition-colors">
            Privacy
          </NuxtLink>
          <NuxtLink to="/terms" class="font-mono text-xs text-slate-500 hover:text-slate-300 transition-colors">
            Terms
          </NuxtLink>
        </div>
      </div>
    </footer>
  </div>
</template>
