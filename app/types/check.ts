/**
 * Shape of the /api/check response. Mirrored from server/api/check.get.ts —
 * keep the two in sync.
 */
export interface CheckResultHorizon {
  verdict: 'clear' | 'marginal' | 'risky' | 'blocked' | 'unknown'
  clearanceDegrees: number | null
  maxHorizonAngle: number | null
  sunAltitude: number
  sunAzimuth: number
  sweep: { azimuth: number; horizon_angle: number; distance_m: number }[]
  nearestGridPoint: {
    lat: number
    lng: number
    distanceMeters: number
    bearing: number
  } | null
  coverage: 'in-grid' | 'outside-grid'
}

export interface CheckResultCloudCell {
  years: { year: number; cloud_cover: number | null }[]
  clear_years: number
  partly_years: number
  overcast_years: number
  total_years: number
  avg_cloud_cover: number | null
}

export interface CheckResultCloudHistory {
  cell: CheckResultCloudCell
  sampledAt: { lat: number; lng: number; distanceMeters: number }
}

export interface CheckResultTotality {
  insidePath: boolean
  durationSeconds: number | null
  contactTimes: {
    c1: string | null
    c2: string | null
    c3: string | null
    c4: string | null
  }
  distanceFromNearestPointMeters: number | null
  nearestGridLat: number | null
  nearestGridLng: number | null
}

export interface CheckResult {
  input: { lat: number; lng: number }
  horizon: CheckResultHorizon
  cloudHistory: CheckResultCloudHistory | null
  totality: CheckResultTotality
  computedAt: string
}
