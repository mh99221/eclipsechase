/**
 * Attach a sun-direction trajectory arc to a Mapbox map.
 *
 * Owns one geojson line layer (the arc) + one sun-disk HTML marker
 * + one callout HTML marker + N tick HTML markers. The arc's visual
 * radius is fixed at ARC_RADIUS_PX screen pixels so it reads the same
 * at every zoom; on map zoom the source and all marker positions are
 * recomputed via project/unproject.
 *
 * Call sites:
 *   - /map focused spot      id = `spot-${slug}`
 *   - /map horizon-check     id = `horizon-check`
 *   - /spots/[slug] map      id = `spot-${slug}`
 */

import mapboxgl from 'mapbox-gl'
import type { Map as MapboxMap, Marker as MapboxMarker } from 'mapbox-gl'
import { computeSunTrajectoryByTime } from './solar'
import type { SunTrajectoryPoint } from './solar'

export interface SunArcProps {
  lat: number
  lng: number
  sunAzimuth: number
  sunAltitude: number
  totalityStartIso: string
  id: string
}

const ARC_RADIUS_PX = 120
const HALF_WINDOW_HOURS = 0.25  // ±15 min
const STEP_MINUTES = 1
const TICK_STEP_MINUTES = 5

function projectOffset(
  map: MapboxMap,
  lat: number,
  lng: number,
  azimuth: number,
): { lng: number; lat: number } {
  const origin = map.project([lng, lat] as any)
  const azRad = azimuth * Math.PI / 180
  const dx = Math.sin(azRad) * ARC_RADIUS_PX
  const dy = -Math.cos(azRad) * ARC_RADIUS_PX
  const ll = map.unproject([origin.x + dx, origin.y + dy] as any)
  return { lng: (ll as any).lng, lat: (ll as any).lat }
}

function trajectoryToLineFeature(
  map: MapboxMap,
  props: SunArcProps,
  trajectory: SunTrajectoryPoint[],
): GeoJSON.Feature<GeoJSON.LineString> {
  const coords: [number, number][] = trajectory.map((p) => {
    const ll = projectOffset(map, props.lat, props.lng, p.azimuth)
    return [ll.lng, ll.lat]
  })
  return {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: coords },
    properties: {},
  }
}

function createSunMarker(): MapboxMarker {
  const el = document.createElement('div')
  el.className = 'sun-arc-sun'
  el.style.cssText = `
    width: 16px; height: 16px; border-radius: 50%;
    background: #f59e0b;
    box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.3);
    pointer-events: none;
  `
  return new mapboxgl.Marker({ element: el, anchor: 'center' })
}

function createCalloutMarker(text: string): MapboxMarker {
  const el = document.createElement('div')
  el.className = 'sun-arc-callout'
  el.style.cssText = `
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: rgb(var(--accent-strong));
    white-space: nowrap;
    pointer-events: none;
    transform: translateY(-22px);
  `
  el.textContent = text
  return new mapboxgl.Marker({ element: el, anchor: 'bottom' })
}

function createTickMarker(timeLabel: string | null): MapboxMarker {
  const el = document.createElement('div')
  el.className = 'sun-arc-tick'
  el.style.cssText = `
    width: 6px; height: 6px; border-radius: 50%;
    background: rgb(var(--accent-strong));
    opacity: 0.7;
    pointer-events: none;
    position: relative;
  `
  if (timeLabel) {
    const label = document.createElement('span')
    label.textContent = timeLabel
    label.style.cssText = `
      position: absolute; left: 10px; top: -4px;
      font-family: 'IBM Plex Mono', monospace;
      font-size: 8px; white-space: nowrap;
      color: rgb(var(--ink-3));
    `
    el.appendChild(label)
  }
  return new mapboxgl.Marker({ element: el, anchor: 'center' })
}

