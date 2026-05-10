import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabase, createTestEvent } from '../_helpers'

const { client: mockSupabase, setResult } = createMockSupabase()

const { default: handler } = await import('../../../../server/api/stripe/activate.post')

describe('POST /api/stripe/activate', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns token for valid session_id', async () => {
    setResult({ activation_token: 'jwt_abc', email: 'buyer@test.com', activated: false })
    const event = createTestEvent({ supabase: mockSupabase, body: { session_id: 'cs_test_123' } })
    const result = await handler(event)

    expect(result.token).toBe('jwt_abc')
    expect(result.email).toBeTruthy()
    expect(mockSupabase.eq).toHaveBeenCalledWith('stripe_session_id', 'cs_test_123')
  })

  it('marks purchase as activated on first retrieval', async () => {
    setResult({ activation_token: 'jwt_abc', email: 'buyer@test.com', activated: false, activated_at: null })
    const event = createTestEvent({ supabase: mockSupabase, body: { session_id: 'cs_test_123' } })
    await handler(event)

    // One-time activation: now stamps activated_at alongside the flag.
    expect(mockSupabase.update).toHaveBeenCalledWith(
      expect.objectContaining({ activated: true, activated_at: expect.any(String) }),
    )
  })

  it('skips activation on subsequent retrieval (within grace window)', async () => {
    setResult({
      activation_token: 'jwt_abc',
      email: 'buyer@test.com',
      activated: true,
      activated_at: new Date().toISOString(),
    })
    const event = createTestEvent({ supabase: mockSupabase, body: { session_id: 'cs_test_123' } })
    await handler(event)

    expect(mockSupabase.update).not.toHaveBeenCalled()
  })

  it('throws 410 when activation grace window has elapsed', async () => {
    setResult({
      activation_token: 'jwt_abc',
      email: 'buyer@test.com',
      activated: true,
      activated_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    })
    const event = createTestEvent({ supabase: mockSupabase, body: { session_id: 'cs_test_123' } })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 410 })
  })

  it('throws 400 when session_id missing', async () => {
    const event = createTestEvent({ supabase: mockSupabase, body: {} })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 404 when purchase not found', async () => {
    setResult(null)
    const event = createTestEvent({ supabase: mockSupabase, body: { session_id: 'nonexistent' } })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 404 })
  })
})
