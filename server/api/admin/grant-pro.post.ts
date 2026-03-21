import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const { email, secret } = await readBody<{ email: string; secret: string }>(event)

  if (!config.adminSecret || secret !== config.adminSecret) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    throw createError({ statusCode: 400, statusMessage: 'Valid email is required' })
  }

  const normalizedEmail = email.toLowerCase().trim()
  const emailHash = hashEmail(normalizedEmail)
  const sessionId = `admin_grant_${Date.now()}`
  const token = await generateProToken(normalizedEmail, sessionId)

  const supabase = await serverSupabaseServiceRole(event)

  await supabase.from('pro_purchases').upsert(
    {
      email: normalizedEmail,
      email_hash: emailHash,
      stripe_session_id: sessionId,
      activation_token: token,
      purchased_at: new Date().toISOString(),
      is_active: true,
      activated: true,
    },
    { onConflict: 'stripe_session_id' },
  )

  return { token, email: maskEmail(normalizedEmail) }
})
