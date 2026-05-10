import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestEvent } from '../../_helpers'

// verify.post.ts touches restore_codes and pro_purchases in distinct ways:
//   1. restore_codes — sum of attempts in the last hour (rate-limit count)
//   2. restore_codes — most recent un-used row for this email_hash
//   3. restore_codes — UPDATE (mark used / bump attempts)
//   4. pro_purchases — lookup by email + is_active
//   5. pro_purchases — UPDATE with new token + bumped token_version
// We need per-table mocks so each chain can return shape-appropriate data.

const recentAttemptsRows = { data: [] as any[], error: null }
const restoreCodeRow = { data: null as any, error: null }
const purchaseRows = { data: null as any[] | null, error: null }
const updateResult = { data: null, error: null }

const mockSupabase = {
  from: vi.fn().mockImplementation((table: string) => {
    if (table === 'restore_codes') {
      const update = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(Promise.resolve(updateResult)),
          then: (resolve: any) => Promise.resolve(updateResult).then(resolve),
        }),
        then: (resolve: any) => Promise.resolve(updateResult).then(resolve),
      })

      // Two select chains hang off restore_codes:
      //   .select('attempts').eq(...).gte(...)  → array (recent attempts)
      //   .select('id, code, ...').eq(...).eq('used', false).order(...).limit(1).maybeSingle() → row
      // We discriminate by which terminal the caller awaits.
      const recentChain: any = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockImplementation(() => Promise.resolve(recentAttemptsRows)),
        then: (resolve: any) => Promise.resolve(recentAttemptsRows).then(resolve),
      }
      const lookupChain: any = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockImplementation(() => Promise.resolve(restoreCodeRow)),
      }
      return {
        select: vi.fn().mockImplementation((cols: string) => {
          if (cols === 'attempts') return recentChain
          return lookupChain
        }),
        update,
      }
    }
    if (table === 'pro_purchases') {
      const lookupChain: any = {
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation(() => Promise.resolve(purchaseRows)),
        then: (resolve: any) => Promise.resolve(purchaseRows).then(resolve),
      }
      const updateChain = {
        eq: vi.fn().mockReturnValue(Promise.resolve(updateResult)),
        then: (resolve: any) => Promise.resolve(updateResult).then(resolve),
      }
      return {
        select: vi.fn().mockReturnValue(lookupChain),
        update: vi.fn().mockReturnValue(updateChain),
      }
    }
    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() }
  }),
}

const { default: handler } = await import('../../../../../server/api/stripe/restore/verify.post')

describe('POST /api/stripe/restore/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    recentAttemptsRows.data = []
    restoreCodeRow.data = null
    purchaseRows.data = null
  })

  it('returns token for valid code', async () => {
    restoreCodeRow.data = {
      id: 1,
      code: '123456',
      expires_at: new Date(Date.now() + 600_000).toISOString(),
      used: false,
      attempts: 0,
    }
    purchaseRows.data = [{ id: 42, restored_count: 0, token_version: 1 }]

    const event = createTestEvent({ supabase: mockSupabase, body: { email: 'buyer@test.com', code: '123456' } })
    const result = await handler(event)

    expect(result.token).toBe('mock_jwt_token')
  })

  it('throws 400 for invalid code (none outstanding)', async () => {
    restoreCodeRow.data = null
    const event = createTestEvent({ supabase: mockSupabase, body: { email: 'buyer@test.com', code: '000000' } })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 400 for code mismatch and increments attempts', async () => {
    restoreCodeRow.data = {
      id: 1,
      code: '999999',
      expires_at: new Date(Date.now() + 600_000).toISOString(),
      used: false,
      attempts: 0,
    }
    const event = createTestEvent({ supabase: mockSupabase, body: { email: 'buyer@test.com', code: '123456' } })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 400 for expired code', async () => {
    restoreCodeRow.data = {
      id: 1,
      code: '123456',
      expires_at: new Date(Date.now() - 60_000).toISOString(),
      used: false,
      attempts: 0,
    }
    const event = createTestEvent({ supabase: mockSupabase, body: { email: 'buyer@test.com', code: '123456' } })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 400 when email or code missing', async () => {
    const event1 = createTestEvent({ supabase: mockSupabase, body: { email: 'buyer@test.com' } })
    await expect(handler(event1)).rejects.toMatchObject({ statusCode: 400 })

    const event2 = createTestEvent({ supabase: mockSupabase, body: { code: '123456' } })
    await expect(handler(event2)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 400 for non-numeric code format', async () => {
    const event = createTestEvent({ supabase: mockSupabase, body: { email: 'buyer@test.com', code: 'abcdef' } })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 429 when too many failed attempts in window', async () => {
    recentAttemptsRows.data = [{ attempts: 5 }]
    const event = createTestEvent({ supabase: mockSupabase, body: { email: 'buyer@test.com', code: '123456' } })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 429 })
  })
})
