// Bumped to v7 so previously-cached Pro-gated responses (cameras /
// traffic) get evicted on update. Those endpoints are now server-gated
// by requirePro() and the SW must not cache them by URL — see
// PRO_ONLY_PATHS below.
const CACHE_NAME = 'eclipsechase-v7'
const API_CACHE = 'eclipsechase-api-v3'
const TILE_CACHE = 'eclipsechase-tiles-v1'
const MAX_TILE_CACHE = 5000

const PRECACHE_URLS = [
  '/',
  '/guide',
  '/pro',
  '/manifest.json',
  '/favicon.svg',
  '/eclipse-data/path.geojson',
  '/eclipse-data/grid.json',
  '/eclipse-data/roads.geojson'
]

// API endpoints to precache for offline use. Pro-only endpoints
// (/api/cameras, /api/traffic/*) are deliberately omitted — the SW
// can't include the Authorization: Bearer header without coordinating
// with the page, so a bare precache fetch would just get 401 and pin
// that response. Even if it did fetch the real body, caching a Pro
// response by URL only would let a future non-Pro user of the same
// browser profile see the data offline.
const API_PRECACHE_URLS = [
  '/api/spots',
  '/api/weather/stations',
  '/api/weather/cloud-cover',
  '/api/weather/forecast-timeline?hours=24'
]

// Paths whose responses MUST NOT enter the SW cache. The server's
// requirePro() gate authenticates by Bearer JWT in the Authorization
// header, but Cache Storage keys by URL+method only — so without a
// per-token cache key, caching here would let a previous Pro user's
// response be served back to a non-Pro / different visitor of the
// same browser profile, bypassing the gate.
const PRO_ONLY_PATHS = [
  '/api/cameras',
  '/api/traffic/conditions',
  '/api/traffic/segments',
  '/api/horizon/check',
  '/api/pro/verify'
]

function isProOnlyPath(pathname) {
  return PRO_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(p + '?') || pathname.startsWith(p + '/'))
}

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

  // Nuxt SPA-navigation payloads (`_payload.json`) and Nuxt Content's
  // query API drive page hydration. Caching them risks serving the
  // wrong revision after a deploy, which manifests as "page renders
  // header but no body" (queryCollection returns null because the
  // payload was the previous build's). Always go to network here;
  // if offline, fall through to a cache match as a last resort.
  if (url.pathname.endsWith('/_payload.json') || url.pathname.startsWith('/api/_content/')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request) || offlineResponse())
    )
    return
  }

  // Pro-only endpoints: pure passthrough, never cached. The server
  // authenticates via Bearer JWT (server/utils/proAuth.ts:requirePro)
  // and the cache has no way to key on that, so caching would create a
  // cross-user data-leak window on shared devices. Offline = endpoint
  // fails, which is correct: there's no offline Pro answer to serve.
  if (url.pathname.startsWith('/api/') && isProOnlyPath(url.pathname)) {
    event.respondWith(fetch(event.request))
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
