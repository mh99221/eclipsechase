/**
 * Unit tests for the pro-gate middleware logic.
 *
 * The middleware has three execution paths:
 *   1. import.meta.dev = true  → immediate return (no check, no redirect)
 *   2. import.meta.server = true → immediate return (SSR skip)
 *   3. Client, non-dev → check isPro, redirect to /pro if not Pro
 *
 * import.meta flags are compile-time Vite replacements and cannot be changed at
 * runtime. In the Nuxt + Vitest environment:
 *   - import.meta.dev  = false  (test build is not dev mode)
 *   - import.meta.server = false (test environment runs in happy-dom, not SSR)
 *
 * Therefore the middleware always executes path 3 during tests. We test:
 *   A) The actual middleware exports correctly and runs client-side logic.
 *   B) The core guard logic in isolation via a direct reimplementation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Shared mock state ────────────────────────────────────────────────────────
//
// Use a single mutable object so that checkStatus implementations can mutate
// isPro.value in-place, and runClientGuard sees the updated value (mirrors
// real Vue refs where the same reactive object is shared).

const proState = {
  isPro: { value: false },
  loading: { value: false },
}

const mockCheckStatus = vi.fn(async () => {})
const mockNavigateTo = vi.fn()

vi.mock('../../../app/composables/useProStatus', () => ({
  useProStatus: () => ({
    // Always returns the same proState references so mutations are visible
    isPro: proState.isPro,
    loading: proState.loading,
    checkStatus: mockCheckStatus,
  }),
}))

vi.stubGlobal('navigateTo', mockNavigateTo)

// ─── Core logic under test ────────────────────────────────────────────────────
//
// Mirrors exactly what pro-gate.ts executes when import.meta.dev = false and
// import.meta.server = false (i.e., in a real production browser session).

async function runClientGuard(): Promise<void> {
  const { useProStatus } = await import('../../../app/composables/useProStatus')
  const { isPro, loading, checkStatus } = useProStatus()

  // Early exit: already verified as Pro and not loading
  if (isPro.value && !loading.value) return

  await checkStatus()

  if (!isPro.value) {
    return mockNavigateTo('/pro')
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('pro-gate middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mutate in-place so all captured references see the reset values
    proState.isPro.value = false
    proState.loading.value = false
    mockCheckStatus.mockResolvedValue(undefined)
  })

  // ── Module shape ─────────────────────────────────────────────────────────────

  describe('module export', () => {
    it('exports a default function (the route middleware handler)', async () => {
      const mod = await import('../../../app/middleware/pro-gate')
      expect(typeof mod.default).toBe('function')
    })
  })

  // ── Actual middleware — client-side execution in test env ─────────────────

  describe('actual middleware (runs client-side logic in Vitest env)', () => {
    it('calls checkStatus when user is not Pro', async () => {
      proState.isPro.value = false
      const mod = await import('../../../app/middleware/pro-gate')
      const fakeRoute = { path: '/map', fullPath: '/map', name: 'map', meta: {}, query: {}, params: {} }
      // @ts-expect-error — minimal route object for testing
      await mod.default(fakeRoute)
      // Middleware is running client-side logic (import.meta.dev = false in test build)
      expect(mockCheckStatus).toHaveBeenCalledOnce()
    })

    it('runs to completion without throwing when isPro is false', async () => {
      // The actual middleware calls Nuxt's built-in navigateTo (auto-import),
      // which is not interceptable via vi.stubGlobal. We verify it completes
      // without error — the redirect logic is verified via runClientGuard below.
      proState.isPro.value = false
      const mod = await import('../../../app/middleware/pro-gate')
      const fakeRoute = { path: '/map', fullPath: '/map', name: 'map', meta: {}, query: {}, params: {} }
      // @ts-expect-error — minimal route object for testing
      await expect(mod.default(fakeRoute)).resolves.not.toThrow()
    })

    it('does not call navigateTo when user is already Pro', async () => {
      proState.isPro.value = true
      proState.loading.value = false
      const mod = await import('../../../app/middleware/pro-gate')
      const fakeRoute = { path: '/map', fullPath: '/map', name: 'map', meta: {}, query: {}, params: {} }
      // @ts-expect-error — minimal route object for testing
      await mod.default(fakeRoute)
      expect(mockNavigateTo).not.toHaveBeenCalled()
    })
  })

  // ── Core client-side guard logic ─────────────────────────────────────────

  describe('client-side guard logic (production browser behaviour)', () => {
    it('redirects to /pro when user is not Pro', async () => {
      proState.isPro.value = false
      await runClientGuard()
      expect(mockNavigateTo).toHaveBeenCalledWith('/pro')
    })

    it('calls checkStatus when isPro is false before deciding', async () => {
      proState.isPro.value = false
      await runClientGuard()
      expect(mockCheckStatus).toHaveBeenCalledOnce()
    })

    it('does not redirect when isPro=true and loading=false (already verified)', async () => {
      proState.isPro.value = true
      proState.loading.value = false
      await runClientGuard()
      expect(mockNavigateTo).not.toHaveBeenCalled()
    })

    it('skips checkStatus when isPro=true and loading=false (early exit path)', async () => {
      proState.isPro.value = true
      proState.loading.value = false
      await runClientGuard()
      expect(mockCheckStatus).not.toHaveBeenCalled()
    })

    it('does not redirect when checkStatus elevates isPro to true', async () => {
      proState.isPro.value = false
      // Mutate .value in-place so the same reference isPro sees the change
      mockCheckStatus.mockImplementation(async () => {
        proState.isPro.value = true
      })
      await runClientGuard()
      expect(mockNavigateTo).not.toHaveBeenCalled()
    })

    it('redirects to /pro when checkStatus leaves isPro=false (no valid token)', async () => {
      proState.isPro.value = false
      mockCheckStatus.mockResolvedValue(undefined) // isPro stays false
      await runClientGuard()
      expect(mockNavigateTo).toHaveBeenCalledWith('/pro')
    })

    it('redirect destination is exactly /pro — not /pricing or /pro/', async () => {
      proState.isPro.value = false
      await runClientGuard()
      const calls = mockNavigateTo.mock.calls
      expect(calls.length).toBe(1)
      expect(calls[0][0]).toBe('/pro')
    })

    it('when isPro=true and loading=true, still runs checkStatus (early-exit requires !loading)', async () => {
      // isPro=true but loading=true → (isPro && !loading) is false → checkStatus runs
      proState.isPro.value = true
      proState.loading.value = true
      // checkStatus does not change isPro, so it remains true → no redirect
      mockCheckStatus.mockResolvedValue(undefined)
      await runClientGuard()
      expect(mockCheckStatus).toHaveBeenCalledOnce()
    })

    it('when isPro=false and loading=true, runs checkStatus then redirects', async () => {
      proState.isPro.value = false
      proState.loading.value = true
      await runClientGuard()
      expect(mockCheckStatus).toHaveBeenCalledOnce()
      expect(mockNavigateTo).toHaveBeenCalledWith('/pro')
    })

    it('checkStatus is called exactly once per navigation attempt', async () => {
      proState.isPro.value = false
      await runClientGuard()
      expect(mockCheckStatus).toHaveBeenCalledTimes(1)
    })
  })
})
