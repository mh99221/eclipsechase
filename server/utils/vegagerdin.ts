const VEGAGERDIN_BASE = 'https://gis.vegagerdin.is/arcgis/rest/services/road_conditions/MapServer/0/query'
const VEGAGERDIN_FETCH_TIMEOUT_MS = 10_000

export interface RoadCondition {
  roadNumber: string
  roadName: string
  section: string
  condition: 'good' | 'difficult' | 'closed' | 'unknown'
  description: string
  lat: number
  lng: number
  updatedAt: string
}

/**
 * Map raw condition strings from the API to our simplified condition type.
 * Field names and values are best guesses from the ArcGIS endpoint — may need
 * adjustment once we can inspect a real response.
 */
function mapCondition(raw: string | undefined): RoadCondition['condition'] {
  if (!raw) return 'unknown'
  const lower = raw.toLowerCase()
  if (lower.includes('closed') || lower.includes('impassable')) return 'closed'
  if (lower.includes('difficult') || lower.includes('slippery') || lower.includes('ice') || lower.includes('snow')) return 'difficult'
  if (lower.includes('good') || lower.includes('dry') || lower.includes('clear') || lower.includes('wet')) return 'good'
  return 'unknown'
}

export async function fetchRoadConditions(): Promise<RoadCondition[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), VEGAGERDIN_FETCH_TIMEOUT_MS)

  try {
    // Filter to western Iceland bounding box (eclipse path region)
    const params = new URLSearchParams({
      where: '1=1',
      geometry: JSON.stringify({ xmin: -25, xmax: -20, ymin: 63.5, ymax: 66.5 }),
      geometryType: 'esriGeometryEnvelope',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: '*',
      f: 'json',
      outSR: '4326',
    })

    const response = await fetch(`${VEGAGERDIN_BASE}?${params.toString()}`, {
      signal: controller.signal,
    })

    if (!response.ok) {
      console.error(`[vegagerdin] HTTP ${response.status}`)
      return []
    }

    const json = await response.json()
    const features = json?.features
    if (!Array.isArray(features)) {
      console.warn('[vegagerdin] No features array in response')
      return []
    }

    const results: RoadCondition[] = []

    for (const feature of features) {
      const attrs = feature.attributes || {}
      const geom = feature.geometry

      // Field names are best guesses from typical Vegagerdin ArcGIS schemas.
      // Common field names: ROAD_NUMBER / VEGUR, ROAD_NAME / NAFN,
      // SECTION / KAFLI, CONDITION / ASTAND, DESCRIPTION / LYSING,
      // LAST_UPDATED / DAGS
      const roadNumber = String(attrs.ROAD_NUMBER ?? attrs.VEGUR ?? attrs.RoadNumber ?? '')
      const roadName = String(attrs.ROAD_NAME ?? attrs.NAFN ?? attrs.RoadName ?? '')
      const section = String(attrs.SECTION ?? attrs.KAFLI ?? attrs.Section ?? '')
      const conditionRaw = String(attrs.CONDITION ?? attrs.ASTAND ?? attrs.Condition ?? '')
      const description = String(attrs.DESCRIPTION ?? attrs.LYSING ?? attrs.Description ?? conditionRaw)
      const updatedAt = attrs.LAST_UPDATED ?? attrs.DAGS ?? attrs.LastUpdated ?? ''

      // Geometry: point or centroid of polyline
      let lat = 0
      let lng = 0
      if (geom) {
        if (geom.y !== undefined && geom.x !== undefined) {
          // Point geometry
          lat = geom.y
          lng = geom.x
        } else if (Array.isArray(geom.paths) && geom.paths.length > 0) {
          // Polyline — use midpoint of first path
          const path = geom.paths[0]
          if (Array.isArray(path) && path.length > 0) {
            const mid = path[Math.floor(path.length / 2)]
            lng = mid[0]
            lat = mid[1]
          }
        }
      }

      // Skip features with no usable coordinates
      if (lat === 0 && lng === 0) continue

      results.push({
        roadNumber,
        roadName,
        section,
        condition: mapCondition(conditionRaw),
        description,
        lat,
        lng,
        updatedAt: updatedAt ? new Date(updatedAt).toISOString() : new Date().toISOString(),
      })
    }

    return results
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.error('[vegagerdin] Request timed out')
    } else {
      console.error('[vegagerdin] Fetch failed:', err.message || err)
    }
    return []
  } finally {
    clearTimeout(timeout)
  }
}
