import { createHash, randomInt } from 'crypto'
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const { email } = await readBody<{ email: string }>(event)

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    throw createError({ statusCode: 400, statusMessage: 'Valid email is required' })
  }

  const normalizedEmail = email.toLowerCase().trim()

  // Rate limit: 3 requests per email per hour
  if (!checkRateLimit(`restore-request:${normalizedEmail}`, 3, 60 * 60 * 1000)) {
    throw createError({ statusCode: 429, statusMessage: 'Too many requests. Try again later.' })
  }

  const emailHash = createHash('sha256').update(normalizedEmail).digest('hex')

  // Always return success to prevent email enumeration
  const maskedLocal = normalizedEmail.split('@')[0]
  const maskedDomain = normalizedEmail.split('@')[1]
  const masked = maskedLocal.length > 1
    ? maskedLocal[0] + '***' + maskedLocal[maskedLocal.length - 1] + '@' + maskedDomain
    : maskedLocal + '***@' + maskedDomain

  const supabase = await serverSupabaseServiceRole(event)

  // Check if purchase exists
  const { data: purchase } = await supabase
    .from('pro_purchases')
    .select('id')
    .eq('email', normalizedEmail)
    .eq('is_active', true)
    .maybeSingle()

  if (purchase) {
    // Generate 6-digit code
    const code = String(randomInt(100000, 1000000))

    // Store code with 15 min TTL
    await supabase.from('restore_codes').insert({
      email_hash: emailHash,
      code,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    })

    // Send email (fire and forget — don't block response)
    sendRestoreCode(normalizedEmail, code)
  }

  // Always return same response regardless of whether purchase exists
  return { sent: true, masked_email: masked }
})
