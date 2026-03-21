import { SignJWT, importPKCS8 } from 'jose'
import { createHash } from 'crypto'

const TOKEN_EXPIRY = Math.floor(new Date('2026-08-31T23:59:59Z').getTime() / 1000)

export async function generateProToken(email: string, sessionId: string): Promise<string> {
  const config = useRuntimeConfig()
  const privateKeyPem = config.proJwtPrivateKey.replace(/\\n/g, '\n')
  const privateKey = await importPKCS8(privateKeyPem, 'RS256')
  const emailHash = createHash('sha256').update(email.toLowerCase().trim()).digest('hex')

  return new SignJWT({ sub: emailHash, sid: sessionId, v: 1 })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(privateKey)
}
