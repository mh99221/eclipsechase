/**
 * Read a CSS custom property and emit a Mapbox-compatible rgb() string.
 *
 * Our design tokens are stored as space-separated rgb triples ("245 158 11")
 * for use with `rgb(var(--accent) / <alpha>)`. Mapbox GL's style-spec
 * colour parser only accepts the comma-separated form, so we convert it.
 *
 * SSR-safe: returns `fallback` when `window` is undefined.
 */
export function readCssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  if (!raw) return fallback
  const parts = raw.split(/[\s,]+/).filter(Boolean)
  if (parts.length < 3) return fallback
  return `rgb(${parts.slice(0, 3).join(', ')})`
}
