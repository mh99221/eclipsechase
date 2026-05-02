/**
 * Module-level single-value TTL cache.
 *
 * Use for endpoints that hold one cached payload per process (e.g. road
 * conditions, road segments, camera list) — not for per-key caches. Returns
 * `null` from `get()` when empty or expired so callers can decide whether to
 * refetch and how to handle stale fallbacks.
 */
export function createTtlCache<T>(ttlMs: number) {
  let value: T | null = null
  let cachedAt = 0
  return {
    get(): T | null {
      if (value === null) return null
      if (Date.now() - cachedAt > ttlMs) return null
      return value
    },
    set(v: T) {
      value = v
      cachedAt = Date.now()
    },
    /** Timestamp (ms epoch) of the last `set()`, or 0 if never set. */
    get cachedAt() {
      return cachedAt
    },
    /** Current cached value regardless of TTL (for stale-fallback paths). */
    peek(): T | null {
      return value
    },
  }
}
