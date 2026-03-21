import { jwtVerify, importSPKI } from 'jose'
import type { KeyLike } from 'jose'
import { getTokenFromIndexedDB, saveTokenToIndexedDB, removeTokenFromIndexedDB } from '~/utils/proStorage'

const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArqJFkSuI5RObxTWBz1JH
fb+h9DOzcDa0VjbCrSokn1KwAuoi1hyyKJfF2pdaOuBLcIhY0johJbEHVVor0PuV
YPfMfvxztEzd+hXV0WuAdK/bRbg2EuekHD/vq+Vxf0uEQ4A9W6rYG9lB5UwJ8BMR
EFMw+L4SKFuycZXorze8yBQtwI0GiKhit42YLeClGluqBTT+2iRiFB9m0ZC7w3NR
fSLnktNYSRomzn8BrPkNKRHzhriXlZP2gME1PtBSo2idrGYRhaHjtiZtbcvRHZLb
G5rmvRTzwqxOg78RVRbivirocQWyDese4w9I7sGsjW7+PElJBTgA1d5gdlzecw0n
OwIDAQAB
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
    catch {
      isPro.value = false
      await removeTokenFromIndexedDB()
    }
    finally {
      loading.value = false
    }
  }

  async function activate(token: string) {
    await saveTokenToIndexedDB(token)
    isPro.value = true
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
