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
    if (voucher) {
      discounts = [{ coupon: voucher.stripe_coupon_id }]
      metadata.voucher_code = voucher.code
      if (voucher.referrer_id != null) metadata.referrer_id = String(voucher.referrer_id)
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price: config.stripeProPriceId,
        quantity: 1,
      },
    ],
    customer_email: customerEmail,
    ...(discounts ? { discounts } : {}),
    metadata,
    success_url: `${config.public.siteUrl}/pro/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.public.siteUrl}/pro?cancelled=true`,
  })

  return { url: session.url }
})
