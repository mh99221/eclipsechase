import { describe, it, expect } from 'vitest'
import {
  generateReferralCode,
  isVoucherUsable,
  lookupUsableVoucher,
  assignReferralCode,
  REFERRAL_REWARD_CENTS,
  REFERRAL_DISCOUNT_PERCENT,
  type VoucherRow,
} from '../../../server/utils/vouchers'
import { createMockSupabase } from '../../server/api/_helpers'

function voucher(overrides: Partial<VoucherRow> = {}): VoucherRow {
  return {
    code: 'ABCD2345',
    stripe_coupon_id: 'coup_x',
    discount_percent: 20,
    kind: 'referral',
    referrer_id: 1,
    max_redemptions: null,
    redeemed_count: 0,
    active: true,
    expires_at: null,
    ...overrides,
  }
}

describe('referral constants', () => {
  it('reward is €4.00 and discount is 20%', () => {
    expect(REFERRAL_REWARD_CENTS).toBe(400)
    expect(REFERRAL_DISCOUNT_PERCENT).toBe(20)
  })
})

describe('generateReferralCode', () => {
  it('returns 8 chars from the unambiguous alphabet', () => {
    const code = generateReferralCode()
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/)
  })
  it('produces distinct codes across calls', () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateReferralCode()))
    expect(codes.size).toBeGreaterThan(45)
  })
})

describe('isVoucherUsable', () => {
  const now = new Date('2026-06-01T00:00:00Z')
  it('true for an active, unexpired, unredeemed voucher', () => {
    expect(isVoucherUsable(voucher(), now)).toBe(true)
  })
  it('false for null', () => {
    expect(isVoucherUsable(null, now)).toBe(false)
  })
  it('false when inactive', () => {
    expect(isVoucherUsable(voucher({ active: false }), now)).toBe(false)
  })
  it('false when expired', () => {
    expect(isVoucherUsable(voucher({ expires_at: '2026-05-01T00:00:00Z' }), now)).toBe(false)
  })
  it('false when max redemptions reached', () => {
    expect(isVoucherUsable(voucher({ max_redemptions: 2, redeemed_count: 2 }), now)).toBe(false)
  })
  it('true when under max redemptions', () => {
    expect(isVoucherUsable(voucher({ max_redemptions: 2, redeemed_count: 1 }), now)).toBe(true)
  })
})

describe('lookupUsableVoucher', () => {
  it('upper-cases + trims the code and returns the row when usable', async () => {
    const { client, setResult } = createMockSupabase()
    setResult(voucher({ code: 'ABCD2345' }))
    const v = await lookupUsableVoucher(client, '  abcd2345 ')
    expect(client.from).toHaveBeenCalledWith('vouchers')
    expect(client.eq).toHaveBeenCalledWith('code', 'ABCD2345')
    expect(v?.code).toBe('ABCD2345')
  })
  it('returns null when the voucher is not usable', async () => {
    const { client, setResult } = createMockSupabase()
    setResult(voucher({ active: false }))
    expect(await lookupUsableVoucher(client, 'ABCD2345')).toBeNull()
  })
  it('returns null when no row found', async () => {
    const { client, setResult } = createMockSupabase()
    setResult(null)
    expect(await lookupUsableVoucher(client, 'NOPE0000')).toBeNull()
  })
})

describe('assignReferralCode', () => {
  it('claims a code on the purchase row and inserts the matching voucher', async () => {
    const { client, queueResults } = createMockSupabase()
    queueResults({ data: { referral_code: 'WXYZ6789' } }) // update().is(null) claim wins
    const code = await assignReferralCode(client, 42, 'coup_ref')
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/)
    expect(client.from).toHaveBeenCalledWith('pro_purchases')
    expect(client.from).toHaveBeenCalledWith('vouchers')
    expect(client.insert).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'referral', referrer_id: 42, stripe_coupon_id: 'coup_ref', discount_percent: 20,
    }))
  })
  it('returns the existing code when another writer already set one', async () => {
    const { client, queueResults } = createMockSupabase()
    queueResults(
      { data: null },                              // our claim updates 0 rows
      { data: { referral_code: 'EXISTING1' } },    // read-back finds concurrent code
    )
    const code = await assignReferralCode(client, 42, 'coup_ref')
    expect(code).toBe('EXISTING1')
    expect(client.insert).not.toHaveBeenCalled()
  })

  it('releases the claim and retries when the voucher insert collides', async () => {
    const { client, queueResults } = createMockSupabase()
    queueResults(
      { data: { referral_code: 'CODE0001' } },     // claim won (attempt 1)
      { data: null, error: { code: '23505' } },    // voucher insert collides
      { data: null },                              // release the claim
      { data: { referral_code: 'CODE0002' } },     // claim won (attempt 2)
      { data: null },                              // voucher insert ok
    )
    const code = await assignReferralCode(client, 42, 'coup_ref')
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/)
    expect(client.update).toHaveBeenCalledWith({ referral_code: null }) // released
  })

  it('releases the claim and rethrows on a transient voucher insert error', async () => {
    const { client, queueResults } = createMockSupabase()
    queueResults(
      { data: { referral_code: 'CODE0001' } },     // claim won
      { data: null, error: { code: 'XX000' } },    // transient voucher insert error
      { data: null },                              // release the claim
    )
    await expect(assignReferralCode(client, 42, 'coup_ref')).rejects.toThrow()
    expect(client.update).toHaveBeenCalledWith({ referral_code: null })
  })
})
