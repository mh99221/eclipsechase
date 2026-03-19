const CONSENT_KEY = 'eclipsechase-consent'

// Shared state across all component instances.
// Safe as module-level refs because all reads/writes are guarded by import.meta.client.
// On the server these remain at their initial values and are never mutated.
const consentState = ref<'all' | 'essential' | null>(null)
const umamiLoaded = ref(false)

const hasConsent = computed(() => consentState.value === 'all')
const consentGiven = computed(() => consentState.value !== null)

function readConsent(): 'all' | 'essential' | null {
  try {
    const value = localStorage.getItem(CONSENT_KEY)
    if (value === 'all' || value === 'essential') return value
  }
  catch {
    // localStorage may be unavailable (private browsing, sandboxed iframe)
  }
  return null
}

// Initialize consent state once on first client-side module load.
// Also auto-loads Umami for returning users who previously consented.
if (import.meta.client) {
  consentState.value = readConsent()
}

export function useAnalyticsConsent() {
  function setConsent(value: 'all' | 'essential') {
    if (!import.meta.client) return
    try {
      localStorage.setItem(CONSENT_KEY, value)
    }
    catch {
      // localStorage may be unavailable
    }
    consentState.value = value
    if (value === 'all') loadUmami()
  }

  function loadUmami() {
    if (!import.meta.client) return
    if (umamiLoaded.value) return
    const config = useRuntimeConfig()
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

  // Auto-load Umami for returning users who previously consented
  if (import.meta.client && hasConsent.value && !umamiLoaded.value) {
    loadUmami()
  }

  return {
    consentState: readonly(consentState),
    hasConsent,
    consentGiven,
    setConsent,
  }
}
