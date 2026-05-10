import { serverSupabaseServiceRole } from '#supabase/server'

// Pre-checkout duplicate-purchase guard. The /pro page calls this with
// the buyer's email before redirecting to Stripe so we can route an
// already-Pro user to Restore instead of letting them pay twice.
//
// We knowingly leak existence here (response is `{ exists: bool }`),
// unlike /api/stripe/restore/request which returns a constant shape.
// The product is a €9.99 single-event purchase — the UX win of catching
// double-purchases outweighs the minor enumeration risk, and the rate
// limit below makes bulk enumeration impractical.
export default defineEventHandler(async (event) => {
  const { email } = await readBody<{ email: string }>(event)

  if (!email || typeof email !== 'string' || !isValidEmail(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Valid email is required' })
  }

  const normalizedEmail = normalizeEmail(email)
  const emailHash = hashEmail(normalizedEmail)

  if (!checkRateLimit(`pro-lookup:${emailHash}`, 10, 60 * 60 * 1000)) {
    throw createError({ statusCode: 429, statusMessage: 'Too many lookups. Try again later.' })
  }

  const supabase = await serverSupabaseServiceRole(event)

  const { data } = await supabase
    .from('pro_purchases')
    .select('id')
    .eq('email_hash', emailHash)
    .eq('is_active', true)
    .limit(1)

  return { exists: Array.isArray(data) && data.length > 0 }
})
