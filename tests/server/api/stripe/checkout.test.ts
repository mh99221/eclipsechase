import { describe, it, expect } from 'vitest'
import { createTestEvent } from '../_helpers'

const { default: handler } = await import('../../../../server/api/stripe/checkout.post')

describe('POST /api/stripe/checkout (retired)', () => {
  it('returns 410 Gone', () => {
    expect(() => handler(createTestEvent({}))).toThrowError(
      expect.objectContaining({ statusCode: 410 }),
    )
  })

  it('explains why in the status message', () => {
    expect(() => handler(createTestEvent({}))).toThrowError(
      expect.objectContaining({ statusMessage: 'Eclipse Pro is no longer for sale' }),
    )
  })

  it('rejects a well-formed purchase attempt, voucher or not', () => {
    // The old handler accepted { email, voucher_code }. A stale client still
    // holding that bundle must be turned away, not quietly served a session.
    const event = createTestEvent({ body: { email: 'a@b.com', voucher_code: 'ABCD2345' } })
    expect(() => handler(event)).toThrowError(
      expect.objectContaining({ statusCode: 410 }),
    )
  })

  it('does not depend on Stripe config being present', () => {
    // No mockNuxtImport / no stripe mock in this file: if the handler still
    // constructed a Stripe client or read stripeProPriceId, it would throw
    // something other than a 410 under the test env's empty runtimeConfig.
    let caught: any
    try { handler(createTestEvent({})) } catch (e) { caught = e }
    expect(caught?.statusCode).toBe(410)
  })
})
