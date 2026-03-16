const CAMERA_API = 'https://gagnaveita.vegagerdin.is/api/vefmyndavelar2014_1'
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour (camera list rarely changes)

// Eclipse path bounding box
const LAT_MIN = 63.0
const LAT_MAX = 67.0
const LNG_MIN = -25.0
const LNG_MAX = -20.0

interface CameraLocation {
  id: number
  name: string
  road: string
  lat: number
  lng: number
  images: Array<{ url: string; description: string }>
}

let cachedCameras: CameraLocation[] = []
let cachedAt = 0

export default defineEventHandler(async () => {
  const now = Date.now()
  if (cachedCameras.length > 0 && (now - cachedAt) < CACHE_TTL_MS) {
    return { cameras: cachedCameras, cached: true }
  }

  try {
    const response = await fetch(CAMERA_API, { signal: AbortSignal.timeout(10000) })
    if (!response.ok) {
      console.error(`[cameras] Vegagerdin API returned ${response.status}`)
      return { cameras: cachedCameras, cached: true }
    }

    const data: any[] = await response.json()

    // Group by location ID, filter to eclipse region
    const locations = new Map<number, CameraLocation>()

    for (const cam of data) {
      const lat = cam.Breidd || 0
      const lng = cam.Lengd || 0
      if (lat < LAT_MIN || lat > LAT_MAX || lng < LNG_MIN || lng > LNG_MAX) continue

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
        description: cam.Skyring || '',
      })
    }

    cachedCameras = Array.from(locations.values())
    cachedAt = now

    return { cameras: cachedCameras, cached: false }
  } catch (err: any) {
    console.error('[cameras] Fetch failed:', err.message || err)
    return { cameras: cachedCameras, cached: true }
  }
})
