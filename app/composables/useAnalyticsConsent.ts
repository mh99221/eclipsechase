const CONSENT_KEY = 'eclipsechase-consent'

// Shared state across all component instances.
// Safe as module-level refs because all reads/writes are guarded by import.meta.client.
// On the server these remain at their initial values and are never mutated.
const consentState = ref<'all' | 'essential' | null>(null)
const umamiLoaded = ref(false)

export function useAnalyticsConsent() {
  const config = useRuntimeConfig()

  function readConsent(): 'all' | 'essential' | null {
    if (!import.meta.client) return null
    const value = localStorage.getItem(CONSENT_KEY)
    if (value === 'all' || value === 'essential') return value
    return null
  }

  function setConsent(value: 'all' | 'essential') {
    if (!import.meta.client) return
    localStorage.setItem(CONSENT_KEY, value)
    consentState.value = value
    if (value === 'all') loadUmami()
  }

  function loadUmami() {
    if (!import.meta.client) return
    if (umamiLoaded.value) return
    const host = config.public.umamiHost || 'https://cloud.umami.is'
    const websiteId = config.public.umamiWebsiteId
    if (!websiteId) return

    const script = document.createElement('script')
    script.src = `${host}/script.js`
    script.async = true
    script.dataset.websiteId = websiteId
    document.head.appendChild(script)
    umamiLoaded.value = true
  }

  // Initialize state on first use (client-side only)
  if (import.meta.client && consentState.value === null) {
    consentState.value = readConsent()
  }

  const hasConsent = computed(() => consentState.value === 'all')
  const consentGiven = computed(() => consentState.value !== null)

  return {
    consentState: readonly(consentState),
    hasConsent,
    consentGiven,
    setConsent,
    loadUmami,
  }
}
