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
  // Status the row already had when we re-drive an existing (non-paid) row.
  // Lets the 'none' branches below reset a stale 'failed'/'none' row instead
  // of leaving it stranded; null means this was a fresh insert.
  let priorStatus: string | null = null
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
    priorStatus = existing.reward_status
  } else {
    redemptionId = inserted?.id
  }

  // Resolve to a 'none' outcome, resetting a re-driven row's stale status so a
  // prior 'failed' doesn't linger as a phantom pending payout forever.
  const resolveNone = async (): Promise<ReferralResult> => {
    if (priorStatus && priorStatus !== 'none') {
      await markRedemption(supabase, redemptionId, 'none', 0, null)
    }
    return { outcome: 'none', referrerEmail: null }
  }

  // 2. Resolve the voucher. Only referral vouchers with a referrer pay out.
  const { data: voucher } = await supabase
    .from('vouchers').select('code, kind, referrer_id').eq('code', input.voucherCode).maybeSingle()
  if (!voucher || voucher.kind !== 'referral' || voucher.referrer_id == null) {
    return resolveNone()
  }

  // 3. Load the referrer; guard self-referral and missing PaymentIntent.
  // Requires is_active so a refunded referrer no longer earns payouts (matches
  // the is_active gate on /api/referral/me). Selecting `email` here lets the
  // caller send the reward mail without a second round-trip for the same row.
  const { data: referrer } = await supabase
    .from('pro_purchases').select('payment_intent_id, email_hash, email')
    .eq('id', voucher.referrer_id).eq('is_active', true).maybeSingle()
  if (!referrer) return resolveNone()
  if (referrer.email_hash === hashEmail(input.refereeEmail)) {
    return resolveNone() // self-referral
  }

  if (!referrer.payment_intent_id) {
    await markRedemption(supabase, redemptionId, 'failed', 0, null)
    return { outcome: 'failed', referrerEmail: null }
  }

  // 4. Issue the partial refund (idempotent on the friend's session id).
  try {
    // On a re-drive, a prior delivery may have already issued the refund but
    // failed to persist 'paid'. Stripe's idempotency key expires after ~24h,
    // so a late re-delivery would refund again. Guard with a durable check:
    // look for an existing referral refund tagged with this session id.
    if (priorStatus) {
      const prior = await findReferralRefund(stripe, referrer.payment_intent_id, input.sessionId)
      if (prior) {
        await markRedemption(supabase, redemptionId, 'paid', REFERRAL_REWARD_CENTS, prior.id)
        return { outcome: 'paid', referrerEmail: referrer.email ?? null }
      }
    }
    const refund = await stripe.refunds.create(
      {
        payment_intent: referrer.payment_intent_id,
        amount: REFERRAL_REWARD_CENTS,
        metadata: { referral_session: input.sessionId },
      },
      { idempotencyKey: `referral-refund-${input.sessionId}` },
    )
    const ok = await markRedemption(supabase, redemptionId, 'paid', REFERRAL_REWARD_CENTS, refund.id)
    if (!ok) {
      // Refund issued but status not persisted — a later re-drive could double
      // refund once the 24h idempotency window closes (the metadata guard above
      // is the backstop). Surface loudly for reconciliation.
      console.error('[referral] CRITICAL: refund', refund.id, 'issued but reward_status not persisted for redemption', redemptionId)
    }
    return { outcome: 'paid', referrerEmail: referrer.email ?? null }
  } catch (err: any) {
    console.error('[referral] refund failed for', input.voucherCode, ':', err?.message || err)
    await markRedemption(supabase, redemptionId, 'failed', 0, null)
    return { outcome: 'failed', referrerEmail: null }
  }
}

/** Find a prior referral refund on this PaymentIntent tagged with the friend's
 *  session id. Used on re-drive to avoid a second refund after Stripe's 24h
 *  idempotency key has expired. Best-effort: returns null on any list error. */
async function findReferralRefund(
  stripe: Stripe, paymentIntentId: string, sessionId: string,
): Promise<{ id: string } | null> {
  try {
    const refunds = await stripe.refunds.list({ payment_intent: paymentIntentId, limit: 100 })
    return refunds.data.find((r: any) => r.metadata?.referral_session === sessionId) ?? null
  } catch {
    return null
  }
}

async function markRedemption(
  supabase: any, id: number | undefined, status: 'paid' | 'failed' | 'none', cents: number, refundId: string | null,
): Promise<boolean> {
  if (id == null) return false
  const { error } = await supabase.from('voucher_redemptions')
    .update({ reward_status: status, reward_cents: cents, stripe_refund_id: refundId })
    .eq('id', id)
  return !error
}
