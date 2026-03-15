import type mapboxgl from 'mapbox-gl'

interface EclipsePathOptions {
  borderWidth?: number
  centerlineOpacity?: number
}

/**
 * Add eclipse totality path layers to a Mapbox map.
 * Loads GeoJSON from /eclipse-data/path.geojson and adds:
 * - totality-fill (amber translucent fill)
 * - totality-border (dashed amber outline)
 * - centerline (bright amber solid line)
 */
export function addEclipsePathLayers(map: mapboxgl.Map, options?: EclipsePathOptions) {
  const borderWidth = options?.borderWidth ?? 1.5
  const centerlineOpacity = options?.centerlineOpacity ?? 0.6

  map.addSource('eclipse-path', {
    type: 'geojson',
    data: '/eclipse-data/path.geojson',
  })

  map.addLayer({
    id: 'totality-fill',
    type: 'fill',
    source: 'eclipse-path',
    filter: ['==', ['get', 'type'], 'totality_path'],
    paint: {
      'fill-color': '#f59e0b',
      'fill-opacity': 0.08,
    },
  })

  map.addLayer({
    id: 'totality-border',
    type: 'line',
    source: 'eclipse-path',
    filter: ['==', ['get', 'type'], 'totality_path'],
    paint: {
      'line-color': '#f59e0b',
      'line-opacity': 0.4,
      'line-width': borderWidth,
      'line-dasharray': [4, 3],
    },
  })

  map.addLayer({
    id: 'centerline',
    type: 'line',
    source: 'eclipse-path',
    filter: ['==', ['get', 'type'], 'centerline'],
    paint: {
      'line-color': '#fbbf24',
      'line-opacity': centerlineOpacity,
      'line-width': 2,
    },
  })
}
