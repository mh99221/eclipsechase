/**
 * Single source of truth for "has the eclipse happened yet".
 *
 * Kept as a function of a passed-in date (rather than a hardcoded `true`)
 * so countdown components stay unit-testable at both sides of the
 * boundary, and so the logic reads honestly rather than as a magic flag.
 */

/** Eclipse totality mid-point: August 12, 2026 at 17:46 UTC. */
export const ECLIPSE_DATE = new Date('2026-08-12T17:46:00Z')

export function hasEclipsePassed(now: Date = new Date()): boolean {
  return now.getTime() >= ECLIPSE_DATE.getTime()
}
