import { isInEclipseRegion } from './eclipseRegion'

// Vegagerðin road conditions API
// Docs: https://www.vegagerdin.is/gagnasafn/vefthjonustur/
// Point warnings (closures, repairs, hazards) with lat/lng
const POINTS_API = 'https://gagnaveita.vegagerdin.is/api/faerdpunktar2017_1'
// Route segment conditions (condition codes + English descriptions)
const SEGMENTS_API = 'https://gagnaveita.vegagerdin.is/api/faerd2017_1'
const FETCH_TIMEOUT_MS = 10_000

export interface RoadCondition {
  roadName: string
  section: string
  condition: 'good' | 'difficult' | 'closed' | 'unknown'
  description: string
  lat: number
  lng: number
  updatedAt: string
}

function mapConditionCode(code: string | undefined): RoadCondition['condition'] {
  if (!code) return 'unknown'
  const c = code.toUpperCase()
  // Closed / banned
  if (c === 'ALLUR_AKSTUR_BANN' || c === 'LOKAD' || c.includes('ÓFÆRT')) return 'closed'
  // Hazards / difficult
  if (c === 'VEGAVINNA' || c === 'OSLETTUR_VEGUR' || c === 'HOLUR_I_VEGI'
    || c === 'STEINKAST' || c === 'DYR_A_VEGI' || c === 'TONN_ALLS'
    || c.includes('HALK') || c.includes('SNJOR') || c.includes('KLAK')) return 'difficult'
  return 'unknown'
}

export interface RoadSegment {
  roadName: string
  sectionName: string
  condition: RoadCondition['condition']
  description: string
  updatedAt: string
}

export async function fetchRoadSegments(): Promise<RoadSegment[]> {
  try {
    const res = await fetch(SEGMENTS_API, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    if (!res.ok) return []
    const segments: any[] = await res.json()
    return segments.map(s => ({
      roadName: s.FulltNafnButs || s.StuttNafnButs || '',
      sectionName: s.StuttNafnButs || '',
      condition: mapSegmentCondition(s.AstandYfirbord),
      description: s.AstandLysingEn || s.AstandLysing || '',
      updatedAt: s.DagsSkrad ? new Date(s.DagsSkrad).toISOString() : new Date().toISOString(),
    }))
  } catch (err: any) {
    console.error('[vegagerdin] Segments fetch failed:', err.message || err)
    return []
  }
}

function mapSegmentCondition(code: string | undefined): RoadCondition['condition'] {
  if (!code) return 'unknown'
  const c = code.toUpperCase()
  if (c === 'GREIDFAERT') return 'good'
  if (c === 'LOKAD' || c.includes('OFAERT')) return 'closed'
  if (c === 'HALKA' || c === 'HALKUBLETTIR' || c === 'SNJOTHEKJA' || c === 'THUNGFAERT') return 'difficult'
  if (c === 'EKKI_I_THJONUSTU' || c === 'OTHEKKT') return 'unknown'
  return 'unknown'
}

export async function fetchRoadConditions(): Promise<RoadCondition[]> {
  const results: RoadCondition[] = []

  try {
    // Fetch point warnings (closures, repairs, hazards) — these have lat/lng
    const pointsRes = await fetch(POINTS_API, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    if (pointsRes.ok) {
      const points: any[] = await pointsRes.json()
      for (const p of points) {
        const lat = p.Breidd || 0
        const lng = p.Lengd || 0
        if (!lat || !lng) continue
        // Filter to eclipse region
        if (!isInEclipseRegion(lat, lng)) continue

        results.push({
          roadName: p.FulltNafn || p.StuttNafn || '',
          section: '',
          condition: mapConditionCode(p.Astand),
          description: p.LysingEn || p.Lysing || p.Astand || '',
          lat,
          lng,
          updatedAt: p.DagsSkrad ? new Date(p.DagsSkrad).toISOString() : new Date().toISOString(),
        })
      }
    }
  } catch (err: any) {
    console.error('[vegagerdin] Points fetch failed:', err.message || err)
  }

  return results
}
