import Stripe from 'stripe'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const stripe = new Stripe(config.stripeSecretKey)

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'eur',
          unit_amount: 999,
          product_data: {
            name: 'EclipseChase Pro',
            description: 'Live weather map, personalized recommendations, offline maps & road conditions for the 2026 Iceland eclipse.',
          },
        },
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
