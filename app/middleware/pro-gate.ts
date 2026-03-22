export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.dev) return

  // Pro status lives in IndexedDB — only available client-side.
  // On server (SSR), allow the page to render unconditionally.
  if (import.meta.server) return

  const { isPro, checkStatus } = useProStatus()

  // Always check on client — useState may have stale server-side values
  await checkStatus()

  if (!isPro.value) {
    return navigateTo('/pro')
  }
})
