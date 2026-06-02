import { serverSupabaseServiceRole } from '#supabase/server'
import { assignReferralCode } from '../../utils/vouchers'

// Pro-gated. Returns the member's own referral code + a shareable link and
// a tally of conversions. Identity comes from the verified JWT (requirePro).
export default defineEventHandler(async (event) => {
  const claims = await requirePro(event)
  if (!claims?.sub) {
    throw createError({ statusCode: 401, statusMessage: 'Pro access required' })
  }

  const config = useRuntimeConfig()
  // Cast to any: the `referral_code` column and `voucher_redemptions` table
  // (migration 018) aren't in the generated database.types.ts until types
  // are regenerated post-migration. Matches the `any`-typed voucher helpers.
  const supabase = await serverSupabaseServiceRole(event) as any

  // Resolve the purchase: prefer the pid claim, fall back to email_hash.
  const sel = 'id, referral_code, email'
  let purchase: { id: number; referral_code: string | null } | null = null
  if (typeof claims.pid === 'number') {
    const { data } = await supabase.from('pro_purchases').select(sel).eq('id', claims.pid).maybeSingle()
    purchase = data
  } else {
    const { data } = await supabase.from('pro_purchases').select(sel)
      .eq('email_hash', claims.sub).eq('is_active', true).maybeSingle()
    purchase = data
  }
  if (!purchase) throw createError({ statusCode: 404, statusMessage: 'Purchase not found' })

  // Lazy backfill for purchases that predate the referral feature.
  let code = purchase.referral_code
  if (!code) code = await assignReferralCode(supabase, purchase.id, config.stripeReferralCouponId)

  const { data: redemptions } = await supabase
    .from('voucher_redemptions').select('reward_status, reward_cents').eq('voucher_code', code)
  const rows = Array.isArray(redemptions) ? redemptions : []
  const joinedCount = rows.length
  const earnedCents = rows.filter(r => r.reward_status === 'paid').reduce((s, r) => s + (r.reward_cents || 0), 0)
  const pendingCount = rows.filter(r => r.reward_status === 'failed').length

  return {
    code,
    link: `${config.public.siteUrl}/pro?ref=${code}`,
    joined_count: joinedCount,
    earned_eur: earnedCents / 100,
    pending_count: pendingCount,
  }
})
