import { describe, it, expect } from 'vitest'
import { createTestEvent } from './_helpers'

// Retired 2026-08-13 — the handler no longer touches Supabase or Resend, so
// there is nothing left to mock. It throws synchronously (no `await` before
// the throw), which is why these assertions use `expect(() => …).toThrowError`
// rather than the `rejects` form the live handler needed.
const { default: handler } = await import('../../../server/api/signup.post')

describe('POST /api/signup (retired)', () => {
  it('throws a permanent 410 for a valid-looking signup', () => {
    const event = createTestEvent({ body: { email: 'new@test.com' } })
    expect(() => handler(event)).toThrowError(
      expect.objectContaining({ statusCode: 410 }),
    )
  })

  it('throws 410 regardless of body shape', () => {
    const event = createTestEvent({ body: {} })
    expect(() => handler(event)).toThrowError(
      expect.objectContaining({ statusCode: 410 }),
    )
  })
})
