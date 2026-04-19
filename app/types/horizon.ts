export type HorizonVerdict = 'clear' | 'marginal' | 'risky' | 'blocked'

export interface HorizonSweepPoint {
  azimuth: number        // absolute compass bearing
  horizon_angle: number  // terrain elevation angle in degrees
  distance_m: number     // distance to highest terrain point on this bearing
}

export interface HorizonCheck {
  verdict: HorizonVerdict
  clearance_degrees: number
  max_horizon_angle: number
  blocking_distance_m: number | null
  blocking_elevation_m: number | null
  observer_elevation_m: number  // DEM elevation + 1.7m eye height
  sun_altitude: number
  sun_azimuth: number
  checked_at: string
  sweep: HorizonSweepPoint[]  // 91 points, ±45°
}

// View-model subset of HorizonCheck, used as props for HorizonProfile component
export interface HorizonProfileData {
  sun_azimuth: number
  sun_altitude: number
  sweep: HorizonSweepPoint[]
  verdict: HorizonVerdict
  clearance_degrees: number
}

export interface HorizonCheckRequest {
  lat: number
  lng: number
}

export interface HorizonCheckResponse extends HorizonCheck {
  peakfinder_url: string
  totality_duration_seconds: number | null
  in_totality_path: boolean
  totality_start?: string  // ISO 8601. Absent when in_totality_path === false or grid miss.
}