function formatUtc(utcHours: number): string {
  const h = Math.floor(utcHours)
  const m = Math.round((utcHours - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function attachSunArc(map: MapboxMap, props: SunArcProps): () => void {
  // Resolve totality utc hours from the ISO timestamp.
  const d = new Date(props.totalityStartIso)
  const totalityUtcHours = d.getUTCHours()
    + d.getUTCMinutes() / 60
    + d.getUTCSeconds() / 3600

  const trajectory = computeSunTrajectoryByTime(
    props.lat,
    props.lng,
    totalityUtcHours - HALF_WINDOW_HOURS,
    totalityUtcHours + HALF_WINDOW_HOURS,
    STEP_MINUTES,
  )

  const sourceId = `sun-arc-${props.id}`
  const layerId = `sun-arc-line-${props.id}`

  // --- Arc line (source + layer) ---
  map.addSource(sourceId, {
    type: 'geojson',
    data: trajectoryToLineFeature(map, props, trajectory),
  })
  map.addLayer({
    id: layerId,
    type: 'line',
    source: sourceId,
    paint: {
      'line-color': '#fbbf24',
      'line-width': 1.2,
      'line-dasharray': [2, 2],
      'line-opacity': 0.55,
    },
    layout: { 'line-cap': 'round', 'line-join': 'round' },
  })

  // --- Sun disk (at totality midpoint) ---
  // Find the trajectory point closest to totalityUtcHours
  let sunIdx = 0
  let bestDiff = Infinity
  for (let i = 0; i < trajectory.length; i++) {
    const diff = Math.abs(trajectory[i]!.utcHours - totalityUtcHours)
    if (diff < bestDiff) { bestDiff = diff; sunIdx = i }
  }
  const sunPt = trajectory[sunIdx]!
  const sunLngLat = projectOffset(map, props.lat, props.lng, sunPt.azimuth)
  const sunMarker = createSunMarker().setLngLat([sunLngLat.lng, sunLngLat.lat]).addTo(map)

  // --- Callout (time + altitude) ---
  const calloutText = `${formatUtc(totalityUtcHours)} UTC · ${Math.round(props.sunAltitude)}°`
  const calloutMarker = createCalloutMarker(calloutText)
    .setLngLat([sunLngLat.lng, sunLngLat.lat])
    .addTo(map)

  // --- Tick markers at 5-min intervals, skipping the totality tick ---
  const tickMarkers: MapboxMarker[] = []
  for (let i = 0; i < trajectory.length; i++) {
    const pt = trajectory[i]!
    const minute = Math.round(pt.utcHours * 60)
    if (minute % TICK_STEP_MINUTES !== 0) continue
    if (i === sunIdx) continue  // Totality tick replaced by sun disk
    // Endpoints get labels, intermediates are dots only
    const isEndpoint = i === 0 || i === trajectory.length - 1
    const label = isEndpoint ? formatUtc(pt.utcHours) : null
    const tickLngLat = projectOffset(map, props.lat, props.lng, pt.azimuth)
    const marker = createTickMarker(label)
      .setLngLat([tickLngLat.lng, tickLngLat.lat])
      .addTo(map)
    tickMarkers.push(marker)
  }

  // --- Zoom handler: recompute everything at the new zoom ---
  const zoomHandler = () => {
    const src = map.getSource(sourceId) as any
    if (src?.setData) {
      src.setData(trajectoryToLineFeature(map, props, trajectory))
    }
    const sun = projectOffset(map, props.lat, props.lng, sunPt.azimuth)
    sunMarker.setLngLat([sun.lng, sun.lat])
    calloutMarker.setLngLat([sun.lng, sun.lat])
    let tickIdx = 0
    for (let i = 0; i < trajectory.length; i++) {
      const pt = trajectory[i]!
      const minute = Math.round(pt.utcHours * 60)
      if (minute % TICK_STEP_MINUTES !== 0) continue
      if (i === sunIdx) continue
      const ll = projectOffset(map, props.lat, props.lng, pt.azimuth)
      tickMarkers[tickIdx]!.setLngLat([ll.lng, ll.lat])
      tickIdx++
    }
  }
  map.on('zoom', zoomHandler)

  // --- Detach closure ---
  let detached = false
  return function detach() {
    if (detached) return
    detached = true
    map.off('zoom', zoomHandler)
    sunMarker.remove()
    calloutMarker.remove()
    for (const m of tickMarkers) m.remove()
    try {
      if (map.getLayer(layerId)) map.removeLayer(layerId)
      if (map.getSource(sourceId)) map.removeSource(sourceId)
    }
    catch { /* ignore */ }
  }
}
