export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return

  // Dev bypasses by default so local work isn't blocked. To test the
  // real gate locally, set `NUXT_PUBLIC_BYPASS_PRO_GATE=0` in .env.
  // Prod never bypasses.
  const bypass = useRuntimeConfig().public.bypassProGate
  if (import.meta.dev && bypass !== '0') return

  const { isPro, loading, checkStatus } = useProStatus()

  if (isPro.value && !loading.value) return

  await checkStatus()

  if (!isPro.value) {
    return navigateTo('/pro')
  }
})
