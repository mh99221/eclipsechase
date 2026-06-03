import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabase } from '../api/_helpers'
import { hashEmail } from '../../../server/utils/email'
import { processReferralRedemption } from '../../../server/utils/referralPayout'

function makeStripe(refundImpl: any) {
  return { refunds: { create: vi.fn().mockImplementation(refundImpl) } } as any
}

describe('processReferralRedemption', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('records the redemption and refunds €4 to the referrer on the happy path', async () => {
    const { client, queueResults } = createMockSupabase()
    queueResults(
      { data: { id: 99 } },                                              // redemption insert (no conflict)
      { data: { code: 'ABCD2345', kind: 'referral', referrer_id: 7 } },  // voucher lookup
      { data: { payment_intent_id: 'pi_123', email_hash: hashEmail('referrer@x.com'), email: 'referrer@x.com' } }, // referrer row
      { data: { id: 99 } },                                              // redemption update -> paid
    )
    const stripe = makeStripe(async () => ({ id: 're_1' }))

    const result = await processReferralRedemption(stripe, client, {
      sessionId: 'cs_friend', refereePurchaseId: 12, refereeEmail: 'friend@x.com', voucherCode: 'ABCD2345',
    })

    expect(result.outcome).toBe('paid')
    expect(result.referrerEmail).toBe('referrer@x.com')
    expect(stripe.refunds.create).toHaveBeenCalledWith(
      { payment_intent: 'pi_123', amount: 400 },
      { idempotencyKey: 'referral-refund-cs_friend' },
    )
    expect(client.from).toHaveBeenCalledWith('voucher_redemptions')
  })

  it('is a no-op when the redemption already exists (unique violation)', async () => {
    const { client, queueResults } = createMockSupabase()
    queueResults({ data: null, error: { code: '23505' } }) // insert hits unique constraint
    const stripe = makeStripe(async () => ({ id: 're_x' }))

    const result = await processReferralRedemption(stripe, client, {
      sessionId: 'cs_dupe', refereePurchaseId: 12, refereeEmail: 'friend@x.com', voucherCode: 'ABCD2345',
    })

    expect(result.outcome).toBe('duplicate')
    expect(stripe.refunds.create).not.toHaveBeenCalled()
  })

  it('does not refund a manual (non-referral) voucher', async () => {
    const { client, queueResults } = createMockSupabase()
    queueResults(
      { data: { id: 1 } },                                          // insert ok
      { data: { code: 'ICELAND26', kind: 'manual', referrer_id: null } },
    )
    const stripe = makeStripe(async () => ({ id: 're_x' }))

    const result = await processReferralRedemption(stripe, client, {
      sessionId: 'cs_manual', refereePurchaseId: 12, refereeEmail: 'friend@x.com', voucherCode: 'ICELAND26',
    })

    expect(result.outcome).toBe('none')
    expect(stripe.refunds.create).not.toHaveBeenCalled()
  })

  it('does NOT pay a self-referral (referee email == referrer email)', async () => {
    const { client, queueResults } = createMockSupabase()
    queueResults(
      { data: { id: 1 } },
      { data: { code: 'ABCD2345', kind: 'referral', referrer_id: 7 } },
      { data: { payment_intent_id: 'pi_123', email_hash: hashEmail('cheater@x.com') } },
    )
    const stripe = makeStripe(async () => ({ id: 're_x' }))

    const result = await processReferralRedemption(stripe, client, {
      sessionId: 'cs_self', refereePurchaseId: 12, refereeEmail: 'cheater@x.com', voucherCode: 'ABCD2345',
    })

    expect(result.outcome).toBe('none')
    expect(stripe.refunds.create).not.toHaveBeenCalled()
  })

  it('marks failed (no throw) when the refund errors', async () => {
    const { client, queueResults } = createMockSupabase()
    queueResults(
      { data: { id: 1 } },
      { data: { code: 'ABCD2345', kind: 'referral', referrer_id: 7 } },
      { data: { payment_intent_id: 'pi_old', email_hash: hashEmail('referrer@x.com') } },
    )
    const stripe = makeStripe(async () => { throw new Error('charge too old to refund') })

    const result = await processReferralRedemption(stripe, client, {
      sessionId: 'cs_fail', refereePurchaseId: 12, refereeEmail: 'friend@x.com', voucherCode: 'ABCD2345',
    })

    expect(result.outcome).toBe('failed')
  })

  it('marks failed when the referrer has no payment_intent_id', async () => {
    const { client, queueResults } = createMockSupabase()
    queueResults(
      { data: { id: 1 } },
      { data: { code: 'ABCD2345', kind: 'referral', referrer_id: 7 } },
      { data: { payment_intent_id: null, email_hash: hashEmail('referrer@x.com') } },
    )
    const stripe = makeStripe(async () => ({ id: 're_x' }))

    const result = await processReferralRedemption(stripe, client, {
      sessionId: 'cs_nopi', refereePurchaseId: 12, refereeEmail: 'friend@x.com', voucherCode: 'ABCD2345',
    })

    expect(result.outcome).toBe('failed')
    expect(stripe.refunds.create).not.toHaveBeenCalled()
  })
})
