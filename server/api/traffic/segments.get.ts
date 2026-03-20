import { fetchRoadSegments, type RoadSegment } from '../../utils/vegagerdin'

const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes
let cachedSegments: RoadSegment[] = []
let cachedAt = 0

export default defineEventHandler(async () => {
  const now = Date.now()

  if (cachedSegments.length > 0 && now - cachedAt < CACHE_TTL_MS) {
    return { segments: cachedSegments, cached: true, fetchedAt: new Date(cachedAt).toISOString() }
  }

  try {
    const segments = await fetchRoadSegments()
    if (segments.length > 0) {
      cachedSegments = segments
      cachedAt = now
    }
    return { segments: cachedSegments, cached: false, fetchedAt: new Date(now).toISOString() }
  } catch {
    return { segments: cachedSegments, cached: true, fetchedAt: new Date(cachedAt).toISOString() }
  }
})
