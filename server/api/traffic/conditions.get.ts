import { fetchRoadConditions, type RoadCondition } from '../../utils/vegagerdin'

const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes

let cachedConditions: RoadCondition[] = []
let cachedAt = 0

export default defineEventHandler(async () => {
  const now = Date.now()
  const isFresh = cachedAt > 0 && (now - cachedAt) < CACHE_TTL_MS

  if (isFresh) {
    return {
      conditions: cachedConditions,
      cached: true,
      fetchedAt: new Date(cachedAt).toISOString(),
    }
  }

  const conditions = await fetchRoadConditions()

  // Only update cache if we got results (keep stale data if fetch fails)
  if (conditions.length > 0 || cachedAt === 0) {
    cachedConditions = conditions
    cachedAt = now
  }

  return {
    conditions: cachedConditions,
    cached: false,
    fetchedAt: new Date(cachedAt).toISOString(),
  }
})
