export default defineNuxtRouteMiddleware(async (to) => {
  const { isPro, restoreFromStorage } = useProStatus()

  // On client, restore pro status from localStorage if not yet checked
  await restoreFromStorage()

  if (!isPro.value && to.query.pro !== 'activated') {
    return navigateTo('/pro')
  }
})
