export default defineNuxtRouteMiddleware(async (to) => {
  // Skip paywall in development
  if (import.meta.dev) return

  // Only gate on the client — server doesn't have localStorage/auth state
  if (import.meta.server) return

  const { isPro, restoreFromStorage } = useProStatus()

  await restoreFromStorage()

  if (!isPro.value && to.query.pro !== 'activated') {
    return navigateTo('/pro')
  }
})
