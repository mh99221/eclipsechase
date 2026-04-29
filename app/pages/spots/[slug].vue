<script setup lang="ts">
import { formatDuration, parseJsonb, regionLabel } from '~/utils/eclipse'
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

// Full spots list — used by the Plan tab's AlternatesList. Lazy + client-only
// so it never blocks the detail-page critical path. The endpoint is cached
// at the edge (s-maxage=300, SWR=3600 per nuxt.config), so this is cheap.
const { data: allSpotsData } = useFetch('/api/spots', { lazy: true, server: false, key: 'all-spots' })
const allSpots = computed(() => allSpotsData.value?.spots ?? null)

const spotPhotos = computed<SpotPhoto[]>(() => parseJsonb<SpotPhoto[]>(spot.value.photos, []))
const heroPhoto = computed<SpotPhoto | null>(
  () => spotPhotos.value.find(p => p.is_hero) || spotPhotos.value[0] || null,
)

// Tolerates both legacy string[] and migrated {level,title,body}[] shapes.
// AdvisoriesBlock normalises whichever it gets.
const warnings = computed<Array<string | { level?: string; title?: string; body?: string }>>(() =>
  parseJsonb<Array<string | { level?: string; title?: string; body?: string }>>(spot.value.warnings, []),
)

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

// Historical weather — pre-computed by scripts/fetch-historical-weather.mjs
const { data: historicalData } = useFetch<{ spots: Record<string, any> }>(
  '/eclipse-data/historical-weather.json',
  { lazy: true, server: false, key: 'historical-weather' },
)
const spotHistory = computed(() => historicalData.value?.spots?.[slug] ?? null)

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
        ...(heroPhoto.value ? { 'image': `${siteUrl}/images/spots/${heroPhoto.value.filename}` } : {}),
      }),
    },
  ],
})

type TabKey = 'overview' | 'sky' | 'weather' | 'plan'

// Default to Overview, but jump straight to Weather if the URL carries an
// `?asOf=…` forecast preview override — those links are only useful on the
// Weather tab, so opening on Overview wastes the demo. Reading from
// route.query at setup time is sufficient: if the user manually clicks
// another tab, their selection wins from then on.
const initialTab: TabKey
  = typeof route.query.asOf === 'string' ? 'weather' : 'overview'
const activeTab = ref<TabKey>(initialTab)

// Advisories — collapsed by default; the badge in the hero toggles the
// expanded list rendered by AdvisoriesBlock. Critical (bad-level)
// entries always render inline regardless of this state.
const advisoriesExpanded = ref(false)
const { count: advisoriesCount, topLevel: advisoriesTopLevel } = useAdvisories(warnings)
</script>

<template>
  <PageShell screen="spot-detail">
    <SpotHeroBlock
      :name="spot.name"
      :region="regionLabel(spot.region)"
      :hero="heroPhoto"
      :kicker="t('v0.spot_detail.kicker')"
    >
      <template #meta-end>
        <AdvisoriesBadge
          v-if="advisoriesCount > 0"
          :count="advisoriesCount"
          :level="advisoriesTopLevel"
          :expanded="advisoriesExpanded"
          @toggle="advisoriesExpanded = !advisoriesExpanded"
        />
      </template>
    </SpotHeroBlock>

    <AdvisoriesBlock :warnings="warnings" :expanded="advisoriesExpanded" />

    <DetailTabs v-model="activeTab" />

    <div class="spot-body">
      <StatStrip
        :totality-seconds="spot.totality_duration_seconds"
        :sun-altitude="spot.sun_altitude"
        :horizon-verdict="horizonCheck?.verdict ?? null"
      />

      <template v-if="activeTab === 'overview'">
        <Card v-if="spot.description">
          <CardTitle>{{ t('v0.spot_detail.card_about') }}</CardTitle>
          <p class="card-prose">{{ spot.description }}</p>
        </Card>
        <div v-if="spot.description" class="spacer-8" />
        <Card>
          <CardTitle>{{ t('v0.spot_detail.card_contact') }}</CardTitle>
          <ContactList
            :totality-start="spot.totality_start"
            :totality-seconds="spot.totality_duration_seconds"
            :c1="spot.c1"
            :c4="spot.c4"
          />
        </Card>
        <div class="spacer-8" />
        <Card>
          <CardTitle>{{ t('v0.spot_detail.card_logistics') }}</CardTitle>
          <LogisticsRows :spot="spot" />
        </Card>
      </template>

      <template v-else-if="activeTab === 'sky'">
        <Card>
          <CardTitle>{{ t('v0.spot_detail.card_sun_position') }}</CardTitle>
          <HorizonDial
            v-if="spot.sun_altitude != null && spot.sun_azimuth != null"
            :altitude="spot.sun_altitude"
            :azimuth="spot.sun_azimuth"
          />
          <div v-else class="dial-missing">Sun position data unavailable.</div>
        </Card>
        <div v-if="horizonProfileData" class="spacer-8" />
        <Card v-if="horizonProfileData">
          <CardTitle>Horizon profile · 91-pt scan</CardTitle>
          <HorizonProfile :data="horizonProfileData" :lat="spot.lat" :lng="spot.lng" />
        </Card>
      </template>

      <template v-else-if="activeTab === 'weather'">
        <ForecastSection
          :spot="{
            lat: spot.lat,
            lng: spot.lng,
            slug,
            totality_start: spot.totality_start,
            totality_duration_seconds: spot.totality_duration_seconds,
          }"
          :history="spotHistory"
        />
      </template>

      <template v-else-if="activeTab === 'plan'">
        <AlternatesList :current="spot" :spots="allSpots" />
        <div class="spacer-8" />
        <Card>
          <CardTitle>{{ t('v0.spot_detail.card_map') }}</CardTitle>
          <SpotLocationMap
            :lat="spot.lat"
            :lng="spot.lng"
            :sun-azimuth="spot.sun_azimuth ?? null"
            :spot-name="spot.name"
            class="plan-map"
          />
        </Card>
      </template>
    </div>
  </PageShell>
</template>

<style scoped>
.spot-body {
  padding: 16px;
}
@media (min-width: 768px) {
  .spot-body { padding: 24px; }
}
.spacer-8 { height: 8px; }

/* Description body inside the About Card. Slightly less dim than the
   prior floating-paragraph treatment because the surrounding Card frame
   already provides separation from the page bg. */
.card-prose {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.55;
  color: rgb(var(--ink-1) / 0.85);
  margin: 0;
}

.dial-missing {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 13px;
  color: rgb(var(--ink-1) / 0.42);
  padding: 8px 0;
}

.plan-map {
  border-radius: 8px;
  overflow: hidden;
}
</style>
