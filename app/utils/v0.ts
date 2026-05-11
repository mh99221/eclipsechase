// v0 visual-design helpers shared across redesigned pages.
// Reference: eclipsechase-v0-prototype/PRODUCTION_SPEC.md §10

export type V0Status = 'good' | 'marginal' | 'bad'

/** Map a cloud-cover percentage (0–100) to the v0 traffic-light status. */
export function cloudToStatus(cloud: number | null | undefined): V0Status {
  if (cloud == null) return 'marginal'
  if (cloud < 40) return 'good'
  if (cloud <= 70) return 'marginal'
  return 'bad'
}

/** CSS color string for a status — uses the live v0 token, theme-aware. */
export function statusColor(status: V0Status): string {
  if (status === 'good') return 'rgb(var(--good))'
  if (status === 'bad') return 'rgb(var(--bad))'
  return 'rgb(var(--warn))'
}

/** Map V0Status onto the tone-prop union used by Dock* / Stat / Pill — the
 *  shared v0 primitives use `warn` while V0Status uses `marginal` (which
 *  is also the value on `[data-status='marginal']` CSS hooks across the
 *  app). Use this helper at the boundary so type narrowing flows cleanly
 *  without renaming the existing data-attribute selectors. */
export type V0Tone = 'good' | 'warn' | 'bad'
export function statusToTone(status: V0Status): V0Tone {
  return status === 'marginal' ? 'warn' : status
}
