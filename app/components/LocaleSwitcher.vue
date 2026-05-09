<script setup lang="ts">
/**
 * EN ↔ IS toggle. With only two locales there's no dropdown — both
 * options sit side-by-side as small mono-cap pills, matching the
 * theme toggle's visual weight. The choice persists via the
 * `i18n_redirected` cookie that @nuxtjs/i18n sets automatically
 * (see nuxt.config.ts → i18n.detectBrowserLanguage), so a returning
 * visitor lands in their last picked locale.
 *
 * Renders nothing on SSR for the active-state styling — the locale
 * switch happens via NuxtLink so SSR markup matches client.
 */
const { locale, locales } = useI18n()
const switchLocalePath = useSwitchLocalePath()

interface DisplayLocale {
  code: string
  short: string
  label: string
}

// Hardcoded display labels — `locales` from useI18n() doesn't carry
// short codes, and we want "EN" / "IS" rather than "English" /
// "Íslenska" in the chrome.
const DISPLAY: Record<string, DisplayLocale> = {
  en: { code: 'en', short: 'EN', label: 'English' },
  is: { code: 'is', short: 'IS', label: 'Íslenska' },
}

const items = computed<DisplayLocale[]>(() =>
  (locales.value as Array<{ code: string }>).map(l => DISPLAY[l.code]).filter(Boolean) as DisplayLocale[],
)
</script>

<template>
  <div
    class="locale-switcher"
    role="group"
    aria-label="Language"
  >
    <NuxtLink
      v-for="item in items"
      :key="item.code"
      :to="switchLocalePath(item.code) || '/'"
      class="locale-btn"
      :class="{ active: locale === item.code }"
      :aria-current="locale === item.code ? 'true' : undefined"
      :aria-label="item.label"
    >
      {{ item.short }}
    </NuxtLink>
  </div>
</template>

<style scoped>
.locale-switcher {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  background: rgb(var(--ink-1) / 0.04);
  border: 1px solid rgb(var(--border-subtle) / 0.16);
  border-radius: 999px;
  padding: 2px;
}
.locale-btn {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: rgb(var(--ink-1) / 0.62);
  text-decoration: none;
  padding: 5px 9px;
  border-radius: 999px;
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  transition: background 0.15s ease, color 0.15s ease;
}
.locale-btn:hover { color: rgb(var(--ink-1)); }
.locale-btn.active {
  background: rgb(var(--accent));
  color: rgb(var(--accent-ink));
}
.locale-btn:focus-visible {
  outline: 2px solid rgb(var(--accent));
  outline-offset: 2px;
}
</style>
