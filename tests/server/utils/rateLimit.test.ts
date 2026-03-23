import { describe, it, expect } from 'vitest'
import { checkRateLimit } from '../../../server/utils/rateLimit'

// Use unique keys per test group to avoid cross-test interference with the
// shared in-memory store.

describe('checkRateLimit', () => {
  it('allows the first request', () => {
    const key = `test-first-${Date.now()}`
    expect(checkRateLimit(key, 5, 60_000)).toBe(true)
  })

  it('allows requests up to the limit', () => {
    const key = `test-within-limit-${Date.now()}`
    const max = 3
    for (let i = 0; i < max; i++) {
      expect(checkRateLimit(key, max, 60_000)).toBe(true)
    }
  })

  it('blocks the request that exceeds the limit', () => {
    const key = `test-exceed-${Date.now()}`
    const max = 3
    // Use up all allowed requests
    for (let i = 0; i < max; i++) {
      checkRateLimit(key, max, 60_000)
    }
    // The next one must be rejected
    expect(checkRateLimit(key, max, 60_000)).toBe(false)
  })

  it('continues to block after exceeding the limit', () => {
    const key = `test-continue-block-${Date.now()}`
    const max = 2
    checkRateLimit(key, max, 60_000)
    checkRateLimit(key, max, 60_000)
    expect(checkRateLimit(key, max, 60_000)).toBe(false)
    expect(checkRateLimit(key, max, 60_000)).toBe(false)
  })

  it('different keys are tracked independently', () => {
    const ts = Date.now()
    const keyA = `test-independent-a-${ts}`
    const keyB = `test-independent-b-${ts}`
    const max = 2

    // Exhaust keyA
    checkRateLimit(keyA, max, 60_000)
    checkRateLimit(keyA, max, 60_000)
    expect(checkRateLimit(keyA, max, 60_000)).toBe(false)

    // keyB still has fresh budget
    expect(checkRateLimit(keyB, max, 60_000)).toBe(true)
  })

  it('allows a single request with max=1', () => {
    const key = `test-max1-${Date.now()}`
    expect(checkRateLimit(key, 1, 60_000)).toBe(true)
    expect(checkRateLimit(key, 1, 60_000)).toBe(false)
  })

  it('resets after the window expires', async () => {
    const key = `test-window-reset-${Date.now()}`
    const max = 1
    const windowMs = 50 // very short window

    // Use up the budget
    expect(checkRateLimit(key, max, windowMs)).toBe(true)
    expect(checkRateLimit(key, max, windowMs)).toBe(false)

    // Wait for the window to expire
    await new Promise(resolve => setTimeout(resolve, 100))

    // Window reset — should allow again
    expect(checkRateLimit(key, max, windowMs)).toBe(true)
  })
})
