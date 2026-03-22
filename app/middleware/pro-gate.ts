export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.dev) return

  // Pro status lives in IndexedDB (client-only) — can't gate on server
  if (import.meta.server) return

  const { isPro, loading, checkStatus } = useProStatus()

  if (isPro.value) return

  if (loading.value) {
    await checkStatus()
  }

  if (!isPro.value) {
    return navigateTo('/pro')
  }
})
