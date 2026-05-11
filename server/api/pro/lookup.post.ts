import { serverSupabaseServiceRole } from '#supabase/server'

const LOOKUP_WINDOW_MS = 60 * 60 * 1000
const MAX_LOOKUPS_PER_WINDOW = 10

// Pre-checkout duplicate-purchase guard. Knowingly leaks email-existence
// (response is `{ exists: bool }`); the UX win of catching double-purchases
// outweighs the enumeration risk on a €9.99 single-event product. The
// rate-limit is DB-backed so concurrent lambdas share one counter — a
// per-lambda counter would be trivially defeated by Vercel autoscaling.
export default defineEventHandler(async (event) => {
  const { email } = await readBody<{ email: string }>(event)

  if (!email || typeof email !== 'string' || !isValidEmail(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Valid email is required' })
  }

  const normalizedEmail = normalizeEmail(email)
  const emailHash = hashEmail(normalizedEmail)

  const supabase = await serverSupabaseServiceRole(event)

  if (!await checkDbRateLimit(supabase, 'pro_lookup_attempts', emailHash, {
    windowMs: LOOKUP_WINDOW_MS,
    max: MAX_LOOKUPS_PER_WINDOW,
  })) {
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
