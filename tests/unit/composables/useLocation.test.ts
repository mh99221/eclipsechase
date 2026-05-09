import { describe, it, expect, beforeEach, vi } from 'vitest'

// useLocation() now calls useI18n() to resolve the
// "Geolocation not supported" error message. Mock vue-i18n so the
// composable can run outside a Vue setup scope. Identity-on-key is
// fine — these tests assert state shape, not message text.
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

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

    it('sets the geolocation-not-supported i18n key when API unavailable', () => {
      // The composable now resolves the human message through useI18n().
      // Our mock returns identity-on-key, so we assert the i18n key —
      // proving the composable wired the message correctly without
      // coupling the test to a specific locale's translation.
      const { error, request } = useLocation()
      request()
      expect(error.value).toBe('geolocation.not_supported')
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
