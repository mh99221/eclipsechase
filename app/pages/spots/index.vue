<script setup lang="ts">
import { parseJsonb } from '~/utils/eclipse'
import { PROFILES, useRecommendation } from '~/composables/useRecommendation'
import type { ProfileId, RankedSpot } from '~/composables/useRecommendation'
import type { Region, SpotPhoto } from '~/types/spots'

const { isPro } = useProStatus()
const { coords } = useLocation()
const route = useRoute()
const router = useRouter()

const { data } = await useFetch('/api/spots')

// Historical cloud cover — pre-computed
const { data: historicalData } = useFetch<{ spots: Record<string, { clear_years: number; total_years: number; avg_cloud_cover: number | null }> }>(
  '/eclipse-data/historical-weather.json',
  { lazy: true, server: false, key: 'historical-weather' },
)
function historyFor(slug: string) {
  return historicalData.value?.spots?.[slug] ?? null
}

// Sort mode — URL-persisted so deep links preserve it
type SortKey = 'duration' | 'historical'
const initialSort = typeof route.query.sort === 'string' ? route.query.sort : null
const sortKey = ref<SortKey>(initialSort === 'historical' ? 'historical' : 'duration')

watch(sortKey, (val) => {
  if (!import.meta.client) return
  const query = { ...route.query }
  if (val === 'historical') query.sort = 'historical'
  else delete query.sort
  router.replace({ path: route.path, query })
})

// Region filter — URL-persisted
const initialRegion = typeof route.query.region === 'string' ? route.query.region : null
const VALID_REGIONS: ReadonlyArray<Region> = ['westfjords', 'snaefellsnes', 'borgarfjordur', 'reykjavik', 'reykjanes']
const selectedRegion = ref<Region | null>(
  VALID_REGIONS.includes(initialRegion as Region) ? (initialRegion as Region) : null,
)
watch(selectedRegion, (val) => {
  if (!import.meta.client) return
  const query = { ...route.query }
  if (val) query.region = val
  else delete query.region
  router.replace({ path: route.path, query })
})

const rawSpots = computed(() => {
  const list = data.value?.spots || []
  const copy = [...list]
  if (sortKey.value === 'historical') {
    return copy.sort((a: any, b: any) => {
      const ha = historyFor(a.slug)
      const hb = historyFor(b.slug)
      const clearA = ha?.clear_years ?? -1
      const clearB = hb?.clear_years ?? -1
      if (clearA !== clearB) return clearB - clearA
      const avgA = ha?.avg_cloud_cover ?? 100
      const avgB = hb?.avg_cloud_cover ?? 100
      if (avgA !== avgB) return avgA - avgB
      return (b.totality_duration_seconds || 0) - (a.totality_duration_seconds || 0)
    })
  }
  return copy.sort((a: any, b: any) => (b.totality_duration_seconds || 0) - (a.totality_duration_seconds || 0))
})

// Weather + stations — lazy, client-only
const { data: rawWeatherData } = useFetch<{ cloud_cover: Array<{ station_id: string; cloud_cover: number | null }> }>('/api/weather/cloud-cover', { lazy: true, server: false })
const { data: rawStationsData } = useFetch<{ stations: Array<{ id: string; lat: number; lng: number }> }>('/api/weather/stations', { lazy: true, server: false })

const weatherData = computed(() => rawWeatherData.value?.cloud_cover || null)
const stationsData = computed(() => rawStationsData.value?.stations || null)

// Profile selection — URL-persisted
const initialProfile = typeof route.query.profile === 'string' ? route.query.profile : null
const selectedProfile = ref<ProfileId | null>(
  PROFILES.some(p => p.id === initialProfile) ? (initialProfile as ProfileId) : null,
)
const showProPrompt = ref(false)

watch(selectedProfile, (val) => {
  if (!import.meta.client) return
  const query = { ...route.query }
  if (val) query.profile = val
  else delete query.profile
  router.replace({ path: route.path, query })
})

// Pro-gate the profile picker — free users see the pills but get prompted to upgrade.
function setProfile(id: ProfileId | null) {
  if (id != null && !isPro.value) {
    showProPrompt.value = true
    return
  }
  selectedProfile.value = id
}
const profileModel = computed<ProfileId | null>({
  get: () => selectedProfile.value,
  set: (v) => setProfile(v),
})

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

