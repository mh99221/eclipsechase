import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabase, createTestEvent } from './_helpers'

const { client: mockSupabase, setResult } = createMockSupabase()
const { default: handler } = await import('../../../server/api/vouchers/validate.post')

describe('POST /api/vouchers/validate', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('throws 400 when code is missing', async () => {
    const event = createTestEvent({ supabase: mockSupabase, body: {} })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('returns valid + discount for a usable voucher', async () => {
    setResult({
      code: 'ABCD2345', stripe_coupon_id: 'coup_x', discount_percent: 20,
      kind: 'referral', referrer_id: 1, max_redemptions: null, redeemed_count: 0,
      active: true, expires_at: null,
    })
    const event = createTestEvent({ supabase: mockSupabase, body: { code: 'abcd2345' } })
    const result = await handler(event)
    expect(result).toEqual({ valid: true, discount_percent: 20, kind: 'referral' })
  })

  it('returns { valid: false } for an unknown code', async () => {
    setResult(null)
    const event = createTestEvent({ supabase: mockSupabase, body: { code: 'NOPE0001' } })
    expect(await handler(event)).toEqual({ valid: false })
  })

  it('returns { valid: false } for an inactive voucher', async () => {
    setResult({
      code: 'OFF00002', stripe_coupon_id: 'c', discount_percent: 20, kind: 'manual',
      referrer_id: null, max_redemptions: null, redeemed_count: 0, active: false, expires_at: null,
    })
    const event = createTestEvent({ supabase: mockSupabase, body: { code: 'OFF00002' } })
    expect(await handler(event)).toEqual({ valid: false })
  })
})
