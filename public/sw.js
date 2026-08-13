/**
 * RETIRED 2026-08-13 — self-destructing service worker.
 *
 * The Aug 12 2026 eclipse has passed and eclipsechase.is is now a static
 * archive. This worker exists only to undo its predecessors: it deletes
 * every cache this origin ever created, unregisters itself, and forces
 * open clients to reload against the network.
 *
 * Bumping the version string is what causes browsers holding v9 to fetch
 * this file and install it in the first place.
 *
 * Do NOT delete this file. If sw.js starts 404ing, browsers that already
 * have v9 installed keep it forever — a 404 does not unregister a worker.
 * This file must stay reachable indefinitely.
 */
const VERSION = 'eclipsechase-sunset-v10'

self.addEventListener('install', (event) => {
  // Take over as soon as possible rather than waiting for every tab to close.
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(names.map((name) => caches.delete(name)))

      await self.clients.claim()
      await self.registration.unregister()

      // Reload every open client so they drop the cached app shell and
      // fetch the live archive instead.
      const clients = await self.clients.matchAll({ type: 'window' })
      for (const client of clients) {
        client.navigate(client.url).catch(() => {})
      }

      console.log(`[sw] ${VERSION}: caches cleared, worker unregistered`)
    })(),
  )
})

// No fetch handler: every request goes straight to the network.
