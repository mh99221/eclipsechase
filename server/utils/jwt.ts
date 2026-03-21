import { SignJWT, importPKCS8 } from 'jose'
import type { KeyLike } from 'jose'

const TOKEN_EXPIRY = Math.floor(new Date('2026-08-31T23:59:59Z').getTime() / 1000)

let cachedKey: KeyLike | null = null

async function getPrivateKey(): Promise<KeyLike> {
  if (cachedKey) return cachedKey
  const config = useRuntimeConfig()
  const privateKeyPem = config.proJwtPrivateKey.replace(/\\n/g, '\n')
  cachedKey = await importPKCS8(privateKeyPem, 'RS256') as KeyLike
  return cachedKey
}

export async function generateProToken(email: string, sessionId: string): Promise<string> {
  const privateKey = await getPrivateKey()
  const emailHash = hashEmail(email)

  return new SignJWT({ sub: emailHash, sid: sessionId, v: 1 })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(privateKey)
}
