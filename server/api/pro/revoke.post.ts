import { serverSupabaseServiceRole } from '#supabase/server'
import { verifyProTokenSignature } from '../../utils/jwt'
import { bumpTokenVersion } from '../../utils/proAuth'

/**
 * Server-side sign-out: bumps `token_version` on the purchase row
 * identified by the JWT's `pid` claim so any captured copy of the
 * token stops verifying on the next /api/pro/verify call.
 *
 * Auth is the JWT signature itself — only the holder of a valid Pro
 * JWT can bump its row's version. Uses `verifyProTokenSignature`
 * (signature-only) rather than `verifyProToken` so revoke is
 * idempotent — a row already at `tv = claims.tv + 1` from a prior
 * call is fine, the CAS just no-ops.
 */
export default defineEventHandler(async (event) => {
  const { token } = await readBody<{ token: string }>(event)
  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'token is required' })
  }

  let claims
  try {
    claims = await verifyProTokenSignature(token)
  } catch {
    return { revoked: false, reason: 'bad-signature' }
  }

  if (typeof claims.pid !== 'number' || typeof claims.tv !== 'number') {
    return { revoked: false, reason: 'legacy-token' }
  }

  const supabase = await serverSupabaseServiceRole(event)
  const { bumped } = await bumpTokenVersion(supabase, claims.pid, claims.tv)
  return { revoked: bumped }
})
