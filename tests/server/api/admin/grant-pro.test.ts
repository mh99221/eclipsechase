import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabase, createTestEvent } from '../_helpers'

const { client: mockSupabase } = createMockSupabase()

const { default: handler } = await import('../../../../server/api/admin/grant-pro.post')

describe('POST /api/admin/grant-pro', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('grants Pro access with valid admin secret', async () => {
    const event = createTestEvent({
      supabase: mockSupabase,
      body: { email: 'user@test.com', secret: 'test-admin-secret' },
    })
    const result = await handler(event)

    expect(result.token).toBe('mock_jwt_token')
    expect(result.email).toBeTruthy()
    expect(mockSupabase.from).toHaveBeenCalledWith('pro_purchases')
    expect(mockSupabase.upsert).toHaveBeenCalled()
  })

  it('throws 403 with wrong secret', async () => {
    const event = createTestEvent({
      supabase: mockSupabase,
      body: { email: 'user@test.com', secret: 'wrong' },
    })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('throws 403 with missing secret', async () => {
    const event = createTestEvent({
      supabase: mockSupabase,
      body: { email: 'user@test.com' },
    })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('throws 400 for invalid email', async () => {
    const event = createTestEvent({
      supabase: mockSupabase,
      body: { email: 'not-an-email', secret: 'test-admin-secret' },
    })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 400 for missing email', async () => {
    const event = createTestEvent({
      supabase: mockSupabase,
      body: { secret: 'test-admin-secret' },
    })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 400 })
  })
})
