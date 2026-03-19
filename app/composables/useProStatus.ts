const PRO_COOKIE = 'eclipsechase-pro'
const PRO_COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export function useProStatus() {
  const user = useSupabaseUser()
  const supabase = useSupabaseClient()
  const proCookie = useCookie(PRO_COOKIE, { maxAge: PRO_COOKIE_MAX_AGE })

  const isPro = useState<boolean>('pro-status', () => false)
  const isLoading = useState<boolean>('pro-loading', () => false)

  const proEmail = computed(() => user.value?.email || '')
  const isLoggedIn = computed(() => !!user.value)

  async function checkStatus() {
    if (!user.value) {
      isPro.value = false
      return
    }

    isLoading.value = true
    try {
      const data = await $fetch<{ isPro: boolean }>('/api/pro/status')
      isPro.value = data.isPro

      // Cache pro status in cookie for offline access
      if (data.isPro) {
        proCookie.value = '1'
      }
      else {
        proCookie.value = null
      }
    }
    catch (err) {
      console.warn('Pro status check failed, falling back to cookie:', err)
      // If server call fails (offline), fall back to cookie
      if (proCookie.value === '1') {
        isPro.value = true
      }
      else {
        isPro.value = false
      }
    }
    finally {
      isLoading.value = false
    }
  }

  /** Restore pro status from cookie (for offline / SSR). */
  function restoreFromCookie() {
    if (proCookie.value === '1') {
      isPro.value = true
    }
  }

  /** For immediate post-checkout access (before magic link click). */
  function setProFromUrl() {
    const route = useRoute()
    if (route.query.pro === 'activated') {
      isPro.value = true
      proCookie.value = '1'
    }
  }

  async function logout() {
    await supabase.auth.signOut()
    isPro.value = false
    proCookie.value = null
  }

  async function sendMagicLink(email: string) {
    const config = useRuntimeConfig()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${config.public.siteUrl}/confirm`,
      },
    })
    if (error) throw error
  }

  return {
    isPro,
    proEmail,
    isLoading,
    isLoggedIn,
    checkStatus,
    restoreFromCookie,
    setProFromUrl,
    logout,
    sendMagicLink,
  }
}
