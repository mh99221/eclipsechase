import { serverSupabaseServiceRole } from '#supabase/server'
import { lookupUsableVoucher } from '../../utils/vouchers'

// Public, low-stakes endpoint (the discount alone triggers no payout —
// payouts are guarded in the webhook). In-memory rate-limit per code is
// enough to blunt brute-force enumeration of codes.
export default defineEventHandler(async (event) => {
  const { code } = await readBody<{ code?: string }>(event).catch(() => ({ code: undefined }))

  if (!code || typeof code !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'code is required' })
  }

  const normalized = code.trim().toUpperCase()
  if (!checkRateLimit(`voucher-validate:${normalized}`, 20, 60 * 1000)) {
    throw createError({ statusCode: 429, statusMessage: 'Too many attempts. Try again later.' })
  }

  const supabase = await serverSupabaseServiceRole(event)
  const voucher = await lookupUsableVoucher(supabase, normalized)
  if (!voucher) return { valid: false }

  return { valid: true, discount_percent: voucher.discount_percent, kind: voucher.kind }
})
