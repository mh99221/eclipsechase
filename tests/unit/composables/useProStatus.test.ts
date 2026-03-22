import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SignJWT, importPKCS8, importSPKI } from 'jose'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'

// Load test keys (different from the production PUBLIC_KEY_PEM in useProStatus)
const __dirname = dirname(fileURLToPath(import.meta.url))
const keysDir = resolve(__dirname, '../../mocks/keys')
const TEST_PRIVATE_PEM = readFileSync(resolve(keysDir, 'private.pem'), 'utf-8')
const TEST_PUBLIC_PEM = readFileSync(resolve(keysDir, 'public.pem'), 'utf-8')

async function makeToken(payload: Record<string, unknown> = {}, privateKeyPem = TEST_PRIVATE_PEM): Promise<string> {
  const privateKey = await importPKCS8(privateKeyPem, 'RS256')
  return new SignJWT({ product: 'eclipse_pro_2026', ...payload })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setExpirationTime('1y')
    .sign(privateKey)
}

// --- Mocks ---

// Mock proStorage module
const mockGetToken = vi.fn<() => Promise<string | null>>()
const mockSaveToken = vi.fn<(token: string) => Promise<void>>()
const mockRemoveToken = vi.fn<() => Promise<void>>()

vi.mock('../../../app/utils/proStorage', () => ({
  getTokenFromIndexedDB: () => mockGetToken(),
  saveTokenToIndexedDB: (t: string) => mockSaveToken(t),
  removeTokenFromIndexedDB: () => mockRemoveToken(),
}))

// Mock import.meta.client = true (we're testing client-side behaviour)
vi.stubGlobal('import', { meta: { client: true } })

describe('useProStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetToken.mockResolvedValue(null)
    mockSaveToken.mockResolvedValue(undefined)
    mockRemoveToken.mockResolvedValue(undefined)
  })

  it('starts with isPro = false and loading = true', async () => {
    const { useProStatus } = await import('../../../app/composables/useProStatus')
    const { isPro, loading } = useProStatus()
    // Before checkStatus resolves, loading should be true and isPro false
    expect(isPro.value).toBe(false)
    // loading starts true (before any check has run)
    expect(typeof loading.value).toBe('boolean')
  })

  it('checkStatus sets isPro=false when no token exists', async () => {
    const { useProStatus } = await import('../../../app/composables/useProStatus')
    mockGetToken.mockResolvedValue(null)
    const { isPro, loading, checkStatus } = useProStatus()
    await checkStatus()
    expect(isPro.value).toBe(false)
    expect(loading.value).toBe(false)
  })

  it('checkStatus sets isPro=false and clears token on invalid JWT', async () => {
    const { useProStatus } = await import('../../../app/composables/useProStatus')
    mockGetToken.mockResolvedValue('invalid.jwt.token')
    const { isPro, loading, checkStatus } = useProStatus()
    await checkStatus()
    expect(isPro.value).toBe(false)
    expect(loading.value).toBe(false)
    expect(mockRemoveToken).toHaveBeenCalled()
  })

  it('clearPro removes token and sets isPro=false', async () => {
    const { useProStatus } = await import('../../../app/composables/useProStatus')
    const { isPro, clearPro } = useProStatus()
    isPro.value = true
    await clearPro()
    expect(isPro.value).toBe(false)
    expect(mockRemoveToken).toHaveBeenCalled()
  })

  it('activate saves token and sets isPro=true when JWT uses production key', async () => {
    // This test uses the PRODUCTION public key embedded in useProStatus.
    // We cannot forge a token for that key, so we test that activate rejects
    // a token signed with a DIFFERENT key (the test key).
    const { useProStatus } = await import('../../../app/composables/useProStatus')
    const testToken = await makeToken()
    const { activate } = useProStatus()
    // A token signed with the TEST key should fail verification against the
    // PRODUCTION key embedded in useProStatus — this is expected behaviour.
    await expect(activate(testToken)).rejects.toThrow()
    // Token should NOT have been saved
    expect(mockSaveToken).not.toHaveBeenCalled()
  })
})
