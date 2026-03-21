export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.dev) return

  const { isPro, loading, checkStatus } = useProStatus()

  if (isPro.value) return

  if (loading.value) {
    await checkStatus()
  }

  if (!isPro.value) {
    return navigateTo('/pro')
  }
})
