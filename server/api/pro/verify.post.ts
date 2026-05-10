import { verifyProToken } from '../../utils/proAuth'

/**
 * Online revocation check for the client-side Pro gate. The client still
 * verifies the JWT signature locally with the embedded public key (so the
 * gate works offline), but on every app open we ask the server whether
 * the embedded `tv` claim is still current. Stops a stolen historical
 * token from working past the next online check.
 */
export default defineEventHandler(async (event) => {
  const { token } = await readBody<{ token: string }>(event)
  const result = await verifyProToken(event, token)
  return { valid: result.valid, reason: result.reason ?? null }
})
