import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabase, createTestEvent } from '../_helpers'

const { client: mockSupabase } = createMockSupabase()
const mockConstructEvent = vi.fn()

vi.mock('stripe', () => {
  function MockStripe() {
    return {
      webhooks: { constructEvent: (...args: any[]) => mockConstructEvent(...args) },
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
})
