import { serverSupabaseServiceRole } from '#supabase/server'

const LOOKUP_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const MAX_LOOKUPS_PER_WINDOW = 10

// Pre-checkout duplicate-purchase guard. The /pro page calls this with
// the buyer's email before redirecting to Stripe so we can route an
// already-Pro user to Restore instead of letting them pay twice.
//
// We knowingly leak existence here (response is `{ exists: bool }`),
// unlike /api/stripe/restore/request which returns a constant shape.
// The product is a €9.99 single-event purchase — the UX win of catching
// double-purchases outweighs the minor enumeration risk, but the
// rate-limit MUST be shared across lambdas or it's trivially defeated
// by Vercel's autoscaling — hence the DB-backed counter below.
export default defineEventHandler(async (event) => {
  const { email } = await readBody<{ email: string }>(event)

  if (!email || typeof email !== 'string' || !isValidEmail(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Valid email is required' })
  }

  const normalizedEmail = normalizeEmail(email)
  const emailHash = hashEmail(normalizedEmail)

  const supabase = await serverSupabaseServiceRole(event)

  // DB-backed rate limit — one source of truth across lambdas.
  const windowStart = new Date(Date.now() - LOOKUP_WINDOW_MS).toISOString()
  const { count: recentCount } = await supabase
    .from('pro_lookup_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('email_hash', emailHash)
    .gte('created_at', windowStart)

  if ((recentCount ?? 0) >= MAX_LOOKUPS_PER_WINDOW) {
    throw createError({ statusCode: 429, statusMessage: 'Too many lookups. Try again later.' })
  }

  await supabase.from('pro_lookup_attempts').insert({ email_hash: emailHash })

  const { data } = await supabase
    .from('pro_purchases')
    .select('id')
    .eq('email_hash', emailHash)
    .eq('is_active', true)
    .limit(1)

  return { exists: Array.isArray(data) && data.length > 0 }
})
