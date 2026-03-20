const CACHE_NAME = 'eclipsechase-v2'
const API_CACHE = 'eclipsechase-api-v2'
const TILE_CACHE = 'eclipsechase-tiles-v1'
const MAX_TILE_CACHE = 5000

const PRECACHE_URLS = [
  '/guide',
  '/pro',
  '/manifest.json',
  '/favicon.svg',
  '/eclipse-data/path.geojson',
  '/eclipse-data/grid.json',
  '/eclipse-data/roads.geojson'
]

// API endpoints to precache for offline use
const API_PRECACHE_URLS = [
  '/api/spots',
  '/api/weather/stations',
  '/api/weather/cloud-cover',
  '/api/weather/forecast-timeline?hours=24',
  '/api/traffic/conditions',
  '/api/traffic/segments',
  '/api/cameras'
]

function offlineResponse() {
  return new Response(
    JSON.stringify({ error: 'Offline and no cached data available' }),
    { status: 503, headers: { 'Content-Type': 'application/json' } }
  )
}

/** Clone a response and add a timestamp header for cache-age tracking */
function stampResponse(response) {
  const headers = new Headers(response.headers)
  headers.set('X-Cached-At', new Date().toISOString())
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

/** Mark a cached response so client knows it came from SW cache */
function markAsCached(response) {
  const headers = new Headers(response.headers)
  headers.set('X-Cache-Source', 'sw')
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
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

// Message handler for API precaching and cache status queries
self.addEventListener('message', (event) => {
  if (event.data?.type === 'PRECACHE_API') {
    event.waitUntil(
      caches.open(API_CACHE).then(async (cache) => {
        const entries = await Promise.allSettled(
          API_PRECACHE_URLS.map(async (url) => {
            const response = await fetch(url)
            if (response.ok) {
              await cache.put(new Request(url), stampResponse(response))
              return { url, status: 'cached' }
            }
            return { url, status: 'failed' }
          })
        )
        const results = {}
        for (const entry of entries) {
          if (entry.status === 'fulfilled') {
            results[entry.value.url] = entry.value.status
          } else {
            results['unknown'] = 'failed'
          }
        }
        if (event.source) {
          event.source.postMessage({ type: 'PRECACHE_API_DONE', results })
        }
      })
    )
  }

  if (event.data?.type === 'GET_CACHE_STATUS') {
    event.waitUntil(
      caches.open(API_CACHE).then(async (cache) => {
        const status = {}
        for (const url of API_PRECACHE_URLS) {
          const cached = await cache.match(new Request(url))
          if (cached) {
            const cachedAt = cached.headers.get('X-Cached-At')
            status[url] = cachedAt ? new Date(cachedAt).getTime() : null
          } else {
            status[url] = null
          }
        }
        // Also check tile cache count
        const tileCache = await caches.open(TILE_CACHE)
        const tileKeys = await tileCache.keys()
        status._tileCount = tileKeys.length

        if (event.source) {
          event.source.postMessage({ type: 'CACHE_STATUS', status })
        }
      })
    )
  }
})

// Fetch: route requests to appropriate caching strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return
  }

  // Pro status: cache-first (critical for offline access)
  if (url.pathname === '/api/pro/status') {
    event.respondWith(cacheFirstApi(event.request))
    return
  }

  // API cache: network-first with cache fallback + timestamp
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

// Network-first strategy for API requests (with timestamp tracking)
async function networkFirstWithCacheFallback(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(API_CACHE)
      cache.put(request, stampResponse(response.clone()))
    }
    return response
  } catch (err) {
    const cached = await caches.match(request)
    if (cached) {
      return markAsCached(cached)
    }
    return offlineResponse()
  }
}

// Cache-first strategy for pro status (offline access)
async function cacheFirstApi(request) {
  const cached = await caches.match(request)
  if (cached) {
    // Return cached immediately, refresh in background
    fetch(request).then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(API_CACHE)
        cache.put(request, stampResponse(response))
      }
    }).catch(() => {})
    return markAsCached(cached)
  }

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(API_CACHE)
      cache.put(request, stampResponse(response.clone()))
    }
    return response
  } catch (err) {
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
