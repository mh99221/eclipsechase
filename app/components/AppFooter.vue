<script setup lang="ts">
/**
 * Shared footer for every subpage (landing page uses its own richer
 * branded footer). Constrained to the same 768px reading column as
 * the rest of the app. Hides a link when the user is already on that
 * page, so we don't render "Privacy" when viewing /privacy.
 */
const { t } = useI18n()
const { goBack } = useGoBack()
const route = useRoute()

// Compare against the route's base name so /is/privacy collapses to
// `privacy` like /privacy does — `route.path === '/privacy'` would
// miss the IS prefix and render a "Privacy" link on the page that
// already IS the privacy page.
const getRouteBaseName = useRouteBaseName()
const baseName = computed(() => getRouteBaseName(route) ?? '')
const isPrivacy = computed(() => baseName.value === 'privacy')
const isTerms = computed(() => baseName.value === 'terms')
const isCredits = computed(() => baseName.value === 'credits')
</script>

<template>
  <footer class="border-t border-border-subtle/50 py-8 mt-12">
    <div class="section-container max-w-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
      <button
        class="font-mono text-sm text-ink-3 hover:text-ink-2 transition-colors"
        @click="goBack"
      >
        &larr; {{ t('nav.back') }}
      </button>

      <div class="flex items-center gap-5">
        <NuxtLinkLocale
          v-if="!isPrivacy"
          to="/privacy"
          class="font-mono text-xs text-ink-3 hover:text-ink-2 transition-colors"
        >
          {{ t('footer.privacy') }}
        </NuxtLinkLocale>
        <NuxtLinkLocale
          v-if="!isTerms"
          to="/terms"
          class="font-mono text-xs text-ink-3 hover:text-ink-2 transition-colors"
        >
          {{ t('footer.terms') }}
        </NuxtLinkLocale>
        <NuxtLinkLocale
          v-if="!isCredits"
          to="/credits"
          class="font-mono text-xs text-ink-3 hover:text-ink-2 transition-colors"
        >
          {{ t('footer.credits') }}
        </NuxtLinkLocale>
      </div>
    </div>
  </footer>
</template>
