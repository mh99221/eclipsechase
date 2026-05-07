// Shared initialization guard — ensures listeners are registered only once
let listenersRegistered = false

export function useOfflineStatus() {
  const isOffline = useState<boolean>('offline-status', () => false)
  const cacheAges = useState<Record<string, number | null>>('offline-cache-ages', () => ({}))
  const tileCount = useState<number>('offline-tile-count', () => 0)
  const spotDetailCount = useState<number>('offline-spot-detail-count', () => 0)

  const lastWeatherUpdate = computed(() => {
    const weatherAge = cacheAges.value['/api/weather/cloud-cover']
    if (!weatherAge) return null
    return formatRelativeTime(Date.now() - weatherAge)
  })

  const lastForecastUpdate = computed(() => {
    const forecastAge = cacheAges.value['/api/weather/forecast-timeline?hours=24']
    if (!forecastAge) return null
    return formatRelativeTime(Date.now() - forecastAge)
  })

  const isWeatherStale = computed(() => {
    const weatherAge = cacheAges.value['/api/weather/cloud-cover']
    if (!weatherAge) return false
    return (Date.now() - weatherAge) > 30 * 60 * 1000 // 30 minutes
  })

  function formatRelativeTime(ms: number): string {
    const minutes = Math.floor(ms / 60000)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes} min ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  function refreshCacheStatus() {
    if (!import.meta.client) return
    navigator.serviceWorker?.controller?.postMessage({ type: 'GET_CACHE_STATUS' })
  }

  function precacheApiData() {
    if (!import.meta.client) return
    navigator.serviceWorker?.controller?.postMessage({ type: 'PRECACHE_API' })
  }

  // Register global listeners only once (shared across all component instances)
  if (import.meta.client && !listenersRegistered) {
    listenersRegistered = true

    isOffline.value = !navigator.onLine

    let refreshDebounce: ReturnType<typeof setTimeout> | null = null

    window.addEventListener('online', () => {
      isOffline.value = false
      // Debounce to avoid spamming SW on connection flapping
      if (refreshDebounce) clearTimeout(refreshDebounce)
      refreshDebounce = setTimeout(() => refreshCacheStatus(), 2000)
    })

    window.addEventListener('offline', () => {
      isOffline.value = true
    })

    navigator.serviceWorker?.addEventListener('message', (event: MessageEvent) => {
      if (event.data?.type === 'CACHE_STATUS') {
        const status = { ...event.data.status }
        tileCount.value = status._tileCount || 0
        spotDetailCount.value = status._spotDetailCount || 0
        delete status._tileCount
        delete status._spotDetailCount
        cacheAges.value = status
      }
    })

    // Initial status check
    refreshCacheStatus()
  }

  return {
    isOffline,
    cacheAges,
    tileCount,
    spotDetailCount,
    lastWeatherUpdate,
    lastForecastUpdate,
    isWeatherStale,
    formatRelativeTime,
    refreshCacheStatus,
    precacheApiData,
  }
}
