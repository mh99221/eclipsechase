import { randomInt } from 'crypto'

export const REFERRAL_REWARD_CENTS = 400
export const REFERRAL_DISCOUNT_PERCENT = 20

// Unambiguous alphabet (no 0/O/1/I) for human-shareable codes.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export interface VoucherRow {
  code: string
  stripe_coupon_id: string
  discount_percent: number
  kind: 'referral' | 'manual'
  referrer_id: number | null
  max_redemptions: number | null
  redeemed_count: number
  active: boolean
  expires_at: string | null
}

export function generateReferralCode(length = 8): string {
  let out = ''
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
  return out
}

export function isVoucherUsable(v: VoucherRow | null, now: Date = new Date()): boolean {
  if (!v || !v.active) return false
  if (v.expires_at && new Date(v.expires_at).getTime() <= now.getTime()) return false
  if (v.max_redemptions != null && v.redeemed_count >= v.max_redemptions) return false
  return true
}

const VOUCHER_COLUMNS =
  'code, stripe_coupon_id, discount_percent, kind, referrer_id, max_redemptions, redeemed_count, active, expires_at'

/** Fetch a voucher by (normalised) code and return it only if usable. */
export async function lookupUsableVoucher(supabase: any, rawCode: string): Promise<VoucherRow | null> {
  const code = rawCode.trim().toUpperCase()
  if (!code) return null
  const { data } = await supabase.from('vouchers').select(VOUCHER_COLUMNS).eq('code', code).maybeSingle()
  return isVoucherUsable(data as VoucherRow | null) ? (data as VoucherRow) : null
}

/**
 * Assign a unique referral code to a purchase (idempotent) and create the
 * matching kind='referral' voucher row. Safe under concurrent webhook
 * deliveries: the `.is('referral_code', null)` claim means only the first
 * writer sets it; losers read back the winner's code.
 */
export async function assignReferralCode(supabase: any, purchaseId: number, couponId: string): Promise<string> {
  // Fail fast on a misconfigured coupon id rather than baking `''` into the
  // vouchers table (which would silently drop every referred friend's discount
  // and force every reader to guard against the empty value).
  if (!couponId) {
    throw new Error('assignReferralCode: empty couponId (NUXT_STRIPE_REFERRAL_COUPON_ID unset)')
  }
  for (let i = 0; i < 5; i++) {
    const code = generateReferralCode()
    const { data: claimed } = await supabase
      .from('pro_purchases')
      .update({ referral_code: code })
      .eq('id', purchaseId)
      .is('referral_code', null)
      .select('referral_code')
      .maybeSingle()

    if (claimed?.referral_code) {
      const { error: voucherError } = await supabase.from('vouchers').insert({
        code,
        stripe_coupon_id: couponId,
        discount_percent: REFERRAL_DISCOUNT_PERCENT,
        kind: 'referral',
        referrer_id: purchaseId,
      })
      if (!voucherError) return code
      // The voucher row couldn't be created — release the claim so we never
      // leave a referral_code that points at no voucher (a silently dead
      // share link). 23505 = code collision: regenerate; otherwise surface.
      await supabase.from('pro_purchases')
        .update({ referral_code: null }).eq('id', purchaseId)
      if ((voucherError as any).code === '23505') continue
      throw voucherError
    }

    // Either a concurrent writer already set a code, or our generated code
    // collided. Read back: if a code now exists, we're done; else retry.
    const { data: existing } = await supabase
      .from('pro_purchases').select('referral_code').eq('id', purchaseId).maybeSingle()
    if (existing?.referral_code) return existing.referral_code
  }
  throw new Error('Failed to assign referral code after retries')
}
