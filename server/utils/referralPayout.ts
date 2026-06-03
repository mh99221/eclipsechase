import type Stripe from 'stripe'
import { REFERRAL_REWARD_CENTS } from './vouchers'
import { hashEmail } from './email'

export type ReferralOutcome = 'paid' | 'none' | 'failed' | 'duplicate'

export interface RedemptionInput {
  sessionId: string        // the FRIEND's checkout session id (idempotency key)
  refereePurchaseId: number
  refereeEmail: string
  voucherCode: string
  refereeLocale?: string | null
}

/**
 * Record a voucher redemption and, for referral vouchers, refund €4 to the
 * referrer's original card. Idempotent: the UNIQUE(referee_session_id)
 * constraint makes a webhook retry a no-op ('duplicate'). Never throws —
 * refund errors are recorded as 'failed' for manual follow-up.
 */
export interface ReferralResult {
  outcome: ReferralOutcome
  /** Referrer's email when a payout succeeded ('paid'), else null. Lets the
   *  caller send the reward email without re-querying the referrer row. */
  referrerEmail: string | null
}

export async function processReferralRedemption(
  stripe: Stripe,
  supabase: any,
  input: RedemptionInput,
): Promise<ReferralResult> {
  // 1. Record the redemption. UNIQUE(referee_session_id) makes a retry a
  //    no-op for an already-PAID row, but a row left 'none'/'failed' by a
  //    prior delivery (e.g. a transient refund error) is re-driven below so
  //    the payout isn't permanently stranded. The refund's idempotency key
  //    (keyed on the session id) prevents any double-charge on re-drive.
  const { data: inserted, error: insertError } = await supabase
    .from('voucher_redemptions')
    .insert({
      voucher_code: input.voucherCode,
      referee_session_id: input.sessionId,
      referee_purchase_id: input.refereePurchaseId,
      reward_status: 'none',
      reward_cents: 0,
    })
    .select('id')
    .maybeSingle()

  let redemptionId: number | undefined
  if (insertError) {
    if ((insertError as any).code !== '23505') {
      console.error('[referral] redemption insert failed:', insertError)
      return { outcome: 'failed', referrerEmail: null }
    }
    // Already recorded on a prior delivery — re-drive only if not yet paid.
    const { data: existing } = await supabase
      .from('voucher_redemptions')
      .select('id, reward_status')
      .eq('referee_session_id', input.sessionId)
      .maybeSingle()
    if (!existing || existing.reward_status === 'paid') {
      return { outcome: 'duplicate', referrerEmail: null }
    }
    redemptionId = existing.id
  } else {
    redemptionId = inserted?.id
  }

  // 2. Resolve the voucher. Only referral vouchers with a referrer pay out.
  const { data: voucher } = await supabase
    .from('vouchers').select('code, kind, referrer_id').eq('code', input.voucherCode).maybeSingle()
  if (!voucher || voucher.kind !== 'referral' || voucher.referrer_id == null) {
    return { outcome: 'none', referrerEmail: null }
  }

  // 3. Load the referrer; guard self-referral and missing PaymentIntent.
  // Selecting `email` here lets the caller send the reward mail without a
  // second round-trip for the same row.
  const { data: referrer } = await supabase
    .from('pro_purchases').select('payment_intent_id, email_hash, email').eq('id', voucher.referrer_id).maybeSingle()
  if (!referrer) return { outcome: 'none', referrerEmail: null }
  if (referrer.email_hash === hashEmail(input.refereeEmail)) {
    return { outcome: 'none', referrerEmail: null } // self-referral
  }

  if (!referrer.payment_intent_id) {
    await markRedemption(supabase, redemptionId, 'failed', 0, null)
    return { outcome: 'failed', referrerEmail: null }
  }

  // 4. Issue the partial refund (idempotent on the friend's session id).
  try {
    const refund = await stripe.refunds.create(
      { payment_intent: referrer.payment_intent_id, amount: REFERRAL_REWARD_CENTS },
      { idempotencyKey: `referral-refund-${input.sessionId}` },
    )
    await markRedemption(supabase, redemptionId, 'paid', REFERRAL_REWARD_CENTS, refund.id)
    return { outcome: 'paid', referrerEmail: referrer.email ?? null }
  } catch (err: any) {
    console.error('[referral] refund failed for', input.voucherCode, ':', err?.message || err)
    await markRedemption(supabase, redemptionId, 'failed', 0, null)
    return { outcome: 'failed', referrerEmail: null }
  }
}

async function markRedemption(
  supabase: any, id: number | undefined, status: 'paid' | 'failed', cents: number, refundId: string | null,
): Promise<void> {
  if (id == null) return
  await supabase.from('voucher_redemptions')
    .update({ reward_status: status, reward_cents: cents, stripe_refund_id: refundId })
    .eq('id', id)
}
