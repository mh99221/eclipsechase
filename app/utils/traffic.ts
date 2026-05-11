/**
 * Road-condition colours + labels shared between the traffic overlay's
 * hazard markers and the road-polyline layer on /map.
 */

export type TrafficCondition = 'good' | 'difficult' | 'closed' | 'unknown'

/** Row shape returned by /api/traffic/conditions. Distinct from the
 *  `TrafficCondition` status union — this is the object the map page
 *  iterates over to render hazard markers. */
export interface TrafficConditionItem {
  lat: number
  lng: number
  condition: string
  roadName?: string
  description: string
  updatedAt?: string
}

export const CONDITION_COLORS: Record<TrafficCondition, string> = {
  good: '#22c55e',
  difficult: '#f97316',
  closed: '#ef4444',
  unknown: '#6b7280',
}

export const CONDITION_LABELS: Record<TrafficCondition, string> = {
  good: 'Passable',
  difficult: 'Difficult',
  closed: 'Closed',
  unknown: 'Unknown',
}

export function getTrafficColor(condition: string): string {
  return CONDITION_COLORS[condition as TrafficCondition] ?? CONDITION_COLORS.unknown
}

export function getTrafficLabel(condition: string): string {
  return CONDITION_LABELS[condition as TrafficCondition] ?? CONDITION_LABELS.unknown
}

/** Higher = worse. Used to pick the "worst" segment condition when names collide. */
export function conditionPriority(c: string): number {
  switch (c) {
    case 'closed': return 3
    case 'difficult': return 2
    case 'good': return 1
    default: return 0
  }
}
