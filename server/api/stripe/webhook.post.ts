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

    const normalizedEmail = normalizeEmail(email)
    const emailHash = hashEmail(normalizedEmail)

    const supabase = await serverSupabaseServiceRole(event)

    // Stripe retries successful webhook deliveries on transient errors.
    // INSERT … ON CONFLICT DO NOTHING (`ignoreDuplicates: true`) means
    // the second delivery doesn't overwrite anything. The follow-up
    // SELECT tells us whether a token has already been minted for this
    // session — if so, return early and skip the re-sign.
    await supabase
      .from('pro_purchases')
      .upsert(
        {
          email: normalizedEmail,
          email_hash: emailHash,
          stripe_session_id: session.id,
          activation_token: null,
          purchased_at: new Date().toISOString(),
          is_active: true,
        },
        { onConflict: 'stripe_session_id', ignoreDuplicates: true },
      )

    const { data: existing, error: selectError } = await supabase
      .from('pro_purchases')
      .select('id, token_version, activation_token')
      .eq('stripe_session_id', session.id)
      .maybeSingle()

    if (selectError || !existing) {
      console.error('Failed to read pro purchase after upsert:', selectError)
      throw createError({ statusCode: 500, statusMessage: 'Failed to save purchase' })
    }

    if (existing.activation_token) {
      // Retry path — token already minted on a prior delivery.
      return { received: true }
    }

    const token = await generateProToken(normalizedEmail, session.id, {
      purchaseId: existing.id,
      tokenVersion: existing.token_version ?? 1,
    })

    // Conditional update — only the first writer for this row wins.
    // A concurrent retry that won the race already set
    // activation_token; ours becomes a no-op.
    const { data: updated } = await supabase
      .from('pro_purchases')
      .update({ activation_token: token })
      .eq('id', existing.id)
      .is('activation_token', null)
      .select('id')
      .maybeSingle()

    if (updated) {
      // We were the first writer — send the welcome email.
      await sendPurchaseEmail(normalizedEmail)
    }
  }

  return { received: true }
})
