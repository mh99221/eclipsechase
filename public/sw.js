const CACHE_NAME = 'eclipsechase-v4'
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

/** Fetch a list of URLs in parallel and put successful responses into the
 *  given cache. Returns rollup counts. Used by PRECACHE_API to fan out to
 *  per-slug API + page-HTML URLs without caring about per-URL details. */
async function fanOut(urls, cache, headers) {
  let cached = 0
  let failed = 0
  await Promise.allSettled(
    urls.map(async (url) => {
      try {
        const r = await fetch(url, headers ? { headers } : undefined)
        if (!r.ok) { failed++; return }
        await cache.put(new Request(url), stampResponse(r))
        cached++
      } catch {
        failed++
      }
    })
  )
  return { cached, failed }
}

// Install: pre-cache static assets (skip failures gracefully)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[SW] Failed to precache', url, err.message)
          })
        )
      )
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
        // 1. Cache fixed list endpoints. Hold onto the /api/spots response
        //    so we can extract slugs and fan out to per-spot detail URLs.
        let spotsBody = null
        const baseEntries = await Promise.allSettled(
          API_PRECACHE_URLS.map(async (url) => {
            const response = await fetch(url)
            if (!response.ok) return { url, status: 'failed' }
            await cache.put(new Request(url), stampResponse(response.clone()))
            if (url === '/api/spots') {
              try { spotsBody = await response.json() } catch { /* skip fan-out */ }
            }
            return { url, status: 'cached' }
          })
        )

        const results = {}
        for (const entry of baseEntries) {
          if (entry.status === 'fulfilled') {
            results[entry.value.url] = entry.value.status
          }
        }

        // 2 & 3. Fan out to /api/spots/{slug} JSON and /spots/{slug} HTML
        //    in parallel — independent of each other (HTML route doesn't
        //    need the JSON cache to be populated first). JSON unlocks SPA
        //    navigation offline; HTML closes the cold-load gap (homescreen
        //    tile, shared link). Photos stay lazy (would add 10–50 MB).
        const slugs = Array.isArray(spotsBody?.spots)
          ? spotsBody.spots.map((s) => s && s.slug).filter(Boolean)
          : []
        const pageCache = await caches.open(CACHE_NAME)
        const htmlUrls = ['/spots', ...slugs.map((slug) => `/spots/${slug}`)]

        const [jsonStats, htmlStats] = await Promise.all([
          fanOut(slugs.map((s) => `/api/spots/${s}`), cache),
          fanOut(htmlUrls, pageCache, { Accept: 'text/html' }),
        ])
        results['/api/spots/*'] = `${jsonStats.cached}/${slugs.length} cached`
        results['/spots/* (html)'] = `${htmlStats.cached}/${htmlUrls.length} cached`

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
        // Count per-slug spot detail entries. The fixed URL list above
        // doesn't include /api/spots/{slug} — those are dynamic, so we
        // probe the cache directly and report a single rollup count.
        const apiKeys = await cache.keys()
        let spotDetailCount = 0
        for (const req of apiKeys) {
          const path = new URL(req.url).pathname
          if (path.startsWith('/api/spots/') && path !== '/api/spots/') {
            spotDetailCount++
          }
        }
        status._spotDetailCount = spotDetailCount

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

  // Navigation requests (HTML pages): always network-first so new deployments load
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request) || caches.match('/'))
    )
    return
  }

  // API cache: network-first with cache fallback + timestamp
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCacheFallback(event.request))
    return
  }

  // Tile cache: cache-first for Mapbox requests (vector tiles, sprites, glyphs)
  if (url.hostname.includes('mapbox')) {
    event.respondWith(cacheFirstTiles(event.request))
    return
  }

  // Hashed assets (_nuxt/*.js): cache-first (content-hashed, immutable)
  if (url.pathname.startsWith('/_nuxt/')) {
    event.respondWith(cacheFirstDefault(event.request))
    return
  }

  // Other static assets: network-first with cache fallback
  event.respondWith(networkFirstWithCacheFallback(event.request))
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
  if (cached && cached.ok) {
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
