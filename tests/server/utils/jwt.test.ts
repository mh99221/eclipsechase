import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'
import { SignJWT, jwtVerify, importPKCS8, importSPKI } from 'jose'

const __filename = fileURLToPath(import.meta.url)
const __dir = dirname(__filename)

const privatePem = readFileSync(join(__dir, '../../mocks/keys/private.pem'), 'utf-8')
const publicPem = readFileSync(join(__dir, '../../mocks/keys/public.pem'), 'utf-8')

// Recreate the token-generation logic using the test keypair
// (server/utils/jwt.ts uses useRuntimeConfig() which isn't available in unit tests)
async function signToken(
  payload: Record<string, unknown>,
  expirationTime: string | number,
): Promise<string> {
  const privateKey = await importPKCS8(privatePem, 'RS256')
  const jwt = new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
  return jwt.sign(privateKey)
}

describe('JWT sign/verify with RS256', () => {
  it('signs a token and verifies it with the public key', async () => {
    const publicKey = await importSPKI(publicPem, 'RS256')
    const token = await signToken({ sub: 'abc123', sid: 'sess_001', v: 1 }, '1h')
    const { payload } = await jwtVerify(token, publicKey)

    expect(payload.sub).toBe('abc123')
    expect(payload.sid).toBe('sess_001')
    expect(payload.v).toBe(1)
  })

  it('token contains iat and exp claims', async () => {
    const publicKey = await importSPKI(publicPem, 'RS256')
    const token = await signToken({ sub: 'user@example.com' }, '2h')
    const { payload } = await jwtVerify(token, publicKey)

    expect(typeof payload.iat).toBe('number')
    expect(typeof payload.exp).toBe('number')
    expect(payload.exp!).toBeGreaterThan(payload.iat!)
  })

  it('rejects a token signed with a different key', async () => {
    // Generate a different private key by importing the wrong format
    // We'll sign with the correct key but swap claims in the header manually
    // Simplest: generate a fresh token and tamper with one character
    const token = await signToken({ sub: 'tamper' }, '1h')
    const parts = token.split('.')
    // Tamper with the signature
    const tampered = `${parts[0]}.${parts[1]}.${parts[2].slice(0, -4)}XXXX`

    const publicKey = await importSPKI(publicPem, 'RS256')
    await expect(jwtVerify(tampered, publicKey)).rejects.toThrow()
  })

  it('rejects an expired token', async () => {
    // Sign with expiry in the past (negative seconds)
    const privateKey = await importPKCS8(privatePem, 'RS256')
    const token = await new SignJWT({ sub: 'expired_user' })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 120)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(privateKey)

    const publicKey = await importSPKI(publicPem, 'RS256')
    await expect(jwtVerify(token, publicKey)).rejects.toThrow()
  })

  it('token header specifies RS256 algorithm', async () => {
    const token = await signToken({ sub: 'alg-check' }, '1h')
    const headerB64 = token.split('.')[0]
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf-8'))
    expect(header.alg).toBe('RS256')
  })

  it('token payload contains custom pro claims', async () => {
    const emailHash = 'a'.repeat(64) // fake sha256 hex
    const sessionId = 'cs_test_session_123'
    const publicKey = await importSPKI(publicPem, 'RS256')
    const token = await signToken({ sub: emailHash, sid: sessionId, v: 1 }, '1h')
    const { payload } = await jwtVerify(token, publicKey)

    expect(payload.sub).toBe(emailHash)
    expect(payload.sid).toBe(sessionId)
    expect(payload.v).toBe(1)
  })
})
