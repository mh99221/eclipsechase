import type { Ref } from 'vue'

// --- Types ---

export type ProfileId = 'photographer' | 'family' | 'hiker' | 'skychaser' | 'firsttimer'

export interface Profile {
  id: ProfileId
  name: string
  description: string
  weights: { weather: number; duration: number; services: number; accessibility: number; distance: number }
  floors: {
    hasServices?: boolean
    cellCoverageNot?: string
    difficultyNot?: string
    spotTypeNot?: string
  }
  invertAccessibility?: boolean
}

export const PROFILES: Profile[] = [
  {
    id: 'photographer',
    name: 'Photographer',
    description: 'Longest totality + clear skies. Doesn\'t mind remote spots.',
    weights: { weather: 0.35, duration: 0.35, services: 0.05, accessibility: 0.10, distance: 0.15 },
    floors: {},
  },
  {
    id: 'family',
    name: 'Family',
    description: 'Easy access, services nearby, good cell signal. No difficult trails.',
    weights: { weather: 0.25, duration: 0.10, services: 0.30, accessibility: 0.25, distance: 0.10 },
    floors: { hasServices: true, cellCoverageNot: 'none', difficultyNot: 'challenging' },
  },
  {
    id: 'hiker',
    name: 'Hiker',
    description: 'Prefers trails and elevation. The harder the hike, the better the spot.',
    weights: { weather: 0.25, duration: 0.20, services: 0.05, accessibility: 0.35, distance: 0.15 },
    floors: { spotTypeNot: 'drive-up' },
    invertAccessibility: true,
  },
  {
    id: 'skychaser',
    name: 'Sky Chaser',
    description: 'Will drive anywhere for the clearest weather. All about the sky.',
    weights: { weather: 0.50, duration: 0.15, services: 0.05, accessibility: 0.05, distance: 0.25 },
    floors: {},
  },
  {
    id: 'firsttimer',
    name: 'First-Timer',
    description: 'Balanced pick — safe, accessible, good conditions. A great first eclipse.',
    weights: { weather: 0.30, duration: 0.15, services: 0.20, accessibility: 0.20, distance: 0.15 },
    floors: { difficultyNot: 'challenging' },
  },
]

// --- Helpers ---

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function nearestStationWeather(
  spotLat: number,
  spotLng: number,
  weatherByStation: Map<string, number | null>,
  stations: Array<{ id: string; lat: number; lng: number }>,
): number | null {
  let minDist = Infinity
  let nearest: number | null = null
  for (const s of stations) {
    const cc = weatherByStation.get(s.id)
    if (cc == null) continue
    const d = haversineKm(spotLat, spotLng, s.lat, s.lng)
    if (d < minDist) {
      minDist = d
      nearest = cc
    }
  }
  return nearest
}

const ACCESSIBILITY_SCORES: Record<string, number> = {
  'drive-up': 1.0,
  'short-walk': 0.8,
  'moderate-hike': 0.5,
  'serious-hike': 0.2,
}

const CELL_COVERAGE_SCORES: Record<string, number> = {
  good: 1.0,
  limited: 0.5,
  none: 0.0,
}

// --- Main composable ---

export interface RankedSpot {
  spot: any
  score: number // 0-100, or -1 when no profile selected
  filtered: boolean
  factors: { weather: number; duration: number; services: number; accessibility: number; distance: number }
  distanceKm: number
  weatherStatus: string | null
}

const DISTANCE_CAP_KM = 300
const WEATHER_NEUTRAL = 0.5

