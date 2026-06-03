import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { createMockSupabase, createTestEvent } from '../_helpers'

const { client: mockSupabase, setResult, queueResults } = createMockSupabase()
const mockConstructEvent = vi.fn()
const mockRefundCreate = vi.fn().mockResolvedValue({ id: 're_1' })

// Handler reads config.stripeReferralCouponId + config.public.siteUrl; the
// Nuxt test env resolves these to empty/undefined, so provide them.
mockNuxtImport('useRuntimeConfig', () => {
  return () => ({
    app: { baseURL: '/', buildAssetsDir: '/_nuxt/', cdnURL: '' },
    stripeSecretKey: 'sk_test_mock',
    stripeWebhookSecret: 'whsec_test_mock',
    stripeReferralCouponId: 'coup_referral_mock',
    public: { siteUrl: 'http://localhost:3000' },
  })
})

vi.mock('stripe', () => {
  function MockStripe() {
    return {
      webhooks: { constructEvent: (...args: any[]) => mockConstructEvent(...args) },
      refunds: { create: (...args: any[]) => mockRefundCreate(...args) },
    }
  }
  return { default: MockStripe }
})

const { default: handler } = await import('../../../../server/api/stripe/webhook.post')

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('throws 400 when body is missing', async () => {
    const event = createTestEvent({ supabase: mockSupabase, rawBody: '', headers: { 'stripe-signature': 'sig' } })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 400 when stripe-signature missing', async () => {
    const event = createTestEvent({ supabase: mockSupabase, rawBody: 'body' })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 400 when signature verification fails', async () => {
    mockConstructEvent.mockImplementation(() => { throw new Error('Invalid') })
    const event = createTestEvent({ supabase: mockSupabase, rawBody: 'body', headers: { 'stripe-signature': 'bad' } })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('returns { received: true } for valid checkout.session.completed', async () => {
    // Idempotent flow: upsert (no-op return), select existing row (no
    // activation_token yet), conditional update wins the race.
    queueResults(
      { data: null },                                                     // upsert (ignoreDuplicates)
      { data: { id: 42, token_version: 1, activation_token: null } },     // post-upsert select
      { data: { id: 42 } },                                               // conditional update wins
      { data: { locale: 'en' } },                                         // email_signups locale lookup
      { data: { referral_code: 'CODE0001' } },                            // assignReferralCode claim
      { data: null },                                                     // vouchers insert
    )
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123', payment_status: 'paid',
          customer_details: { email: 'buyer@test.com' },
          metadata: { product: 'eclipse_pro_2026' },
        },
      },
    })
    const event = createTestEvent({ supabase: mockSupabase, rawBody: 'body', headers: { 'stripe-signature': 'valid' } })
    const result = await handler(event)

    expect(result.received).toBe(true)
    expect(mockSupabase.from).toHaveBeenCalledWith('pro_purchases')
  })

  it('returns { received: true } for non-paid status without DB write', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123', payment_status: 'unpaid',
          customer_email: 'buyer@test.com',
          metadata: { product: 'eclipse_pro_2026' },
        },
      },
    })
    const event = createTestEvent({ supabase: mockSupabase, rawBody: 'body', headers: { 'stripe-signature': 'valid' } })
    const result = await handler(event)

    expect(result.received).toBe(true)
    expect(mockSupabase.upsert).not.toHaveBeenCalled()
  })

  it('returns { received: true } for unrelated event types', async () => {
    mockConstructEvent.mockReturnValue({ type: 'payment_intent.succeeded', data: { object: {} } })
    const event = createTestEvent({ supabase: mockSupabase, rawBody: 'body', headers: { 'stripe-signature': 'valid' } })
    const result = await handler(event)

    expect(result.received).toBe(true)
    expect(mockSupabase.from).not.toHaveBeenCalled()
  })

  it('stores payment_intent_id and assigns a referral code on first write', async () => {
    queueResults(
      { data: null },                                                 // 1 upsert
      { data: { id: 42, token_version: 1, activation_token: null } }, // 2 post-upsert select
      // (no payout: no voucher_code)
      { data: { id: 42 } },                                           // 5 conditional token update wins
      { data: { locale: 'en' } },                                     // 6 email_signups locale lookup
      { data: { referral_code: 'NEWCODE1' } },                        // 6 assignReferralCode claim
      { data: null },                                                 // 6 vouchers insert
    )
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: {
        id: 'cs_buyer', payment_status: 'paid', payment_intent: 'pi_buyer',
        customer_details: { email: 'buyer@test.com' },
        metadata: { product: 'eclipse_pro_2026' },
      } },
    })
    const event = createTestEvent({ supabase: mockSupabase, rawBody: 'b', headers: { 'stripe-signature': 'valid' } })
    const result = await handler(event)
    expect(result.received).toBe(true)
    expect(mockSupabase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ payment_intent_id: 'pi_buyer' }),
      expect.anything(),
    )
  })

  it('processes a referral payout when the friend used a referral voucher', async () => {
    queueResults(
      { data: null },                                                 // 1 upsert
      { data: { id: 50, token_version: 1, activation_token: null } }, // 2 select existing
      { data: { id: 1 } },                                            // 3 redemption insert
      { data: { code: 'ABCD2345', kind: 'referral', referrer_id: 7 } }, // 3 voucher lookup
      { data: { payment_intent_id: 'pi_ref', email_hash: 'differenthash', email: 'ref@x.com' } }, // 3 referrer select (now incl. email)
      { data: { id: 1 } },                                            // 3 redemption update -> paid
      { data: { id: 50 } },                                           // 5 conditional token update wins
      { data: { locale: 'en' } },                                     // 6 email_signups locale lookup
      { data: { referral_code: 'FRIENDCD' } },                        // 6 assignReferralCode claim
      { data: null },                                                 // 6 vouchers insert
    )
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: {
        id: 'cs_friend', payment_status: 'paid', payment_intent: 'pi_friend',
        customer_details: { email: 'friend@test.com' },
        metadata: { product: 'eclipse_pro_2026', voucher_code: 'ABCD2345', referrer_id: '7' },
      } },
    })
    const event = createTestEvent({ supabase: mockSupabase, rawBody: 'b', headers: { 'stripe-signature': 'valid' } })
    const result = await handler(event)
    expect(result.received).toBe(true)
    expect(mockRefundCreate).toHaveBeenCalledWith(
      { payment_intent: 'pi_ref', amount: 400 },
      { idempotencyKey: 'referral-refund-cs_friend' },
    )
  })
})
