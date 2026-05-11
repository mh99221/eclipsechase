import { serverSupabaseServiceRole } from '#supabase/server'

// Activations allowed before refusing replay. Set to 1 so a leaked
// session_id can't be reused — clients that have lost their token must
// go through Restore (email + OTP), which is bound to proof of email
// ownership rather than session_id-knowledge.
const MAX_ACTIVATIONS = 1

export default defineEventHandler(async (event) => {
  const { session_id } = await readBody<{ session_id: string }>(event)

  if (!session_id || typeof session_id !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'session_id is required' })
  }

  if (!checkRateLimit(`activate:${session_id}`, 10, 60 * 60 * 1000)) {
    throw createError({ statusCode: 429, statusMessage: 'Too many attempts. Try again later.' })
  }

  const supabase = await serverSupabaseServiceRole(event)

  // Atomic activation guard. The conditional UPDATE wins exactly once
  // per session_id: the row's `activation_count` starts at 0; the
  // `< MAX_ACTIVATIONS` clause makes the update affect 1 row only on
  // the first call, 0 rows on every subsequent call regardless of
  // clock skew, retries, or concurrent requests.
  const { data: claimed } = await supabase
    .from('pro_purchases')
    .update({ activation_count: MAX_ACTIVATIONS, activated: true, activated_at: new Date().toISOString() })
    .eq('stripe_session_id', session_id)
    .lt('activation_count', MAX_ACTIVATIONS)
    .select('activation_token, email')
    .maybeSingle()

  if (claimed) {
    if (!claimed.activation_token) {
      // Webhook hasn't finished signing yet — let the client retry.
      throw createError({ statusCode: 404, statusMessage: 'Purchase not found' })
    }
    return { token: claimed.activation_token, email: maskEmail(claimed.email) }
  }

  // Either the row doesn't exist yet (webhook still in flight) or the
  // activation budget is exhausted. Disambiguate with one SELECT.
  const { data: existing } = await supabase
    .from('pro_purchases')
    .select('id')
    .eq('stripe_session_id', session_id)
    .maybeSingle()

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Purchase not found' })
  }

  throw createError({
    statusCode: 410,
    statusMessage: 'This purchase has already been activated. Use Restore to re-activate on another device.',
  })
})
