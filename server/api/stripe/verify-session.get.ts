import Stripe from 'stripe'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const { session_id } = getQuery(event)

  if (!session_id || typeof session_id !== 'string') {
    return { valid: false }
  }

  try {
    const stripe = new Stripe(config.stripeSecretKey)
    const session = await stripe.checkout.sessions.retrieve(session_id)

    // Verify it's a completed eclipse_pro payment
    const valid = session.payment_status === 'paid'
      && session.metadata?.product === 'eclipse_pro'

    return { valid }
  }
  catch {
    return { valid: false }
  }
})
