import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSessionCreate = vi.fn()

vi.mock('stripe', () => {
  // Use a regular function (not arrow) so it can be called with `new`
  function MockStripe() {
    return {
      checkout: { sessions: { create: (...args: any[]) => mockSessionCreate(...args) } },
    }
  }
  return { default: MockStripe }
})

const { default: handler } = await import('../../../../server/api/stripe/checkout.post')

describe('POST /api/stripe/checkout', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('creates Stripe checkout session and returns URL', async () => {
    mockSessionCreate.mockResolvedValue({ id: 'cs_test_123', url: 'https://checkout.stripe.com/pay/cs_test_123' })
    const result = await handler({} as any)

    expect(result.url).toBe('https://checkout.stripe.com/pay/cs_test_123')
    const args = mockSessionCreate.mock.calls[0][0]
    expect(args.mode).toBe('payment')
    expect(args.line_items[0].price_data.unit_amount).toBe(999)
    expect(args.line_items[0].price_data.currency).toBe('eur')
    expect(args.metadata.product).toBe('eclipse_pro_2026')
  })
})
