import Stripe from 'stripe'
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const stripe = new Stripe(config.stripeSecretKey)

  const body = await readRawBody(event)
  if (!body) {
    throw createError({ statusCode: 400, statusMessage: 'Missing request body' })
  }

  const signature = getHeader(event, 'stripe-signature')
  if (!signature) {
    throw createError({ statusCode: 400, statusMessage: 'Missing stripe-signature header' })
  }

  let stripeEvent: Stripe.Event
  try {
    stripeEvent = stripe.webhooks.constructEvent(body, signature, config.stripeWebhookSecret)
  }
  catch (err: any) {
    throw createError({ statusCode: 400, statusMessage: `Webhook signature verification failed: ${err.message}` })
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object as Stripe.Checkout.Session
    const email = session.customer_details?.email || session.customer_email

    if (session.payment_status !== 'paid' || session.metadata?.product !== 'eclipse_pro_2026') {
      return { received: true }
    }

    if (!email) {
      console.error('Webhook: no customer email in session', session.id)
      return { received: true }
    }

    const normalizedEmail = email.toLowerCase().trim()
    const emailHash = hashEmail(normalizedEmail)
    const token = await generateProToken(normalizedEmail, session.id)

    const supabase = await serverSupabaseServiceRole(event)

    const { error } = await supabase.from('pro_purchases').upsert(
      {
        email: normalizedEmail,
        email_hash: emailHash,
        stripe_session_id: session.id,
        activation_token: token,
        purchased_at: new Date().toISOString(),
        is_active: true,
      },
      { onConflict: 'stripe_session_id' },
    )

    if (error) {
      console.error('Failed to insert pro purchase:', error)
      throw createError({ statusCode: 500, statusMessage: 'Failed to save purchase' })
    }
  }

  return { received: true }
})
