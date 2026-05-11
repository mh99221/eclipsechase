import { serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event } from 'h3'
import { verifyProTokenSignature, type VerifiedProClaims } from './jwt'

export interface ProVerifyResult {
  valid: boolean
  reason?: 'missing' | 'malformed' | 'bad-signature' | 'expired' | 'revoked' | 'inactive' | 'not-found'
  claims?: VerifiedProClaims
}

/**
 * Verify a Pro JWT against signature *and* live revocation state in
 * `pro_purchases`. Tokens minted before the v1.1 hardening lack `pid`/`tv`
 * claims — they are grandfathered (signature check only) so existing
 * customers don't get locked out mid-event. The first restore migrates a
 * user to the versioned scheme.
 */
export async function verifyProToken(event: H3Event, token: string | null | undefined): Promise<ProVerifyResult> {
  if (!token) return { valid: false, reason: 'missing' }

  let claims: VerifiedProClaims
  try {
    claims = await verifyProTokenSignature(token)
  } catch (err: any) {
    if (err?.code === 'ERR_JWT_EXPIRED') return { valid: false, reason: 'expired' }
    if (err?.code === 'ERR_JWS_INVALID' || err?.code === 'ERR_JWT_INVALID') {
      return { valid: false, reason: 'malformed' }
    }
    return { valid: false, reason: 'bad-signature' }
  }

  // Legacy tokens: signature ok, no pid/tv claim. Accept as-is.
  if (typeof claims.pid !== 'number' || typeof claims.tv !== 'number') {
    return { valid: true, claims }
  }

  const supabase = await serverSupabaseServiceRole(event)
  const { data } = await supabase
    .from('pro_purchases')
    .select('id, is_active, token_version')
    .eq('id', claims.pid)
    .maybeSingle()

  if (!data) return { valid: false, reason: 'not-found', claims }
  if (!data.is_active) return { valid: false, reason: 'inactive', claims }
  if (typeof data.token_version === 'number' && claims.tv < data.token_version) {
    return { valid: false, reason: 'revoked', claims }
  }

  return { valid: true, claims }
}

function extractBearerToken(event: H3Event): string | null {
  const header = getHeader(event, 'authorization') || getHeader(event, 'Authorization')
  if (!header || typeof header !== 'string') return null
  const match = /^Bearer\s+(\S+)/i.exec(header)
  return match?.[1] ?? null
}

/**
 * Gate a Pro-only API endpoint. Throws 401 if the request lacks a valid
 * Pro JWT.
 *
 * Dev bypass requires BOTH `import.meta.dev === true` (a Vite-baked
 * build-time constant — false in any production bundle) AND the env
 * opt-in `NUXT_ALLOW_PRO_BYPASS=1`. Inverting the default and pinning
 * to a build-time constant means no production runtime config — no
 * missing NODE_ENV, no platform port — can silently open the gate.
 */
export async function requirePro(event: H3Event): Promise<VerifiedProClaims | null> {
  if (import.meta.dev && process.env.NUXT_ALLOW_PRO_BYPASS === '1') {
    return null
  }

  const token = extractBearerToken(event)
  const result = await verifyProToken(event, token)
  if (!result.valid) {
    throw createError({ statusCode: 401, statusMessage: 'Pro access required' })
  }
  return result.claims ?? null
}
