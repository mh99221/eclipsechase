/**
 * `useMapOverlay` — shared fetch + marker + zoom-visibility lifecycle
 * for /map overlays (traffic hazard markers, road cameras, etc).
 *
 * Each caller provides:
 *   - `active`: reactive on/off toggle
 *   - `mapRef`: the `<EclipseMap>` component ref exposing `.map`
 *   - `fetchData`: lazy fetcher, called once; the result is cached in
 *     the composable's `data` ref and reused on re-toggle
 *   - `buildMarker`: turns one item into a `mapboxgl.Marker` (or null
 *     to skip)
 *   - optional `onActivate` / `onDeactivate`: paired hooks for
 *     companion map sources/layers that live alongside the markers
 *
 * The composable owns: fetch caching, marker collection, per-item
 * min-zoom computation (`OVERLAY_BUCKETS`), `map.on('zoom')` handler
 * registration, watcher wiring, and unmount cleanup.
 */

import type { Map as MapboxMap, Marker as MapboxMarker } from 'mapbox-gl'
import { computeMinZooms, OVERLAY_BUCKETS, setMarkerVisibility } from '~/utils/mapMarkers'

export interface OverlayMarkerEntry {
  marker: MapboxMarker
  minZoom: number
}

export interface UseMapOverlayOptions<T extends { lat: number; lng: number }> {
  active: Ref<boolean>
  mapRef: Ref<{ map: MapboxMap | null } | null>
  fetchData: () => Promise<T[]>
  buildMarker: (item: T, ctx: { map: MapboxMap; minZoom: number }) => MapboxMarker | null
  onActivate?: (map: MapboxMap, data: T[]) => void | Promise<void>
  onDeactivate?: (map: MapboxMap) => void
}

export function useMapOverlay<T extends { lat: number; lng: number }>(
  opts: UseMapOverlayOptions<T>,
) {
  const data = ref<T[] | null>(null) as Ref<T[] | null>
  const markers = ref<OverlayMarkerEntry[]>([]) as Ref<OverlayMarkerEntry[]>
  let zoomHandler: (() => void) | null = null
  let attachedMap: MapboxMap | null = null

  async function activate() {
    const map = opts.mapRef.value?.map
    if (!map) return
    if (!data.value) {
      data.value = await opts.fetchData()
    }
    const items = data.value ?? []
    const minZooms = computeMinZooms(
      items.map(it => ({ lat: it.lat, lng: it.lng })),
      OVERLAY_BUCKETS,
    )
    for (let i = 0; i < items.length; i++) {
      const minZoom = minZooms[i]!
      const marker = opts.buildMarker(items[i]!, { map, minZoom })
      if (marker) markers.value.push({ marker, minZoom })
    }
    await opts.onActivate?.(map, items)
    setMarkerVisibility(markers.value, map.getZoom())
    zoomHandler = () => setMarkerVisibility(markers.value, map.getZoom())
    map.on('zoom', zoomHandler)
    attachedMap = map
  }

  function deactivate() {
    const map = attachedMap ?? opts.mapRef.value?.map ?? null
    if (map && zoomHandler) {
      map.off('zoom', zoomHandler)
    }
    zoomHandler = null
    for (const { marker } of markers.value) {
      marker.remove()
    }
    markers.value = []
    if (map) opts.onDeactivate?.(map)
    attachedMap = null
  }

  watch(opts.active, (val) => {
    if (val) activate()
    else deactivate()
  })

  onScopeDispose(() => {
    if (opts.active.value) deactivate()
  })

  return { data, markers }
}
