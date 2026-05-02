import { fetchRoadConditions, type RoadCondition } from '../../utils/vegagerdin'
import { createTtlCache } from '../../utils/cacheHelper'

const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes

const cache = createTtlCache<RoadCondition[]>(CACHE_TTL_MS)

export default defineEventHandler(async () => {
  const hit = cache.get()

  if (hit !== null) {
    return {
      conditions: hit,
      cached: true,
      fetchedAt: new Date(cache.cachedAt).toISOString(),
    }
  }

  const conditions = await fetchRoadConditions()

  // Only update cache if we got results (keep stale data if fetch fails).
  // First-ever fetch always primes the cache, even if empty.
  if (conditions.length > 0 || cache.cachedAt === 0) {
    cache.set(conditions)
  }

  const current = cache.peek() ?? []
  return {
    conditions: current,
    cached: false,
    fetchedAt: new Date(cache.cachedAt).toISOString(),
  }
})