// Region filter applied AFTER ranking so profile sort is preserved
const displayItems = computed<RankedSpot[]>(() => {
  if (!selectedRegion.value) return ranked.value
  return ranked.value.filter(item => item.spot.region === selectedRegion.value)
})

// Helpers
function heroFilenameFor(spot: any): string | null {
  const photos = parseJsonb<SpotPhoto[]>(spot.photos, [])
  const hero = photos.find(p => p.is_hero) || photos[0]
  return hero?.filename ?? null
}
function heroAltFor(spot: any): string {
  const photos = parseJsonb<SpotPhoto[]>(spot.photos, [])
  const hero = photos.find(p => p.is_hero) || photos[0]
  return hero?.alt ?? spot.name
}
function cloudFor(spot: any): number | null {
  const h = historyFor(spot.slug)
  return h?.avg_cloud_cover ?? null
}

useHead({
  title: 'Viewing Spots — EclipseChase',
  meta: [
    { name: 'description', content: 'Browse curated eclipse viewing spots across western Iceland for the August 12, 2026 total solar eclipse.' },
  ],
})

const headerSub = computed(() => {
  const profileName = selectedProfile.value
    ? PROFILES.find(p => p.id === selectedProfile.value)?.name
    : 'All'
  const sortLabel = sortKey.value === 'duration' ? 'totality duration' : 'historical clearness'
  return `${profileName} · sorted by ${sortLabel}`
})
</script>

<template>
  <PageShell screen="spots" width="wide">
    <header class="spots-header">
      <Eyebrow variant="dot" tone="accent">SPOTS · {{ displayItems.length }}</Eyebrow>
      <p class="spots-sub">{{ headerSub }}</p>
    </header>

    <ProfileSelector v-model="profileModel" />
    <SortTabs v-model="sortKey" :disabled="!!selectedProfile" />
    <RegionChips v-model="selectedRegion" />

    <div v-if="showProPrompt" class="pro-prompt">
      <p class="pro-prompt-text">
        Profile-based scoring is a Pro feature.
        <NuxtLink to="/pro" class="pro-prompt-link">Get Pro Access</NuxtLink>
      </p>
      <button type="button" class="pro-prompt-dismiss" @click="dismissProPrompt">Dismiss</button>
    </div>

    <div v-if="selectedProfile && thinResults" class="thin-results">
      Few spots match this profile. Try a different one for more options.
    </div>

    <div class="spots-list">
      <SpotCard
        v-for="item in displayItems"
        :key="item.spot.id"
        :slug="item.spot.slug"
        :name="item.spot.name"
        :region="item.spot.region"
        :duration-seconds="item.spot.totality_duration_seconds || 0"
        :cloud="cloudFor(item.spot)"
        :hero-filename="heroFilenameFor(item.spot)"
        :hero-alt="heroAltFor(item.spot)"
        :class="{ 'is-filtered': item.filtered }"
      />
    </div>
  </PageShell>
</template>

<style scoped>
.spots-header {
  padding: 24px 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.spots-sub {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 14px;
  color: rgb(var(--ink-1) / 0.62);
  margin: 0;
}

.pro-prompt {
  margin: 12px 16px;
  padding: 12px 14px;
  background: rgb(var(--accent) / 0.1);
  border: 1px solid rgb(var(--accent) / 0.4);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
}
.pro-prompt-text { margin: 0; color: rgb(var(--ink-1)); }
.pro-prompt-link {
  color: rgb(var(--accent));
  text-decoration: none;
  margin-left: 6px;
  font-weight: 600;
}
.pro-prompt-dismiss {
  background: transparent;
  border: 0;
  color: rgb(var(--ink-1) / 0.62);
  cursor: pointer;
  font-family: inherit;
  font-size: 11px;
  min-height: 32px;
}

.thin-results {
  margin: 12px 16px;
  padding: 10px 12px;
  background: rgb(var(--warn) / 0.1);
  border: 1px solid rgb(var(--warn) / 0.4);
  border-radius: 8px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  color: rgb(var(--ink-1));
}

.spots-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  padding: 16px;
}
@media (min-width: 640px) {
  .spots-list { grid-template-columns: repeat(2, 1fr); gap: 16px; padding: 16px 24px; }
}
@media (min-width: 1024px) {
  .spots-list { grid-template-columns: repeat(3, 1fr); }
}

@media (min-width: 768px) {
  .spots-header { padding: 32px 24px 18px; }
  .spots-sub { font-size: 16px; }
}

.is-filtered {
  opacity: 0.5;
}
</style>