export function useRecommendation(
  spots: Ref<any[]>,
  weatherData: Ref<Array<{ station_id: string; cloud_cover: number | null }> | null>,
  stations: Ref<Array<{ id: string; lat: number; lng: number }> | null>,
  userCoords: Ref<[number, number]>,
  profileId: Ref<ProfileId | null>,
) {
  const emptyFactors = { weather: 0, duration: 0, services: 0, accessibility: 0, distance: 0 }

  const ranked = computed<RankedSpot[]>(() => {
    if (!spots.value?.length) return []

    const profile = PROFILES.find(p => p.id === profileId.value)

    // No profile: return all spots sorted by duration
    if (!profile) {
      return [...spots.value]
        .sort((a, b) => (b.totality_duration_seconds || 0) - (a.totality_duration_seconds || 0))
        .map(spot => ({ spot, score: -1, filtered: false, factors: { ...emptyFactors }, distanceKm: 0, weatherStatus: null }))
    }

    const allSpots = spots.value
    const maxDuration = Math.max(...allSpots.map(s => s.totality_duration_seconds || 0))

    // Build weather lookup
    const weatherByStation = new Map<string, number | null>()
    if (weatherData.value) {
      for (const w of weatherData.value) {
        weatherByStation.set(w.station_id, w.cloud_cover)
      }
    }
    const stationList = stations.value || []
    const allWeatherMissing = stationList.length === 0 || weatherByStation.size === 0

    return allSpots.map((spot) => {
      // Floor checks
      const floors = profile.floors
      let filtered = false
      if (floors.hasServices && !spot.has_services) filtered = true
      if (floors.cellCoverageNot && spot.cell_coverage === floors.cellCoverageNot) filtered = true
      if (floors.difficultyNot && spot.difficulty === floors.difficultyNot) filtered = true
      if (floors.spotTypeNot && spot.spot_type === floors.spotTypeNot) filtered = true

      if (filtered) {
        return { spot, score: 0, filtered: true, factors: { ...emptyFactors }, distanceKm: 0, weatherStatus: null }
      }

      // Compute factors
      const cloudCover = nearestStationWeather(spot.lat, spot.lng, weatherByStation, stationList)
      const weatherFactor = cloudCover != null ? 1 - cloudCover / 100 : WEATHER_NEUTRAL
      const durationFactor = maxDuration > 0 ? (spot.totality_duration_seconds || 0) / maxDuration : 0
      const servicesFactor = ((spot.has_services ? 1 : 0) + (CELL_COVERAGE_SCORES[spot.cell_coverage] ?? 0)) / 2

      let accessFactor = ACCESSIBILITY_SCORES[spot.spot_type] ?? 1.0
      if (profile.invertAccessibility) accessFactor = 1 - accessFactor

      const distKm = haversineKm(userCoords.value[0], userCoords.value[1], spot.lat, spot.lng)
      const distanceFactor = Math.max(0, Math.min(1, 1 - distKm / DISTANCE_CAP_KM))

      const factors = {
        weather: weatherFactor,
        duration: durationFactor,
        services: servicesFactor,
        accessibility: accessFactor,
        distance: distanceFactor,
      }

      // Weighted sum
      let score: number
      if (allWeatherMissing) {
        const wTotal = 1 - profile.weights.weather
        score = (profile.weights.duration / wTotal) * durationFactor
          + (profile.weights.services / wTotal) * servicesFactor
          + (profile.weights.accessibility / wTotal) * accessFactor
          + (profile.weights.distance / wTotal) * distanceFactor
      }
      else {
        const w = profile.weights
        score = w.weather * weatherFactor + w.duration * durationFactor
          + w.services * servicesFactor + w.accessibility * accessFactor + w.distance * distanceFactor
      }

      score = Math.round(Math.min(1, Math.max(0, score)) * 100)

      // Weather status label
      let weatherStatus: string | null = null
      if (cloudCover != null) {
        if (cloudCover <= 25) weatherStatus = 'Clear'
        else if (cloudCover <= 50) weatherStatus = 'Partly cloudy'
        else if (cloudCover <= 75) weatherStatus = 'Mostly cloudy'
        else weatherStatus = 'Overcast'
      }

      return { spot, score, filtered: false, factors, distanceKm: Math.round(distKm), weatherStatus }
    })
      .sort((a, b) => {
        if (a.filtered !== b.filtered) return a.filtered ? 1 : -1
        return b.score - a.score
      })
  })

  const thinResults = computed(() => ranked.value.filter(r => !r.filtered).length < 3)

  return { ranked, thinResults }
}
