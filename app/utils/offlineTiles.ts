// Western Iceland bounding box (eclipse path region) and zoom range
// targeted by the offline-tile downloader. Shared between OfflineManager
// (which downloads + reports progress) and MapMobileStatusPill (which
// reports the same percentage in compact form). Keep one source of truth
// so the two never drift if BOUNDS or zoom levels change.
export const BOUNDS = { west: -24.5, east: -20.5, south: 63.5, north: 66.5 }
export const ZOOM_MIN = 5
export const ZOOM_MAX = 11

export function lng2tile(lng: number, zoom: number): number {
  return Math.floor(((lng + 180) / 360) * Math.pow(2, zoom))
}

export function lat2tile(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180
  return Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, zoom))
}

export function tile2lng(x: number, zoom: number): number {
  return (x / Math.pow(2, zoom)) * 360 - 180
}

export function tile2lat(y: number, zoom: number): number {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, zoom)
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
}

export function countTiles(): number {
  let count = 0
  for (let z = ZOOM_MIN; z <= ZOOM_MAX; z++) {
    const xMin = lng2tile(BOUNDS.west, z)
    const xMax = lng2tile(BOUNDS.east, z)
    const yMin = lat2tile(BOUNDS.north, z)
    const yMax = lat2tile(BOUNDS.south, z)
    count += (xMax - xMin + 1) * (yMax - yMin + 1)
  }
  return count
}

export const ESTIMATED_TILE_COUNT = countTiles()
