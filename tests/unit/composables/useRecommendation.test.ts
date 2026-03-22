import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useRecommendation, PROFILES, type ProfileId } from '../../../app/composables/useRecommendation'
import { createSpot, resetSpotCounter } from '../../mocks/factories/spot'
import { createStation, resetStationCounter } from '../../mocks/factories/station'

// Reset factory counters before each suite so we get predictable IDs
function makeSpot(overrides: Record<string, unknown> = {}) {
  return createSpot(overrides)
}

function makeStation(overrides: Record<string, unknown> = {}) {
  return createStation(overrides)
}

// --- Fixtures ---

const SPOT_NEAR: any = makeSpot({
  id: 'spot-near',
  lat: 64.1466,
  lng: -21.9426,
  totality_duration_seconds: 135,
  has_services: true,
  cell_coverage: 'good',
  spot_type: 'drive-up',
  difficulty: 'easy',
  horizon_check: { verdict: 'clear' },
})

const SPOT_FAR: any = makeSpot({
  id: 'spot-far',
  lat: 66.0,
  lng: -23.0,
  totality_duration_seconds: 100,
  has_services: false,
  cell_coverage: 'limited',
  spot_type: 'moderate-hike',
  difficulty: 'moderate',
  horizon_check: { verdict: 'marginal' },
})

const SPOT_BLOCKED: any = makeSpot({
  id: 'spot-blocked',
  lat: 65.5,
  lng: -22.5,
  totality_duration_seconds: 90,
  has_services: false,
  cell_coverage: 'none',
  spot_type: 'short-walk',
  difficulty: 'easy',
  horizon_check: { verdict: 'blocked' },
})

const STATION_NEAR: any = makeStation({
  id: 'st-near',
  lat: 64.1466,
  lng: -21.9426,
})

const STATION_FAR: any = makeStation({
  id: 'st-far',
  lat: 66.0,
  lng: -23.0,
})

const WEATHER_DATA = [
  { station_id: 'st-near', cloud_cover: 10 },
  { station_id: 'st-far', cloud_cover: 80 },
]

// User at Reykjavik
const USER_COORDS: [number, number] = [64.1466, -21.9426]

