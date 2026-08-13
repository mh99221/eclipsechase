/**
 * vue-i18n runtime options.
 *
 * The only reason this file exists is `fallbackLocale`. @nuxtjs/i18n does
 * not set one by default, so a key present in en.json but missing from
 * is.json renders as its literal path ("archive.notice") on /is/* pages
 * rather than as English text.
 *
 * That was latent for a long time because is.json is essentially fully
 * translated (765 of 769 keys). The 2026-08-13 sunset added 9 English-only
 * keys — one of them the archive banner that PageShell renders on every
 * page — which would have shipped raw key names across the entire
 * Icelandic site.
 *
 * English fallback for untranslated keys is the project's documented
 * policy (CLAUDE.md); this makes it actually true.
 */
export default defineI18nConfig(() => ({
  legacy: false,
  fallbackLocale: 'en',
  // Missing-key warnings are noise in production but useful in dev, where
  // they flag a key that needs an Icelandic translation.
  missingWarn: import.meta.dev,
  fallbackWarn: import.meta.dev,
}))
