/**
 * In-memory result cache for /api/check.
 *
 * Sibling to rateLimit.ts: per-lambda Map with periodic GC. Resets on
 * deploy and cold start, which is fine — Vercel keeps warm functions
 * around long enough that repeat-shares of a coord (e.g. a Reddit
 * thread) collapse onto one compute.
 */
const store = new Map<string, { value: unknown; expiresAt: number }>()
const MAX_STORE_SIZE = 5_000

export function getCachedResult<T>(key: string): T | null {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return null
  }
  return entry.value as T
}

export function setCachedResult<T>(key: string, value: T, ttlSeconds: number): void {
  if (store.size > MAX_STORE_SIZE) {
    const now = Date.now()
    for (const [k, v] of store) {
      if (now > v.expiresAt) store.delete(k)
    }
  }
  store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 })
}

export function clearCache(): void {
  store.clear()
}
