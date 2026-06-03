import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabase } from '../api/_helpers'
import { hashEmail } from '../../../server/utils/email'
import { processReferralRedemption } from '../../../server/utils/referralPayout'

function makeStripe(refundImpl: any, listImpl: any = async () => ({ data: [] })) {
  return {
    refunds: {
      create: vi.fn().mockImplementation(refundImpl),
      list: vi.fn().mockImplementation(listImpl),
    },
  } as any
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
      { payment_intent: 'pi_123', amount: 400, metadata: { referral_session: 'cs_friend' } },
      { idempotencyKey: 'referral-refund-cs_friend' },
    )
    expect(client.from).toHaveBeenCalledWith('voucher_redemptions')
  })

  it('is a no-op when the redemption already exists and was already paid', async () => {
    const { client, queueResults } = createMockSupabase()
    queueResults(
      { data: null, error: { code: '23505' } },     // insert hits unique constraint
      { data: { id: 99, reward_status: 'paid' } },   // existing row already paid
    )
    const stripe = makeStripe(async () => ({ id: 're_x' }))

    const result = await processReferralRedemption(stripe, client, {
      sessionId: 'cs_dupe', refereePurchaseId: 12, refereeEmail: 'friend@x.com', voucherCode: 'ABCD2345',
    })

    expect(result.outcome).toBe('duplicate')
    expect(stripe.refunds.create).not.toHaveBeenCalled()
  })

  it('re-drives the refund when a prior delivery left the redemption unpaid', async () => {
    const { client, queueResults } = createMockSupabase()
    queueResults(
      { data: null, error: { code: '23505' } },                          // insert conflict
      { data: { id: 5, reward_status: 'failed' } },                       // existing row, not yet paid
      { data: { code: 'ABCD2345', kind: 'referral', referrer_id: 7 } },   // voucher lookup
      { data: { payment_intent_id: 'pi_123', email_hash: hashEmail('referrer@x.com'), email: 'referrer@x.com' } }, // referrer
      { data: { id: 5 } },                                               // redemption update -> paid
    )
    const stripe = makeStripe(async () => ({ id: 're_redrive' }))

    const result = await processReferralRedemption(stripe, client, {
      sessionId: 'cs_redrive', refereePurchaseId: 12, refereeEmail: 'friend@x.com', voucherCode: 'ABCD2345',
    })

    expect(result.outcome).toBe('paid')
    expect(result.referrerEmail).toBe('referrer@x.com')
    expect(stripe.refunds.create).toHaveBeenCalledWith(
      { payment_intent: 'pi_123', amount: 400, metadata: { referral_session: 'cs_redrive' } },
      { idempotencyKey: 'referral-refund-cs_redrive' },
    )
  })

  it('skips a second refund on re-drive when one already exists at Stripe (idempotency-key expired)', async () => {
    const { client, queueResults } = createMockSupabase()
    queueResults(
      { data: null, error: { code: '23505' } },                          // insert conflict
      { data: { id: 5, reward_status: 'failed' } },                       // existing row, not yet paid
      { data: { code: 'ABCD2345', kind: 'referral', referrer_id: 7 } },   // voucher lookup
      { data: { payment_intent_id: 'pi_123', email_hash: hashEmail('referrer@x.com'), email: 'referrer@x.com' } }, // referrer
      { data: { id: 5 } },                                               // redemption update -> paid
    )
    // Prior referral refund already exists on the PI, tagged with this session.
    const stripe = makeStripe(
      async () => ({ id: 're_should_not_be_called' }),
      async () => ({ data: [{ id: 're_prior', metadata: { referral_session: 'cs_redrive2' } }] }),
    )

    const result = await processReferralRedemption(stripe, client, {
      sessionId: 'cs_redrive2', refereePurchaseId: 12, refereeEmail: 'friend@x.com', voucherCode: 'ABCD2345',
    })

    expect(result.outcome).toBe('paid')
    expect(stripe.refunds.create).not.toHaveBeenCalled() // no double refund
  })

  it('resets a stale failed row to none when a re-drive resolves to no payout', async () => {
    const { client, queueResults } = createMockSupabase()
    queueResults(
      { data: null, error: { code: '23505' } },                          // insert conflict
      { data: { id: 5, reward_status: 'failed' } },                       // existing row, not yet paid
      { data: { code: 'ABCD2345', kind: 'referral', referrer_id: 7 } },   // voucher lookup
      { data: null },                                                    // referrer now missing/inactive
      { data: { id: 5 } },                                               // markRedemption('none') update
    )
    const stripe = makeStripe(async () => ({ id: 're_x' }))

    const result = await processReferralRedemption(stripe, client, {
      sessionId: 'cs_stale', refereePurchaseId: 12, refereeEmail: 'friend@x.com', voucherCode: 'ABCD2345',
    })

    expect(result.outcome).toBe('none')
    expect(stripe.refunds.create).not.toHaveBeenCalled()
    // The previously-'failed' row is reset to 'none' so it stops showing as pending.
    expect(client.update).toHaveBeenCalledWith(
      expect.objectContaining({ reward_status: 'none' }),
    )
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
