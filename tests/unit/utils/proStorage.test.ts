import { describe, it, expect, beforeEach, vi } from 'vitest'

const LS_KEY = 'eclipsechase_pro_token'
const SAMPLE_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.sample.signature'

let store: Record<string, string> = {}

const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value }),
  removeItem: vi.fn((key: string) => { delete store[key] }),
  clear: vi.fn(() => { store = {} }),
}

// IndexedDB stubbed to always fail open() so we exercise the "no
// IndexedDB" path — get returns null, save/remove still purge legacy.
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

async function getStorage() {
  const mod = await import('../../../app/utils/proStorage')
  return mod
}

describe('saveTokenToIndexedDB', () => {
  it('does NOT write to localStorage (storage moved to IndexedDB only)', async () => {
    const { saveTokenToIndexedDB } = await getStorage()
    await saveTokenToIndexedDB(SAMPLE_TOKEN).catch(() => {})
    expect(localStorageMock.setItem).not.toHaveBeenCalled()
  })

  it('purges a legacy localStorage mirror left by a prior build', async () => {
    store[LS_KEY] = 'legacy-token-from-old-build'
    const { saveTokenToIndexedDB } = await getStorage()
    await saveTokenToIndexedDB(SAMPLE_TOKEN).catch(() => {})
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(LS_KEY)
  })
})

describe('getTokenFromIndexedDB', () => {
  it('returns null when IndexedDB open() fails', async () => {
    const { getTokenFromIndexedDB } = await getStorage()
    const token = await getTokenFromIndexedDB()
    expect(token).toBeNull()
  })

  it('does NOT fall back to localStorage (the mirror is gone)', async () => {
    store[LS_KEY] = SAMPLE_TOKEN
    const { getTokenFromIndexedDB } = await getStorage()
    const token = await getTokenFromIndexedDB()
    expect(token).toBeNull()
    expect(localStorageMock.getItem).not.toHaveBeenCalledWith(LS_KEY)
  })
})

describe('removeTokenFromIndexedDB', () => {
  it('purges legacy localStorage entry if present', async () => {
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
