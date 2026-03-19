export default defineNuxtPlugin(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(async () => {
        // Wait for SW to be active before sending messages
        await navigator.serviceWorker.ready

        // Precache critical API data for offline use
        navigator.serviceWorker.controller?.postMessage({ type: 'PRECACHE_API' })
      })
      .catch((err) => {
        console.warn('SW registration failed:', err)
      })
  }
})
