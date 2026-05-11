/**
 * Baseline security response headers applied to every response.
 *
 * - Referrer-Policy: keeps the /pro/success session_id out of
 *   cross-origin Referer headers during the 10-min activation grace.
 * - X-Frame-Options: blocks framing of /dashboard / /map (clickjacking
 *   defence against Pro users).
 * - X-Content-Type-Options: stops MIME sniffing.
 * - Permissions-Policy: only this origin may prompt for geolocation
 *   (useLocation); camera / mic / payment denied — we redirect to
 *   Stripe Checkout instead of using the Payment Request API.
 */
const HEADERS = {
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'geolocation=(self), camera=(), microphone=(), payment=()',
} as const

export default defineEventHandler((event) => {
  setResponseHeaders(event, HEADERS)
})
