const store = new Map<string, { count: number; resetAt: number }>()
const MAX_STORE_SIZE = 10_000

/**
 * Simple in-memory rate limiter. Resets on deploy (Vercel serverless).
 * Acceptable for a low-traffic single-event app.
 */
export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()

  // Evict expired entries if store grows too large
  if (store.size > MAX_STORE_SIZE) {
    for (const [k, v] of store) {
      if (now > v.resetAt) store.delete(k)
    }
  }

  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= maxRequests) {
    return false
  }

  entry.count++
  return true
}
