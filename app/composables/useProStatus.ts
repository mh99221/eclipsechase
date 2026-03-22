import { jwtVerify, importSPKI } from 'jose'
import type { KeyLike } from 'jose'
import { getTokenFromIndexedDB, saveTokenToIndexedDB, removeTokenFromIndexedDB } from '~/utils/proStorage'

const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyxe5KSWEkDbaANYrh+Rn
eQKcuYD8JwypRZK9PocVyhdEtF5zfQuVQu5aDm3QVb24gX199/nE7MKW1Ej3y/f6
BPki2EpKEHbi/SFmJSLXPx8MY0dJpYG7e3aeu1uytKdIYd3Qfc3GICZGkfaurAya
tCu7r6cTEgMgpoAyvC4p9MnXB9GziGx0a1TQY3Z4+FzIwAL73MeXhKtAXdS7tPSV
XhXJiraLHeIoieC1zdN0K86Xw3ZNQiDv8y4rLKDCmCg2m64Y4yEVqZplojcOouMp
4wc71ehorMaEcnVjXDOaH0SWLmGI+Ek9mCFgm8d0AFFwleE17p5jVq7U1zvFSp7D
HwIDAQAB
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

    try {
      const token = await getTokenFromIndexedDB()
      if (!token) {
        isPro.value = false
        loading.value = false
        return
      }

      const publicKey = await getPublicKey()
      await jwtVerify(token, publicKey)
      isPro.value = true
    }
    catch (err) {
      console.error('[Pro] JWT verification failed, removing token:', err)
      isPro.value = false
      await removeTokenFromIndexedDB()
    }
    finally {
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

  onMounted(() => {
    if (loading.value) checkStatus()
  })

  return { isPro, loading, checkStatus, activate, clearPro }
}
