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
  if (c === 'ALLUR_AKSTUR_BANN' || c === 'LOKAD' || c.includes('ÓFÆRT')) return 'closed'
  if (c === 'VEGAVINNA' || c === 'OSLETTUR_VEGUR' || c.includes('HALK') || c.includes('SNJOR') || c.includes('KLAK')) return 'difficult'
  if (c === 'GREIDFAERT' || c === 'THURT' || c === 'BLAUTT') return 'good'
  // English fallbacks
  if (c.includes('CLOSED') || c.includes('IMPASSABLE')) return 'closed'
  if (c.includes('DIFFICULT') || c.includes('ICE') || c.includes('SNOW')) return 'difficult'
  if (c.includes('PASSABLE') || c.includes('DRY') || c.includes('WET')) return 'good'
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
        if (lat < 63.0 || lat > 67.0 || lng < -25.0 || lng > -20.0) continue

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

  try {
    // Fetch route segment conditions — no lat/lng but useful status info
    // We skip these from the map markers (no coords) but could display in a list
    const segRes = await fetch(SEGMENTS_API, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    if (segRes.ok) {
      const segments: any[] = await segRes.json()
      for (const s of segments) {
        // Segments don't have lat/lng coordinates — skip for map markers
        // They use route segment IDs (IdButur) that would need to be joined
        // with the WFS geometry service for coordinates
        // For now, log count for debugging
        if (results.length === 0 && segments.length > 0) {
          console.log(`[vegagerdin] ${segments.length} route segments loaded (no coords, not mapped)`)
        }
      }
    }
  } catch (err: any) {
    console.error('[vegagerdin] Segments fetch failed:', err.message || err)
  }

  return results
}
