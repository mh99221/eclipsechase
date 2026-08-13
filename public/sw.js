/**
 * RETIRED 2026-08-13 — self-destructing service worker.
 *
 * The Aug 12 2026 eclipse has passed and eclipsechase.is is now a static
 * archive. This worker exists only to undo its predecessors: it deletes
 * every cache this origin ever created and stops intercepting fetches, so
 * visitors stop seeing the cached app shell for pages that no longer exist.
 *
 * Bumping the version string is what causes browsers holding an older
 * version to fetch this file and install it in the first place.
 *
 * Do NOT delete this file. If sw.js starts 404ing, browsers that already
 * have an old version installed keep it forever — a 404 does not
 * unregister a worker. This file must stay reachable indefinitely.
 *
 * v10 → v11 INCIDENT (fixed same day): v10 called
 * `self.registration.unregister()` followed by `client.navigate(client.url)`
 * to force open tabs to reload. app/plugins/sw.client.ts registers '/sw.js'
 * unconditionally on every page mount with no guard against re-registering
 * an already-controlling worker. Once v10 unregistered itself, the forced
 * reload triggered the plugin's registration call again, which the browser
 * treats as brand new (since nothing was registered any more) — install,
 * activate, unregister, navigate, repeat. This produced a true infinite
 * reload loop in production with no user action needed to trigger it.
 * v11 removes BOTH `unregister()` and `client.navigate()`. Clearing the
 * caches and dropping the fetch handler is sufficient on its own: with no
 * fetch handler, every request already goes straight to the network, so
 * there is nothing left to force a reload for. Staying registered (but
 * doing nothing) is inert and cannot loop, because the plugin's next
 * registration of the same unchanged script is a no-op, not a fresh
 * install.
 */
const VERSION = 'eclipsechase-sunset-v11'

self.addEventListener('install', (event) => {
  // Take over as soon as possible rather than waiting for every tab to close.
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(names.map((name) => caches.delete(name)))

      // Take control of any already-open tabs immediately, so their next
      // request (there's no fetch handler below to intercept it) goes
      // straight to the network instead of to whatever worker — this one
      // or a stale predecessor — controlled them before.
      await self.clients.claim()

      console.log(`[sw] ${VERSION}: caches cleared, now inert (no fetch interception)`)
    })(),
  )
})

// No fetch handler: every request goes straight to the network.
