<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: () => t('pro.title'),
  meta: [
    { name: 'description', content: () => t('pro.description') },
  ],
})

const route = useRoute()
const cancelled = computed(() => route.query.cancelled === 'true')

const { isPro } = useProStatus()

// Redirect if already Pro
watch(isPro, (pro) => {
  if (import.meta.client && pro) navigateTo('/map')
}, { immediate: true })

// Checkout state
const checkoutSubmitting = ref(false)
const checkoutError = ref('')
const waiverAccepted = ref(false)

async function handleCheckout() {
  if (!waiverAccepted.value) {
    checkoutError.value = t('pro.waiver_required')
    return
  }

  checkoutError.value = ''
  checkoutSubmitting.value = true

  try {
    const { url } = await $fetch<{ url: string }>('/api/stripe/checkout', {
      method: 'POST',
    })

    if (url) {
      navigateTo(url, { external: true })
    }
    else {
      checkoutError.value = t('pro.checkout_error')
    }
  }
  catch (err: any) {
    checkoutError.value = err?.data?.statusMessage || t('pro.generic_error')
  }
  finally {
    checkoutSubmitting.value = false
  }
}

const features = [
  { label: t('pro.feature_map'), description: t('pro.feature_map_desc') },
  { label: t('pro.feature_recs'), description: t('pro.feature_recs_desc') },
  { label: t('pro.feature_offline'), description: t('pro.feature_offline_desc') },
  { label: t('pro.feature_roads'), description: t('pro.feature_roads_desc') },
]
</script>

<template>
  <div class="relative noise min-h-screen pt-[72px]">
    <main class="pb-20">
      <div class="section-container max-w-3xl py-8 sm:py-16">
        <!-- Cancelled banner -->
        <div
          v-if="cancelled"
          class="mb-8 px-4 py-3 rounded bg-amber-900/15 border border-amber-700/20 text-sm font-mono text-amber-400/80"
        >
          {{ t('pro.cancelled') }}
        </div>

        <!-- Header -->
        <div class="mb-12">
          <span class="font-mono text-xs tracking-[0.3em] text-corona/60 uppercase">
            {{ t('pro.unlock') }}
          </span>
          <h1 class="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mt-2 mb-4">
            {{ t('pro.heading') }}
          </h1>
          <p class="text-base sm:text-lg text-slate-400 max-w-xl">
            {{ t('pro.subtitle') }}
          </p>
        </div>

        <!-- Feature list -->
        <div class="grid gap-3 mb-12">
          <div
            v-for="feature in features"
            :key="feature.label"
            class="flex items-start gap-3 bg-void-surface border border-void-border/40 rounded px-4 py-4"
          >
            <svg
              class="w-5 h-5 text-corona shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2.5"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <p class="font-display font-semibold text-white text-sm sm:text-base">
                {{ feature.label }}
              </p>
              <p class="text-xs sm:text-sm text-slate-500 mt-0.5">
                {{ feature.description }}
              </p>
            </div>
          </div>
        </div>

        <!-- Price card + Checkout -->
        <div class="bg-void-surface border border-corona/20 rounded-lg p-6 sm:p-8 text-center">
          <div class="mb-6">
            <div class="font-display text-5xl sm:text-6xl font-bold text-white">
              &euro;9.99
            </div>
            <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 mt-3">
              {{ t('pro.price') }}
            </p>
          </div>

          <!-- Withdrawal waiver checkbox -->
          <div class="max-w-sm mx-auto mb-4 text-left">
            <label class="flex items-start gap-2.5 cursor-pointer">
              <input
                v-model="waiverAccepted"
                type="checkbox"
                class="mt-1 shrink-0 accent-corona"
              >
              <span class="text-xs text-slate-400 leading-relaxed">
                {{ t('pro.withdrawal_waiver_pre') }}
                <NuxtLink to="/terms" class="text-corona hover:text-corona-bright transition-colors">{{ t('pro.terms_link_text') }}</NuxtLink>
                {{ t('pro.withdrawal_waiver_and') }}
                <NuxtLink to="/privacy" class="text-corona hover:text-corona-bright transition-colors">{{ t('pro.privacy_link_text') }}</NuxtLink>.
              </span>
            </label>
          </div>

          <!-- Error -->
          <p v-if="checkoutError" class="text-sm font-mono text-red-400 mb-4">
            {{ checkoutError }}
          </p>

          <!-- Checkout button -->
          <button
            :disabled="checkoutSubmitting || !waiverAccepted"
            class="btn-corona w-full max-w-sm text-base py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="handleCheckout"
          >
            <span v-if="checkoutSubmitting" class="inline-flex items-center gap-2">
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>{{ t('pro.processing') }}</span>
            </span>
            <span v-else>{{ t('pro.get_access') }}</span>
          </button>

          <p class="font-mono text-[10px] uppercase tracking-[0.15em] text-slate-600 mt-4">
            {{ t('pro.stripe_note') }}
          </p>
        </div>

        <!-- Restore Purchase -->
        <RestorePurchase />
      </div>
    </main>

    <AppFooter />
  </div>
</template>
