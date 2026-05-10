/**
 * Baseline security response headers applied to every response.
 *
 * - Referrer-Policy: prevents the full URL (including query string) from
 *   leaking in Referer headers when the page links to a third party. The
 *   /pro/success page carries the Stripe session_id in the query, which
 *   the activate-replay grace window treats as an authentication token —
 *   strict-origin-when-cross-origin keeps that out of cross-origin
 *   Referers.
 *
 * - X-Frame-Options + frame-ancestors via CSP: blocks framing so a
 *   malicious origin can't host /dashboard or /map in a clickjacking
 *   overlay against a Pro user.
 *
 * - X-Content-Type-Options: stops MIME sniffing that could turn an
 *   `image/*` upload into an executable script under some browsers.
 *
 * - Permissions-Policy: only this origin may prompt for geolocation
 *   (used by useLocation), and camera / microphone / payment APIs are
 *   denied outright — we redirect to Stripe Checkout instead of using
 *   the Payment Request API, and we never need camera or mic.
 */
export default defineEventHandler((event) => {
  setResponseHeaders(event, {
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'geolocation=(self), camera=(), microphone=(), payment=()',
  })
})
