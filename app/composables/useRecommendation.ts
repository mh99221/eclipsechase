import type { Ref } from 'vue'
import { cloudLevel } from '~/utils/eclipse'

// --- Types ---

export type ProfileId = 'photographer' | 'family' | 'hiker' | 'skychaser' | 'firsttimer'

export interface Profile {
  id: ProfileId
  name: string
  descriptionKey: string
  weights: { weather: number; duration: number; services: number; accessibility: number; distance: number; horizon: number }
  floors: {
    hasServices?: boolean
    cellCoverageNot?: string
    difficultyNot?: string
    spotTypeNot?: string
    horizonBlocked?: boolean
  }
  invertAccessibility?: boolean
}

export const PROFILES: Profile[] = [
  {
    id: 'photographer',
    name: 'Photographer',
    descriptionKey: 'recommend.profiles.photographer',
    weights: { weather: 0.2625, duration: 0.2625, services: 0.0375, accessibility: 0.075, distance: 0.1125, horizon: 0.25 },
    floors: { horizonBlocked: true },
  },
  {
    id: 'family',
    name: 'Family',
    descriptionKey: 'recommend.profiles.family',
    weights: { weather: 0.1875, duration: 0.075, services: 0.225, accessibility: 0.1875, distance: 0.075, horizon: 0.25 },
    floors: { hasServices: true, cellCoverageNot: 'none', difficultyNot: 'challenging', horizonBlocked: true },
  },
  {
    id: 'hiker',
    name: 'Hiker',
    descriptionKey: 'recommend.profiles.hiker',
    weights: { weather: 0.1875, duration: 0.15, services: 0.0375, accessibility: 0.2625, distance: 0.1125, horizon: 0.25 },
    floors: { spotTypeNot: 'drive-up', horizonBlocked: true },
    invertAccessibility: true,
  },
  {
    id: 'skychaser',
    name: 'Sky Chaser',
    descriptionKey: 'recommend.profiles.skychaser',
    weights: { weather: 0.375, duration: 0.1125, services: 0.0375, accessibility: 0.0375, distance: 0.1875, horizon: 0.25 },
    floors: { horizonBlocked: true },
  },
  {
    id: 'firsttimer',
    name: 'First-Timer',
    descriptionKey: 'recommend.profiles.firsttimer',
    weights: { weather: 0.225, duration: 0.1125, services: 0.15, accessibility: 0.15, distance: 0.1125, horizon: 0.25 },
    floors: { difficultyNot: 'challenging', horizonBlocked: true },
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

function computeHorizonScore(horizonCheck: any): number {
  if (!horizonCheck?.verdict) return 0.5
  switch (horizonCheck.verdict) {
    case 'clear': return 1.0
    case 'marginal': return 0.7
    case 'risky': return 0.3
    case 'blocked': return 0.0
    default: return 0.5
  }
}

// --- Main composable ---

export interface RankedSpot {
  spot: any
  score: number // 0-100, or -1 when no profile selected
  filtered: boolean
  factors: { weather: number; duration: number; services: number; accessibility: number; distance: number; horizon: number }
  distanceKm: number
  weatherStatus: string | null
  cloudCover: number | null
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
  const emptyFactors = { weather: 0, duration: 0, services: 0, accessibility: 0, distance: 0, horizon: 0 }

  const ranked = computed<RankedSpot[]>(() => {
    if (!spots.value?.length) return []

    const profile = PROFILES.find(p => p.id === profileId.value)

    // No profile: preserve the caller's existing order (caller picks the
    // sort — totality duration, historical clearness, etc.). With a
    // profile, the score-based sort further down takes over.
    if (!profile) {
      return spots.value.map(spot => ({
        spot, score: -1, filtered: false,
        factors: { ...emptyFactors }, distanceKm: 0,
        weatherStatus: null, cloudCover: null,
      }))
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
    const allHorizonMissing = allSpots.every(s => !s.horizon_check?.verdict)

    return allSpots.map((spot) => {
      // Floor checks
      const floors = profile.floors
      let filtered = false
      if (floors.hasServices && !spot.has_services) filtered = true
      if (floors.cellCoverageNot && spot.cell_coverage === floors.cellCoverageNot) filtered = true
      if (floors.difficultyNot && spot.difficulty === floors.difficultyNot) filtered = true
      if (floors.spotTypeNot && spot.spot_type === floors.spotTypeNot) filtered = true
      if (floors.horizonBlocked && spot.horizon_check?.verdict === 'blocked') filtered = true

      if (filtered) {
        return { spot, score: 0, filtered: true, factors: { ...emptyFactors }, distanceKm: 0, weatherStatus: null, cloudCover: null }
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

      const horizonFactor = computeHorizonScore(spot.horizon_check)

      const factors = {
        weather: weatherFactor,
        duration: durationFactor,
        services: servicesFactor,
        accessibility: accessFactor,
        distance: distanceFactor,
        horizon: horizonFactor,
      }

      // Weighted sum
      let score: number
      let excludedWeight = 0
      if (allWeatherMissing) excludedWeight += profile.weights.weather
      if (allHorizonMissing) excludedWeight += profile.weights.horizon
      const wScale = excludedWeight > 0 ? 1 / (1 - excludedWeight) : 1

      if (allWeatherMissing || allHorizonMissing) {
        score = 0
        if (!allWeatherMissing) score += profile.weights.weather * wScale * weatherFactor
        score += profile.weights.duration * wScale * durationFactor
        score += profile.weights.services * wScale * servicesFactor
        score += profile.weights.accessibility * wScale * accessFactor
        score += profile.weights.distance * wScale * distanceFactor
        if (!allHorizonMissing) score += profile.weights.horizon * wScale * horizonFactor
      }
      else {
        const w = profile.weights
        score = w.weather * weatherFactor + w.duration * durationFactor
          + w.services * servicesFactor + w.accessibility * accessFactor
          + w.distance * distanceFactor + w.horizon * horizonFactor
      }

      score = Math.round(Math.min(1, Math.max(0, score)) * 100)

      // Weather status label
      const weatherStatus = cloudCover != null ? cloudLevel(cloudCover).label : null

      return { spot, score, filtered: false, factors, distanceKm: Math.round(distKm), weatherStatus, cloudCover }
    })
      .sort((a, b) => {
        if (a.filtered !== b.filtered) return a.filtered ? 1 : -1
        return b.score - a.score
      })
  })

  const thinResults = computed(() => ranked.value.filter(r => !r.filtered).length < 3)

  return { ranked, thinResults }
}
