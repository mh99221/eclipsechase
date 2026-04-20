<script setup lang="ts">
import { compassDirection, formatDuration, formatTrailTime, parseJsonb, regionLabel, SPOT_TYPE_LABELS } from '~/utils/eclipse'
import type { SpotPhoto } from '~/types/spots'
import type { HorizonCheck, HorizonProfileData } from '~/types/horizon'

const { t } = useI18n()
const route = useRoute()
const slug = route.params.slug as string


const { data, error } = await useFetch(`/api/spots/${slug}`)

if (error.value || !data.value?.spot) {
  throw createError({ statusCode: 404, message: 'Spot not found' })
}

const spot = computed(() => data.value!.spot)

const spotPhotos = computed<SpotPhoto[]>(() => parseJsonb<SpotPhoto[]>(spot.value.photos, []))

const heroPhoto = computed<SpotPhoto | null>(() =>
  spotPhotos.value.find(p => p.is_hero) || spotPhotos.value[0] || null,
)

const otherPhotos = computed(() =>
  spotPhotos.value.filter(p => p !== heroPhoto.value),
)

const siteUrl = useRuntimeConfig().public.siteUrl as string

useHead({
  title: () => spot.value.name,
  meta: [
    { name: 'description', content: () => `${spot.value.name} — eclipse viewing spot in ${regionLabel(spot.value.region)}. ${formatDuration(spot.value.totality_duration_seconds)} of totality.` },
    { property: 'og:title', content: () => `${spot.value.name} — Eclipse Viewing Spot` },
    { property: 'og:description', content: () => spot.value.description },
    { property: 'og:url', content: () => `${siteUrl}/spots/${slug}` },
    { property: 'og:type', content: 'place' },
    ...(heroPhoto.value ? [
      { property: 'og:image', content: `${siteUrl}/images/spots/${heroPhoto.value.filename}` },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '675' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ] : []),
  ],
  link: [
    { rel: 'canonical', href: `${siteUrl}/spots/${slug}` },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'TouristAttraction',
        'name': spot.value.name,
        'description': spot.value.description,
        'geo': {
          '@type': 'GeoCoordinates',
          'latitude': spot.value.lat,
          'longitude': spot.value.lng,
        },
        'isAccessibleForFree': true,
        'url': `${siteUrl}/spots/${slug}`,
        ...(heroPhoto.value ? {
          'image': `${siteUrl}/images/spots/${heroPhoto.value.filename}`,
        } : {}),
      }),
    },
  ],
})

const coverageBadge: Record<string, { label: string; color: string }> = {
  good: { label: 'Good signal', color: 'text-status-green' },
  limited: { label: 'Limited signal', color: 'text-status-amber' },
  none: { label: 'No signal', color: 'text-status-red' },
}

const difficultyBadge: Record<string, { label: string; color: string }> = {
  easy: { label: 'Easy', color: 'ec-chip-green' },
  moderate: { label: 'Moderate', color: 'ec-chip-amber' },
  difficult: { label: 'Difficult', color: 'ec-chip-orange' },
  strenuous: { label: 'Strenuous', color: 'ec-chip-red' },
}

const isTrail = computed(() => spot.value.spot_type && spot.value.spot_type !== 'drive-up')

const horizonCheck = computed<HorizonCheck | null>(
  () => parseJsonb<HorizonCheck | null>(spot.value.horizon_check, null),
)

const horizonProfileData = computed<HorizonProfileData | null>(() => {
  const hc = horizonCheck.value
  if (!hc?.sweep?.length) return null
  return {
    sun_azimuth: hc.sun_azimuth,
    sun_altitude: hc.sun_altitude,
    sweep: hc.sweep,
    verdict: hc.verdict,
    clearance_degrees: hc.clearance_degrees,
  }
})

const warnings = computed<string[]>(() => parseJsonb<string[]>(spot.value.warnings, []))
const nearbyPoi = computed<string[]>(() => parseJsonb<string[]>(spot.value.nearby_poi, []))

// Historical weather — pre-computed by scripts/fetch-historical-weather.mjs
// and served as a static JSON. Lazy + client-only so it doesn't block SSR.
const { data: historicalData } = useFetch<{ spots: Record<string, any> }>(
  '/eclipse-data/historical-weather.json',
  { lazy: true, server: false, key: 'historical-weather' },
)
const spotHistory = computed(() => historicalData.value?.spots?.[slug] ?? null)

</script>

