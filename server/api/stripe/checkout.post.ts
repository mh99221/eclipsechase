import Stripe from 'stripe'
import { serverSupabaseServiceRole } from '#supabase/server'
import { lookupUsableVoucher } from '../../utils/vouchers'

/**
 * True only when Stripe rejected the request BECAUSE of the coupon/discount
 * (missing, expired, or maxed) — i.e. a StripeInvalidRequestError pointing at
 * the discounts/coupon param, or a resource_missing on the coupon. Any other
 * failure (network, rate-limit, bad price id, outage) must NOT be retried at
 * full price: that would silently overcharge a referred friend and mask the
 * real error behind a successful-looking session.
 */
// Product tag written to session metadata; the webhook gates fulfilment on it
// (server/api/stripe/webhook.post.ts). Single source of truth on this side.
const PRO_PRODUCT = 'eclipse_pro_2026'

function isCouponRejection(err: any): boolean {
  if (!err) return false
  const type = err.type ?? err.raw?.type
  if (type !== 'StripeInvalidRequestError') return false
  const param = String(err.param ?? err.raw?.param ?? '')
  const code = err.code ?? err.raw?.code
  return param.includes('coupon') || param.includes('discount') || code === 'resource_missing'
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const stripe = new Stripe(config.stripeSecretKey)

  if (!config.stripeProPriceId) {
    throw createError({ statusCode: 500, statusMessage: 'Stripe Price ID is not configured' })
  }

  const body = await readBody<{ email?: string; voucher_code?: string }>(event)
    .catch(() => ({} as { email?: string; voucher_code?: string }))
  const customerEmail = body?.email && isValidEmail(body.email) ? normalizeEmail(body.email) : undefined

  const metadata: Record<string, string> = { product: PRO_PRODUCT }
  let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined

  // Re-validate the voucher server-side — never trust the client's claim
  // that a code is valid (it sets the discount AND the payout target).
  if (body?.voucher_code) {
    const supabase = await serverSupabaseServiceRole(event)
    const voucher = await lookupUsableVoucher(supabase, body.voucher_code)
    // Require a non-empty coupon id: an unset NUXT_STRIPE_REFERRAL_COUPON_ID
    // would otherwise produce `coupon: ''`, which Stripe rejects — 500-ing
    // the whole checkout for every referred friend.
    if (voucher && voucher.stripe_coupon_id) {
      discounts = [{ coupon: voucher.stripe_coupon_id }]
      metadata.voucher_code = voucher.code
      if (voucher.referrer_id != null) metadata.referrer_id = String(voucher.referrer_id)
    }
  }

  const baseParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    line_items: [{ price: config.stripeProPriceId, quantity: 1 }],
    customer_email: customerEmail,
    metadata,
    success_url: `${config.public.siteUrl}/pro/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.public.siteUrl}/pro?cancelled=true`,
  }

  let session
  try {
    session = await stripe.checkout.sessions.create(
      discounts ? { ...baseParams, discounts } : baseParams,
    )
  } catch (err) {
    // Only fall back to full price when the COUPON itself was rejected
    // (missing / expired / maxed). For any other error — including transient
    // network failures that may have already created a session — rethrow so
    // we never silently overcharge the friend or double-create a session.
    if (!discounts || !isCouponRejection(err)) throw err
    console.error('[checkout] coupon rejected, retrying at full price:', err)
    // Drop the voucher attribution (voucher_code / referrer_id) so no referrer
    // payout fires for a discount that never applied; keep only the product tag.
    session = await stripe.checkout.sessions.create({
      ...baseParams,
      metadata: { product: PRO_PRODUCT },
    })
  }

  return { url: session.url }
})
