import Stripe from 'stripe'
import { serverSupabaseServiceRole } from '#supabase/server'
import { lookupUsableVoucher } from '../../utils/vouchers'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const stripe = new Stripe(config.stripeSecretKey)

  if (!config.stripeProPriceId) {
    throw createError({ statusCode: 500, statusMessage: 'Stripe Price ID is not configured' })
  }

  const body = await readBody<{ email?: string; voucher_code?: string }>(event)
    .catch(() => ({} as { email?: string; voucher_code?: string }))
  const customerEmail = body?.email && isValidEmail(body.email) ? normalizeEmail(body.email) : undefined

  const metadata: Record<string, string> = { product: 'eclipse_pro_2026' }
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
    if (!discounts) throw err
    // The coupon is missing / expired / maxed on Stripe's side. Don't block
    // the sale — retry at full price, dropping the voucher attribution so no
    // referrer payout fires for a discount that never applied.
    console.error('[checkout] discount rejected, retrying at full price:', err)
    session = await stripe.checkout.sessions.create({
      ...baseParams,
      metadata: { product: 'eclipse_pro_2026' },
    })
  }

  return { url: session.url }
})
