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
  // A pid that resolves to a real row settles identity here. If that row is
  // inactive (revoked/refunded) we 404 rather than fall through to the
  // email_hash lookup — otherwise a stale token could surface a DIFFERENT,
  // re-purchased active row for the same person. Only a pid that matches NO
  // row (or a legacy token with no pid at all) falls back to email_hash.
  let pidRowInactive = false
  if (typeof claims.pid === 'number') {
    const { data } = await supabase.from('pro_purchases').select('id, referral_code, email, is_active')
      .eq('id', claims.pid).maybeSingle()
    if (data?.is_active) {
      purchase = { id: data.id, referral_code: data.referral_code }
    } else if (data) {
      pidRowInactive = true
    }
  }
  if (!purchase && !pidRowInactive && claims.sub) {
    const { data } = await supabase.from('pro_purchases').select(sel)
      .eq('email_hash', claims.sub).eq('is_active', true).maybeSingle()
    purchase = data
  }
  if (!purchase) throw createError({ statusCode: 404, statusMessage: 'Purchase not found' })

  // Lazy backfill for purchases that predate the referral feature. This can
  // throw (e.g. an unset/invalid referral coupon id) — degrade to a controlled
  // 503 rather than an unhandled 500 so the referral card just hides itself.
  let code = purchase.referral_code
  if (!code) {
    try {
      code = await assignReferralCode(supabase, purchase.id, config.stripeReferralCouponId)
    } catch (err) {
      console.error('[referral] failed to backfill code for purchase', purchase.id, err)
      throw createError({ statusCode: 503, statusMessage: 'Referral temporarily unavailable' })
    }
  }

  const { data: redemptions } = await supabase
    .from('voucher_redemptions').select('reward_status, reward_cents').eq('voucher_code', code)
  const rows = Array.isArray(redemptions) ? redemptions : []
  // 'none' rows are self-referrals / non-paying redemptions — not real
  // friend conversions, so they don't count toward the "friends joined" tally.
  const joinedCount = rows.filter(r => r.reward_status !== 'none').length
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
