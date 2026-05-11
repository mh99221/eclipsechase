import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabase, createTestEvent } from '../_helpers'

const { client: mockSupabase, queueResults } = createMockSupabase()

const { default: handler } = await import('../../../../server/api/stripe/activate.post')

describe('POST /api/stripe/activate', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns token on first activation', async () => {
    // Conditional UPDATE claims the row and returns its activation_token.
    queueResults({ data: { activation_token: 'jwt_abc', email: 'buyer@test.com' } })
    const event = createTestEvent({ supabase: mockSupabase, body: { session_id: 'cs_test_123' } })
    const result = await handler(event)

    expect(result.token).toBe('jwt_abc')
    expect(result.email).toBeTruthy()
    expect(mockSupabase.update).toHaveBeenCalledWith(
      expect.objectContaining({ activation_count: 1, activated: true }),
    )
  })

  it('throws 410 on second activation (row exists, budget exhausted)', async () => {
    // Conditional UPDATE affects 0 rows → null. Disambiguation SELECT
    // finds the row → existing purchase → 410.
    queueResults(
      { data: null },          // claim update — already used
      { data: { id: 1 } },     // existence check — row exists
    )
    const event = createTestEvent({ supabase: mockSupabase, body: { session_id: 'cs_test_123' } })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 410 })
  })

  it('throws 400 when session_id missing', async () => {
    const event = createTestEvent({ supabase: mockSupabase, body: {} })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 404 when purchase not found (webhook still in flight)', async () => {
    queueResults(
      { data: null },          // claim update — no matching row
      { data: null },          // existence check — none either
    )
    const event = createTestEvent({ supabase: mockSupabase, body: { session_id: 'nonexistent' } })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('throws 404 when row exists but token not yet signed', async () => {
    queueResults({ data: { activation_token: null, email: 'buyer@test.com' } })
    const event = createTestEvent({ supabase: mockSupabase, body: { session_id: 'cs_test_123' } })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 404 })
  })
})
