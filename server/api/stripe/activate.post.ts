import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const { session_id } = await readBody<{ session_id: string }>(event)

  if (!session_id || typeof session_id !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'session_id is required' })
  }

  const supabase = await serverSupabaseServiceRole(event)

  const { data } = await supabase
    .from('pro_purchases')
    .select('activation_token, email')
    .eq('stripe_session_id', session_id)
    .maybeSingle()

  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'Purchase not found' })
  }

  return { token: data.activation_token, email: maskEmail(data.email) }
})
