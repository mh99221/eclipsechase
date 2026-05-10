import { timingSafeEqual } from 'crypto'
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const { email, secret } = await readBody<{ email: string; secret: string }>(event)

  if (!config.adminSecret) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  if (typeof secret !== 'string' || secret.length === 0) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const provided = Buffer.from(secret, 'utf8')
  const expected = Buffer.from(config.adminSecret, 'utf8')
  const ok = provided.length === expected.length && timingSafeEqual(provided, expected)
  if (!ok) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    throw createError({ statusCode: 400, statusMessage: 'Valid email is required' })
  }

  const normalizedEmail = email.toLowerCase().trim()
  const emailHash = hashEmail(normalizedEmail)
  const sessionId = `admin_grant_${Date.now()}`

  const supabase = await serverSupabaseServiceRole(event)

  // Insert first so the JWT can be bound to the row id (`pid` claim).
  const { data: inserted, error: insertError } = await supabase
    .from('pro_purchases')
    .upsert(
      {
        email: normalizedEmail,
        email_hash: emailHash,
        stripe_session_id: sessionId,
        activation_token: '',
        purchased_at: new Date().toISOString(),
        is_active: true,
        activated: true,
        activated_at: new Date().toISOString(),
      },
      { onConflict: 'stripe_session_id' },
    )
    .select('id, token_version')
    .single()

  if (insertError || !inserted) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to save grant' })
  }

  const token = await generateProToken(normalizedEmail, sessionId, {
    purchaseId: inserted.id,
    tokenVersion: inserted.token_version ?? 1,
  })

  await supabase.from('pro_purchases')
    .update({ activation_token: token })
    .eq('id', inserted.id)

  return { token, email: maskEmail(normalizedEmail) }
})
