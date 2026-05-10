/**
 * Stringify a JSON-LD payload for safe injection into an inline
 * `<script type="application/ld+json">` block.
 *
 * `JSON.stringify` happily encodes the literal substring `</script>`,
 * which would close the surrounding inline-script tag and let attacker-
 * controlled content (e.g. a translated spot name, a future user-
 * submitted advisory body) execute as same-origin JavaScript. We
 * unicode-escape `<`, `>`, `&`, and U+2028/U+2029 so the serialised
 * payload can never break out of the script tag, no matter what string
 * lands in it.
 */
export function safeJsonLd(payload: unknown): string {
  return JSON.stringify(payload)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/ /g, '\\u2028')
    .replace(/ /g, '\\u2029')
}
