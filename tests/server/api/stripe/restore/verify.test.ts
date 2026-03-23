import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestEvent } from '../../_helpers'

// verify.post.ts calls multiple tables with different results, so
// we need a more granular mock supabase.

const mockRestoreCodeResult = { data: null as any, error: null }
const mockPurchaseResult = { data: null as any[] | null, error: null }
const mockUpdateResult = { data: null, error: null }

const mockSupabase = {
  from: vi.fn().mockImplementation((table: string) => {
    if (table === 'restore_codes') {
      return {
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(Promise.resolve(mockUpdateResult)),
          then: (resolve: any) => Promise.resolve(mockUpdateResult).then(resolve),
        }),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockImplementation(() => Promise.resolve(mockRestoreCodeResult)),
      }
    }
    if (table === 'pro_purchases') {
      return {
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(Promise.resolve(mockUpdateResult)),
          then: (resolve: any) => Promise.resolve(mockUpdateResult).then(resolve),
        }),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          then: (resolve: any) => Promise.resolve(mockPurchaseResult).then(resolve),
        }),
      }
    }
    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() }
  }),
}

const { default: handler } = await import('../../../../../server/api/stripe/restore/verify.post')

describe('POST /api/stripe/restore/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRestoreCodeResult.data = null
    mockPurchaseResult.data = null
  })

  it('returns token for valid code', async () => {
    mockRestoreCodeResult.data = { id: 1, expires_at: new Date(Date.now() + 600_000).toISOString(), used: false }
    mockPurchaseResult.data = [{ id: 42, restored_count: 0 }]

    const event = createTestEvent({ supabase: mockSupabase, body: { email: 'buyer@test.com', code: '123456' } })
    const result = await handler(event)

    expect(result.token).toBe('mock_jwt_token')
  })

  it('throws 400 for invalid code (not found)', async () => {
    mockRestoreCodeResult.data = null
    const event = createTestEvent({ supabase: mockSupabase, body: { email: 'buyer@test.com', code: '000000' } })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 400 for already-used code', async () => {
    mockRestoreCodeResult.data = { id: 1, expires_at: new Date(Date.now() + 600_000).toISOString(), used: true }
    const event = createTestEvent({ supabase: mockSupabase, body: { email: 'buyer@test.com', code: '123456' } })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 400 for expired code', async () => {
    mockRestoreCodeResult.data = { id: 1, expires_at: new Date(Date.now() - 60_000).toISOString(), used: false }
    const event = createTestEvent({ supabase: mockSupabase, body: { email: 'buyer@test.com', code: '123456' } })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 400 when email or code missing', async () => {
    const event1 = createTestEvent({ supabase: mockSupabase, body: { email: 'buyer@test.com' } })
    await expect(handler(event1)).rejects.toMatchObject({ statusCode: 400 })

    const event2 = createTestEvent({ supabase: mockSupabase, body: { code: '123456' } })
    await expect(handler(event2)).rejects.toMatchObject({ statusCode: 400 })
  })
})
