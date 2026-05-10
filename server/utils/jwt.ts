import { SignJWT, jwtVerify, importPKCS8, importSPKI } from 'jose'
import type { KeyLike, JWTPayload } from 'jose'

const TOKEN_EXPIRY = Math.floor(new Date('2026-08-31T23:59:59Z').getTime() / 1000)

// Public key is embedded in the client too (app/composables/useProStatus.ts).
// Server keeps a copy for /api/pro/verify and requirePro() — we never trust
// just the signature; we also cross-check the `tv` (token version) claim
// against the live `pro_purchases.token_version` so a JWT revoked via the
// Restore flow stops being honored on Pro-only endpoints.
const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAv/rPri8Iy0lr22jC8rSP
NR5ec5cdNqCRmxxTHp56/yFC6UUSYV32Yj6ORYelufcO9bQqxSvLJ9m3MizU/VIc
bPcFhkw30kW86lBTKFnmTiR4500bRRUYxQBBMQQa6gM+Pt760teAp3eYSeNqCG4q
4itcYLFAgyEXjs1ATg8Rd8V5x+DMt6soDVEzq0mp9opPceRSFhZlSAt9JFUytxOC
M8skz+Q0eGpKj52U9fFwxN7ikuF8FbDl85nbqoyDxQx1GGMRPGeJdeHWGOwNPLP1
K6mJ78jY5Yija/6bQeXxAruRuTXJMu1m1E+LHCX3ShQI6CWak3gCWJgZlaFJw5WX
RwIDAQAB
-----END PUBLIC KEY-----`

let cachedPrivateKey: KeyLike | null = null
let cachedPublicKey: KeyLike | null = null

async function getPrivateKey(): Promise<KeyLike> {
  if (cachedPrivateKey) return cachedPrivateKey
  const config = useRuntimeConfig()
  const privateKeyPem = config.proJwtPrivateKey.replace(/\\n/g, '\n')
  cachedPrivateKey = await importPKCS8(privateKeyPem, 'RS256') as KeyLike
  return cachedPrivateKey
}

async function getPublicKey(): Promise<KeyLike> {
  if (cachedPublicKey) return cachedPublicKey
  cachedPublicKey = await importSPKI(PUBLIC_KEY_PEM, 'RS256') as KeyLike
  return cachedPublicKey
}

export interface ProTokenOptions {
  /** pro_purchases.id — bound into the JWT so server verify can check token_version. */
  purchaseId: number
  /** pro_purchases.token_version at issuance time. */
  tokenVersion: number
}

export async function generateProToken(
  email: string,
  sessionId: string,
  opts: ProTokenOptions,
): Promise<string> {
  const privateKey = await getPrivateKey()
  const emailHash = hashEmail(email)

  return new SignJWT({
    sub: emailHash,
    sid: sessionId,
    pid: opts.purchaseId,
    tv: opts.tokenVersion,
    v: 1,
  })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(privateKey)
}

export interface VerifiedProClaims extends JWTPayload {
  sub: string
  sid?: string
  /** pro_purchases.id — present on tokens minted since the v1.1 hardening. */
  pid?: number
  /** Token version this JWT was minted at. */
  tv?: number
}

/**
 * Verifies the JWT signature only. Does NOT check token_version against
 * the database — callers that need revocation (server verify endpoint,
 * requirePro) must do that as a follow-up.
 */
export async function verifyProTokenSignature(token: string): Promise<VerifiedProClaims> {
  const publicKey = await getPublicKey()
  const { payload } = await jwtVerify(token, publicKey, { algorithms: ['RS256'] })
  if (typeof payload.sub !== 'string') {
    throw new Error('JWT missing sub claim')
  }
  return payload as VerifiedProClaims
}
