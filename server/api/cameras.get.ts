import { isInEclipseRegion } from '../utils/eclipseRegion'

const CAMERA_API = 'https://gagnaveita.vegagerdin.is/api/vefmyndavelar2014_1'
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour (camera list rarely changes)

// Translate Icelandic camera descriptions to English.
// Apply all matching replacements (not just first match).
const IS_TO_EN: [RegExp, string][] = [
  // Phrases with séð (seen/looking)
  [/séð niður á veg/gi, 'road view'],
  [/séð niður að veg/gi, 'road view'],
  [/séð niður brekku/gi, 'looking downhill'],
  [/séð upp brekku/gi, 'looking uphill'],
  [/séð yfir/gi, 'overlooking'],
  [/séð inn/gi, 'looking into'],
  [/séð út/gi, 'looking out'],
  [/séð á veg inn/gi, 'road view into'],
  [/séð á veg/gi, 'road view'],
  [/séð að/gi, 'towards'],
  [/séð í átt að/gi, 'towards'],
  [/séð upp/gi, 'looking up'],
  [/séð í/gi, 'looking'],
  [/séð/gi, 'looking'],
  // Bare directional phrases (no séð)
  [/niður á veg/gi, 'road view'],
  [/niður á/gi, 'down at'],
  // Directions with til + genitive
  [/til norðausturs/gi, 'northeast'],
  [/til norðvesturs/gi, 'northwest'],
  [/til suðausturs/gi, 'southeast'],
  [/til suðvesturs/gi, 'southwest'],
  [/til norðurs/gi, 'north'],
  [/til suðurs/gi, 'south'],
  [/til austurs/gi, 'east'],
  [/til vesturs/gi, 'west'],
  // Directions with í + accusative
  [/í norðaustur/gi, 'northeast'],
  [/í norðvestur/gi, 'northwest'],
  [/í suðaustur/gi, 'southeast'],
  [/í suðvestur/gi, 'southwest'],
  [/í norður/gi, 'north'],
  [/í suður/gi, 'south'],
  [/í austur/gi, 'east'],
  [/í vestur/gi, 'west'],
  // Bare cardinal directions (end of string or after space)
  [/\bnorðaustur\b/gi, 'northeast'],
  [/\bnorðvestur\b/gi, 'northwest'],
  [/\bsuðaustur\b/gi, 'southeast'],
  [/\bsuðvestur\b/gi, 'southwest'],
  [/\bnorður\b/gi, 'north'],
  [/\bsuður\b/gi, 'south'],
  [/\baustur\b/gi, 'east'],
  [/\bvestur\b/gi, 'west'],
  [/\bnorðurs\b/gi, 'north'],
  [/\bsuðurs\b/gi, 'south'],
  // Catch-all for til + place name (after directional til patterns)
  [/\btil\b/gi, 'towards'],
  // Special terms
  [/\bbrekka\b/gi, 'hill'],
  [/\bbeygjur\b/gi, 'curves'],
  [/\bgöng\b/gi, 'tunnel'],
  [/\baðrein að/gi, 'on-ramp to'],
]

function translateDescription(desc: string): string {
  if (!desc) return ''
  let result = desc
  for (const [pattern, replacement] of IS_TO_EN) {
    result = result.replace(pattern, replacement)
  }
  // Clean up double spaces and trim
  return result.replace(/\s{2,}/g, ' ').trim()
}

import { createTtlCache } from '../utils/cacheHelper'


interface CameraLocation {
  id: number
  name: string
  road: string
  lat: number
  lng: number
  images: Array<{ url: string; description: string }>
}

const cache = createTtlCache<CameraLocation[]>(CACHE_TTL_MS)

export default defineEventHandler(async () => {
  const hit = cache.get()
  if (hit !== null && hit.length > 0) {
    return { cameras: hit, cached: true }
  }

  try {
    const response = await fetch(CAMERA_API, { signal: AbortSignal.timeout(10000) })
    if (!response.ok) {
      console.error(`[cameras] Vegagerdin API returned ${response.status}`)
      return { cameras: cache.peek() ?? [], cached: true }
    }

    const data: any[] = await response.json()

    // Group by location ID, filter to eclipse region
    const locations = new Map<number, CameraLocation>()

    for (const cam of data) {
      const lat = cam.Breidd || 0
      const lng = cam.Lengd || 0
      if (!isInEclipseRegion(lat, lng)) continue

      const id = cam.Maelist_nr
      if (!locations.has(id)) {
        locations.set(id, {
          id,
          name: cam.Myndavel || '',
          road: cam.Vegheiti || '',
          lat,
          lng,
          images: [],
        })
      }
      locations.get(id)!.images.push({
        url: cam.Slod || '',
        description: translateDescription(cam.Skyring || ''),
      })
    }

    const fresh = Array.from(locations.values())
    cache.set(fresh)

    return { cameras: fresh, cached: false }
  } catch (err: any) {
    console.error('[cameras] Fetch failed:', err.message || err)
    return { cameras: cache.peek() ?? [], cached: true }
  }
})
