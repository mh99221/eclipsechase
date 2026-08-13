import { describe, it, expect } from 'vitest'
import { ECLIPSE_DATE, hasEclipsePassed } from '../../../app/utils/eventStatus'

describe('eventStatus', () => {
  it('pins the eclipse to 2026-08-12T17:46:00Z', () => {
    expect(ECLIPSE_DATE.toISOString()).toBe('2026-08-12T17:46:00.000Z')
  })

  it('reports the eclipse as passed for any time after it', () => {
    expect(hasEclipsePassed(new Date('2026-08-13T00:00:00Z'))).toBe(true)
  })

  it('reports the eclipse as upcoming for any time before it', () => {
    expect(hasEclipsePassed(new Date('2026-08-01T00:00:00Z'))).toBe(false)
  })

  it('defaults to the current clock, which is after the eclipse', () => {
    expect(hasEclipsePassed()).toBe(true)
  })
})
