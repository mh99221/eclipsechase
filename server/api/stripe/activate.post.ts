import { serverSupabaseServiceRole } from '#supabase/server'

// Grace window after first activation during which the same session_id
// can still re-fetch the token. Covers genuine network flakes (failed
// save to IndexedDB, hard refresh during onboarding) without leaving a
// long replay window open for leaked session_ids.
const ACTIVATION_GRACE_MS = 10 * 60 * 1000

export default defineEventHandler(async (event) => {
  const { session_id } = await readBody<{ session_id: string }>(event)

  if (!session_id || typeof session_id !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'session_id is required' })
  }

  if (!checkRateLimit(`activate:${session_id}`, 10, 60 * 60 * 1000)) {
    throw createError({ statusCode: 429, statusMessage: 'Too many attempts. Try again later.' })
  }

  const supabase = await serverSupabaseServiceRole(event)

  const { data } = await supabase
    .from('pro_purchases')
    .select('activation_token, email, activated, activated_at')
    .eq('stripe_session_id', session_id)
    .maybeSingle()

  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'Purchase not found' })
  }

  // One-time activation: once `activated_at` is set and the grace window
  // has elapsed, refuse subsequent calls. Clients that have lost their
  // token must use the Restore flow (email + OTP) — which is bound to
  // proof of email ownership, not session_id-knowledge.
  if (data.activated && data.activated_at) {
    const activatedAt = new Date(data.activated_at).getTime()
    if (Date.now() - activatedAt > ACTIVATION_GRACE_MS) {
      throw createError({
        statusCode: 410,
        statusMessage: 'This purchase has already been activated. Use Restore to re-activate on another device.',
      })
    }
  }

  // Mark as activated on first retrieval. We update before returning the
  // token so replay attempts after the grace window are blocked even if
  // the legitimate client never saves the response.
  if (!data.activated) {
    await supabase.from('pro_purchases')
      .update({ activated: true, activated_at: new Date().toISOString() })
      .eq('stripe_session_id', session_id)
  }

  return { token: data.activation_token, email: maskEmail(data.email) }
})
