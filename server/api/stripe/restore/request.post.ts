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

  if (!await checkDbRateLimit(supabase, 'restore_codes', emailHash, {
    windowMs: REQUEST_WINDOW_MS,
    max: MAX_REQUESTS_PER_WINDOW,
  })) {
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

    if (!inserted?.id) {
      throw createError({ statusCode: 500, statusMessage: 'Failed to save restore code' })
    }

    try {
      // Vercel kills the function after response, so await before returning.
      await sendRestoreCode(normalizedEmail, code)
    } catch (err) {
      // Email send failed — delete the row so the rate-limit slot isn't
      // burned and prior outstanding codes (if any) remain valid.
      await supabase.from('restore_codes').delete().eq('id', inserted.id)
      throw err
    }

    // Email landed. Invalidate codes inserted BEFORE this one so a
    // brute-force campaign can't keep multiple codes valid in parallel.
    // Scoped to `id < new_code.id` so a concurrent requester who slipped
    // in a newer code doesn't get their fresh code burned.
    await supabase
      .from('restore_codes')
      .update({ used: true })
      .eq('email_hash', emailHash)
      .eq('used', false)
      .lt('id', inserted.id)
  } else {
    console.log('[restore] No active purchase found for', masked)
  }

  return { sent: true, masked_email: masked }
})
