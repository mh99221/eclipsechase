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
    setResult([]) // no purchases
    const event = createTestEvent({ supabase: mockSupabase, body: { email: 'nobody@test.com' } })
    await handler(event)

    // restore_codes.insert should NOT be called (only pro_purchases queried)
    // The from('pro_purchases') is called but not from('restore_codes')
    const fromCalls = mockSupabase.from.mock.calls.map((c: any[]) => c[0])
    expect(fromCalls).toContain('pro_purchases')
    expect(fromCalls).not.toContain('restore_codes')
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
