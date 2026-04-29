<script setup lang="ts">
const { t } = useI18n()
const { consentGiven, setConsent } = useAnalyticsConsent()

// Client-only visibility to avoid SSR hydration mismatch.
// Once consent is given, consentGiven becomes true and the banner hides reactively.
const mounted = ref(false)
onMounted(() => { mounted.value = true })

const visible = computed(() => mounted.value && !consentGiven.value)
</script>

<template>
  <div
    v-if="visible"
    class="fixed bottom-0 inset-x-0 z-50 bg-surface border-t border-border-subtle/40"
  >
    <div class="section-container py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <p class="text-sm text-ink-2 flex-1">
        {{ t('cookie.banner_text') }}
        <NuxtLink to="/privacy" class="text-accent hover:text-accent-strong transition-colors ml-1">
          {{ t('cookie.learn_more') }}
        </NuxtLink>
      </p>
      <div class="flex gap-2 shrink-0">
        <button
          class="border border-border-subtle text-ink-3 font-mono text-xs uppercase tracking-wider px-4 py-2 rounded hover:border-slate-500 hover:text-ink-2 transition-colors"
          @click="setConsent('essential')"
        >
          {{ t('cookie.essential_only') }}
        </button>
        <button
          class="bg-accent text-accent-ink font-mono text-xs uppercase tracking-wider px-4 py-2 rounded hover:bg-accent-strong transition-colors"
          @click="setConsent('all')"
        >
          {{ t('cookie.accept_all') }}
        </button>
      </div>
    </div>
  </div>
</template>
