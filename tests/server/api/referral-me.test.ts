import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { createMockSupabase, createTestEvent } from './_helpers'

// requirePro is globally mocked in _setup as a pass-through returning null;
// override per-test to return claims with a pid.
const requirePro = (globalThis as any).requirePro as ReturnType<typeof vi.fn>

// Handler builds the link from config.public.siteUrl.
mockNuxtImport('useRuntimeConfig', () => {
  return () => ({
    app: { baseURL: '/', buildAssetsDir: '/_nuxt/', cdnURL: '' },
    stripeReferralCouponId: 'coup_referral_mock',
    public: { siteUrl: 'http://localhost:3000' },
  })
})

const { default: handler } = await import('../../../server/api/referral/me.post')

describe('POST /api/referral/me', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns code, link and tally for a Pro member with an existing code', async () => {
    requirePro.mockResolvedValueOnce({ sub: 'hash', pid: 7 })
    const { client, queueResults } = createMockSupabase()
    queueResults(
      { data: { id: 7, referral_code: 'ABCD2345', email: 'm@x.com' } }, // purchase by pid
      { data: [                                                          // redemptions
        { reward_status: 'paid', reward_cents: 400 },
        { reward_status: 'failed', reward_cents: 0 },
        { reward_status: 'none', reward_cents: 0 },                       // self-referral — excluded
      ] },
    )
    const event = createTestEvent({ supabase: client, body: {} })
    const result = await handler(event)
    expect(result.code).toBe('ABCD2345')
    expect(result.link).toContain('/pro?ref=ABCD2345')
    expect(result.joined_count).toBe(2) // paid + failed, not the 'none' self-referral
    expect(result.earned_eur).toBe(4)
    expect(result.pending_count).toBe(1)
  })

  it('falls back to email_hash when the pid lookup misses', async () => {
    requirePro.mockResolvedValueOnce({ sub: 'hashX', pid: 999 })
    const { client, queueResults } = createMockSupabase()
    queueResults(
      { data: null },                                                   // pid lookup misses
      { data: { id: 3, referral_code: 'FALLBK01', email: 'f@x.com' } },  // email_hash fallback hit
      { data: [] },                                                     // redemptions
    )
    const event = createTestEvent({ supabase: client, body: {} })
    const result = await handler(event)
    expect(result.code).toBe('FALLBK01')
    expect(result.joined_count).toBe(0)
  })

  it('throws 401 when there are no Pro claims (sub missing)', async () => {
    requirePro.mockResolvedValueOnce(null)
    const { client } = createMockSupabase()
    const event = createTestEvent({ supabase: client, body: {} })
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 401 })
  })
})
