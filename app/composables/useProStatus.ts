import { jwtVerify, importSPKI } from 'jose'
import type { KeyLike } from 'jose'
import { getTokenFromIndexedDB, saveTokenToIndexedDB, removeTokenFromIndexedDB } from '~/utils/proStorage'

const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAv/rPri8Iy0lr22jC8rSP
NR5ec5cdNqCRmxxTHp56/yFC6UUSYV32Yj6ORYelufcO9bQqxSvLJ9m3MizU/VIc
bPcFhkw30kW86lBTKFnmTiR4500bRRUYxQBBMQQa6gM+Pt760teAp3eYSeNqCG4q
4itcYLFAgyEXjs1ATg8Rd8V5x+DMt6soDVEzq0mp9opPceRSFhZlSAt9JFUytxOC
M8skz+Q0eGpKj52U9fFwxN7ikuF8FbDl85nbqoyDxQx1GGMRPGeJdeHWGOwNPLP1
K6mJ78jY5Yija/6bQeXxAruRuTXJMu1m1E+LHCX3ShQI6CWak3gCWJgZlaFJw5WX
RwIDAQAB
-----END PUBLIC KEY-----`

let cachedPublicKey: KeyLike | null = null

async function getPublicKey(): Promise<KeyLike> {
  if (cachedPublicKey) return cachedPublicKey
  cachedPublicKey = await importSPKI(PUBLIC_KEY_PEM, 'RS256') as KeyLike
  return cachedPublicKey
}

export function useProStatus() {
  const isPro = useState<boolean>('pro-status', () => false)
  const loading = useState<boolean>('pro-loading', () => true)

  async function checkStatus() {
    if (!import.meta.client) {
      loading.value = false
      return
    }

    // Dev bypass: treat as Pro on localhost by default. Set
    // NUXT_PUBLIC_BYPASS_PRO_GATE=0 in .env to test the real gate.
    const bypass = useRuntimeConfig().public.bypassProGate
    if (import.meta.dev && bypass !== '0') {
      isPro.value = true
      loading.value = false
      return
    }

    try {
      const token = await getTokenFromIndexedDB()
      if (!token) {
        isPro.value = false
        loading.value = false
        return
      }

      // Local signature check first so we work offline. If a stale/bad
      // token is in storage, this rejects it without any network call.
      const publicKey = await getPublicKey()
      await jwtVerify(token, publicKey)
      isPro.value = true
      loading.value = false

      // Online revocation check — confirms the JWT's `tv` (token version)
      // still matches the live row. Lets the Restore flow actually evict
      // a leaked historical token instead of leaving it valid until the
      // absolute expiry. Skipped silently when offline.
      if (navigator.onLine !== false) {
        try {
          const result = await $fetch<{ valid: boolean; reason: string | null }>('/api/pro/verify', {
            method: 'POST',
            body: { token },
          })
          if (!result.valid && (result.reason === 'revoked' || result.reason === 'inactive' || result.reason === 'not-found')) {
            console.warn('[Pro] Server reports token revoked:', result.reason)
            isPro.value = false
            await removeTokenFromIndexedDB()
          }
        } catch {
          // Network / server hiccup — keep locally-verified Pro status.
        }
      }
    }
    catch (err) {
      console.error('[Pro] JWT verification failed, removing token:', err)
      isPro.value = false
      await removeTokenFromIndexedDB()
      loading.value = false
    }
  }

  async function activate(token: string) {
    // Verify before saving — surface key mismatches immediately
    const publicKey = await getPublicKey()
    await jwtVerify(token, publicKey)
    await saveTokenToIndexedDB(token)
    isPro.value = true
    loading.value = false
  }

  async function clearPro() {
    await removeTokenFromIndexedDB()
    isPro.value = false
  }

  /**
   * Returns an `Authorization: Bearer <jwt>` header object for use in
   * $fetch calls to Pro-gated endpoints (see server/utils/proAuth.ts).
   * Empty object if no token is available — caller will get a 401 in
   * that case which the page should treat as a gate failure.
   */
  async function authHeaders(): Promise<Record<string, string>> {
    if (!import.meta.client) return {}
    try {
      const token = await getTokenFromIndexedDB()
      return token ? { Authorization: `Bearer ${token}` } : {}
    } catch {
      return {}
    }
  }

  onMounted(() => {
    if (loading.value) checkStatus()
  })

  return { isPro, loading, checkStatus, activate, clearPro, authHeaders }
}
