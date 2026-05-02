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
