import Stripe from 'stripe'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const { email } = await readBody<{ email: string }>(event)

  if (!email || !email.includes('@')) {
    throw createError({ statusCode: 400, statusMessage: 'Valid email is required' })
  }

  const stripe = new Stripe(config.stripeSecretKey)

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: email,
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
      product: 'eclipse_pro',
    },
    success_url: `${config.public.siteUrl}/map?pro=activated&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.public.siteUrl}/pro?cancelled=true`,
  })

  return { url: session.url }
})
