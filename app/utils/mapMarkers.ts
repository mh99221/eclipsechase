/**
 * Shared zoom-visibility helpers for Mapbox HTML markers.
 *
 * Two concerns live here:
 *  - `computeMinZooms(points, buckets)` assigns a minZoom to each point
 *    based on its nearest-neighbor distance. Isolated points surface
 *    early; clustered ones only at higher zooms. Used by both
 *    EclipseMap (stations + spots) and /map (traffic + cameras).
 *  - `setMarkerVisibility(items, zoom)` toggles visibility +
 *    pointer-events on each marker's element without destroying /
 *    recreating the marker. Accepts either a plain `el` or a
 *    Mapbox-like `{ getElement() }` so both callers can share it.
 */

export interface ZoomBucket {
  /** Fraction of markers that fall into this bucket (cumulative). */
  pct: number
  /** minZoom assigned to markers in this bucket. */
  zoom: number
}

/**
 * Station/spot marker zoom buckets used by `EclipseMap.vue`.
 * Most isolated 30% of points are visible from zoom 5 and up; the
 * densest 20% only appear once the user zooms to 8.
 */
export const STATION_BUCKETS: ReadonlyArray<ZoomBucket> = [
  { pct: 0.30, zoom: 5 },
  { pct: 0.55, zoom: 6 },
  { pct: 0.80, zoom: 7 },
  { pct: Infinity, zoom: 8 },
]

/**
 * Overlay marker zoom buckets used by `/map` (traffic, cameras).
 * Tighter than station buckets so the map isn't overwhelmed on
 * initial load.
 */
export const OVERLAY_BUCKETS: ReadonlyArray<ZoomBucket> = [
  { pct: 0.25, zoom: 6 },
  { pct: 0.50, zoom: 7 },
  { pct: 0.75, zoom: 8 },
  { pct: Infinity, zoom: 9 },
]

export function computeMinZooms(
  points: Array<{ lat: number; lng: number }>,
  buckets: ReadonlyArray<ZoomBucket> = STATION_BUCKETS,
): number[] {
  if (!points.length) return []
  const dists = points.map((p, i) => {
    let min = Infinity
    for (let j = 0; j < points.length; j++) {
      if (i === j) continue
      const d = (p.lat - points[j]!.lat) ** 2 + (p.lng - points[j]!.lng) ** 2
      if (d < min) min = d
    }
    return { idx: i, dist: min }
  })
  dists.sort((a, b) => b.dist - a.dist) // most isolated first
  const zooms = new Array<number>(points.length)
  const total = dists.length
  for (let i = 0; i < total; i++) {
    const pct = i / total
    const bucket = buckets.find(b => pct < b.pct) ?? buckets[buckets.length - 1]!
    zooms[dists[i]!.idx] = bucket.zoom
  }
  return zooms
}

interface VisibilityItem {
  minZoom: number
  el?: HTMLElement | null
  marker?: { getElement(): HTMLElement } | null
}

export function setMarkerVisibility(
  items: Iterable<VisibilityItem>,
  zoom: number,
): void {
  for (const item of items) {
    const el = item.el ?? item.marker?.getElement()
    if (!el) continue
    const visible = zoom >= item.minZoom
    el.style.visibility = visible ? '' : 'hidden'
    el.style.pointerEvents = visible ? '' : 'none'
  }
}
