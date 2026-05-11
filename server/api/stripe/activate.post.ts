import { serverSupabaseServiceRole } from '#supabase/server'

// MAX_ACTIVATIONS = 1 makes the conditional UPDATE below a one-shot
// claim — a leaked session_id can't be replayed regardless of clock
// skew, retries, or concurrent requests. Clients that lost their token
// must go through Restore (email + OTP).
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

  const { data: claimed } = await supabase
    .from('pro_purchases')
    .update({ activation_count: MAX_ACTIVATIONS, activated: true, activated_at: new Date().toISOString() })
    .eq('stripe_session_id', session_id)
    .lt('activation_count', MAX_ACTIVATIONS)
    .select('activation_token, email')
    .maybeSingle()

  if (claimed?.activation_token) {
    return { token: claimed.activation_token, email: maskEmail(claimed.email) }
  }
  if (claimed) {
    // Row claimed but webhook hasn't finished signing yet — client retries.
    throw createError({ statusCode: 404, statusMessage: 'Purchase not found' })
  }

  // Either the row doesn't exist yet (webhook in flight) or the
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
