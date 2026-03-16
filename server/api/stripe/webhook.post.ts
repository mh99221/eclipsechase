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

    if (session.metadata?.product === 'eclipse_pro' && session.customer_email) {
      const supabase = await serverSupabaseServiceRole(event)

      const { error } = await supabase.from('pro_users').upsert(
        {
          email: session.customer_email,
          stripe_session_id: session.id,
          purchased_at: new Date().toISOString(),
          is_active: true,
        },
        { onConflict: 'email' },
      )

      if (error) {
        console.error('Failed to upsert pro user:', error)
        throw createError({ statusCode: 500, statusMessage: 'Failed to save pro user' })
      }
    }
  }

  return { received: true }
})
