const store = new Map<string, { count: number; resetAt: number }>()
const MAX_STORE_SIZE = 10_000

/**
 * In-memory rate limiter. Resets on deploy and is per-lambda, so
 * concurrent warm workers each have their own counter — use only for
 * limits that don't matter if defeated by autoscaling (`/api/cameras`,
 * `/api/horizon/check`, etc.). For auth-adjacent endpoints, use
 * `checkDbRateLimit` instead.
 */
export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()

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

/**
 * DB-backed sliding-window rate limit. Counts rows for `email_hash` in
 * the last `windowMs` and reports whether the caller is still under
 * `max`. Use for security-adjacent endpoints where a per-lambda counter
 * is defeated by Vercel autoscaling.
 *
 * Caller is responsible for inserting the attempt row on a successful
 * pass — that's the row this function counts on subsequent calls.
 */
export async function checkDbRateLimit(
  supabase: any,
  table: 'pro_lookup_attempts' | 'restore_codes',
  emailHash: string,
  opts: { windowMs: number; max: number },
): Promise<boolean> {
  const windowStart = new Date(Date.now() - opts.windowMs).toISOString()
  const { count } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('email_hash', emailHash)
    .gte('created_at', windowStart)
  return (count ?? 0) < opts.max
}
