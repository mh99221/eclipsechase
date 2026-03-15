const CACHE_NAME = 'eclipsechase-v1'
const API_CACHE = 'eclipsechase-api-v1'
const TILE_CACHE = 'eclipsechase-tiles-v1'
const MAX_TILE_CACHE = 2000

const PRECACHE_URLS = [
  '/guide',
  '/pro',
  '/manifest.json',
  '/favicon.svg',
  '/eclipse-data/path.geojson'
]

function offlineResponse() {
  return new Response(
    JSON.stringify({ error: 'Offline and no cached data available' }),
    { status: 503, headers: { 'Content-Type': 'application/json' } }
  )
}

// Install: pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS)
    })
  )
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, API_CACHE, TILE_CACHE]
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !currentCaches.includes(name))
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// Fetch: route requests to appropriate caching strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return
  }

  // API cache: network-first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCacheFallback(event.request))
    return
  }

  // Tile cache: cache-first for Mapbox tiles
  if (url.hostname.includes('mapbox') && url.pathname.includes('/tiles/')) {
    event.respondWith(cacheFirstTiles(event.request))
    return
  }

  // Default: cache-first for all other GET requests
  event.respondWith(cacheFirstDefault(event.request))
})

// Network-first strategy for API requests
async function networkFirstWithCacheFallback(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(API_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch (err) {
    const cached = await caches.match(request)
    if (cached) {
      return cached
    }
    return offlineResponse()
  }
}

// Cache-first strategy for Mapbox tiles with eviction
async function cacheFirstTiles(request) {
  const cached = await caches.match(request)
  if (cached) {
    return cached
  }

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(TILE_CACHE)
      const keys = await cache.keys()
      if (keys.length >= MAX_TILE_CACHE) {
        await cache.delete(keys[0])
      }
      cache.put(request, response.clone())
    }
    return response
  } catch (err) {
    return new Response('', { status: 503, statusText: 'Tile unavailable offline' })
  }
}

// Cache-first strategy for default GET requests
async function cacheFirstDefault(request) {
  const cached = await caches.match(request)
  if (cached) {
    return cached
  }

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch (err) {
    return offlineResponse()
  }
}
