<script setup lang="ts">
import { PROFILES, useRecommendation } from '~/composables/useRecommendation'
import type { ProfileId } from '~/composables/useRecommendation'
import { formatDuration, REGION_LABELS, SPOT_TYPE_LABELS } from '~/utils/eclipse'

const { t } = useI18n()

useHead({
  title: 'Find Your Spot — EclipseChase.is',
  meta: [
    { name: 'description', content: 'Personalized eclipse viewing spot recommendations based on your style and live weather conditions.' },
  ],
})

// Fetch data in parallel
const [{ data: spotsData }, { data: stationsData }, { data: cloudData }] = await Promise.all([
  useFetch('/api/spots'),
  useFetch('/api/weather/stations'),
  useFetch('/api/weather/cloud-cover'),
])

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
const scoreTooltipOpen = ref(false)

function closeTooltip() { scoreTooltipOpen.value = false }
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
      <NuxtLink to="/" class="flex items-center gap-2.5 group">
        <svg class="w-7 h-7" viewBox="0 0 128 128" fill="none">
          <circle cx="64" cy="64" r="36" fill="#050810" />
          <circle cx="64" cy="64" r="36" stroke="#f59e0b" stroke-width="3" opacity="0.8" />
          <circle cx="96" cy="48" r="4" fill="#f59e0b" />
        </svg>
        <span class="font-display font-semibold text-sm tracking-wide text-slate-400 group-hover:text-slate-200 transition-colors">
          ECLIPSECHASE
        </span>
      </NuxtLink>
      <NuxtLink to="/map" class="text-xs font-mono text-slate-400 hover:text-corona transition-colors tracking-wider">
        MAP
      </NuxtLink>
    </nav>

    <!-- Content -->
    <div class="section-container max-w-3xl py-6 sm:py-12">
      <!-- Header -->
      <div class="mb-8">
        <span class="font-mono text-[10px] tracking-[0.3em] text-corona/60 uppercase">
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
      <div class="flex flex-wrap gap-2 sm:gap-3 mb-3">
        <button
          v-for="profile in PROFILES"
          :key="profile.id"
          class="px-3 sm:px-4 py-2 sm:py-2.5 rounded-md text-xs sm:text-sm font-mono tracking-wide transition-all"
          :class="selectedProfile === profile.id
            ? 'bg-corona/15 border-2 border-corona text-corona-bright'
            : 'bg-void-surface border border-void-border/50 text-slate-400 hover:text-slate-200 hover:border-slate-500'"
          @click="selectedProfile = selectedProfile === profile.id ? null : profile.id; showAll = false"
        >
          {{ profile.name }}
        </button>
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
        {{ t('recommend.thin_results', { count: unfilteredCount }) }}
      </div>

      <!-- Location indicator -->
      <div class="mb-6 text-xs font-mono text-slate-500">
        {{ isGps ? t('recommend.from_location') : t('recommend.from_reykjavik') }}
      </div>

      <!-- Results header -->
      <div class="mb-4">
        <p v-if="activeProfile" class="font-mono text-[10px] tracking-[0.2em] text-slate-500 uppercase">
          {{ t('recommend.top_picks', { profile: activeProfile.name }) }}
        </p>
        <p v-else class="font-mono text-[10px] tracking-[0.2em] text-slate-500 uppercase">
          {{ t('recommend.all_spots') }}
        </p>
      </div>

      <!-- No profile prompt -->
      <p
        v-if="!selectedProfile"
        class="mb-6 text-sm text-slate-500 font-mono"
      >
        {{ t('recommend.no_profile') }}
      </p>

      <!-- Spot cards -->
      <div class="flex flex-col gap-3">
        <div
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
                  class="text-[11px] font-bold px-1.5 py-0.5 rounded"
                  :class="index < 3
                    ? 'bg-corona text-void-deep'
                    : 'bg-slate-700 text-slate-200'"
                >
                  #{{ index + 1 }}
                </span>
                <span
                  v-if="item.filtered"
                  class="text-[10px] font-mono text-slate-600"
                >
                  {{ t('recommend.filtered') }}
                </span>
                <span class="text-[10px] tracking-[0.15em] text-corona/60 uppercase font-mono">
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
              <p class="text-xs font-mono text-slate-400 mt-1">
                {{ formatDuration(item.spot.totality_duration_seconds) }} totality
                · {{ SPOT_TYPE_LABELS[item.spot.spot_type] || item.spot.spot_type }}
                <template v-if="item.weatherStatus"> · {{ item.weatherStatus }}</template>
              </p>

              <!-- Factor breakdown -->
              <div
                v-if="selectedProfile && !item.filtered"
                class="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] font-mono text-slate-500"
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
                  class="text-[9px] font-mono text-slate-600 tracking-[0.1em] hover:text-slate-400 transition-colors cursor-help flex items-center gap-1"
                  @click.stop="scoreTooltipOpen = !scoreTooltipOpen"
                >
                  {{ t('recommend.score') }}
                  <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <div
                  v-if="scoreTooltipOpen"
                  class="absolute right-0 bottom-full mb-2 w-56 bg-void-deep/95 backdrop-blur-sm border border-void-border/60 rounded px-3 py-2.5 z-30 text-left"
                  @click.stop
                >
                  <p class="text-[10px] font-mono text-slate-300 leading-relaxed mb-1.5">
                    {{ t('recommend.score_explanation') }}
                  </p>
                  <div v-if="activeProfile" class="text-[9px] font-mono text-slate-500 space-y-0.5">
                    <div>Weather: {{ Math.round(activeProfile.weights.weather * 100) }}%</div>
                    <div>Duration: {{ Math.round(activeProfile.weights.duration * 100) }}%</div>
                    <div>Services: {{ Math.round(activeProfile.weights.services * 100) }}%</div>
                    <div>Access: {{ Math.round(activeProfile.weights.accessibility * 100) }}%</div>
                    <div>Distance: {{ Math.round(activeProfile.weights.distance * 100) }}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
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

      <!-- Action buttons -->
      <div v-if="selectedProfile" class="mt-8 flex gap-3">
        <NuxtLink
          :to="`/map?profile=${selectedProfile}`"
          class="px-5 py-2.5 bg-corona text-void-deep rounded-md text-sm font-semibold font-display hover:bg-corona-bright transition-colors"
        >
          {{ t('recommend.view_on_map') }}
        </NuxtLink>
      </div>
    </div>

    <!-- Footer -->
    <footer class="border-t border-void-border/30 py-8 mt-12">
      <div class="section-container text-center">
        <NuxtLink to="/map" class="font-mono text-sm text-slate-500 hover:text-slate-300 transition-colors">
          &larr; Back to map
        </NuxtLink>
      </div>
    </footer>
  </div>
</template>
