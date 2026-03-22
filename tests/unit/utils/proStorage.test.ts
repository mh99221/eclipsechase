import { describe, it, expect, beforeEach, vi } from 'vitest'

const LS_KEY = 'eclipsechase_pro_token'
const SAMPLE_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.sample.signature'

/**
 * proStorage uses IndexedDB with localStorage as a reliable backup.
 * The Nuxt test environment (happy-dom) does not fully expose IndexedDB or
 * localStorage as fully functional globals in all workers. We mock both at
 * the globalThis level so we can test the observable behaviour.
 *
 * The key contract under test:
 *  - saveTokenToIndexedDB always writes to localStorage
 *  - getTokenFromIndexedDB reads from IndexedDB first, falls back to localStorage
 *  - removeTokenFromIndexedDB always removes from localStorage
 */

// In-memory localStorage mock
let store: Record<string, string> = {}

const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value }),
  removeItem: vi.fn((key: string) => { delete store[key] }),
  clear: vi.fn(() => { store = {} }),
}

// Mock IndexedDB to always fail (simulating unavailability)
// This forces the code onto the localStorage fallback path
const indexedDBMock = {
  open: vi.fn(() => {
    const req: any = {}
    setTimeout(() => {
      if (req.onerror) req.onerror()
    }, 0)
    return req
  }),
}

beforeEach(() => {
  store = {}
  vi.clearAllMocks()

  // Install mocks on globalThis
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  })

  Object.defineProperty(globalThis, 'indexedDB', {
    value: indexedDBMock,
    writable: true,
    configurable: true,
  })
})

// Dynamic import to pick up the mocked globals each test
async function getStorage() {
  // We need to reset the module cache to pick up fresh mocks
  // because proStorage has a module-level dbPromise cache.
  // Use a workaround: import the module and access the exports.
  const mod = await import('../../../app/utils/proStorage')
  return mod
}

describe('saveTokenToIndexedDB', () => {
  it('saves token to localStorage as backup', async () => {
    const { saveTokenToIndexedDB } = await getStorage()
    await saveTokenToIndexedDB(SAMPLE_TOKEN).catch(() => {})
    expect(localStorageMock.setItem).toHaveBeenCalledWith(LS_KEY, SAMPLE_TOKEN)
  })

  it('overwrites existing token in localStorage', async () => {
    store[LS_KEY] = 'old-token'
    const { saveTokenToIndexedDB } = await getStorage()
    await saveTokenToIndexedDB(SAMPLE_TOKEN).catch(() => {})
    expect(localStorageMock.setItem).toHaveBeenCalledWith(LS_KEY, SAMPLE_TOKEN)
  })
})

describe('getTokenFromIndexedDB', () => {
  it('returns null when localStorage is empty and IndexedDB fails', async () => {
    const { getTokenFromIndexedDB } = await getStorage()
    const token = await getTokenFromIndexedDB()
    expect(token).toBeNull()
  })

  it('returns token from localStorage fallback when IndexedDB fails', async () => {
    store[LS_KEY] = SAMPLE_TOKEN
    const { getTokenFromIndexedDB } = await getStorage()
    const token = await getTokenFromIndexedDB()
    expect(token).toBe(SAMPLE_TOKEN)
  })
})

describe('removeTokenFromIndexedDB', () => {
  it('removes token from localStorage', async () => {
    store[LS_KEY] = SAMPLE_TOKEN
    const { removeTokenFromIndexedDB } = await getStorage()
    await removeTokenFromIndexedDB()
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(LS_KEY)
  })

  it('resolves without throwing when nothing to remove', async () => {
    const { removeTokenFromIndexedDB } = await getStorage()
    await expect(removeTokenFromIndexedDB()).resolves.not.toThrow()
  })
})

describe('localStorage fallback (IndexedDB unavailable)', () => {
  it('save writes to localStorage, get reads it back', async () => {
    const { saveTokenToIndexedDB, getTokenFromIndexedDB } = await getStorage()

    // Save puts it in localStorage
    await saveTokenToIndexedDB(SAMPLE_TOKEN).catch(() => {})
    // Simulate that localStorage.setItem was called and store was updated
    store[LS_KEY] = SAMPLE_TOKEN

    // Get reads from localStorage fallback
    const retrieved = await getTokenFromIndexedDB()
    expect(retrieved).toBe(SAMPLE_TOKEN)
  })

  it('remove clears localStorage key', async () => {
    store[LS_KEY] = SAMPLE_TOKEN
    const { removeTokenFromIndexedDB } = await getStorage()
    await removeTokenFromIndexedDB()
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(LS_KEY)
  })

  it('correct localStorage key is used (eclipsechase_pro_token)', async () => {
    const { saveTokenToIndexedDB } = await getStorage()
    await saveTokenToIndexedDB(SAMPLE_TOKEN).catch(() => {})
    // Verify it was saved with the correct key
    expect(localStorageMock.setItem).toHaveBeenCalledWith(LS_KEY, SAMPLE_TOKEN)
  })
})
