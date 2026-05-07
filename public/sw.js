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

        // 2. Fan out to /api/spots/{slug} for every spot. Photos are NOT
        //    eagerly cached here — the runtime fetch handler picks them up
        //    lazily as users browse, keeping this precache step lightweight
        //    (~30 spots × ~50KB JSON is well under 2 MB).
        const slugs = Array.isArray(spotsBody?.spots)
          ? spotsBody.spots.map((s) => s && s.slug).filter(Boolean)
          : []
        let cached = 0
        let failed = 0
        if (slugs.length > 0) {
          await Promise.allSettled(
            slugs.map(async (slug) => {
              const url = `/api/spots/${slug}`
              try {
                const r = await fetch(url)
                if (!r.ok) { failed++; return }
                await cache.put(new Request(url), stampResponse(r))
                cached++
              } catch {
                failed++
              }
            })
          )
        }
        results['/api/spots/*'] = `${cached}/${slugs.length} cached`

        // 3. Precache HTML for the spot pages so cold loads work offline
        //    (e.g. opening /spots/{slug} from a homescreen tile or a
        //    shared link with no network). SPA navigation between
        //    already-loaded pages is fine without this — Nuxt's router
        //    just needs the per-slug JSON cached above. This step closes
        //    the cold-load gap. Nuxt SSR HTML is ~100–300 KB per page,
        //    so the additional storage cost is roughly 5 MB for ~30
        //    spots — acceptable for the offline experience.
        const pageCache = await caches.open(CACHE_NAME)
        const htmlUrls = ['/spots', ...slugs.map((slug) => `/spots/${slug}`)]
        let htmlCached = 0
        let htmlFailed = 0
        await Promise.allSettled(
          htmlUrls.map(async (url) => {
            try {
              const r = await fetch(url, { headers: { Accept: 'text/html' } })
              if (!r.ok) { htmlFailed++; return }
              await pageCache.put(new Request(url), stampResponse(r))
              htmlCached++
            } catch {
              htmlFailed++
            }
          })
        )
        results['/spots/* (html)'] = `${htmlCached}/${htmlUrls.length} cached`

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

        // Count cached spot page HTML (under CACHE_NAME, not API_CACHE).
        const pageCache = await caches.open(CACHE_NAME)
        const pageKeys = await pageCache.keys()
        let spotPageCount = 0
        for (const req of pageKeys) {
          const path = new URL(req.url).pathname
          if (path.startsWith('/spots/') && path !== '/spots/') {
            spotPageCount++
          }
        }
        status._spotPageCount = spotPageCount

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
