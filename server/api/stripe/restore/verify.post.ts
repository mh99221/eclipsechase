import { serverSupabaseServiceRole } from '#supabase/server'

const VERIFY_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const MAX_VERIFY_PER_WINDOW = 5
const MAX_ATTEMPTS_PER_CODE = 5

export default defineEventHandler(async (event) => {
  const { email, code } = await readBody<{ email: string; code: string }>(event)

  if (!email || !code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    throw createError({ statusCode: 400, statusMessage: 'Email and 6-digit code are required' })
  }

  const normalizedEmail = normalizeEmail(email)
  const emailHash = hashEmail(normalizedEmail)

  const supabase = await serverSupabaseServiceRole(event)

  // DB-backed rate limit: count failed-attempt rows in the last hour.
  // We count by summing `attempts` across all this email's recent codes
  // — that's the total number of guesses, regardless of how the lambda
  // pool routed them.
  const windowStart = new Date(Date.now() - VERIFY_WINDOW_MS).toISOString()
  const { data: recent } = await supabase
    .from('restore_codes')
    .select('attempts')
    .eq('email_hash', emailHash)
    .gte('created_at', windowStart)

  const totalAttempts = (recent ?? []).reduce((sum, r: any) => sum + (r.attempts ?? 0), 0)
  if (totalAttempts >= MAX_VERIFY_PER_WINDOW) {
    throw createError({ statusCode: 429, statusMessage: 'Too many attempts. Try again later.' })
  }

  // Look up the most recent un-used code for this email_hash. We don't
  // match on `code` in the query — we match only on email_hash so any
  // mismatch increments the attempt counter on the current outstanding
  // code (defense against unlimited guessing against a single code).
  const { data: restoreCode } = await supabase
    .from('restore_codes')
    .select('id, code, expires_at, used, attempts')
    .eq('email_hash', emailHash)
    .eq('used', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!restoreCode) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid code' })
  }

  if (new Date(restoreCode.expires_at) < new Date()) {
    await supabase.from('restore_codes').update({ used: true }).eq('id', restoreCode.id)
    throw createError({ statusCode: 400, statusMessage: 'Code expired' })
  }

  // Constant-time compare so an attacker can't infer prefixes from
  // timing. Both strings are 6-digit ASCII so length is fixed.
  const provided = Buffer.from(code, 'utf8')
  const expected = Buffer.from(restoreCode.code, 'utf8')
  const match = provided.length === expected.length
    && (await import('crypto')).timingSafeEqual(provided, expected)

  if (!match) {
    const nextAttempts = (restoreCode.attempts ?? 0) + 1
    const burned = nextAttempts >= MAX_ATTEMPTS_PER_CODE
    await supabase
      .from('restore_codes')
      .update({ attempts: nextAttempts, used: burned })
      .eq('id', restoreCode.id)
    throw createError({ statusCode: 400, statusMessage: 'Invalid code' })
  }

  // Success — mark this code used AND invalidate any other outstanding
  // codes for this email so a parallel guess campaign can't continue.
  await supabase
    .from('restore_codes')
    .update({ used: true })
    .eq('email_hash', emailHash)
    .eq('used', false)

  const { data: purchases } = await supabase
    .from('pro_purchases')
    .select('id, restored_count, token_version')
    .eq('email', normalizedEmail)
    .eq('is_active', true)
    .limit(1)

  const purchase = purchases?.[0] ?? null
  if (!purchase) {
    throw createError({ statusCode: 404, statusMessage: 'Purchase not found' })
  }

  // Bump token_version atomically so concurrent restores can't both
  // mint a JWT at the same tv. The `eq('token_version', observed)`
  // clause makes the UPDATE a compare-and-swap — if another verify
  // has already bumped the version, this update affects 0 rows and
  // we return 409 (client retries; this is rare).
  const observedVersion = purchase.token_version ?? 1
  const nextVersion = observedVersion + 1

  const token = await generateProToken(normalizedEmail, `restore_${purchase.id}`, {
    purchaseId: purchase.id,
    tokenVersion: nextVersion,
  })

  const { data: updated } = await supabase.from('pro_purchases')
    .update({
      activation_token: token,
      token_version: nextVersion,
      restored_count: (purchase.restored_count || 0) + 1,
      last_restored_at: new Date().toISOString(),
    })
    .eq('id', purchase.id)
    .eq('token_version', observedVersion)
    .select('id')
    .maybeSingle()

  if (!updated) {
    throw createError({ statusCode: 409, statusMessage: 'Concurrent restore detected; please retry' })
  }

  return { token }
})
