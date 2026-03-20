<script setup lang="ts">
const { t } = useI18n()
const supabase = useSupabaseClient()
const { isPro, restoreFromCookie } = useProStatus()

const status = ref<'loading' | 'success' | 'no-subscription' | 'error'>('loading')

useHead({
  title: () => t('confirm.title'),
})

async function handleAuthConfirmed() {
  try {
    const data = await $fetch<{ isPro: boolean }>('/api/auth/link-pro', {
      method: 'POST',
    })

    if (data.isPro) {
      isPro.value = true
      restoreFromCookie() // Sets cookie via composable (no duplicate)
      status.value = 'success'
      setTimeout(() => navigateTo('/map'), 1500)
    }
    else {
      status.value = 'no-subscription'
      setTimeout(() => navigateTo('/pro?no_subscription=true'), 3000)
    }
  }
  catch {
    status.value = 'error'
  }
}

onMounted(async () => {
  const route = useRoute()
  const code = route.query.code as string | undefined

  // PKCE flow: exchange the ?code= parameter for a session
  if (code) {
    try {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      if (exchangeError) {
        console.error('Code exchange failed:', exchangeError.message)
        status.value = 'error'
        return
      }
      await handleAuthConfirmed()
    }
    catch {
      status.value = 'error'
    }
    return
  }

  // Check if user is already signed in (e.g. @nuxtjs/supabase exchanged code server-side)
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    await handleAuthConfirmed()
    return
  }

  // Implicit flow: listen for access token in URL hash
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN') {
      subscription.unsubscribe()
      handleAuthConfirmed()
    }
  })

  // Safety timeout — if token parsing fails or takes too long
  setTimeout(() => {
    if (status.value === 'loading') {
      subscription.unsubscribe()
      status.value = 'error'
    }
  }, 10000)
})
</script>

<template>
  <div class="relative noise min-h-screen flex items-center justify-center">
    <div class="text-center px-6">
      <!-- Loading -->
      <div v-if="status === 'loading'" class="space-y-4">
        <svg class="animate-spin h-8 w-8 text-corona mx-auto" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p class="font-mono text-sm text-slate-400 tracking-wider">
          {{ t('confirm.verifying') }}
        </p>
      </div>

      <!-- Success -->
      <div v-else-if="status === 'success'" class="space-y-4">
        <svg class="w-12 h-12 text-green-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <p class="font-display text-xl font-semibold text-white">
          {{ t('confirm.welcome') }}
        </p>
        <p class="font-mono text-xs text-slate-500 tracking-wider">
          {{ t('confirm.redirecting') }}
        </p>
      </div>

      <!-- No subscription -->
      <div v-else-if="status === 'no-subscription'" class="space-y-4">
        <p class="font-display text-xl font-semibold text-white">
          {{ t('confirm.logged_in') }}
        </p>
        <p class="text-sm text-slate-400">
          {{ t('confirm.no_subscription') }}
        </p>
        <p class="font-mono text-xs text-slate-500 tracking-wider">
          {{ t('confirm.redirecting_pro') }}
        </p>
      </div>

      <!-- Error -->
      <div v-else class="space-y-4">
        <p class="font-display text-xl font-semibold text-white">
          {{ t('confirm.error_title') }}
        </p>
        <p class="text-sm text-slate-400">
          {{ t('confirm.error_desc') }}
        </p>
        <NuxtLink
          to="/pro"
          class="inline-block mt-4 font-mono text-xs text-corona hover:text-corona-bright transition-colors tracking-wider uppercase"
        >
          {{ t('confirm.try_again') }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
