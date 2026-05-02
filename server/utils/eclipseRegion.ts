// Bounding box for the 2026-08-12 eclipse path region (western Iceland).
// Used by Vegagerðin road conditions + camera filters to drop points
// outside the area we care about.
export const ECLIPSE_REGION = {
  latMin: 63.0,
  latMax: 67.0,
  lngMin: -25.0,
  lngMax: -20.0,
} as const

export function isInEclipseRegion(lat: number, lng: number): boolean {
  return (
    lat >= ECLIPSE_REGION.latMin &&
    lat <= ECLIPSE_REGION.latMax &&
    lng >= ECLIPSE_REGION.lngMin &&
    lng <= ECLIPSE_REGION.lngMax
  )
}