describe('useRecommendation', () => {
  describe('no profile selected', () => {
    it('returns all spots sorted by totality_duration_seconds descending', () => {
      const spots = ref([SPOT_NEAR, SPOT_FAR, SPOT_BLOCKED])
      const weatherData = ref(WEATHER_DATA)
      const stations = ref([STATION_NEAR, STATION_FAR])
      const userCoords = ref<[number, number]>(USER_COORDS)
      const profileId = ref<ProfileId | null>(null)

      const { ranked } = useRecommendation(spots, weatherData, stations, userCoords, profileId)

      expect(ranked.value).toHaveLength(3)
      expect(ranked.value[0].spot.id).toBe('spot-near') // 135s
      expect(ranked.value[1].spot.id).toBe('spot-far')  // 100s
      expect(ranked.value[2].spot.id).toBe('spot-blocked') // 90s
    })

    it('assigns score = -1 when no profile', () => {
      const spots = ref([SPOT_NEAR])
      const { ranked } = useRecommendation(
        spots,
        ref(WEATHER_DATA),
        ref([STATION_NEAR]),
        ref(USER_COORDS),
        ref(null),
      )
      expect(ranked.value[0].score).toBe(-1)
    })

    it('returns empty array when spots list is empty', () => {
      const { ranked } = useRecommendation(
        ref([]),
        ref(WEATHER_DATA),
        ref([STATION_NEAR]),
        ref(USER_COORDS),
        ref(null),
      )
      expect(ranked.value).toHaveLength(0)
    })
  })

  describe('with photographer profile', () => {
    it('filters out spots with blocked horizon', () => {
      const spots = ref([SPOT_NEAR, SPOT_BLOCKED])
      const { ranked } = useRecommendation(
        spots,
        ref(WEATHER_DATA),
        ref([STATION_NEAR, STATION_FAR]),
        ref(USER_COORDS),
        ref<ProfileId>('photographer'),
      )

      const blockedResult = ranked.value.find(r => r.spot.id === 'spot-blocked')
      expect(blockedResult?.filtered).toBe(true)
      expect(blockedResult?.score).toBe(0)
    })

    it('non-filtered spots get a score between 0-100', () => {
      const spots = ref([SPOT_NEAR])
      const { ranked } = useRecommendation(
        spots,
        ref(WEATHER_DATA),
        ref([STATION_NEAR]),
        ref(USER_COORDS),
        ref<ProfileId>('photographer'),
      )
      const r = ranked.value[0]
      expect(r.filtered).toBe(false)
      expect(r.score).toBeGreaterThanOrEqual(0)
      expect(r.score).toBeLessThanOrEqual(100)
    })

    it('filtered spots appear after unfiltered in sort order', () => {
      const spots = ref([SPOT_BLOCKED, SPOT_NEAR])
      const { ranked } = useRecommendation(
        spots,
        ref(WEATHER_DATA),
        ref([STATION_NEAR]),
        ref(USER_COORDS),
        ref<ProfileId>('photographer'),
      )
      // First result should be unfiltered
      expect(ranked.value[0].filtered).toBe(false)
      // Blocked spot should be last
      expect(ranked.value[ranked.value.length - 1].filtered).toBe(true)
    })
  })

  describe('with family profile', () => {
    it('filters out spots without services', () => {
      const spotNoServices: any = { ...SPOT_NEAR, id: 'no-services', has_services: false, horizon_check: { verdict: 'clear' } }
      const spots = ref([spotNoServices])
      const { ranked } = useRecommendation(
        spots,
        ref(WEATHER_DATA),
        ref([STATION_NEAR]),
        ref(USER_COORDS),
        ref<ProfileId>('family'),
      )
      expect(ranked.value[0].filtered).toBe(true)
    })

    it('filters out spots with no cell coverage', () => {
      const spotNoCoverage: any = { ...SPOT_NEAR, id: 'no-coverage', has_services: true, cell_coverage: 'none', horizon_check: { verdict: 'clear' } }
      const spots = ref([spotNoCoverage])
      const { ranked } = useRecommendation(
        spots,
        ref(WEATHER_DATA),
        ref([STATION_NEAR]),
        ref(USER_COORDS),
        ref<ProfileId>('family'),
      )
      expect(ranked.value[0].filtered).toBe(true)
    })

    it('filters out challenging spots', () => {
      const spotChallenging: any = { ...SPOT_NEAR, id: 'challenging', difficulty: 'challenging', has_services: true, cell_coverage: 'good', horizon_check: { verdict: 'clear' } }
      const spots = ref([spotChallenging])
      const { ranked } = useRecommendation(
        spots,
        ref(WEATHER_DATA),
        ref([STATION_NEAR]),
        ref(USER_COORDS),
        ref<ProfileId>('family'),
      )
      expect(ranked.value[0].filtered).toBe(true)
    })
  })

  describe('with hiker profile', () => {
    it('filters out drive-up spots', () => {
      const spotDriveUp: any = { ...SPOT_NEAR, id: 'drive-up', spot_type: 'drive-up', horizon_check: { verdict: 'clear' } }
      const spots = ref([spotDriveUp])
      const { ranked } = useRecommendation(
        spots,
        ref(WEATHER_DATA),
        ref([STATION_NEAR]),
        ref(USER_COORDS),
        ref<ProfileId>('hiker'),
      )
      expect(ranked.value[0].filtered).toBe(true)
    })
  })

  describe('weather handling', () => {
    it('handles cloud_cover: null in weather data without crashing', () => {
      const weatherWithNull = [{ station_id: 'st-near', cloud_cover: null }]
      const { ranked } = useRecommendation(
        ref([SPOT_NEAR]),
        ref(weatherWithNull),
        ref([STATION_NEAR]),
        ref(USER_COORDS),
        ref<ProfileId>('photographer'),
      )
      expect(ranked.value).toHaveLength(1)
      // Should use WEATHER_NEUTRAL = 0.5 for weather factor
      expect(ranked.value[0].cloudCover).toBeNull()
      expect(ranked.value[0].weatherStatus).toBeNull()
    })

    it('uses neutral weather factor when no weather data', () => {
      const { ranked } = useRecommendation(
        ref([SPOT_NEAR]),
        ref(null),
        ref([]),
        ref(USER_COORDS),
        ref<ProfileId>('skychaser'),
      )
      // Should not throw and should return 1 result
      expect(ranked.value).toHaveLength(1)
      // No weather data → cloudCover is null
      expect(ranked.value[0].cloudCover).toBeNull()
    })

    it('attaches cloudCover and weatherStatus when weather available', () => {
      const { ranked } = useRecommendation(
        ref([SPOT_NEAR]),
        ref(WEATHER_DATA),
        ref([STATION_NEAR]),
        ref(USER_COORDS),
        ref<ProfileId>('photographer'),
      )
      expect(ranked.value[0].cloudCover).toBe(10)
      expect(ranked.value[0].weatherStatus).toBeTruthy()
    })
  })

  describe('distance computation', () => {
    it('attaches distanceKm (integer km)', () => {
      const { ranked } = useRecommendation(
        ref([SPOT_NEAR, SPOT_FAR]),
        ref(WEATHER_DATA),
        ref([STATION_NEAR, STATION_FAR]),
        ref(USER_COORDS),
        ref<ProfileId>('skychaser'),
      )
      ranked.value.forEach((r) => {
        expect(Number.isInteger(r.distanceKm)).toBe(true)
      })
    })

    it('spot at user location has distanceKm = 0', () => {
      const spotAtUser: any = { ...SPOT_NEAR, id: 'at-user', lat: USER_COORDS[0], lng: USER_COORDS[1], horizon_check: { verdict: 'clear' } }
      const { ranked } = useRecommendation(
        ref([spotAtUser]),
        ref(WEATHER_DATA),
        ref([STATION_NEAR]),
        ref(USER_COORDS),
        ref<ProfileId>('photographer'),
      )
      expect(ranked.value[0].distanceKm).toBe(0)
    })
  })

  describe('thinResults', () => {
    it('is false when 3+ unfiltered spots exist', () => {
      const spot2: any = makeSpot({ id: 's2', lat: 64.2, lng: -21.9, horizon_check: { verdict: 'clear' }, has_services: true, cell_coverage: 'good', difficulty: 'easy' })
      const spot3: any = makeSpot({ id: 's3', lat: 64.3, lng: -21.8, horizon_check: { verdict: 'clear' }, has_services: true, cell_coverage: 'good', difficulty: 'easy' })
      const spots = ref([SPOT_NEAR, spot2, spot3])
      const { thinResults } = useRecommendation(
        spots,
        ref(WEATHER_DATA),
        ref([STATION_NEAR]),
        ref(USER_COORDS),
        ref<ProfileId>('photographer'),
      )
      expect(thinResults.value).toBe(false)
    })

    it('is true when fewer than 3 unfiltered spots pass', () => {
      // All spots have blocked horizon → all filtered for photographer
      const allBlocked = ref([
        makeSpot({ id: 'b1', horizon_check: { verdict: 'blocked' } }),
        makeSpot({ id: 'b2', horizon_check: { verdict: 'blocked' } }),
      ])
      const { thinResults } = useRecommendation(
        allBlocked,
        ref(WEATHER_DATA),
        ref([STATION_NEAR]),
        ref(USER_COORDS),
        ref<ProfileId>('photographer'),
      )
      expect(thinResults.value).toBe(true)
    })
  })

  describe('horizon scoring', () => {
    it('spot with clear horizon scores higher than marginal for photographer', () => {
      const spotClear: any = makeSpot({ id: 'h-clear', lat: 64.1466, lng: -21.9426, horizon_check: { verdict: 'clear' }, totality_duration_seconds: 120 })
      const spotMarginal: any = makeSpot({ id: 'h-marginal', lat: 64.1466, lng: -21.9426, horizon_check: { verdict: 'marginal' }, totality_duration_seconds: 120 })

      const { ranked } = useRecommendation(
        ref([spotClear, spotMarginal]),
        ref(WEATHER_DATA),
        ref([STATION_NEAR]),
        ref(USER_COORDS),
        ref<ProfileId>('photographer'),
      )

      const clearResult = ranked.value.find(r => r.spot.id === 'h-clear')!
      const marginalResult = ranked.value.find(r => r.spot.id === 'h-marginal')!
      expect(clearResult.score).toBeGreaterThan(marginalResult.score)
    })
  })

  describe('PROFILES export', () => {
    it('exports all 5 profiles', () => {
      expect(PROFILES).toHaveLength(5)
    })

    it('all profile weights sum to approximately 1', () => {
      for (const profile of PROFILES) {
        const sum = Object.values(profile.weights).reduce((a, b) => a + b, 0)
        expect(sum).toBeCloseTo(1, 5)
      }
    })

    it('each profile has a valid id', () => {
      const ids = PROFILES.map(p => p.id)
      expect(ids).toContain('photographer')
      expect(ids).toContain('family')
      expect(ids).toContain('hiker')
      expect(ids).toContain('skychaser')
      expect(ids).toContain('firsttimer')
    })
  })
})
