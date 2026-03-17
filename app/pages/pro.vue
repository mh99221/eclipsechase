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

const email = ref('')
const isSubmitting = ref(false)
const error = ref('')

async function handleCheckout() {
  if (!email.value || !email.value.includes('@')) {
    error.value = t('pro.email_invalid')
    return
  }

  error.value = ''
  isSubmitting.value = true

  try {
    const { url } = await $fetch<{ url: string }>('/api/stripe/checkout', {
      method: 'POST',
      body: { email: email.value },
    })

    if (url) {
      navigateTo(url, { external: true })
    }
    else {
      error.value = t('pro.checkout_error')
    }
  }
  catch (err: any) {
    error.value = err?.data?.statusMessage || t('pro.generic_error')
  }
  finally {
    isSubmitting.value = false
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
  <div class="relative noise min-h-screen">
    <!-- Nav -->
    <nav class="flex items-center justify-between px-6 sm:px-10 py-5">
      <NuxtLink to="/" class="flex items-center gap-3 group">
        <svg class="w-8 h-8" viewBox="0 0 128 128" fill="none" aria-hidden="true">
          <circle cx="64" cy="64" r="36" fill="#050810" />
          <circle cx="64" cy="64" r="36" stroke="#f59e0b" stroke-width="3" opacity="0.8" />
          <circle cx="96" cy="48" r="4" fill="#f59e0b" />
        </svg>
        <span class="font-display font-semibold text-base tracking-wide text-slate-300 group-hover:text-white transition-colors">
          ECLIPSECHASE
        </span>
      </NuxtLink>
      <NuxtLink
        to="/guide"
        class="text-xs font-mono text-slate-400 hover:text-corona transition-colors tracking-wider"
      >
        {{ t('nav.guide') }}
      </NuxtLink>
    </nav>

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

        <!-- Price card -->
        <div class="bg-void-surface border border-corona/20 rounded-lg p-6 sm:p-8 text-center">
          <div class="mb-6">
            <div class="font-display text-5xl sm:text-6xl font-bold text-white">
              &euro;9.99
            </div>
            <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 mt-3">
              {{ t('pro.price') }}
            </p>
          </div>

          <!-- Email input -->
          <div class="max-w-sm mx-auto mb-4">
            <label for="pro-email" class="sr-only">Email address</label>
            <input
              id="pro-email"
              v-model="email"
              type="email"
              :placeholder="t('pro.email_placeholder')"
              required
              class="w-full px-4 py-3 rounded bg-void border border-void-border text-white placeholder-slate-600 font-mono text-sm focus:outline-none focus:border-corona/50 transition-colors"
              @keydown.enter="handleCheckout"
            >
          </div>

          <!-- Error -->
          <p v-if="error" class="text-sm font-mono text-red-400 mb-4">
            {{ error }}
          </p>

          <!-- Checkout button -->
          <button
            :disabled="isSubmitting"
            class="btn-corona w-full max-w-sm text-base py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="handleCheckout"
          >
            <span v-if="isSubmitting" class="inline-flex items-center gap-2">
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
      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-void-border/30 py-8">
      <div class="section-container text-center">
        <NuxtLink to="/" class="font-mono text-sm text-slate-500 hover:text-slate-300 transition-colors">
          &larr; {{ t('nav.back_home') }}
        </NuxtLink>
      </div>
    </footer>
  </div>
</template>
