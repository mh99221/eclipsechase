import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabase, createTestEvent } from '../../_helpers'

const { client: mockSupabase, setResult } = createMockSupabase()

const { default: handler } = await import('../../../../../server/api/stripe/restore/request.post')

describe('POST /api/stripe/restore/request', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('always returns { sent: true } for valid email', async () => {
    setResult([{ id: 1 }])
    const event = createTestEvent({ supabase: mockSupabase, body: { email: 'buyer@test.com' } })
    const result = await handler(event)

    expect(result.sent).toBe(true)
    expect(result.masked_email).toBeTruthy()
  })

  it('stores restore code and sends email when purchase exists', async () => {
    setResult([{ id: 1 }])
    const event = createTestEvent({ supabase: mockSupabase, body: { email: 'buyer@test.com' } })
    await handler(event)

    expect(mockSupabase.from).toHaveBeenCalledWith('restore_codes')
    expect(mockSupabase.insert).toHaveBeenCalled()
  })

  it('does NOT send code when no purchase exists', async () => {
    setResult([]) // no purchases (and no recent codes for rate-limit count)
    const event = createTestEvent({ supabase: mockSupabase, body: { email: 'nobody@test.com' } })
    await handler(event)

    // pro_purchases is queried; restore_codes is queried for the
    // DB-backed rate limit but should NOT have insert called on it.
    const fromCalls = mockSupabase.from.mock.calls.map((c: any[]) => c[0])
    expect(fromCalls).toContain('pro_purchases')
    expect(mockSupabase.insert).not.toHaveBeenCalled()
  })

  it('throws 400 for missing email', async () => {
    const event = createTestEvent({ supabase: mockSupabase, body: {} })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 400 for invalid email (no @)', async () => {
    const event = createTestEvent({ supabase: mockSupabase, body: { email: 'notanemail' } })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 400 })
  })
})
