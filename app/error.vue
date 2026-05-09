<script setup lang="ts">
// Nuxt 4 error.vue — replaces the full app.vue tree on fatal errors.
// We re-mount the BrandBar manually so users aren't stranded chrome-less.

interface NuxtError {
  statusCode: number
  statusMessage?: string
  message?: string
}

const props = defineProps<{
  error: NuxtError
}>()

const is404 = computed(() => props.error?.statusCode === 404)

useHead({
  title: () => is404.value ? 'Page not found' : 'Something went wrong',
  // Override the global titleTemplate so we don't append "— EclipseChase.is"
  // twice; the template at app.head.titleTemplate adds the suffix already.
  meta: [
    { name: 'robots', content: 'noindex' },
  ],
})

function goHome() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div class="error-root">
    <BrandBar />
    <main class="error-shell" data-screen="error">
      <div class="error-inner">
        <p class="error-eyebrow font-mono">
          {{ error.statusCode }}
        </p>
        <h1 class="error-title">
          {{ is404 ? "We couldn't find that page" : 'Something went wrong' }}
        </h1>
        <p class="error-subtitle">
          {{ is404
            ? "The page you tried to reach doesn't exist or has moved."
            : 'Please try again in a moment.' }}
        </p>

        <div class="error-actions">
          <button type="button" class="error-cta" @click="goHome">
            Go back home
          </button>
          <NuxtLinkLocale to="/spots" class="error-link">Browse spots</NuxtLinkLocale>
          <NuxtLinkLocale to="/guide" class="error-link">Read the guide</NuxtLinkLocale>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.error-root {
  min-height: 100vh;
  background: rgb(var(--bg));
  color: rgb(var(--ink-1));
}

.error-shell {
  padding: calc(60px + max(14px, env(safe-area-inset-top)) + 32px) 16px 64px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}
@media (min-width: 768px) {
  .error-shell {
    padding-top: calc(60px + max(14px, env(safe-area-inset-top)) + 64px);
  }
}

.error-inner {
  width: 100%;
  max-width: 560px;
  text-align: center;
}

.error-eyebrow {
  font-size: 12px;
  letter-spacing: 0.36em;
  text-transform: uppercase;
  color: rgb(var(--accent));
  margin-bottom: 14px;
}

.error-title {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 28px;
  font-weight: 600;
  color: rgb(var(--ink-1));
  margin-bottom: 14px;
  line-height: 1.2;
}
@media (min-width: 768px) {
  .error-title { font-size: 36px; }
}

.error-subtitle {
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 15px;
  color: rgb(var(--ink-2));
  margin-bottom: 32px;
  line-height: 1.5;
}

.error-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.error-cta {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--accent-ink));
  background: rgb(var(--accent));
  border: none;
  border-radius: 8px;
  padding: 12px 22px;
  cursor: pointer;
  min-height: 44px;
}
.error-cta:hover { background: rgb(var(--accent-strong)); }

.error-link {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--ink-3));
  text-decoration: none;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
}
.error-link:hover { color: rgb(var(--ink-2)); }
</style>
