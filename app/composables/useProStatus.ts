const PRO_STORAGE_KEY = 'eclipsechase-pro-email'

export function useProStatus() {
  const isPro = useState<boolean>('pro-status', () => false)
  const proEmail = useState<string>('pro-email', () => '')
  const isLoading = useState<boolean>('pro-loading', () => false)

  async function checkStatus(email: string) {
    if (!email) {
      isPro.value = false
      return
    }

    isLoading.value = true
    try {
      const data = await $fetch<{ isPro: boolean }>('/api/pro/status', {
        params: { email },
      })
      isPro.value = data.isPro
      if (data.isPro) {
        proEmail.value = email
        if (import.meta.client) {
          localStorage.setItem(PRO_STORAGE_KEY, email)
        }
      }
    }
    catch {
      isPro.value = false
    }
    finally {
      isLoading.value = false
    }
  }

  function setProFromUrl() {
    const route = useRoute()
    if (route.query.pro === 'activated') {
      isPro.value = true
    }
  }

  /** Restore pro status from localStorage on client. Call in middleware. */
  async function restoreFromStorage() {
    if (!import.meta.client) return
    if (isPro.value) return

    const stored = localStorage.getItem(PRO_STORAGE_KEY)
    if (stored) {
      await checkStatus(stored)
    }
  }

  return {
    isPro,
    proEmail,
    isLoading,
    checkStatus,
    setProFromUrl,
    restoreFromStorage,
  }
}
