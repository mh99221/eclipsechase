import { describe, it, expect } from 'vitest'
import { maskEmail, hashEmail } from '../../../server/utils/email'

describe('maskEmail', () => {
  it('masks middle characters of a normal email', () => {
    const result = maskEmail('john.doe@example.com')
    expect(result).toBe('j***e@example.com')
  })

  it('preserves the first and last character of the local part', () => {
    const result = maskEmail('alice@test.org')
    expect(result).toBe('a***e@test.org')
    expect(result[0]).toBe('a')
    expect(result).toContain('@test.org')
  })

  it('handles a two-character local part', () => {
    const result = maskEmail('ab@example.com')
    expect(result).toBe('a***b@example.com')
  })

  it('handles a single-character local part', () => {
    // local.length <= 1: local + '***@' + domain
    const result = maskEmail('x@example.com')
    expect(result).toBe('x***@example.com')
  })

  it('preserves domain intact', () => {
    const result = maskEmail('user@sub.domain.co.uk')
    expect(result).toContain('@sub.domain.co.uk')
  })

  it('works with longer local parts', () => {
    const result = maskEmail('verylongemail@example.com')
    expect(result).toBe('v***l@example.com')
  })
})

describe('hashEmail', () => {
  it('returns a 64-character hex string (SHA-256)', () => {
    const hash = hashEmail('user@example.com')
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is deterministic — same input produces same output', () => {
    const h1 = hashEmail('test@example.com')
    const h2 = hashEmail('test@example.com')
    expect(h1).toBe(h2)
  })

  it('is case-insensitive — uppercased email produces same hash', () => {
    const lower = hashEmail('user@example.com')
    const upper = hashEmail('USER@EXAMPLE.COM')
    expect(lower).toBe(upper)
  })

  it('is case-insensitive for mixed case', () => {
    const a = hashEmail('User@Example.Com')
    const b = hashEmail('user@example.com')
    expect(a).toBe(b)
  })

  it('strips leading and trailing whitespace before hashing', () => {
    const padded = hashEmail('  user@example.com  ')
    const clean = hashEmail('user@example.com')
    expect(padded).toBe(clean)
  })

  it('different emails produce different hashes', () => {
    const h1 = hashEmail('alice@example.com')
    const h2 = hashEmail('bob@example.com')
    expect(h1).not.toBe(h2)
  })
})
