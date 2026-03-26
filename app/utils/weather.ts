interface Station {
  id: string
  region: string
  [key: string]: unknown
}

interface CloudEntry {
  station_id: string
  cloud_cover: number | null
}

export interface BestRegionResult {
  region: string
  avgCloudCover: number
}

/**
 * Find the region with the lowest average cloud cover.
 * Stations with null cloud cover are excluded from averages.
 * Regions where all stations have null are skipped.
 */
export function bestRegion(
  stations: Station[],
  cloudData: CloudEntry[],
): BestRegionResult | null {
  if (!stations.length || !cloudData.length) return null

  // Build cloud cover lookup
  const coverMap = new Map<string, number | null>()
  for (const c of cloudData) {
    coverMap.set(c.station_id, c.cloud_cover)
  }

  // Group stations by region, compute averages
  const regionSums = new Map<string, { sum: number; count: number }>()

  for (const station of stations) {
    const cover = coverMap.get(station.id)
    if (cover == null) continue

    const entry = regionSums.get(station.region)
    if (entry) {
      entry.sum += cover
      entry.count++
    } else {
      regionSums.set(station.region, { sum: cover, count: 1 })
    }
  }

  if (regionSums.size === 0) return null

  let bestRegionKey = ''
  let bestAvg = Infinity

  for (const [region, { sum, count }] of regionSums) {
    const avg = sum / count
    if (avg < bestAvg) {
      bestAvg = avg
      bestRegionKey = region
    }
  }

  return {
    region: bestRegionKey,
    avgCloudCover: Math.round(bestAvg),
  }
}
