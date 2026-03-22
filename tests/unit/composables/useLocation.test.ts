import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useLocation } from '../../../app/composables/useLocation'

const REYKJAVIK: [number, number] = [64.1466, -21.9426]

describe('useLocation', () => {
  describe('initial state', () => {
    it('defaults coords to Reykjavik', () => {
      const { coords } = useLocation()
      expect(coords.value).toEqual(REYKJAVIK)
    })

    it('starts with isGps = false', () => {
      const { isGps } = useLocation()
      expect(isGps.value).toBe(false)
    })

    it('starts with error = null', () => {
      const { error } = useLocation()
      expect(error.value).toBeNull()
    })
  })

  describe('request() — success', () => {
    beforeEach(() => {
      Object.defineProperty(globalThis, 'navigator', {
        writable: true,
        configurable: true,
        value: {
          geolocation: {
            getCurrentPosition: vi.fn((successCb: PositionCallback) => {
              successCb({
                coords: { latitude: 65.0, longitude: -22.5, accuracy: 10, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
                timestamp: Date.now(),
              } as GeolocationPosition)
            }),
          },
        },
      })
    })

    it('request() is synchronous (no await needed)', () => {
      const { coords, isGps, request } = useLocation()
      // Call without await — callback should fire synchronously
      request()
      expect(coords.value).toEqual([65.0, -22.5])
      expect(isGps.value).toBe(true)
    })

    it('sets coords to GPS position', () => {
      const { coords, request } = useLocation()
      request()
      expect(coords.value[0]).toBe(65.0)
      expect(coords.value[1]).toBe(-22.5)
    })

    it('sets isGps = true on success', () => {
      const { isGps, request } = useLocation()
      request()
      expect(isGps.value).toBe(true)
    })

    it('error remains null on success', () => {
      const { error, request } = useLocation()
      request()
      expect(error.value).toBeNull()
    })
  })

  describe('request() — geolocation error', () => {
    beforeEach(() => {
      Object.defineProperty(globalThis, 'navigator', {
        writable: true,
        configurable: true,
        value: {
          geolocation: {
            getCurrentPosition: vi.fn((_successCb: PositionCallback, errorCb: PositionErrorCallback) => {
              errorCb({ message: 'User denied geolocation', code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError)
            }),
          },
        },
      })
    })

    it('sets error message on geolocation failure', () => {
      const { error, request } = useLocation()
      request()
      expect(error.value).toBe('User denied geolocation')
    })

    it('keeps default Reykjavik coords on failure', () => {
      const { coords, request } = useLocation()
      request()
      expect(coords.value).toEqual(REYKJAVIK)
    })

    it('isGps stays false on failure', () => {
      const { isGps, request } = useLocation()
      request()
      expect(isGps.value).toBe(false)
    })
  })

  describe('request() — geolocation not supported', () => {
    beforeEach(() => {
      Object.defineProperty(globalThis, 'navigator', {
        writable: true,
        configurable: true,
        value: {
          geolocation: undefined,
        },
      })
    })

    it('sets error "Geolocation not supported" when API unavailable', () => {
      const { error, request } = useLocation()
      request()
      expect(error.value).toBe('Geolocation not supported')
    })

    it('coords remain at Reykjavik when geolocation unavailable', () => {
      const { coords, request } = useLocation()
      request()
      expect(coords.value).toEqual(REYKJAVIK)
    })
  })

  describe('return shape', () => {
    it('returns coords, isGps, error, and request', () => {
      const result = useLocation()
      expect(result).toHaveProperty('coords')
      expect(result).toHaveProperty('isGps')
      expect(result).toHaveProperty('error')
      expect(result).toHaveProperty('request')
      expect(typeof result.request).toBe('function')
    })
  })
})
