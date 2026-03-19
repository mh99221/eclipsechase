export default defineNuxtRouteMiddleware(async (to) => {
  // Skip paywall in development
  if (import.meta.dev) return

  const { isPro, restoreFromCookie, checkStatus, setProFromUrl } = useProStatus()

  // 1. Already confirmed in memory
  if (isPro.value) return

  // 2. Check cookie (works offline + SSR)
  restoreFromCookie()
  if (isPro.value) return

  // 3. Post-checkout: verify Stripe session ID server-side
  if (to.query.pro === 'activated' && to.query.session_id) {
    try {
      const { valid } = await $fetch<{ valid: boolean }>('/api/stripe/verify-session', {
        params: { session_id: to.query.session_id },
      })
      if (valid) {
        setProFromUrl()
        return
      }
    }
    catch {
      // Verification failed — fall through to normal auth
    }
  }

  // 4. Check Supabase Auth session
  const user = useSupabaseUser()
  if (!user.value) {
    return navigateTo('/pro')
  }

  // 5. User is logged in — verify pro status with server
  await checkStatus()
  if (!isPro.value) {
    return navigateTo('/pro')
  }
})
