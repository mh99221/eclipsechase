/**
 * Pre-warm the horizon grid at Nitro boot so the first user request
 * doesn't pay the ~100–300 ms JSON parse cost on a Vercel cold start.
 * The loader is cache-first, so this just fills the cache eagerly.
 *
 * Fire-and-forget: if it fails (asset not bundled yet, transient fetch
 * error), the request handler will retry via the same loader.
 */
import { loadHorizonGrid } from '../utils/horizonGrid'

export default defineNitroPlugin(() => {
  loadHorizonGrid()
    .then(grid => console.log(`[Horizon] Pre-warmed grid (${grid.point_count} points)`))
    .catch(err => console.warn('[Horizon] Pre-warm failed, will retry on demand:', err?.message || err))
})
