export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.dev) return

  // Pro status lives in IndexedDB — only available client-side.
  // On server (SSR), allow the page to render unconditionally.
  if (import.meta.server) return

  const { isPro, loading, checkStatus } = useProStatus()

  // Skip if already verified in this session (fast path for inter-page navigation)
  if (isPro.value && !loading.value) return

  // Otherwise check IndexedDB — useState may have stale server-side values
  await checkStatus()

  if (!isPro.value) {
    return navigateTo('/pro')
  }
})
