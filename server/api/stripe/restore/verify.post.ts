import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const { email, code } = await readBody<{ email: string; code: string }>(event)

  if (!email || !code) {
    throw createError({ statusCode: 400, statusMessage: 'Email and code are required' })
  }

  const normalizedEmail = email.toLowerCase().trim()

  // Rate limit: 5 attempts per email per hour
  if (!checkRateLimit(`restore-verify:${normalizedEmail}`, 5, 60 * 60 * 1000)) {
    throw createError({ statusCode: 429, statusMessage: 'Too many attempts. Try again later.' })
  }

  const emailHash = hashEmail(normalizedEmail)

  const supabase = await serverSupabaseServiceRole(event)

  // Look up code
  const { data: restoreCode } = await supabase
    .from('restore_codes')
    .select('id, expires_at, used')
    .eq('email_hash', emailHash)
    .eq('code', code)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!restoreCode) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid code' })
  }

  if (restoreCode.used) {
    throw createError({ statusCode: 400, statusMessage: 'Code already used' })
  }

  if (new Date(restoreCode.expires_at) < new Date()) {
    throw createError({ statusCode: 400, statusMessage: 'Code expired' })
  }

  // Mark code as used + look up purchase in parallel
  const [, { data: purchase }] = await Promise.all([
    supabase.from('restore_codes')
      .update({ used: true })
      .eq('id', restoreCode.id),
    supabase
      .from('pro_purchases')
      .select('id, restored_count')
      .eq('email', normalizedEmail)
      .eq('is_active', true)
      .limit(1),
  ])

  const firstPurchase = purchase?.[0] ?? null
  if (!firstPurchase) {
    throw createError({ statusCode: 404, statusMessage: 'Purchase not found' })
  }

  // Generate fresh token
  const token = await generateProToken(normalizedEmail, `restore_${firstPurchase.id}`)

  // Update purchase with new token and increment restored_count
  await supabase.from('pro_purchases')
    .update({
      activation_token: token,
      restored_count: (firstPurchase.restored_count || 0) + 1,
      last_restored_at: new Date().toISOString(),
    })
    .eq('id', firstPurchase.id)

  return { token }
})
