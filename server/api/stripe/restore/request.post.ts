import { randomInt } from 'crypto'
import { serverSupabaseServiceRole } from '#supabase/server'

const REQUEST_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const MAX_REQUESTS_PER_WINDOW = 3
const CODE_TTL_MS = 15 * 60 * 1000

export default defineEventHandler(async (event) => {
  const { email } = await readBody<{ email: string }>(event)

  if (!email || typeof email !== 'string' || !isValidEmail(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Valid email is required' })
  }

  const normalizedEmail = normalizeEmail(email)
  const emailHash = hashEmail(normalizedEmail)
  const masked = maskEmail(normalizedEmail)

  const supabase = await serverSupabaseServiceRole(event)

  // DB-backed rate limit (replaces the per-lambda in-memory counter).
  // Counts every code created in the last hour against this email hash
  // so requests across cold starts / concurrent warm lambdas can't be
  // multiplied.
  const windowStart = new Date(Date.now() - REQUEST_WINDOW_MS).toISOString()
  const { count: recentCount } = await supabase
    .from('restore_codes')
    .select('id', { count: 'exact', head: true })
    .eq('email_hash', emailHash)
    .gte('created_at', windowStart)

  if ((recentCount ?? 0) >= MAX_REQUESTS_PER_WINDOW) {
    throw createError({ statusCode: 429, statusMessage: 'Too many requests. Try again later.' })
  }

  const { data: purchases } = await supabase
    .from('pro_purchases')
    .select('id')
    .eq('email', normalizedEmail)
    .eq('is_active', true)
    .limit(1)
  const purchase = purchases?.[0] ?? null

  if (purchase) {
    console.log('[restore] Purchase found for', masked, '— generating code')

    const code = String(randomInt(100000, 1000000))

    // Insert the new code BEFORE invalidating older ones — otherwise
    // a transient insert/email failure would leave the user with no
    // working code AND a burned rate-limit slot.
    const { data: inserted } = await supabase
      .from('restore_codes')
      .insert({
        email_hash: emailHash,
        code,
        expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
      })
      .select('id')
      .single()

    try {
      // Await — Vercel kills the function after response is sent.
      await sendRestoreCode(normalizedEmail, code)
    } catch (err) {
      // Email send failed — undo the rate-limit charge so the user
      // can retry. Older outstanding codes are still alive.
      if (inserted?.id) {
        await supabase.from('restore_codes').delete().eq('id', inserted.id)
      }
      throw err
    }

    // Email sent successfully — invalidate any OTHER outstanding codes
    // for this email so an attacker can't keep multiple codes valid in
    // parallel. Scoped to `id < new_code.id` so concurrent requesters
    // don't trample each other.
    if (inserted?.id) {
      await supabase
        .from('restore_codes')
        .update({ used: true })
        .eq('email_hash', emailHash)
        .eq('used', false)
        .neq('id', inserted.id)
    }
  } else {
    console.log('[restore] No active purchase found for', masked)
  }

  return { sent: true, masked_email: masked }
})
