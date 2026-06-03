import Stripe from 'stripe'
import { serverSupabaseServiceRole } from '#supabase/server'
import { assignReferralCode, REFERRAL_REWARD_CENTS } from '../../utils/vouchers'
import { processReferralRedemption } from '../../utils/referralPayout'

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
    // `ignoreDuplicates: true` makes the retry a no-op; the follow-up
    // SELECT then lets us short-circuit on already-signed rows.
    await supabase
      .from('pro_purchases')
      .upsert(
        {
          email: normalizedEmail,
          email_hash: emailHash,
          stripe_session_id: session.id,
          payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
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

    // If THIS purchase used a referral/manual voucher, record the
    // redemption and (for referral codes) refund the referrer. Runs before
    // the activation_token retry short-circuit so a retry after a partial
    // first delivery still completes the payout. Idempotent via
    // UNIQUE(referee_session_id) — a true repeat returns 'duplicate'.
    if (session.metadata?.voucher_code) {
      const { outcome, referrerEmail } = await processReferralRedemption(stripe, supabase, {
        sessionId: session.id,
        refereePurchaseId: existing.id,
        refereeEmail: normalizedEmail,
        voucherCode: session.metadata.voucher_code,
      })
      if (outcome === 'paid' && referrerEmail) {
        await sendReferralRewardEmail(referrerEmail, null, { amountEur: REFERRAL_REWARD_CENTS / 100 })
      }
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
      // We were the first writer — send the welcome email. Look up the
      // locale from email_signups so an IS buyer (who likely signed up
      // for the newsletter from the IS landing first) gets the IS
      // template. Fall back to Stripe's session.locale, then 'en'.
      // Both lookups are best-effort: missing rows just default to EN.
      const { data: signup } = await supabase
        .from('email_signups')
        .select('locale')
        .eq('email', normalizedEmail)
        .maybeSingle()
      const locale = signup?.locale || session.locale || 'en'

      // Give this buyer their own shareable referral code + voucher row.
      // Reuse the handler-level `config` (line 5) — do NOT redeclare it.
      let referralLink: string | undefined
      try {
        const code = await assignReferralCode(supabase, existing.id, config.stripeReferralCouponId)
        referralLink = `${config.public.siteUrl}/pro?ref=${code}`
      } catch (err) {
        console.error('[referral] failed to assign code for purchase', existing.id, err)
      }

      await sendPurchaseEmail(normalizedEmail, locale, referralLink)
    }
  }

  return { received: true }
})
