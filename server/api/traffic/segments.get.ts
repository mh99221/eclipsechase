import { fetchRoadSegments, type RoadSegment } from '../../utils/vegagerdin'
import { createTtlCache } from '../../utils/cacheHelper'

const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes

const cache = createTtlCache<RoadSegment[]>(CACHE_TTL_MS)

export default defineEventHandler(async (event) => {
  await requirePro(event)

  const hit = cache.get()

  if (hit !== null) {
    return {
      segments: hit,
      cached: true,
      fetchedAt: new Date(cache.cachedAt).toISOString(),
    }
  }

  try {
    const segments = await fetchRoadSegments()

    // Only update cache if we got results (keep stale data if fetch fails).
    // First-ever fetch always primes the cache, even if empty.
    if (segments.length > 0 || cache.cachedAt === 0) {
      cache.set(segments)
    }

    const current = cache.peek() ?? []
    return {
      segments: current,
      cached: false,
      fetchedAt: new Date(cache.cachedAt).toISOString(),
    }
  } catch (err: any) {
    // Vegagerdin outage shouldn't 500 the map — degrade to stale cache
    // (or empty if we've never fetched) so the /map traffic overlay
    // just renders as empty rather than failing the page load.
    console.error('[traffic/segments] fetch failed:', err?.message || err)
    return {
      segments: cache.peek() ?? [],
      cached: true,
      fetchedAt: cache.cachedAt > 0 ? new Date(cache.cachedAt).toISOString() : null,
    }
  }
})
