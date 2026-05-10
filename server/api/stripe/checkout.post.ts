import Stripe from 'stripe'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const stripe = new Stripe(config.stripeSecretKey)

  if (!config.stripeProPriceId) {
    throw createError({ statusCode: 500, statusMessage: 'Stripe Price ID is not configured' })
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price: config.stripeProPriceId,
        quantity: 1,
      },
    ],
    metadata: {
      product: 'eclipse_pro_2026',
    },
    success_url: `${config.public.siteUrl}/pro/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.public.siteUrl}/pro?cancelled=true`,
  })

  return { url: session.url }
})
