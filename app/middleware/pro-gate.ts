export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.dev) return
  if (import.meta.server) return

  console.log('[Pro] middleware: running for', to.path)

  const { isPro, loading, checkStatus } = useProStatus()

  if (isPro.value && !loading.value) {
    console.log('[Pro] middleware: already verified, skipping')
    return
  }

  console.log('[Pro] middleware: checking status...')
  await checkStatus()
  console.log('[Pro] middleware: isPro =', isPro.value)

  if (!isPro.value) {
    return navigateTo('/pro')
  }
})
