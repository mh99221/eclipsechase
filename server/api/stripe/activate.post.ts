import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const { session_id } = await readBody<{ session_id: string }>(event)

  if (!session_id || typeof session_id !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'session_id is required' })
  }

  // Rate limit: 10 attempts per session_id per hour
  if (!checkRateLimit(`activate:${session_id}`, 10, 60 * 60 * 1000)) {
    throw createError({ statusCode: 429, statusMessage: 'Too many attempts. Try again later.' })
  }

  const supabase = await serverSupabaseServiceRole(event)

  const { data } = await supabase
    .from('pro_purchases')
    .select('activation_token, email, activated')
    .eq('stripe_session_id', session_id)
    .maybeSingle()

  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'Purchase not found' })
  }

  // Mark as activated on first retrieval
  if (!data.activated) {
    await supabase.from('pro_purchases')
      .update({ activated: true })
      .eq('stripe_session_id', session_id)
  }

  return { token: data.activation_token, email: maskEmail(data.email) }
})
