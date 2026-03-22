export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.dev) return
  if (import.meta.server) return

  const { isPro, loading, checkStatus } = useProStatus()

  if (isPro.value && !loading.value) return

  await checkStatus()

  if (!isPro.value) {
    return navigateTo('/pro')
  }
})
