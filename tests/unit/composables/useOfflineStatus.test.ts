import { describe, it, expect, beforeEach, vi } from 'vitest'

// We need to reset modules because useOfflineStatus has module-level state
// (listenersRegistered flag) that must be fresh for each test.

describe('useOfflineStatus', () => {
  beforeEach(() => {
    vi.resetModules()

    // Set up navigator.onLine = true by default
    Object.defineProperty(globalThis, 'navigator', {
      writable: true,
      configurable: true,
      value: {
        onLine: true,
        serviceWorker: undefined,
      },
    })

    // Set up window event listeners
    Object.defineProperty(globalThis, 'window', {
      writable: true,
      configurable: true,
      value: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    })
  })

  describe('initial state', () => {
    it('isOffline starts false when navigator.onLine = true', async () => {
      const { useOfflineStatus } = await import('../../../app/composables/useOfflineStatus')
      const { isOffline } = useOfflineStatus()
      expect(isOffline.value).toBe(false)
    })

    it('tileCount starts at 0', async () => {
      const { useOfflineStatus } = await import('../../../app/composables/useOfflineStatus')
      const { tileCount } = useOfflineStatus()
      expect(tileCount.value).toBe(0)
    })

    it('cacheAges starts as empty object', async () => {
      const { useOfflineStatus } = await import('../../../app/composables/useOfflineStatus')
      const { cacheAges } = useOfflineStatus()
      expect(cacheAges.value).toEqual({})
    })
  })

  describe('computed: lastWeatherUpdate', () => {
    it('returns null when no weather cache age stored', async () => {
      const { useOfflineStatus } = await import('../../../app/composables/useOfflineStatus')
      const { lastWeatherUpdate } = useOfflineStatus()
      expect(lastWeatherUpdate.value).toBeNull()
    })
  })

  describe('computed: lastForecastUpdate', () => {
    it('returns null when no forecast cache age stored', async () => {
      const { useOfflineStatus } = await import('../../../app/composables/useOfflineStatus')
      const { lastForecastUpdate } = useOfflineStatus()
      expect(lastForecastUpdate.value).toBeNull()
    })
  })

  describe('computed: isWeatherStale', () => {
    it('returns false when no weather cache age stored', async () => {
      const { useOfflineStatus } = await import('../../../app/composables/useOfflineStatus')
      const { isWeatherStale } = useOfflineStatus()
      expect(isWeatherStale.value).toBe(false)
    })

    it('returns true when weather data is > 30 min old', async () => {
      vi.useFakeTimers()
      const now = Date.now()
      vi.setSystemTime(now)

      const { useOfflineStatus } = await import('../../../app/composables/useOfflineStatus')
      const { isWeatherStale, cacheAges } = useOfflineStatus()

      // Set cache age to 31 minutes ago
      const thirtyOneMinutesAgo = now - (31 * 60 * 1000)
      cacheAges.value = { '/api/weather/cloud-cover': thirtyOneMinutesAgo }

      expect(isWeatherStale.value).toBe(true)
      vi.useRealTimers()
    })

    it('returns false when weather data is < 30 min old', async () => {
      vi.useFakeTimers()
      const now = Date.now()
      vi.setSystemTime(now)

      const { useOfflineStatus } = await import('../../../app/composables/useOfflineStatus')
      const { isWeatherStale, cacheAges } = useOfflineStatus()

      // Set cache age to 10 minutes ago
      const tenMinutesAgo = now - (10 * 60 * 1000)
      cacheAges.value = { '/api/weather/cloud-cover': tenMinutesAgo }

      expect(isWeatherStale.value).toBe(false)
      vi.useRealTimers()
    })
  })

  describe('formatRelativeTime', () => {
    it('returns "just now" for < 1 minute', async () => {
      const { useOfflineStatus } = await import('../../../app/composables/useOfflineStatus')
      const { formatRelativeTime } = useOfflineStatus()
      expect(formatRelativeTime(30_000)).toBe('just now')
      expect(formatRelativeTime(59_000)).toBe('just now')
    })

    it('returns "X min ago" for 1-59 minutes', async () => {
      const { useOfflineStatus } = await import('../../../app/composables/useOfflineStatus')
      const { formatRelativeTime } = useOfflineStatus()
      expect(formatRelativeTime(60_000)).toBe('1 min ago')
      expect(formatRelativeTime(5 * 60_000)).toBe('5 min ago')
      expect(formatRelativeTime(59 * 60_000)).toBe('59 min ago')
    })

    it('returns "Xh ago" for 1-23 hours', async () => {
      const { useOfflineStatus } = await import('../../../app/composables/useOfflineStatus')
      const { formatRelativeTime } = useOfflineStatus()
      expect(formatRelativeTime(60 * 60_000)).toBe('1h ago')
      expect(formatRelativeTime(3 * 60 * 60_000)).toBe('3h ago')
    })

    it('returns "Xd ago" for 24+ hours', async () => {
      const { useOfflineStatus } = await import('../../../app/composables/useOfflineStatus')
      const { formatRelativeTime } = useOfflineStatus()
      expect(formatRelativeTime(24 * 60 * 60_000)).toBe('1d ago')
      expect(formatRelativeTime(48 * 60 * 60_000)).toBe('2d ago')
    })
  })

  describe('return shape', () => {
    it('returns all expected properties', async () => {
      const { useOfflineStatus } = await import('../../../app/composables/useOfflineStatus')
      const result = useOfflineStatus()
      expect(result).toHaveProperty('isOffline')
      expect(result).toHaveProperty('cacheAges')
      expect(result).toHaveProperty('tileCount')
      expect(result).toHaveProperty('lastWeatherUpdate')
      expect(result).toHaveProperty('lastForecastUpdate')
      expect(result).toHaveProperty('isWeatherStale')
      expect(result).toHaveProperty('formatRelativeTime')
      expect(result).toHaveProperty('refreshCacheStatus')
      expect(result).toHaveProperty('precacheApiData')
    })
  })
})
