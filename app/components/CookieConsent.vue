<script setup lang="ts">
const { t } = useI18n()
const { consentGiven, setConsent } = useAnalyticsConsent()

const visible = ref(false)

onMounted(() => {
  visible.value = !consentGiven.value
})

function accept() {
  setConsent('all')
  visible.value = false
}

function decline() {
  setConsent('essential')
  visible.value = false
}
</script>

<template>
  <div
    v-if="visible"
    class="fixed bottom-0 inset-x-0 z-50 bg-void-surface border-t border-void-border/40"
  >
    <div class="section-container py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <p class="text-sm text-slate-300 flex-1">
        {{ t('cookie.banner_text') }}
        <NuxtLink to="/privacy" class="text-corona hover:text-corona-bright transition-colors ml-1">
          {{ t('cookie.learn_more') }}
        </NuxtLink>
      </p>
      <div class="flex gap-2 shrink-0">
        <button
          class="border border-void-border text-slate-400 font-mono text-xs uppercase tracking-wider px-4 py-2 rounded hover:border-slate-500 hover:text-slate-300 transition-colors"
          @click="decline"
        >
          {{ t('cookie.essential_only') }}
        </button>
        <button
          class="bg-corona text-void font-mono text-xs uppercase tracking-wider px-4 py-2 rounded hover:bg-corona-bright transition-colors"
          @click="accept"
        >
          {{ t('cookie.accept_all') }}
        </button>
      </div>
    </div>
  </div>
</template>