<template>
  <div class="relative noise min-h-screen pt-[72px]">
    <!-- Hero: aligned to the same 768px reading column as the content below -->
    <header class="section-container max-w-3xl pt-8 sm:pt-10">
      <!-- Breadcrumb / coord row -->
      <div class="flex items-center justify-between gap-4 mb-4">
        <div class="flex items-center gap-2 font-mono text-[10px] tracking-[0.25em] text-ink-3 uppercase min-w-0">
          <span class="truncate">{{ regionLabel(spot.region) }}</span>
          <span class="text-ink-3/50" aria-hidden="true">/</span>
          <span class="text-accent/80 truncate">{{ t('spot.viewing_spot') }}</span>
        </div>
        <span class="font-mono text-[10px] tracking-[0.2em] text-ink-3 uppercase whitespace-nowrap">
          {{ spot.lat.toFixed(4) }}°N · {{ Math.abs(spot.lng).toFixed(4) }}°W
        </span>
      </div>

      <!-- Title -->
      <h1 class="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-ink-1 tracking-tight mb-3">
        {{ spot.name }}
      </h1>

      <!-- Metadata row -->
      <div class="flex flex-wrap items-center gap-3 mb-6">
        <span
          v-if="spot.spot_type"
          class="inline-block px-2 py-0.5 text-[10px] font-mono tracking-[0.15em] uppercase rounded border"
          :class="spot.spot_type === 'drive-up' ? 'ec-chip-green' : 'ec-chip-amber'"
        >
          {{ SPOT_TYPE_LABELS[spot.spot_type] || spot.spot_type }}
        </span>
        <span
          v-if="isTrail && (spot.trail_distance_km || spot.trail_time_minutes)"
          class="font-mono text-xs tracking-wider text-ink-3"
        >
          <template v-if="spot.trail_distance_km">{{ spot.trail_distance_km }} km</template>
          <template v-if="spot.trail_distance_km && spot.trail_time_minutes"> · </template>
          <template v-if="spot.trail_time_minutes">
            {{ formatTrailTime(spot.trail_time_minutes) }}
          </template>
          <template v-if="spot.difficulty"> · {{ difficultyBadge[spot.difficulty]?.label || spot.difficulty }}</template>
        </span>
      </div>

      <!-- Hero image (contained, framed) -->
      <figure
        v-if="heroPhoto"
        class="relative overflow-hidden rounded border border-border-subtle/60 spot-hero-frame mb-5"
      >
        <img
          :src="`/images/spots/${heroPhoto.filename}`"
          :srcset="`/images/spots/${heroPhoto.filename.replace(/\.webp$/, '-thumb.webp')} 600w, /images/spots/${heroPhoto.filename} 1200w`"
          sizes="(max-width: 767px) 100vw, 768px"
          :alt="heroPhoto.alt"
          loading="eager"
          width="1200"
          height="750"
          class="w-full h-full object-cover spot-hero-img"
        />
        <PhotoCredit
          :credit="heroPhoto.credit"
          :credit-url="heroPhoto.credit_url"
          :license="heroPhoto.license"
          variant="overlay"
        />
      </figure>

      <!-- Description -->
      <p class="text-base sm:text-lg text-ink-2 leading-relaxed">
        {{ spot.description }}
      </p>
    </header>

    <!-- Offline banner -->
    <div class="section-container max-w-3xl pt-6">
      <OfflineBanner />
    </div>

    <!-- Content -->
    <main>
    <article class="section-container max-w-3xl py-8 sm:py-12">
      <!-- Additional photos (non-hero) -->
      <div v-if="otherPhotos.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-10">
        <div
          v-for="photo in otherPhotos.slice(0, 2)"
          :key="photo.filename"
          class="relative overflow-hidden rounded border border-border-subtle/40"
        >
          <img
            :src="`/images/spots/${photo.filename}`"
            :srcset="`/images/spots/${photo.filename.replace(/\.webp$/, '-thumb.webp')} 600w, /images/spots/${photo.filename} 1200w`"
            sizes="(max-width: 639px) 100vw, 50vw"
            :alt="photo.alt"
            loading="lazy"
            width="1200"
            height="675"
            class="w-full aspect-video object-cover"
          />
          <PhotoCredit
            :credit="photo.credit"
            :credit-url="photo.credit_url"
            :license="photo.license"
            variant="overlay"
          />
        </div>
      </div>

      <!-- Key stats -->
      <dl class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
        <div class="bg-surface border border-border-subtle/40 px-4 py-4 rounded">
          <dt class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3 mb-1.5">{{ t('spot.totality') }}</dt>
          <dd class="font-display text-2xl font-bold text-ink-1 ml-0">
            {{ formatDuration(spot.totality_duration_seconds) }}
          </dd>
        </div>
        <div class="bg-surface border border-border-subtle/40 px-4 py-4 rounded">
          <dt class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3 mb-1.5">{{ t('spot.sun_altitude') }}</dt>
          <dd class="font-display text-2xl font-bold text-ink-1 ml-0">
            {{ spot.sun_altitude }}°
          </dd>
        </div>
        <div class="bg-surface border border-border-subtle/40 px-4 py-4 rounded">
          <dt class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3 mb-1.5">{{ t('spot.services') }}</dt>
          <dd class="font-display text-lg font-semibold ml-0" :class="spot.has_services ? 'text-status-green' : 'text-ink-3'">
            {{ spot.has_services ? t('spot.available') : t('spot.none_nearby') }}
          </dd>
        </div>
        <div class="bg-surface border border-border-subtle/40 px-4 py-4 rounded">
          <dt class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3 mb-1.5">{{ t('spot.cell_coverage') }}</dt>
          <dd class="font-display text-lg font-semibold ml-0" :class="coverageBadge[spot.cell_coverage]?.color || 'text-ink-3'">
            {{ coverageBadge[spot.cell_coverage]?.label || spot.cell_coverage }}
          </dd>
        </div>
      </dl>

      <!-- Only show a standalone horizon banner for non-'clear' verdicts;
           otherwise the verdict is already surfaced inside HorizonProfile. -->
      <div v-if="horizonCheck && horizonCheck.verdict !== 'clear'" class="mb-12">
        <HorizonBadge
          :verdict="horizonCheck.verdict"
          :clearance="horizonCheck.clearance_degrees"
        />
      </div>

      <!-- Warnings -->
      <div v-if="warnings.length > 0" class="space-y-2 mb-12">
        <div
          v-for="(warning, i) in warnings"
          :key="i"
          class="px-3 py-2.5 ec-banner-warn text-xs font-mono"
        >
          {{ warning }}
        </div>
      </div>

      <!-- Trail info (hiking spots only) -->
      <div v-if="isTrail" class="mb-12 bg-surface border border-border-subtle/40 rounded-lg p-5 sm:p-6">
        <h2 class="font-display text-lg font-semibold text-ink-1 mb-4 flex items-center gap-2">
          <svg class="w-5 h-5 text-accent/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          {{ t('spot.trail_info') }}
          <span
            v-if="spot.difficulty && difficultyBadge[spot.difficulty]"
            class="ml-2 text-[10px] font-mono tracking-wider px-2 py-0.5 rounded border"
            :class="difficultyBadge[spot.difficulty].color"
          >
            {{ difficultyBadge[spot.difficulty].label }}
          </span>
        </h2>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div v-if="spot.spot_type">
            <p class="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-3 mb-1">{{ t('spot.type') }}</p>
            <p class="text-sm font-mono text-ink-2">{{ SPOT_TYPE_LABELS[spot.spot_type] || spot.spot_type }}</p>
          </div>
          <div v-if="spot.trail_distance_km">
            <p class="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-3 mb-1">{{ t('spot.distance') }}</p>
            <p class="text-sm font-mono text-ink-2">{{ spot.trail_distance_km }} km</p>
          </div>
          <div v-if="spot.trail_time_minutes">
            <p class="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-3 mb-1">{{ t('spot.est_time') }}</p>
            <p class="text-sm font-mono text-ink-2">{{ formatTrailTime(spot.trail_time_minutes) }}</p>
          </div>
          <div v-if="spot.elevation_gain_m">
            <p class="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-3 mb-1">{{ t('spot.elevation_gain') }}</p>
            <p class="text-sm font-mono text-ink-2">{{ spot.elevation_gain_m }} m</p>
          </div>
        </div>

        <!-- Trailhead coordinates -->
        <div v-if="spot.trailhead_lat && spot.trailhead_lng" class="pt-3 border-t border-border-subtle/30">
          <p class="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-3 mb-1.5">{{ t('spot.trailhead') }}</p>
          <p class="font-mono text-sm text-ink-3">
            {{ spot.trailhead_lat.toFixed(4) }}°N, {{ Math.abs(spot.trailhead_lng).toFixed(4) }}°W
          </p>
          <a
            :href="`https://www.google.com/maps?q=${spot.trailhead_lat},${spot.trailhead_lng}`"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center gap-1.5 mt-1.5 text-sm text-accent hover:text-accent-strong transition-colors"
          >
            {{ t('spot.navigate_trailhead') }}
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>

        <!-- Timing warning -->
        <div class="mt-4 px-3 py-2.5 ec-banner-warn text-xs font-mono">
          {{ t('spot.timing_warning') }}
        </div>
      </div>

      <!-- Horizon View -->
      <section v-if="horizonProfileData" class="mb-12">
        <h2 class="font-display text-xl font-semibold text-ink-1 mb-3 flex items-center gap-2">
          <svg class="w-5 h-5 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 15l5.12-5.12A3 3 0 0110.24 9H13a2 2 0 012 2v.76a3 3 0 01-.88 2.12L9 19" />
          </svg>
          {{ t('horizon.section_title') }}
        </h2>
        <p class="text-sm text-ink-3 mb-4">
          {{ t('horizon.sun_position', { altitude: horizonCheck!.sun_altitude.toFixed(0), direction: compassDirection(horizonCheck!.sun_azimuth) }) }}
        </p>

        <!-- Blocked warning banner -->
        <div
          v-if="horizonCheck!.verdict === 'blocked'"
          class="mb-4 px-4 py-3 ec-banner-error text-sm"
        >
          {{ t('horizon.blocked_warning', {
            height: horizonCheck!.blocking_elevation_m ?? '?',
            distance: horizonCheck!.blocking_distance_m ?? '?',
          }) }}
        </div>

        <HorizonProfile :data="horizonProfileData" :lat="spot.lat" :lng="spot.lng" />

        <div class="mt-4">
          <PeakFinderLink
            :lat="spot.lat"
            :lng="spot.lng"
            :elevation="horizonCheck!.observer_elevation_m"
            :sun-azimuth="horizonCheck!.sun_azimuth"
            :spot-name="spot.name"
          />
        </div>
      </section>

      <!-- Historical weather (10-year cloud cover at totality) -->
      <section v-if="spotHistory" class="mb-12">
        <HistoricalWeatherChart :history="spotHistory" />
      </section>

      <!-- Details -->
      <div class="space-y-8">
        <section v-if="spot.parking_info">
          <h2 class="font-display text-xl font-semibold text-ink-1 mb-3 flex items-center gap-2">
            <svg class="w-5 h-5 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7h.01M12 7h.01M16 7h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {{ t('spot.parking') }}
          </h2>
          <p class="text-ink-2 text-base leading-relaxed">{{ spot.parking_info }}</p>
        </section>

        <section v-if="spot.terrain_notes">
          <h2 class="font-display text-xl font-semibold text-ink-1 mb-3 flex items-center gap-2">
            <svg class="w-5 h-5 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
            </svg>
            {{ t('spot.terrain') }}
          </h2>
          <p class="text-ink-2 text-base leading-relaxed">{{ spot.terrain_notes }}</p>
        </section>

        <!-- Nearby points of interest -->
        <section v-if="nearbyPoi.length > 0">
          <h2 class="font-display text-xl font-semibold text-ink-1 mb-3 flex items-center gap-2">
            <svg class="w-5 h-5 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            Nearby
          </h2>
          <ul class="space-y-1.5">
            <li
              v-for="(poi, i) in nearbyPoi"
              :key="i"
              class="text-ink-2 text-sm flex items-start gap-2"
            >
              <span class="text-accent/50 mt-1">&#x2022;</span>
              {{ poi }}
            </li>
          </ul>
        </section>

        <!-- Location + Map -->
        <section>
          <h2 class="font-display text-xl font-semibold text-ink-1 mb-3 flex items-center gap-2">
            <svg class="w-5 h-5 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {{ t('spot.location') }}
          </h2>

          <SpotLocationMap
            :lat="spot.lat"
            :lng="spot.lng"
            :sun-azimuth="spot.sun_azimuth ?? 249"
            :spot-name="spot.name"
            class="mb-4"
          />

          <p class="font-mono text-sm text-ink-3">
            {{ spot.lat.toFixed(4) }}°N, {{ Math.abs(spot.lng).toFixed(4) }}°W
          </p>
          <a
            :href="`https://www.google.com/maps?q=${spot.lat},${spot.lng}`"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center gap-1.5 mt-2 text-sm text-accent hover:text-accent-strong transition-colors"
          >
            {{ t('spot.open_gmaps') }}
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </section>
      </div>
    </article>
    </main>

    <AppFooter />
  </div>
</template>

<style scoped>
/* Photographic "plate" framing — subtle inset shadow + drop shadow
   so the contained hero feels lifted off the page. */
.spot-hero-frame {
  box-shadow:
    0 24px 48px -24px rgba(0, 0, 0, 0.6),
    inset 0 0 0 1px rgba(255, 255, 255, 0.02);
}

/* Aspect ratio: cinematic 16:10 on desktop; on mobile let the photo's
   intrinsic ratio show so portraits aren't letterboxed + landscapes
   aren't cropped into a forced portrait. */
.spot-hero-img {
  aspect-ratio: 16 / 10;
}

@media (max-width: 639px) {
  .spot-hero-img {
    aspect-ratio: auto;
  }
}
</style>
