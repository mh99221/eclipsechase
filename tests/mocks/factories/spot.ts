let counter = 0

export function resetSpotCounter() {
  counter = 0
}

export function createSpot(overrides: Record<string, unknown> = {}) {
  counter++
  const id = `spot-test-${counter}`
  const slug = `test-spot-${counter}`

  return {
    id,
    name: `Test Spot ${counter}`,
    slug,
    lat: 65.0 + counter * 0.01,
    lng: -22.7 - counter * 0.01,
    region: 'snaefellsnes' as const,
    description: `A test viewing spot number ${counter}.`,
    parking_info: 'Free parking nearby.',
    terrain_notes: 'Flat ground.',
    has_services: false,
    cell_coverage: 'good' as const,
    totality_duration_seconds: 120 + counter,
    totality_start: '2026-08-12T17:44:30Z',
    sun_altitude: 24.5,
    sun_azimuth: 250.0,
    photo_url: `/images/spots/${slug}.webp`,
    spot_type: 'viewpoint',
    difficulty: 'easy',
    elevation_gain_m: 0,
    trail_distance_km: null,
    trail_time_minutes: null,
    trailhead_lat: null,
    trailhead_lng: null,
    photos: [],
    horizon_check: null,
    ...overrides,
  }
}
