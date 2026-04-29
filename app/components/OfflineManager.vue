<script setup lang="ts">
const { t } = useI18n()

const props = defineProps<{
  map: any
}>()

const emit = defineEmits<{
  downloading: [active: boolean]
}>()

const { tileCount, lastWeatherUpdate, lastForecastUpdate, cacheAges, precacheApiData, refreshCacheStatus } = useOfflineStatus()

// Western Iceland bounding box (eclipse path region) — must be before countTiles()
const BOUNDS = { west: -24.5, east: -20.5, south: 63.5, north: 66.5 }
const ZOOM_MIN = 5
const ZOOM_MAX = 11

function lng2tile(lng: number, zoom: number) {
  return Math.floor(((lng + 180) / 360) * Math.pow(2, zoom))
}

function lat2tile(lat: number, zoom: number) {
  const rad = (lat * Math.PI) / 180
  return Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, zoom))
}

function tile2lng(x: number, zoom: number) {
  return (x / Math.pow(2, zoom)) * 360 - 180
}

function tile2lat(y: number, zoom: number) {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, zoom)
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
}

function countTiles(): number {
  let count = 0
  for (let z = ZOOM_MIN; z <= ZOOM_MAX; z++) {
    const xMin = lng2tile(BOUNDS.west, z)
    const xMax = lng2tile(BOUNDS.east, z)
    const yMin = lat2tile(BOUNDS.north, z) // note: lat→tile is inverted
    const yMax = lat2tile(BOUNDS.south, z)
    count += (xMax - xMin + 1) * (yMax - yMin + 1)
  }
  return count
}

const isDownloading = ref(false)
const totalTiles = ref(0)
const loadedTiles = ref(0)
const isDone = ref(false)
const isCancelled = ref(false)
const isDismissed = ref(false)
const isCachingData = ref(false)
const dataCached = ref(false)
const progress = computed(() => totalTiles.value > 0 ? Math.round((loadedTiles.value / totalTiles.value) * 100) : 0)
const estimatedTileCount = countTiles()
// Estimated ~1338 tiles for western Iceland z5-z11; treat >10% as "has cached tiles"
const hasCachedTiles = computed(() => tileCount.value > estimatedTileCount * 0.1)

const hasCachedWeather = computed(() => !!cacheAges.value['/api/weather/cloud-cover'])
const hasCachedSpots = computed(() => !!cacheAges.value['/api/spots'])
const hasCachedTraffic = computed(() => !!cacheAges.value['/api/traffic/conditions'])
const hasCachedCameras = computed(() => !!cacheAges.value['/api/cameras'])

async function downloadTiles() {
  if (!props.map || isDownloading.value) return

  isDownloading.value = true
  isDone.value = false
  isCancelled.value = false
  loadedTiles.value = 0
  totalTiles.value = countTiles()
  emit('downloading', true)

  // Save current view to restore later
  const savedCenter = props.map.getCenter()
  const savedZoom = props.map.getZoom()

  // Hide entire map container during download to prevent flickering (canvas + markers)
  const container = props.map.getContainer()
  if (container) container.style.visibility = 'hidden'

  for (let z = ZOOM_MIN; z <= ZOOM_MAX; z++) {
    if (isCancelled.value) break

    const xMin = lng2tile(BOUNDS.west, z)
    const xMax = lng2tile(BOUNDS.east, z)
    const yMin = lat2tile(BOUNDS.north, z)
    const yMax = lat2tile(BOUNDS.south, z)

    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        if (isCancelled.value) break

        // Pan map to tile center to trigger tile load via SW
        const lng = tile2lng(x + 0.5, z)
        const lat = tile2lat(y + 0.5, z)

        props.map.jumpTo({ center: [lng, lat], zoom: z })

        // Small delay to let tiles load
        await new Promise(r => setTimeout(r, 80))

        loadedTiles.value++
      }
    }
  }

  // Restore view and show map again
  props.map.jumpTo({ center: [savedCenter.lng, savedCenter.lat], zoom: savedZoom })
  if (container) container.style.visibility = 'visible'

  if (!isCancelled.value) {
    isDone.value = true
    refreshCacheStatus()
  }
  isDownloading.value = false
  emit('downloading', false)
}

defineExpose({ isDownloading, loadedTiles, totalTiles, progress, cancel })

async function cacheData() {
  isCachingData.value = true
  precacheApiData()

  // Listen for completion
  const onMessage = (event: MessageEvent) => {
    if (event.data?.type === 'PRECACHE_API_DONE') {
      isCachingData.value = false
      dataCached.value = true
      refreshCacheStatus()
      navigator.serviceWorker?.removeEventListener('message', onMessage)
    }
  }
  navigator.serviceWorker?.addEventListener('message', onMessage)

  // Timeout fallback — don't claim success on timeout (data may not be cached)
  setTimeout(() => {
    if (isCachingData.value) {
      isCachingData.value = false
      refreshCacheStatus()
      navigator.serviceWorker?.removeEventListener('message', onMessage)
    }
  }, 15000)
}

async function clearCache() {
  // Get cache names from the browser and delete all eclipsechase-related caches
  const names = await caches.keys()
  await Promise.all(
    names
      .filter(n => n.startsWith('eclipsechase'))
      .map(n => caches.delete(n)),
  )
  dataCached.value = false
  isDone.value = false
  refreshCacheStatus()
}

