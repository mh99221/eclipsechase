import { describe, it, expect, beforeEach, vi } from 'vitest'

// useAnalyticsConsent has module-level state (consentState, umamiLoaded).
// We must vi.resetModules() in each test to get a fresh module instance.

// In-memory localStorage mock
let lsStore: Record<string, string> = {}

const localStorageMock = {
  getItem: vi.fn((key: string) => lsStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { lsStore[key] = value }),
  removeItem: vi.fn((key: string) => { delete lsStore[key] }),
  clear: vi.fn(() => { lsStore = {} }),
}

// DOM mock for document.head.appendChild
const appendChildMock = vi.fn()

beforeEach(() => {
  lsStore = {}
  vi.clearAllMocks()
  vi.resetModules()

  // Install localStorage mock
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  })

  // Install document mock
  Object.defineProperty(globalThis, 'document', {
    value: {
      createElement: vi.fn(() => ({
        src: '',
        async: false,
        dataset: {},
      })),
      head: { appendChild: appendChildMock },
    },
    writable: true,
    configurable: true,
  })
})

async function getComposable() {
  const mod = await import('../../../app/composables/useAnalyticsConsent')
  return mod.useAnalyticsConsent()
}

describe('useAnalyticsConsent', () => {
  describe('initial state — no prior consent in localStorage', () => {
    it('consentState is null when localStorage is empty', async () => {
      const { consentState } = await getComposable()
      expect(consentState.value).toBeNull()
    })

    it('hasConsent is false when consentState is null', async () => {
      const { hasConsent } = await getComposable()
      expect(hasConsent.value).toBe(false)
    })

    it('consentGiven is false when consentState is null', async () => {
      const { consentGiven } = await getComposable()
      expect(consentGiven.value).toBe(false)
    })
  })

  describe('initial state — returning user with "all" consent', () => {
    beforeEach(() => {
      lsStore['eclipsechase-consent'] = 'all'
    })

    it('reads consent from localStorage on module init', async () => {
      const { consentState } = await getComposable()
      expect(consentState.value).toBe('all')
    })

    it('hasConsent is true for "all" consent', async () => {
      const { hasConsent } = await getComposable()
      expect(hasConsent.value).toBe(true)
    })

    it('consentGiven is true for "all" consent', async () => {
      const { consentGiven } = await getComposable()
      expect(consentGiven.value).toBe(true)
    })
  })

  describe('initial state — returning user with "essential" consent', () => {
    beforeEach(() => {
      lsStore['eclipsechase-consent'] = 'essential'
    })

    it('reads "essential" consent from localStorage', async () => {
      const { consentState } = await getComposable()
      expect(consentState.value).toBe('essential')
    })

    it('hasConsent is false for "essential" consent (analytics not allowed)', async () => {
      const { hasConsent } = await getComposable()
      expect(hasConsent.value).toBe(false)
    })

    it('consentGiven is true for "essential" consent', async () => {
      const { consentGiven } = await getComposable()
      expect(consentGiven.value).toBe(true)
    })
  })

  describe('setConsent("all")', () => {
    it('updates consentState to "all"', async () => {
      const { consentState, setConsent } = await getComposable()
      setConsent('all')
      expect(consentState.value).toBe('all')
    })

    it('persists "all" to localStorage', async () => {
      const { setConsent } = await getComposable()
      setConsent('all')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('eclipsechase-consent', 'all')
    })

    it('hasConsent becomes true after setConsent("all")', async () => {
      const { hasConsent, setConsent } = await getComposable()
      setConsent('all')
      expect(hasConsent.value).toBe(true)
    })

    it('consentGiven becomes true after setConsent("all")', async () => {
      const { consentGiven, setConsent } = await getComposable()
      setConsent('all')
      expect(consentGiven.value).toBe(true)
    })
  })

  describe('setConsent("essential")', () => {
    it('updates consentState to "essential"', async () => {
      const { consentState, setConsent } = await getComposable()
      setConsent('essential')
      expect(consentState.value).toBe('essential')
    })

    it('persists "essential" to localStorage', async () => {
      const { setConsent } = await getComposable()
      setConsent('essential')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('eclipsechase-consent', 'essential')
    })

    it('hasConsent stays false after setConsent("essential")', async () => {
      const { hasConsent, setConsent } = await getComposable()
      setConsent('essential')
      expect(hasConsent.value).toBe(false)
    })

    it('consentGiven becomes true after setConsent("essential")', async () => {
      const { consentGiven, setConsent } = await getComposable()
      setConsent('essential')
      expect(consentGiven.value).toBe(true)
    })
  })

  describe('return shape', () => {
    it('returns consentState, hasConsent, consentGiven, setConsent', async () => {
      const result = await getComposable()
      expect(result).toHaveProperty('consentState')
      expect(result).toHaveProperty('hasConsent')
      expect(result).toHaveProperty('consentGiven')
      expect(result).toHaveProperty('setConsent')
      expect(typeof result.setConsent).toBe('function')
    })
  })
})
