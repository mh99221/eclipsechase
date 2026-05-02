import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestEvent } from './_helpers'

const mockSendWelcomeEmail = vi.fn()
vi.mock('../../../server/utils/email', () => ({
  sendWelcomeEmail: (...args: any[]) => mockSendWelcomeEmail(...args),
  hashEmail: vi.fn().mockReturnValue('hashed'),
  maskEmail: vi.fn().mockReturnValue('masked'),
  sendRestoreCode: vi.fn(),
  normalizeEmail: (s: string) => s.toLowerCase().trim(),
  isValidEmail: (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s),
}))

// signup.post.ts makes two calls to supabase:
// 1. .from('email_signups').select('email').eq('email', ...).maybeSingle()
// 2. .from('email_signups').upsert(...)
const mockMaybeSingleResult = { data: null as any, error: null }
const mockUpsertResult = { data: null, error: null as any }

const mockSupabase = {
  from: vi.fn().mockImplementation(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockImplementation(() => Promise.resolve(mockMaybeSingleResult)),
    upsert: vi.fn().mockImplementation(() => Promise.resolve(mockUpsertResult)),
  })),
}

const { default: handler } = await import('../../../server/api/signup.post')

describe('POST /api/signup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMaybeSingleResult.data = null
    mockMaybeSingleResult.error = null
    mockUpsertResult.error = null
  })

  it('accepts a valid email', async () => {
    const event = createTestEvent({ supabase: mockSupabase, body: { email: 'new@test.com' } })
    const result = await handler(event)
    expect(result.success).toBe(true)
  })

  it('sends welcome email for new signups', async () => {
    mockMaybeSingleResult.data = null
    const event = createTestEvent({ supabase: mockSupabase, body: { email: 'new@test.com' } })
    await handler(event)

    // sendWelcomeEmail is a global mock set in _setup.ts
    expect(mockSendWelcomeEmail).toHaveBeenCalledWith('new@test.com')
  })

  it('does NOT send welcome email for existing signups', async () => {
    mockMaybeSingleResult.data = { email: 'existing@test.com' }
    const event = createTestEvent({ supabase: mockSupabase, body: { email: 'existing@test.com' } })
    await handler(event)

    expect(mockSendWelcomeEmail).not.toHaveBeenCalled()
  })

  it('throws 400 for missing email', async () => {
    const event = createTestEvent({ supabase: mockSupabase, body: {} })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 400 for invalid email format', async () => {
    const event = createTestEvent({ supabase: mockSupabase, body: { email: 'notanemail' } })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 500 when Supabase upsert fails', async () => {
    mockUpsertResult.error = { message: 'DB error' }
    const event = createTestEvent({ supabase: mockSupabase, body: { email: 'user@test.com' } })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 500 })
  })
})