function cancel() {
  isCancelled.value = true
}
</script>

<template>
  <div v-if="!isDismissed" class="bg-surface-raised border border-border-subtle/40 rounded px-4 py-3 relative">
    <!-- Close button -->
    <button
      v-if="!isDownloading"
      class="absolute top-2 right-2 text-ink-3/70 hover:text-ink-3 transition-colors"
      aria-label="Close"
      @click="isDismissed = true"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>

    <!-- Idle state -->
    <div v-if="!isDownloading && !isDone">
      <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3 mb-2">
        {{ t('offline.title') }}
      </p>
      <p class="text-sm text-ink-3 mb-3">
        {{ t('offline.description') }}
      </p>
      <div class="flex flex-col gap-2">
        <div v-if="hasCachedTiles" class="flex items-center gap-1.5 text-status-green font-mono text-xs">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {{ t('offline.tiles_cached', { count: tileCount }) }}
        </div>
        <button
          v-else
          class="font-mono text-xs tracking-wider px-3 py-2 rounded border border-accent/40 text-accent bg-accent/5 hover:bg-accent/10 transition-colors"
          @click="downloadTiles"
        >
          {{ t('offline.download', { count: estimatedTileCount }) }}
        </button>
        <button
          v-if="!dataCached"
          :disabled="isCachingData"
          class="font-mono text-xs tracking-wider px-3 py-2 rounded border border-border-subtle/40 text-ink-3 hover:text-ink-2 hover:border-slate-500 transition-colors disabled:opacity-50"
          @click="cacheData"
        >
          <span v-if="isCachingData">{{ t('offline.caching_data') }}</span>
          <span v-else>{{ t('offline.cache_weather') }}</span>
        </button>
        <div v-if="dataCached" class="flex items-center gap-1.5 text-status-green font-mono text-xs">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {{ t('offline.data_ready') }}
        </div>
      </div>

      <!-- Cache status -->
      <div class="mt-3 pt-3 border-t border-border-subtle/30 space-y-1">
        <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3/70">
          {{ t('offline.cache_status') }}
        </p>
        <div class="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] font-mono text-ink-3">
          <span>Map tiles</span>
          <span>{{ tileCount > 0 ? t('offline.tiles_cached', { count: tileCount }) : t('offline.not_cached') }}</span>
          <span>Weather</span>
          <span>{{ hasCachedWeather ? lastWeatherUpdate : t('offline.not_cached') }}</span>
          <span>Forecast</span>
          <span>{{ lastForecastUpdate || t('offline.not_cached') }}</span>
          <span>Spots</span>
          <span>{{ hasCachedSpots ? t('offline.cached') : t('offline.not_cached') }}</span>
          <span>Traffic</span>
          <span>{{ hasCachedTraffic ? t('offline.cached') : t('offline.not_cached') }}</span>
          <span>Cameras</span>
          <span>{{ hasCachedCameras ? t('offline.cached') : t('offline.not_cached') }}</span>
        </div>
        <button
          v-if="tileCount > 0 || hasCachedWeather"
          class="font-mono text-[10px] text-ink-3/70 hover:text-ink-3 transition-colors mt-1"
          @click="clearCache"
        >
          {{ t('offline.clear_cache') }}
        </button>
      </div>
    </div>

    <!-- Downloading -->
    <div v-else-if="isDownloading">
      <div class="flex items-center justify-between mb-2">
        <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-accent/70">
          {{ t('offline.downloading') }}
        </p>
        <button
          class="font-mono text-[10px] text-ink-3 hover:text-ink-2 transition-colors"
          @click="cancel"
        >
          {{ t('offline.cancel') }}
        </button>
      </div>
      <!-- Progress bar -->
      <div class="w-full h-1.5 bg-surface-raised rounded-full overflow-hidden mb-2">
        <div
          class="h-full bg-accent transition-all duration-200"
          :style="{ width: `${progress}%` }"
        />
      </div>
      <p class="font-mono text-xs text-ink-3">
        {{ t('offline.tiles_progress', { loaded: loadedTiles, total: totalTiles, progress }) }}
      </p>
    </div>

    <!-- Done -->
    <div v-else-if="isDone">
      <div class="flex items-center gap-2">
        <svg class="w-4 h-4 text-status-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <p class="text-sm text-status-green font-mono">
          {{ t('offline.done') }}
        </p>
      </div>
      <p class="text-xs text-ink-3 font-mono mt-1">
        {{ t('offline.done_detail', { count: loadedTiles }) }}
      </p>
      <button
        v-if="!dataCached"
        :disabled="isCachingData"
        class="mt-2 font-mono text-xs tracking-wider px-3 py-2 rounded border border-border-subtle/40 text-ink-3 hover:text-ink-2 hover:border-slate-500 transition-colors disabled:opacity-50"
        @click="cacheData"
      >
        <span v-if="isCachingData">{{ t('offline.caching_data') }}</span>
        <span v-else>{{ t('offline.cache_weather') }}</span>
      </button>
      <div v-if="dataCached" class="mt-2 flex items-center gap-1.5 text-status-green font-mono text-xs">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        {{ t('offline.data_ready') }}
      </div>
    </div>
  </div>
</template>
