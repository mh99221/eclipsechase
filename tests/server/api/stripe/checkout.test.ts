import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { createMockSupabase, createTestEvent } from '../_helpers'

const { client: mockSupabase, setResult } = createMockSupabase()
const mockCreate = vi.fn()

// The Nuxt test env resolves useRuntimeConfig to the build-time defaults
// (empty strings), so the handler's `stripeProPriceId` guard would always
// trip. Override the auto-import with the values the handler needs.
mockNuxtImport('useRuntimeConfig', () => {
  return () => ({
    app: { baseURL: '/', buildAssetsDir: '/_nuxt/', cdnURL: '' },
    stripeSecretKey: 'sk_test_mock',
    stripeProPriceId: 'price_test_mock',
    stripeReferralCouponId: 'coup_referral_mock',
    public: { siteUrl: 'http://localhost:3000' },
  })
})

vi.mock('stripe', () => {
  function MockStripe() {
    return { checkout: { sessions: { create: (...a: any[]) => mockCreate(...a) } } }
  }
  return { default: MockStripe }
})

const { default: handler } = await import('../../../../server/api/stripe/checkout.post')

describe('POST /api/stripe/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreate.mockResolvedValue({ url: 'https://stripe.test/session' })
  })

  it('creates a session with no discount when no voucher_code', async () => {
    const event = createTestEvent({ supabase: mockSupabase, body: { email: 'a@b.com' } })
    const result = await handler(event)
    expect(result.url).toBe('https://stripe.test/session')
    const arg = mockCreate.mock.calls[0][0]
    expect(arg.discounts).toBeUndefined()
    expect(arg.metadata).toEqual({ product: 'eclipse_pro_2026' })
  })

  it('attaches the coupon + referrer metadata for a usable referral voucher', async () => {
    setResult({
      code: 'ABCD2345', stripe_coupon_id: 'coup_x', discount_percent: 20,
      kind: 'referral', referrer_id: 7, max_redemptions: null, redeemed_count: 0,
      active: true, expires_at: null,
    })
    const event = createTestEvent({ supabase: mockSupabase, body: { email: 'a@b.com', voucher_code: 'abcd2345' } })
    await handler(event)
    const arg = mockCreate.mock.calls[0][0]
    expect(arg.discounts).toEqual([{ coupon: 'coup_x' }])
    expect(arg.metadata).toEqual({ product: 'eclipse_pro_2026', voucher_code: 'ABCD2345', referrer_id: '7' })
  })

  it('ignores an unusable voucher and charges full price', async () => {
    setResult(null)
    const event = createTestEvent({ supabase: mockSupabase, body: { email: 'a@b.com', voucher_code: 'NOPE0000' } })
    await handler(event)
    const arg = mockCreate.mock.calls[0][0]
    expect(arg.discounts).toBeUndefined()
    expect(arg.metadata).toEqual({ product: 'eclipse_pro_2026' })
  })

  it('skips the discount when the coupon id is empty (unset env)', async () => {
    setResult({
      code: 'ABCD2345', stripe_coupon_id: '', discount_percent: 20,
      kind: 'referral', referrer_id: 7, max_redemptions: null, redeemed_count: 0,
      active: true, expires_at: null,
    })
    const event = createTestEvent({ supabase: mockSupabase, body: { email: 'a@b.com', voucher_code: 'ABCD2345' } })
    await handler(event)
    const arg = mockCreate.mock.calls[0][0]
    expect(arg.discounts).toBeUndefined()
    expect(arg.metadata).toEqual({ product: 'eclipse_pro_2026' })
  })

  it('retries at full price when Stripe rejects the coupon', async () => {
    setResult({
      code: 'ABCD2345', stripe_coupon_id: 'coup_dead', discount_percent: 20,
      kind: 'referral', referrer_id: 7, max_redemptions: null, redeemed_count: 0,
      active: true, expires_at: null,
    })
    // Stripe-shaped coupon rejection (missing/expired/maxed coupon).
    const couponErr = Object.assign(new Error('No such coupon'), {
      type: 'StripeInvalidRequestError', code: 'resource_missing', param: 'discounts[0][coupon]',
    })
    mockCreate
      .mockRejectedValueOnce(couponErr)
      .mockResolvedValueOnce({ url: 'https://stripe.test/full' })
    const event = createTestEvent({ supabase: mockSupabase, body: { email: 'a@b.com', voucher_code: 'ABCD2345' } })
    const result = await handler(event)
    expect(result.url).toBe('https://stripe.test/full')
    expect(mockCreate).toHaveBeenCalledTimes(2)
    expect(mockCreate.mock.calls[0][0].discounts).toEqual([{ coupon: 'coup_dead' }])
    expect(mockCreate.mock.calls[1][0].discounts).toBeUndefined()
    expect(mockCreate.mock.calls[1][0].metadata).toEqual({ product: 'eclipse_pro_2026' })
  })

  it('does NOT retry at full price when the failure is unrelated to the coupon', async () => {
    setResult({
      code: 'ABCD2345', stripe_coupon_id: 'coup_x', discount_percent: 20,
      kind: 'referral', referrer_id: 7, max_redemptions: null, redeemed_count: 0,
      active: true, expires_at: null,
    })
    // A transient/non-coupon error must propagate, not silently overcharge.
    const netErr = Object.assign(new Error('Stripe API connection error'), {
      type: 'StripeConnectionError',
    })
    mockCreate.mockRejectedValueOnce(netErr)
    const event = createTestEvent({ supabase: mockSupabase, body: { email: 'a@b.com', voucher_code: 'ABCD2345' } })
    await expect(handler(event)).rejects.toThrow('Stripe API connection error')
    expect(mockCreate).toHaveBeenCalledTimes(1) // no full-price retry
  })
})
