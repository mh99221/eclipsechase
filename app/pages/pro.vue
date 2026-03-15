<script setup lang="ts">
useHead({
  title: 'Go Pro',
  meta: [
    { name: 'description', content: 'Unlock the live weather map, personalized recommendations, and offline maps for the 2026 Iceland eclipse.' },
  ],
})

const route = useRoute()
const cancelled = computed(() => route.query.cancelled === 'true')

const email = ref('')
const isSubmitting = ref(false)
const error = ref('')

async function handleCheckout() {
  if (!email.value || !email.value.includes('@')) {
    error.value = 'Please enter a valid email address.'
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
      error.value = 'Could not create checkout session. Please try again.'
    }
  }
  catch (err: any) {
    error.value = err?.data?.statusMessage || 'Something went wrong. Please try again.'
  }
  finally {
    isSubmitting.value = false
  }
}

const features = [
  { label: 'Live Weather Map', description: 'Real-time cloud cover from 55 weather stations across western Iceland' },
  { label: 'Personalized Recommendations', description: 'AI-powered spot scoring based on your viewing style and live conditions' },
  { label: 'Offline Maps', description: 'Download map tiles for use without internet on eclipse day' },
  { label: 'Road Conditions', description: 'Live road status overlay so you can plan your route safely' },
]
</script>

<template>
  <div class="min-h-screen bg-void text-slate-300">
    <!-- Nav -->
    <nav class="fixed top-0 inset-x-0 z-50 border-b border-void-border bg-void/80 backdrop-blur-md">
      <div class="section-container flex items-center justify-between h-14">
        <NuxtLink to="/" class="font-display font-bold text-white tracking-tight text-lg">
          EclipseChase<span class="text-corona">.is</span>
        </NuxtLink>
        <NuxtLink
          to="/guide"
          class="font-mono text-xs tracking-widest uppercase text-slate-400 hover:text-corona transition-colors"
        >
          Guide
        </NuxtLink>
      </div>
    </nav>

    <main class="pt-24 pb-20">
      <div class="section-container max-w-2xl">
        <!-- Cancelled banner -->
        <div
          v-if="cancelled"
          class="mb-8 px-4 py-3 rounded bg-amber-900/20 border border-amber-700/30 text-sm font-mono text-amber-400"
        >
          Payment was cancelled. No worries — you can try again when you're ready.
        </div>

        <!-- Header -->
        <div class="text-center mb-12">
          <span class="font-mono text-xs tracking-[0.3em] text-corona/60 uppercase">
            Unlock Everything
          </span>
          <h1 class="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mt-3 mb-4">
            EclipseChase Pro
          </h1>
          <p class="text-base sm:text-lg text-slate-400 max-w-lg mx-auto">
            One payment. Full access. Everything you need to find clear skies on August 12, 2026.
          </p>
        </div>

        <!-- Feature list -->
        <div class="grid gap-4 mb-12">
          <div
            v-for="feature in features"
            :key="feature.label"
            class="flex items-start gap-3 bg-void-surface border border-void-border/40 rounded-lg px-4 py-3.5"
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
              <p class="text-xs sm:text-sm text-slate-500 font-mono mt-0.5">
                {{ feature.description }}
              </p>
            </div>
          </div>
        </div>

        <!-- Price card -->
        <div class="bg-void-surface border border-corona/30 rounded-xl p-6 sm:p-8 text-center">
          <div class="mb-6">
            <div class="font-display text-5xl sm:text-6xl font-bold text-white">
              &euro;9.99
            </div>
            <p class="font-mono text-sm text-slate-500 mt-2">
              One-time payment &middot; No subscription
            </p>
          </div>

          <!-- Email input -->
          <div class="max-w-sm mx-auto mb-4">
            <label for="pro-email" class="sr-only">Email address</label>
            <input
              id="pro-email"
              v-model="email"
              type="email"
              placeholder="you@example.com"
              required
              class="w-full px-4 py-3 rounded-lg bg-void border border-void-border text-white placeholder-slate-600 font-mono text-sm focus:outline-none focus:border-corona/60 focus:ring-1 focus:ring-corona/30 transition-colors"
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
              Processing...
            </span>
            <span v-else>Get Pro Access</span>
          </button>

          <p class="font-mono text-xs text-slate-600 mt-4">
            Secure payment via Stripe. Instant access after payment.
          </p>
        </div>
      </div>
    </main>
  </div>
</template>
