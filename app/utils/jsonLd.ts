/**
 * Stringify a JSON-LD payload for safe injection into an inline
 * `<script type="application/ld+json">` block.
 *
 * `JSON.stringify` happily encodes the literal closing-script substring,
 * which would let attacker-controlled content (e.g. a translated spot
 * name, a future user-submitted advisory body) execute as same-origin
 * JavaScript. We replace each dangerous character with its `\uXXXX`
 * escape so the serialised payload can never break out of the inline
 * script tag, no matter what string lands in it.
 *
 * Implementation notes:
 *  - The replacement string is built from `String.fromCharCode(0x5c)`
 *    (backslash) + `u` + the codepoint's hex. Source-level string
 *    literals like `'<'` get reduced to a single `<` by the JS parser
 *    at load time, making `replace(/</g, '<')` a no-op. Building the
 *    replacement at runtime avoids that footgun.
 *  - The regex pattern is assembled from char codes for the same
 *    reason: a literal U+2028 / U+2029 inside a regex literal is
 *    parsed by esbuild as a real newline, which is a syntax error
 *    in the production build pipeline.
 */
const BACKSLASH = String.fromCharCode(0x5c)
const DANGEROUS_RE = new RegExp(
  '[<>&' + String.fromCharCode(0x2028) + String.fromCharCode(0x2029) + ']',
  'g',
)

function unicodeEscape(c: string): string {
  return BACKSLASH + 'u' + c.charCodeAt(0).toString(16).padStart(4, '0')
}

export function safeJsonLd(payload: unknown): string {
  return JSON.stringify(payload).replace(DANGEROUS_RE, unicodeEscape)
}
