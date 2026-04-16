<script setup lang="ts">
/**
 * Theme toggle — cycles between system preference, light, and dark.
 * Uses @nuxtjs/color-mode which persists to localStorage and respects
 * `prefers-color-scheme` when set to 'system'.
 *
 * Phase 1: component exists but most pages still use hardcoded dark
 * colors. Switching to light here will show the new tokens take effect
 * on surfaces that have been migrated (main.css base layer), while
 * un-migrated pages still look dark-styled. Expected during rollout.
 */
const colorMode = useColorMode()

const isDark = computed(() => colorMode.value === 'dark')
const label = computed(() => isDark.value ? 'Switch to light' : 'Switch to dark')

function toggle() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}
</script>

<template>
  <ClientOnly>
    <button
      type="button"
      :aria-label="label"
      :title="label"
      class="theme-toggle"
      @click="toggle"
    >
      <!-- Sun icon (visible when dark — click to go light) -->
      <svg
        v-if="isDark"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4.5" />
        <line x1="12" y1="2" x2="12" y2="4.5" />
        <line x1="12" y1="19.5" x2="12" y2="22" />
        <line x1="4.22" y1="4.22" x2="6" y2="6" />
        <line x1="18" y1="18" x2="19.78" y2="19.78" />
        <line x1="2" y1="12" x2="4.5" y2="12" />
        <line x1="19.5" y1="12" x2="22" y2="12" />
        <line x1="4.22" y1="19.78" x2="6" y2="18" />
        <line x1="18" y1="6" x2="19.78" y2="4.22" />
      </svg>

      <!-- Moon icon (visible when light — click to go dark) -->
      <svg
        v-else
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    </button>
  </ClientOnly>
</template>

<style scoped>
.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: rgb(var(--ink-3));
  border-radius: 4px;
  transition: color 0.2s ease, background 0.2s ease;
  cursor: pointer;
}
.theme-toggle:hover {
  color: rgb(var(--accent-strong));
  background: rgb(var(--surface-raised) / 0.6);
}
.theme-toggle svg {
  width: 16px;
  height: 16px;
}
.theme-toggle:focus-visible {
  outline: 2px solid rgb(var(--accent));
  outline-offset: 2px;
}
</style>
