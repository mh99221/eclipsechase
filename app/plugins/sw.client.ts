export default defineNuxtPlugin(() => {
  if (!('serviceWorker' in navigator)) return

  // Never run the service worker against a dev server. In production
  // everything under /_nuxt/ is content-hashed and immutable, which is
  // what sw.js's cache-first rule assumes. Vite's dev server serves
  // *mutable* modules from that same prefix (/_nuxt/@fs/…, ?v= dep
  // hashes), so caching them pins a stale module for good — which shows
  // up as the browser refusing to boot the app at all ("expected a
  // JavaScript module but got text/css").
  //
  // Also actively unregister anything left over from before this guard,
  // otherwise a developer who already has a poisoned registration stays
  // broken no matter how many times they restart the dev server.
  if (import.meta.dev) {
    navigator.serviceWorker.getRegistrations()
      .then(async (regs) => {
        if (!regs.length) return
        await Promise.all(regs.map(r => r.unregister()))
        const keys = await caches.keys()
        await Promise.all(keys.map(k => caches.delete(k)))
        console.info('[SW] Unregistered dev service worker + cleared caches.')
      })
      .catch(() => { /* best-effort cleanup */ })
    return
  }

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
})
