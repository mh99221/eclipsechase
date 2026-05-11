import { serverSupabaseServiceRole } from '#supabase/server'
import { verifyProTokenSignature } from '../../utils/jwt'

/**
 * Server-side sign-out: bump `token_version` on the purchase row
 * identified by the JWT's `pid` claim, so any captured copy of the
 * token (DevTools, screen recording, prior malware run) stops
 * verifying against /api/pro/verify on the next call.
 *
 * Auth is the JWT signature itself — only the holder of a valid
 * Pro JWT can bump its row's version. Legacy tokens without
 * `pid` claims can't be revoked this way; those expire naturally
 * at 2026-08-31 (and the holder can mint a fresh versioned one
 * via Restore).
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
    // Bad signature → caller already has no useful token to revoke.
    return { revoked: false, reason: 'bad-signature' }
  }

  if (typeof claims.pid !== 'number') {
    return { revoked: false, reason: 'legacy-token' }
  }

  const supabase = await serverSupabaseServiceRole(event)
  const { data: updated } = await supabase
    .from('pro_purchases')
    .update({ token_version: (claims.tv ?? 1) + 1 })
    .eq('id', claims.pid)
    .gte('token_version', claims.tv ?? 1)
    .select('id')
    .maybeSingle()

  return { revoked: Boolean(updated) }
})
