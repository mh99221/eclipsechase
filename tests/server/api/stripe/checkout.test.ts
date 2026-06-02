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
})
