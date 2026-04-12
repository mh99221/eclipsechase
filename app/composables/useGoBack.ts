export function useGoBack() {
  const router = useRouter()

  function goBack() {
    if (import.meta.client && window.history.state?.back) {
      router.back()
    } else {
      navigateTo('/')
    }
  }

  return { goBack }
}
