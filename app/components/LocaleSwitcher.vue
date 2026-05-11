<script setup lang="ts">
/**
 * Single-button locale toggle. Always shows the OTHER locale's short
 * code (when on `en`, the button reads "IS"; when on `is`, it reads
 * "EN"). Clicking switches and persists via the `i18n_redirected`
 * cookie that @nuxtjs/i18n's detectBrowserLanguage option sets.
 *
 * Renders inside an SSR-safe NuxtLink so the click target is a real
 * <a href> with the localized destination — search engines and
 * keyboard users see the correct route directly.
 */
const { locale, locales } = useI18n()
const switchLocalePath = useSwitchLocalePath()

// Hardcoded display labels. `locales` from useI18n() doesn't carry
// short codes, and we want "EN" / "IS" rather than "English" /
// "Íslenska" in the chrome.
const SHORT: Record<string, string> = {
  en: 'EN',
  is: 'IS',
}

// The OTHER locale (anything that isn't currently active). With two
// locales this is unambiguous; if a third is added later the first
// non-active one wins.
const otherLocale = computed(() => {
  const active = String(locale.value)
  const codes = (locales.value as Array<{ code: string }>).map(l => l.code)
  return codes.find(c => c !== active) ?? active
})

const otherShort = computed(() => SHORT[otherLocale.value] ?? otherLocale.value.toUpperCase())
const otherHref = computed(() => switchLocalePath(otherLocale.value as 'en' | 'is') || '/')
</script>

<template>
  <NuxtLink
    :to="otherHref"
    class="locale-toggle"
    :aria-label="`Switch language to ${otherShort}`"
  >
    {{ otherShort }}
  </NuxtLink>
</template>

<style scoped>
/* Plain text link, no pill. Matches the masthead-link cap-mono
   silhouette so the toggle reads as ambient nav rather than a CTA. */
.locale-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: rgb(var(--ink-1) / 0.62);
  text-decoration: none;
  /* Keep a touch target ≥ 32 px tall + a little inline padding so the
     hit area is generous, but no border / background / radius. */
  padding: 4px 2px;
  min-height: 32px;
  transition: color 0.15s ease;
}
.locale-toggle:hover {
  color: rgb(var(--ink-1));
}
.locale-toggle:focus-visible {
  outline: 2px solid rgb(var(--accent));
  outline-offset: 2px;
  border-radius: 4px;
}
</style>
