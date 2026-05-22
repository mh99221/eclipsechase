/**
 * Permissive coordinate parser for the free /check tool.
 *
 * Users paste many formats: decimal pairs, hemisphere markers, Google
 * Maps URLs, Apple Maps URLs. Return either {lat, lng} or an error
 * message — never throw. Validation is twofold: numbers must parse,
 * and the result must fall inside Iceland's bounding box (with margin).
 */
export interface ParsedCoords {
  lat: number
  lng: number
}

export interface ParseCoordsError {
  error: 'unparseable' | 'outside_iceland'
}

const ICELAND_BBOX = {
  latMin: 63.0, latMax: 67.5,
  lngMin: -25.0, lngMax: -13.0,
}

export function isValidIcelandCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= ICELAND_BBOX.latMin && lat <= ICELAND_BBOX.latMax
    && lng >= ICELAND_BBOX.lngMin && lng <= ICELAND_BBOX.lngMax
  )
}

function ok(lat: number, lng: number): ParsedCoords | ParseCoordsError {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { error: 'unparseable' }
  if (!isValidIcelandCoord(lat, lng)) return { error: 'outside_iceland' }
  return { lat, lng }
}

export function parseCoordinates(input: string): ParsedCoords | ParseCoordsError {
  const trimmed = (input || '').trim()
  if (!trimmed) return { error: 'unparseable' }

  // 1. Google Maps URL `@lat,lng` (also catches `place/.../@lat,lng,15z`)
  const gAt = trimmed.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/)
  if (gAt) {
    const r = ok(parseFloat(gAt[1]!), parseFloat(gAt[2]!))
    if ('lat' in r) return r
  }

  // 2. Google Maps `?q=lat,lng` or `&query=lat,lng`
  const gQuery = trimmed.match(/[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/)
  if (gQuery) {
    const r = ok(parseFloat(gQuery[1]!), parseFloat(gQuery[2]!))
    if ('lat' in r) return r
  }

  // 3. Hemisphere-marker pair: "65.86°N, 23.48°W" or "N65.86 W23.48"
  //    Captures: lead-sign, number, suffix-letter, then same for lng.
  const hemi = trimmed.match(
    /([NS])?\s*(-?\d+(?:\.\d+)?)\s*°?\s*([NS])?[,\s]+([EW])?\s*(-?\d+(?:\.\d+)?)\s*°?\s*([EW])?/i,
  )
  if (hemi) {
    let lat = parseFloat(hemi[2]!)
    let lng = parseFloat(hemi[5]!)
    const latHemi = (hemi[1] || hemi[3] || '').toUpperCase()
    const lngHemi = (hemi[4] || hemi[6] || '').toUpperCase()
    // Only flip signs when a hemisphere marker is present. Without it
    // we trust the leading sign (typical decimal-degree convention).
    if (latHemi === 'S') lat = -Math.abs(lat)
    else if (latHemi === 'N') lat = Math.abs(lat)
    if (lngHemi === 'W') lng = -Math.abs(lng)
    else if (lngHemi === 'E') lng = Math.abs(lng)
    if (latHemi || lngHemi) {
      const r = ok(lat, lng)
      if ('lat' in r) return r
    }
  }

  // 4. Bare decimal pair — last resort, broadest match.
  const bare = trimmed.match(/(-?\d+(?:\.\d+)?)[,;\s]+(-?\d+(?:\.\d+)?)/)
  if (bare) {
    const a = parseFloat(bare[1]!)
    const b = parseFloat(bare[2]!)
    // If the numbers look like (lat, lng) in Iceland, accept as-is. If
    // they look like (lng, lat) — e.g. someone copied from GeoJSON —
    // swap and try once more before giving up.
    const direct = ok(a, b)
    if ('lat' in direct) return direct
    const swapped = ok(b, a)
    if ('lat' in swapped) return swapped
    // Both failed: surface whichever error is more informative.
    return direct.error === 'outside_iceland' ? direct : swapped
  }

  return { error: 'unparseable' }
}
