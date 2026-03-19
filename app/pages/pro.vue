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
const noSubscription = computed(() => route.query.no_subscription === 'true')

const { isLoggedIn, isPro, sendMagicLink } = useProStatus()

function isValidEmail(email: string): boolean {
  return !!email && email.includes('@') && email.includes('.')
}

// Redirect if already logged in and Pro (client-only to avoid SSR navigation)
watch([isLoggedIn, isPro], ([loggedIn, pro]) => {
  if (import.meta.client && loggedIn && pro) navigateTo('/map')
}, { immediate: true })

// --- Login (magic link) state ---
const loginEmail = ref('')
const loginSubmitting = ref(false)
const loginError = ref('')
const loginSent = ref(false)

async function handleLogin() {
  if (!isValidEmail(loginEmail.value)) {
    loginError.value = t('pro.email_invalid')
    return
  }

  loginError.value = ''
  loginSubmitting.value = true

  try {
    await sendMagicLink(loginEmail.value)
    loginSent.value = true
  }
  catch (err: any) {
    loginError.value = err?.message || t('pro.generic_error')
  }
  finally {
    loginSubmitting.value = false
  }
}

// --- Checkout (Stripe) state ---
const checkoutEmail = ref('')
const checkoutSubmitting = ref(false)
const checkoutError = ref('')
const waiverAccepted = ref(false)

async function handleCheckout() {
  if (!waiverAccepted.value) {
    checkoutError.value = t('pro.waiver_required')
    return
  }

  if (!isValidEmail(checkoutEmail.value)) {
    checkoutError.value = t('pro.email_invalid')
    return
  }

  checkoutError.value = ''
  checkoutSubmitting.value = true

  try {
    const { url } = await $fetch<{ url: string }>('/api/stripe/checkout', {
      method: 'POST',
      body: { email: checkoutEmail.value },
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

        <!-- No subscription banner -->
        <div
          v-if="noSubscription"
          class="mb-8 px-4 py-3 rounded bg-blue-900/15 border border-blue-700/20 text-sm font-mono text-blue-400/80"
        >
          {{ t('auth.no_subscription_banner') }}
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

        <!-- Already have Pro? Login section -->
        <div class="mb-8 bg-void-surface border border-void-border/40 rounded p-6">
          <h2 class="font-display text-lg font-semibold text-white mb-1">
            {{ t('auth.already_pro') }}
          </h2>
          <p class="text-sm text-slate-500 mb-4">
            {{ t('auth.login_subtitle') }}
          </p>

          <!-- Magic link sent confirmation -->
          <div v-if="loginSent" class="px-4 py-3 rounded bg-green-900/15 border border-green-700/20 text-sm text-green-400">
            {{ t('auth.check_email') }}
          </div>

          <!-- Login form -->
          <div v-else>
            <div class="flex gap-2">
              <label for="login-email" class="sr-only">{{ t('auth.email_label') }}</label>
              <input
                id="login-email"
                v-model="loginEmail"
                type="email"
                :placeholder="t('pro.email_placeholder')"
                required
                class="flex-1 px-4 py-2.5 rounded bg-void border border-void-border text-white placeholder-slate-600 font-mono text-sm focus:outline-none focus:border-corona/50 transition-colors"
                @keydown.enter="handleLogin"
              >
              <button
                :disabled="loginSubmitting"
                class="px-4 py-2.5 rounded bg-void border border-void-border text-white font-mono text-sm hover:border-corona/50 transition-colors disabled:opacity-50 whitespace-nowrap"
                @click="handleLogin"
              >
                <span v-if="loginSubmitting">...</span>
                <span v-else>{{ t('auth.send_link') }}</span>
              </button>
            </div>
            <p v-if="loginError" class="text-xs font-mono text-red-400 mt-2">
              {{ loginError }}
            </p>
          </div>
        </div>

        <!-- Price card + Checkout -->
        <div class="bg-void-surface border border-corona/20 rounded-lg p-6 sm:p-8 text-center">
          <h2 class="font-display text-lg font-semibold text-white mb-4">
            {{ t('auth.new_user') }}
          </h2>

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
            <label for="pro-email" class="sr-only">{{ t('auth.email_label') }}</label>
            <input
              id="pro-email"
              v-model="checkoutEmail"
              type="email"
              :placeholder="t('pro.email_placeholder')"
              required
              class="w-full px-4 py-3 rounded bg-void border border-void-border text-white placeholder-slate-600 font-mono text-sm focus:outline-none focus:border-corona/50 transition-colors"
              @keydown.enter="handleCheckout"
            >
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
                <i18n-t path="pro.withdrawal_waiver" tag="span">
                  <template #terms_link>
                    <NuxtLink to="/terms" class="text-corona hover:text-corona-bright transition-colors">
                      {{ t('pro.terms_link_text') }}
                    </NuxtLink>
                  </template>
                  <template #privacy_link>
                    <NuxtLink to="/privacy" class="text-corona hover:text-corona-bright transition-colors">
                      {{ t('pro.privacy_link_text') }}
                    </NuxtLink>
                  </template>
                </i18n-t>
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
      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-void-border/30 py-8">
      <div class="section-container flex items-center justify-between">
        <NuxtLink to="/" class="font-mono text-sm text-slate-500 hover:text-slate-300 transition-colors">
          &larr; {{ t('nav.back_home') }}
        </NuxtLink>
        <div class="flex gap-4">
          <NuxtLink to="/privacy" class="font-mono text-xs text-slate-500 hover:text-slate-300 transition-colors">
            {{ t('footer.privacy') }}
          </NuxtLink>
          <NuxtLink to="/terms" class="font-mono text-xs text-slate-500 hover:text-slate-300 transition-colors">
            {{ t('footer.terms') }}
          </NuxtLink>
        </div>
      </div>
    </footer>
  </div>
</template>
